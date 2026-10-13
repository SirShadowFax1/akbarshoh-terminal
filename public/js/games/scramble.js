// 3x3 scramble generator with a cube preview and a solve timer.
// Scrambles use WCA notation: no face twice in a row and no three moves in
// a row on the same axis. The preview applies the scramble to a solved cube
// (white on top, green in front).

import { h, line, dim, acc, hint, store } from '../util.js';

const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const AXIS = { U: 0, D: 0, L: 1, R: 1, F: 2, B: 2 };
const SUFFIX = ['', "'", '2'];

export function generate(length = 20) {
  const moves = [];
  while (moves.length < length) {
    const face = FACES[(Math.random() * 6) | 0];
    const a = moves[moves.length - 1]?.[0];
    const b = moves[moves.length - 2]?.[0];
    if (face === a) continue;
    if (a && b && AXIS[face] === AXIS[a] && AXIS[a] === AXIS[b]) continue;
    moves.push(face + SUFFIX[(Math.random() * 3) | 0]);
  }
  return moves;
}

// Stickers are numbered 0-8 row by row, each face seen from outside with
// U above F, R, B and L, and D below F.
function solved() {
  const cube = {};
  for (const f of FACES) cube[f] = Array(9).fill(f);
  return cube;
}

const ROTATE = [6, 3, 0, 7, 4, 1, 8, 5, 2];
const row = (f, r) => [[f, r * 3], [f, r * 3 + 1], [f, r * 3 + 2]];
const col = (f, c) => [[f, c], [f, c + 3], [f, c + 6]];
const rev = (strip) => [...strip].reverse();

// For each face, four strips listed so that each strip receives the stickers
// of the one before it on a clockwise turn.
const CYCLES = {
  U: [row('F', 0), row('L', 0), row('B', 0), row('R', 0)],
  D: [row('F', 2), row('R', 2), row('B', 2), row('L', 2)],
  R: [col('F', 2), col('U', 2), rev(col('B', 0)), col('D', 2)],
  L: [col('U', 0), col('F', 0), col('D', 0), rev(col('B', 2))],
  F: [row('U', 2), col('R', 0), rev(row('D', 0)), rev(col('L', 2))],
  B: [row('U', 0), rev(col('L', 0)), rev(row('D', 2)), col('R', 2)],
};

function turn(cube, face) {
  const f = cube[face];
  cube[face] = ROTATE.map((i) => f[i]);
  const strips = CYCLES[face];
  const values = strips.map((s) => s.map(([k, i]) => cube[k][i]));
  strips.forEach((s, n) => {
    const from = values[(n + 3) % 4];
    s.forEach(([k, i], j) => {
      cube[k][i] = from[j];
    });
  });
}

export function apply(moves, cube = solved()) {
  for (const m of moves) {
    const times = m[1] === '2' ? 2 : m[1] === "'" ? 3 : 1;
    for (let i = 0; i < times; i++) turn(cube, m[0]);
  }
  return cube;
}

// Unfolded net: U on top, then L F R B, then D.
const LAYOUT = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };

function net(cube) {
  const cells = [];
  for (const f of FACES) {
    const [r0, c0] = LAYOUT[f];
    cube[f].forEach((color, i) => {
      const s = h('i', { class: `st st-${color}` });
      s.style.gridRow = String(r0 + Math.floor(i / 3) + 1);
      s.style.gridColumn = String(c0 + (i % 3) + 1);
      cells.push(s);
    });
  }
  return h('div', { class: 'net', role: 'img', 'aria-label': 'Preview of the cube after this scramble, white on top and green in front' }, cells);
}

function ao5(times) {
  if (times.length < 5) return null;
  const last = times.slice(-5).sort((a, b) => a - b).slice(1, 4);
  return last.reduce((s, x) => s + x, 0) / 3;
}

const fmt = (ms) => (ms / 1000).toFixed(2);

export function start(t) {
  let moves = generate();
  const times = [];
  let state = 'idle';
  let startedAt = 0;
  let raf = 0;

  const scrambleLine = h('p', { class: 'ln scramble-moves' });
  const preview = h('div', { class: 'net-wrap' });
  const display = h('p', { class: 'timer', 'aria-hidden': 'true' }, '0.00');
  const status = h('p', { class: 'ln dim', 'aria-live': 'polite' });
  const list = h('p', { class: 'ln dim times' });
  const toggle = h('button', { type: 'button', class: 'game-btn primary', onclick: () => press() }, 'Start');
  const fresh = h('button', { type: 'button', class: 'game-btn', onclick: () => newScramble() }, 'New scramble');
  const quit = h('button', { type: 'button', class: 'game-btn', onclick: () => t.exitMode() }, 'Quit');

  function newScramble() {
    if (state === 'running') return;
    moves = generate();
    scrambleLine.textContent = moves.join(' ');
    preview.replaceChildren(net(apply(moves)));
    status.textContent = t.keyboard() ? 'Press Space to start the timer.' : 'Tap Start when you are ready.';
  }

  function tick() {
    display.textContent = fmt(performance.now() - startedAt);
    raf = requestAnimationFrame(tick);
  }

  function press() {
    if (state === 'running') {
      cancelAnimationFrame(raf);
      const ms = performance.now() - startedAt;
      times.push(ms);
      display.textContent = fmt(ms);
      state = 'stopped';
      toggle.textContent = 'Start';
      const best = Math.min(...times);
      const avg = ao5(times);
      const pb = store.get('scramble-best', 0);
      if (!pb || ms < pb) store.set('scramble-best', ms);
      status.textContent = `Time: ${fmt(ms)} s. ${ms === best && times.length > 1 ? 'New session best! ' : ''}For comparison, I'm sub-8.5 on the 3x3.`;
      list.textContent = `Session: ${times.map(fmt).join(', ')} · best ${fmt(best)}${avg ? ` · ao5 ${fmt(avg)}` : ''}`;
      moves = generate();
      scrambleLine.textContent = moves.join(' ');
      preview.replaceChildren(net(apply(moves)));
    } else {
      state = 'running';
      startedAt = performance.now();
      toggle.textContent = 'Stop';
      status.textContent = t.keyboard() ? 'Solving… press any key to stop.' : 'Solving… tap Stop when done.';
      raf = requestAnimationFrame(tick);
    }
  }

  t.print(h('div', { class: 'game' },
    line(acc('3x3 scramble'), dim(" · white on top, green in front · I'm sub-8.5 on the 3x3")),
    scrambleLine,
    preview,
    display,
    h('p', { class: 'ln game-actions' }, toggle, ' ', fresh, ' ', quit),
    status,
    list,
    hint(t.keyboard() ? 'Space starts, any key stops, N gives a new scramble, Esc quits.' : 'Tap Start and Stop. Use New scramble for another one.'),
  ));
  newScramble();

  t.enterMode({
    prompt: 'scramble>',
    keyboard: false,
    onInput() {},
    onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (state === 'running') {
        press();
        return true;
      }
      if (e.key === ' ' || e.key === 'Enter') press();
      else if (e.key.toLowerCase() === 'n') newScramble();
      return true;
    },
    exit() {
      cancelAnimationFrame(raf);
      state = 'closed';
      toggle.disabled = fresh.disabled = quit.disabled = true;
      status.textContent = times.length ? `Timer closed after ${times.length} solve${times.length > 1 ? 's' : ''}.` : 'Timer closed.';
    },
  });
}
