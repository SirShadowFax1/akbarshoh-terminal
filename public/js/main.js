// Terminal core: input, history, completion, output, chips and boot control.

import * as C from './content.js';
import { lookup, names, helpFor } from './registry.js';
import { prefetchGames } from './commands.js';
import { display, entries } from './fs.js';
import { h, line, warn, cmd, hint, tokenize, suggest, commonPrefix, store, preloadImage } from './util.js';

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const screen = $('screen');
const log = $('log');
const input = $('cmd');
const ps1 = $('ps1');
const field = $('field');
const cursor = $('cur');
const title = $('title');
const fine = matchMedia('(pointer: fine)');
const MAX_ENTRIES = 500;

const state = {
  cwd: [],
  history: store.get('history', []),
  hIndex: -1,
  draft: '',
  mode: null,
  tabbed: false,
  cols: 80,
};

/* ---------- boot ---------- */

function endBoot() {
  if (!root.classList.contains('boot')) return;
  root.classList.remove('boot');
}
if (root.classList.contains('boot')) {
  setTimeout(endBoot, 3300);
  $('skip').addEventListener('click', () => {
    endBoot();
    input.focus({ preventScroll: true });
  });
  addEventListener('pointerdown', endBoot, { once: true, passive: true });
}

/* ---------- prompt ---------- */

const promptText = () => `guest@akbarshoh:${display(state.cwd)}$`;

function updatePrompt() {
  const where = display(state.cwd);
  ps1.textContent = state.mode ? state.mode.prompt : promptText();
  title.textContent = `akbarshoh@portfolio: ${where}`;
}

let typingTimer = 0;
function syncCursor() {
  const v = input.value;
  const pos = input.selectionEnd ?? v.length;
  field.style.setProperty('--c', pos);
  cursor.textContent = v[pos] && v[pos] !== ' ' ? v[pos] : ' ';
  field.classList.toggle('long', v.length >= state.cols - 1);
  field.classList.add('typing');
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => field.classList.remove('typing'), 600);
}

new ResizeObserver(([entry]) => {
  const size = parseFloat(getComputedStyle(input).fontSize) || 16;
  state.cols = Math.floor(entry.contentRect.width / (size * 0.6));
}).observe(field);

/* ---------- output ---------- */

let revealTarget = null;
function reveal(entry) {
  if (!revealTarget) {
    requestAnimationFrame(() => {
      const e = revealTarget;
      revealTarget = null;
      if (!e.isConnected) return;
      const room = screen.clientHeight - 72;
      screen.scrollTop = e.offsetHeight > room ? e.offsetTop - 8 : screen.scrollHeight;
    });
  }
  revealTarget = entry;
}

function trim() {
  while (log.childElementCount > MAX_ENTRIES) log.firstElementChild.remove();
}

const echoLine = (text) => h('p', { class: 'ln echo' }, h('span', { class: 'ps1' }, state.mode ? state.mode.prompt : promptText()), ' ', text);

function context(out, entry) {
  let pending = null;
  const flush = () => {
    out.append(pending);
    pending = null;
    reveal(entry);
  };
  return {
    get cwd() {
      return state.cwd;
    },
    history: state.history,
    entry,
    print(...nodes) {
      if (!pending) {
        pending = document.createDocumentFragment();
        queueMicrotask(flush);
      }
      for (const n of nodes.flat(Infinity)) if (n != null && n !== false && n !== '') pending.append(n);
    },
    setCwd(parts) {
      state.cwd = parts;
      updatePrompt();
    },
    clear: clearScreen,
    run: (text) => exec(text),
    enterMode,
    exitMode,
    view,
    loadStyle,
    update: () => reveal(entry),
    focus: () => input.focus({ preventScroll: true }),
    keyboard: () => fine.matches,
  };
}

function newEntry(echoText) {
  const entry = h('div', { class: 'entry' });
  if (echoText != null) entry.append(echoLine(echoText));
  const out = h('div', { class: 'out' });
  entry.append(out);
  log.append(entry);
  trim();
  reveal(entry);
  return context(out, entry);
}

function remember(text) {
  const hist = state.history;
  if (hist[hist.length - 1] !== text) {
    hist.push(text);
    if (hist.length > 100) hist.splice(0, hist.length - 100);
    store.set('history', hist);
  }
  state.hIndex = -1;
}

async function run(text, t) {
  const [word, ...args] = tokenize(text);
  if (!word) return;
  const def = lookup(word) || lookup(word.toLowerCase());
  if (!def) {
    const s = suggest(word, names());
    const rest = args.length ? ` ${args.join(' ')}` : '';
    t.print(
      warn(`command not found: ${word}`),
      s ? line('Did you mean ', cmd(s + rest), '?') : hint('Type ', cmd('help'), ' to see everything you can do here.'),
    );
    return;
  }
  if (args.includes('--help') || args.includes('-h')) return t.print(helpFor(def));
  try {
    await def.run(args, t);
  } catch (err) {
    t.print(warn(`${word}: could not finish (${err.message || err}).`));
  }
}

function exec(raw) {
  const text = raw.trim();
  const t = newEntry(raw);
  if (!text) return;
  remember(text);
  run(text, t);
}

function clearScreen() {
  log.replaceChildren();
  screen.scrollTop = 0;
}

/* ---------- interactive modes (games, animations) ---------- */

function enterMode(mode) {
  exitMode();
  state.mode = mode;
  root.classList.add('in-mode');
  input.value = '';
  updatePrompt();
  syncCursor();
  if (mode.keyboard !== false || fine.matches) input.focus({ preventScroll: true });
}

function exitMode() {
  const m = state.mode;
  if (!m) return;
  state.mode = null;
  root.classList.remove('in-mode');
  input.value = '';
  updatePrompt();
  syncCursor();
  m.exit?.();
}

/* ---------- lazy helpers ---------- */

const styles = new Map();
function loadStyle(href) {
  if (!styles.has(href)) {
    styles.set(href, new Promise((resolve) => {
      const el = h('link', { rel: 'stylesheet', href });
      el.addEventListener('load', resolve);
      el.addEventListener('error', resolve);
      document.head.append(el);
    }));
  }
  return styles.get(href);
}

function galleryImages(name) {
  if (name === 'certs') {
    return C.certificates.map((c) => ({ src: c.image.full, width: c.image.width, height: c.image.height, alt: c.image.alt, title: `${c.title} · ${c.date}` }));
  }
  const e = entries.get(name);
  return (e?.item.media?.images || []).map((im) => ({ ...im, title: e.item.title }));
}

async function view(gallery, index = 0, trigger) {
  const images = galleryImages(gallery);
  if (!images.length) return;
  const { open } = await import('./viewer.js');
  open(images, Number(index) || 0, trigger || document.activeElement);
}

function playVideo(button) {
  const frame = h('iframe', {
    class: 'yt-frame',
    src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(button.dataset.yt)}?autoplay=1`,
    title: button.dataset.title,
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowfullscreen: true,
  });
  button.replaceWith(frame);
}

/* ---------- completion and history ---------- */

function replaceToken(before, partial, value, after) {
  const head = before.slice(0, before.length - partial.length);
  input.value = head + value + after;
  const pos = (head + value).length;
  input.setSelectionRange(pos, pos);
  syncCursor();
}

function complete() {
  const v = input.value;
  const caret = input.selectionStart ?? v.length;
  const before = v.slice(0, caret);
  const after = v.slice(caret);
  const tokens = tokenize(before);
  if (!tokens.length || /\s$/.test(before)) tokens.push('');
  const partial = tokens[tokens.length - 1];
  let options;
  if (tokens.length === 1) {
    options = names().filter((n) => n.startsWith(partial.toLowerCase()));
  } else {
    const def = lookup(tokens[0]);
    options = def?.complete ? def.complete(tokens.slice(1), { cwd: state.cwd }) : [];
  }
  options = [...new Set(options)].sort();
  if (!options.length) return;
  if (options.length === 1) {
    const only = options[0];
    replaceToken(before, partial, only + (only.endsWith('/') ? '' : ' '), after);
    state.tabbed = false;
    return;
  }
  const prefix = commonPrefix(options);
  if (prefix.length > partial.length) {
    replaceToken(before, partial, prefix, after);
    state.tabbed = true;
    return;
  }
  if (state.tabbed) {
    const t = newEntry(v);
    const lead = tokens.slice(0, -1).join(' ');
    t.print(h('ul', { class: 'ls' }, options.map((o) => h('li', null, cmd(o, lead ? `${lead} ${o}` : o)))));
  }
  state.tabbed = true;
}

function historyStep(dir) {
  const hist = state.history;
  if (!hist.length) return;
  if (state.hIndex === -1) {
    if (dir > 0) return;
    state.draft = input.value;
    state.hIndex = hist.length;
  }
  state.hIndex = Math.min(hist.length, Math.max(0, state.hIndex + dir));
  input.value = state.hIndex === hist.length ? state.draft : hist[state.hIndex];
  if (state.hIndex === hist.length) state.hIndex = -1;
  const end = input.value.length;
  input.setSelectionRange(end, end);
  syncCursor();
}

function hasSelection() {
  return input.selectionStart !== input.selectionEnd || String(getSelection()).length > 0;
}

/* ---------- events ---------- */

input.addEventListener('keydown', (e) => {
  endBoot();
  const key = e.key;
  const ctrl = e.ctrlKey || e.metaKey;
  if (key !== 'Tab') state.tabbed = false;

  if (state.mode) {
    if (key === 'Escape' || (ctrl && key.toLowerCase() === 'c' && !hasSelection())) {
      e.preventDefault();
      exitMode();
      return;
    }
    if (state.mode.onKey?.(e)) e.preventDefault();
    return;
  }

  if (key === 'Enter') {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    syncCursor();
    exec(v);
  } else if (key === 'Tab' && !e.shiftKey && input.value) {
    e.preventDefault();
    complete();
  } else if (key === 'ArrowUp') {
    e.preventDefault();
    historyStep(-1);
  } else if (key === 'ArrowDown') {
    e.preventDefault();
    historyStep(1);
  } else if (ctrl && key.toLowerCase() === 'l') {
    e.preventDefault();
    clearScreen();
  } else if (ctrl && key.toLowerCase() === 'c' && !hasSelection()) {
    e.preventDefault();
    newEntry(`${input.value}^C`);
    input.value = '';
    state.hIndex = -1;
    syncCursor();
  } else if (key === 'Escape') {
    input.value = '';
    syncCursor();
  } else if (key === '/' && !input.value) {
    e.preventDefault();
    input.value = 'search ';
    syncCursor();
  }
});

input.addEventListener('input', () => {
  syncCursor();
  state.mode?.onInput?.(input.value);
});
document.addEventListener('selectionchange', () => {
  if (document.activeElement === input) syncCursor();
});
input.addEventListener('focus', () => {
  root.classList.add('focused');
  if (!fine.matches) requestAnimationFrame(() => (screen.scrollTop = screen.scrollHeight));
});
input.addEventListener('blur', () => root.classList.remove('focused'));

// Typing anywhere sends keys to the prompt.
addEventListener('keydown', (e) => {
  endBoot();
  if (e.target === input || document.querySelector('dialog[open]')) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    clearScreen();
    return;
  }
  if (ctrl || e.altKey || e.key.length !== 1 || e.key === ' ') return;
  if (e.target.closest?.('input, textarea, select')) return;
  if (e.key === '/' && !input.value && !state.mode) {
    e.preventDefault();
    input.value = 'search ';
  }
  input.focus({ preventScroll: true });
  syncCursor();
});

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-cmd], [data-gallery], [data-yt]');
  if (el) {
    if (el.dataset.cmd) {
      exitMode();
      exec(el.dataset.cmd);
      if (fine.matches) input.focus({ preventScroll: true });
    } else if (el.dataset.gallery) {
      view(el.dataset.gallery, el.dataset.index, el);
    } else {
      playVideo(el);
    }
    return;
  }
  if (fine.matches && e.target.closest('#screen') && !e.target.closest('a, button') && !String(getSelection())) {
    input.focus({ preventScroll: true });
  }
});

function hintTarget(e) {
  const el = e.target.closest?.('[data-full], [data-cmd]');
  if (!el) return;
  if (el.dataset.full) {
    preloadImage(el.dataset.full);
    import('./viewer.js');
  } else if (el.dataset.cmd === 'certs') {
    for (const c of C.certificates) preloadImage(c.image.thumb);
  } else if (el.dataset.cmd.startsWith('games')) {
    prefetchGames();
  }
}
document.addEventListener('pointerover', hintTarget, { passive: true });
document.addEventListener('focusin', hintTarget);

// Keep the prompt visible above on-screen keyboards that do not resize the page.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => root.style.setProperty('--vvh', `${vv.height}px`);
  vv.addEventListener('resize', fit);
  fit();
}

updatePrompt();
syncCursor();

/* ---------- offline support ---------- */

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const registerWorker = () => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    idle(() => navigator.serviceWorker.register('sw.js').catch(() => {}));
  };
  if (document.readyState === 'complete') registerWorker();
  else addEventListener('load', registerWorker, { once: true });
}
