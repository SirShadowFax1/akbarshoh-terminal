// Hidden commands, loaded the first time one of them runs.

import { h, line, dim, acc, warn, hint, cmd, reducedMotion } from './util.js';

// Prints lines one after another (all at once when motion is reduced).
function play(t, steps, gap = 140) {
  const box = h('div');
  t.print(box);
  if (reducedMotion()) {
    for (const s of steps) box.append(typeof s === 'function' ? s(true) : s);
    return;
  }
  steps.forEach((s, i) => {
    setTimeout(() => {
      box.append(typeof s === 'function' ? s(false) : s);
      t.update();
    }, i * gap);
  });
}

export function sudo(args, t) {
  t.print(
    line(dim('[sudo] password for guest: ')),
    warn('guest is not in the sudoers file. This incident will be reported.'),
    hint('No root needed: everything here is already open to you. Try ', cmd('help'), '.'),
  );
}

export function rm(args, t) {
  const flags = args.filter((a) => a.startsWith('-')).join('');
  const targets = args.filter((a) => !a.startsWith('-'));
  const recursiveForce = /r/i.test(flags) && /f/.test(flags);
  if (!recursiveForce || !targets.some((p) => p === '/' || p === '/*' || p === '~' || p === '~/')) {
    return t.print(warn(`rm: cannot remove '${targets[0] || ''}': Read-only file system`));
  }
  const dirs = ['experience', 'achievements', 'certificates', 'pictures', 'documents', 'games'];
  play(t, [
    ...dirs.map((d) => line(dim(`removed directory '/home/akbarshoh/${d}'`))),
    line(dim("removed directory '/usr'")),
    line(dim("removed directory '/etc'")),
    warn("rm: cannot remove '/': Device or resource busy"),
    line('Just kidding. Nothing was deleted: this portfolio is read-only.'),
    hint('Everything is still here: ', cmd('ls'), '.'),
  ], 110);
}

function bubble(text, width = 28) {
  const words = text.split(/\s+/).filter(Boolean);
  const rows = [];
  let row = '';
  for (const w of words) {
    if ((row + ' ' + w).trim().length > width) {
      if (row) rows.push(row);
      row = w.slice(0, width);
    } else row = (row + ' ' + w).trim();
  }
  if (row) rows.push(row);
  const len = Math.max(...rows.map((r) => r.length));
  const pad = (r) => r + ' '.repeat(len - r.length);
  const top = ` ${'_'.repeat(len + 2)}`;
  const bottom = ` ${'-'.repeat(len + 2)}`;
  if (rows.length === 1) return [top, `< ${pad(rows[0])} >`, bottom].join('\n');
  const body = rows.map((r, i) => {
    const [l, rr] = i === 0 ? ['/', '\\'] : i === rows.length - 1 ? ['\\', '/'] : ['|', '|'];
    return `${l} ${pad(r)} ${rr}`;
  });
  return [top, ...body, bottom].join('\n');
}

export function cowsay(args, t) {
  const text = args.join(' ') || "Moo. Type help to explore Akbarshokh's portfolio.";
  const cow = String.raw`
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||`;
  t.print(h('pre', { class: 'art cow', vars: { cols: 40 } }, bubble(text) + cow));
}

export function coffee(args, t) {
  const cup = String.raw`
      ( (
       ) )
    ........
    |      |]
    \      /
     '----'`;
  play(t, [
    line(dim('Brewing…')),
    h('pre', { class: 'art cow', vars: { cols: 40 } }, cup.slice(1)),
    line('Coffee is ready. Take a break, then try ', cmd('games scramble'), '.'),
  ], 400);
}

export function hack(args, t) {
  const bar = (p) => `[${'#'.repeat(Math.round(p / 10)).padEnd(10, '.')}] ${String(p).padStart(3)}%`;
  const progress = line(dim('Bypassing firewall '), acc(bar(0)));
  const steps = [
    line(dim('Connecting to mainframe at 127.0.0.1 … done')),
    () => {
      if (!reducedMotion()) {
        let p = 0;
        const timer = setInterval(() => {
          p = Math.min(100, p + 10);
          progress.lastChild.textContent = bar(p);
          if (p === 100) clearInterval(timer);
        }, 90);
      } else progress.lastChild.textContent = bar(100);
      return progress;
    },
    line(dim('Decrypting /home/akbarshoh/secrets.txt …')),
    line(acc('ACCESS GRANTED')),
    line('There are no secrets here, only an open portfolio.'),
    hint('Start with ', cmd('about'), '.'),
  ];
  play(t, steps, 380);
}

export function matrix(args, t) {
  if (reducedMotion()) {
    return t.print(line(acc('Wake up, guest…')), hint('The animation is off because your device prefers reduced motion.'));
  }
  const canvas = h('canvas', { class: 'matrix', 'aria-hidden': 'true' });
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth;
  const H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  const size = 16;
  const drops = Array.from({ length: Math.ceil(W / size) }, () => Math.floor((Math.random() * -H) / size));
  const glyphs = '01アカサタナハマヤラワ23456789AKBARSHOHTUROV<>/=+*';
  const color = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#4fd88a';
  ctx.font = `${size}px monospace`;
  const started = performance.now();
  let last = 0;
  let raf = 0;
  let done = false;

  const stop = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    canvas.remove();
    removeEventListener('keydown', onKey, true);
    t.exitMode();
  };
  const onKey = (e) => {
    e.preventDefault();
    e.stopPropagation();
    stop();
  };
  const frame = (now) => {
    if (now - started > 9000) return stop();
    raf = requestAnimationFrame(frame);
    if (now - last < 45) return;
    last = now;
    ctx.fillStyle = 'rgba(6, 8, 7, 0.14)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = color;
    for (let i = 0; i < drops.length; i++) {
      const y = drops[i] * size;
      if (y > 0) ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y);
      drops[i] = y > H && Math.random() > 0.97 ? 0 : drops[i] + 1;
    }
  };

  t.print(line(acc('Wake up, guest…')), hint('Press any key or tap to return.'));
  t.enterMode({ prompt: 'matrix>', keyboard: false, exit: stop });
  addEventListener('keydown', onKey, true);
  canvas.addEventListener('pointerdown', stop);
  raf = requestAnimationFrame(frame);
}
