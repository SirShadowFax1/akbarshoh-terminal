// Small DOM and text helpers shared by every module. Content is always set
// through textContent or text nodes, never innerHTML.

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const key in props) {
      const v = props[key];
      if (v == null || v === false) continue;
      if (key === 'class') el.className = v;
      else if (key === 'text') el.textContent = v;
      else if (key === 'dataset') Object.assign(el.dataset, v);
      else if (key === 'vars') for (const k in v) el.style.setProperty(`--${k}`, v[k]);
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), v);
      else el.setAttribute(key, v === true ? '' : v);
    }
  }
  add(el, kids);
  return el;
}

function add(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : String(k));
  }
}

export const frag = (...kids) => {
  const f = document.createDocumentFragment();
  add(f, kids);
  return f;
};

// Output building blocks
export const line = (...kids) => h('p', { class: 'ln' }, ...kids);
export const heading = (text) => h('p', { class: 'hd' }, text);
export const dim = (text) => h('span', { class: 'dim' }, text);
export const acc = (text) => h('span', { class: 'acc' }, text);
export const bold = (text) => h('b', null, text);
export const warn = (...kids) => h('p', { class: 'ln warn' }, ...kids);

export const cmd = (label, command = label, extra) =>
  h('button', { type: 'button', class: extra ? `cl ${extra}` : 'cl', dataset: { cmd: command } }, label);

export const link = (label, url, extra) =>
  h('a', { class: extra ? `lk ${extra}` : 'lk', href: url, target: '_blank', rel: 'noopener noreferrer' }, label);

export const bullets = (items) =>
  h('ul', { class: 'pts' }, items.map((it) => h('li', null, it)));

export const kv = (rows) =>
  h('dl', { class: 'kv' }, rows.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v))));

export const art = (text, cols, label) =>
  h('pre', { class: 'art', 'aria-hidden': label ? null : 'true', 'aria-label': label, role: label ? 'img' : null, vars: { cols } }, text);

export const hint = (...kids) => h('p', { class: 'ln dim hint' }, ...kids);

export function joinNodes(nodes, sep = ', ') {
  const out = [];
  nodes.forEach((n, i) => {
    if (i) out.push(sep);
    out.push(n);
  });
  return out;
}

// Splits a command line into words, honouring single and double quotes.
export function tokenize(input) {
  const out = [];
  let cur = '';
  let quote = null;
  let started = false;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started || cur) out.push(cur);
      cur = '';
      started = false;
    } else {
      cur += ch;
    }
  }
  if (started || cur) out.push(cur);
  return out;
}

// Optimal string alignment distance (Levenshtein plus adjacent swaps).
export function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

export function suggest(word, candidates) {
  const w = word.toLowerCase();
  let best = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    let score = distance(w, c);
    if (c.startsWith(w) && w.length >= 2) score = Math.min(score, 1);
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  const limit = w.length <= 3 ? 1 : 2;
  return bestScore <= limit ? best : null;
}

export function commonPrefix(words) {
  if (!words.length) return '';
  let p = words[0];
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return p;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function openTab(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(`akt:${key}`);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`akt:${key}`, JSON.stringify(value));
    } catch {
      // Storage can be unavailable (private mode); the terminal works without it.
    }
  },
};

export function preloadImage(src) {
  if (!src || preloadImage.seen.has(src)) return;
  preloadImage.seen.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
}
preloadImage.seen = new Set();
