// Typing test: 30 common English words, typed into the terminal prompt.
// WPM counts correct characters / 5 per minute, like monkeytype.

import { h, line, dim, acc, hint, cmd, store } from '../util.js';

const WORDS = (
  'the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would ' +
  'all will there say who make when can more if no man out other so what time up go about than into could state only ' +
  'new year some take come these know see use get like then first any work now may such give over think most even find ' +
  'day also after way many must look before great back through long where much should well people down own just because ' +
  'good each those feel seem how high too place little world very still nation hand old life tell write become here show ' +
  'house both between need mean call develop under last right move thing general school never same another begin while ' +
  'number part turn real leave might want point form off child few small since against ask late home interest large ' +
  'person end open public follow during present without again hold around possible head consider word program problem ' +
  'however lead system set order eye plan run keep face fact group play stand increase early course change help line'
).split(' ');

const COUNT = 30;
const MY_BEST = 135;

function score(typed, text, seconds) {
  let correct = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === text[i]) correct++;
  return {
    wpm: seconds > 0 ? Math.round(correct / 5 / (seconds / 60)) : 0,
    accuracy: typed.length ? Math.round((correct / typed.length) * 100) : 100,
  };
}

export function start(t) {
  const text = Array.from({ length: COUNT }, () => WORDS[(Math.random() * WORDS.length) | 0]).join(' ');
  const chars = [...text].map((ch) => h('span', null, ch));
  chars[0].className = 'now';
  const target = h('p', { class: 'ln typing-target', 'aria-hidden': 'true' }, chars);
  const stats = h('p', { class: 'ln dim typing-stats', 'aria-hidden': 'true' }, 'WPM 0 · accuracy 100% · 0.0s');
  const result = h('div', { class: 'typing-result' });
  t.print(h('div', { class: 'game' },
    line(acc('Typing test'), dim(` · ${COUNT} words · my best is ${MY_BEST} WPM`)),
    hint(t.keyboard() ? 'Start typing: the timer starts on your first key. Esc quits.' : 'Tap the prompt and start typing. The timer starts on your first key.'),
    h('p', { class: 'sr' }, `Type this text: ${text}`),
    target,
    stats,
    result,
  ));

  let typed = '';
  let startedAt = 0;
  let timer = 0;
  let finished = false;
  const seconds = () => (startedAt ? (performance.now() - startedAt) / 1000 : 0);

  function paint(value) {
    let i = 0;
    while (i < typed.length && i < value.length && typed[i] === value[i]) i++;
    const end = Math.min(chars.length, Math.max(typed.length, value.length) + 1);
    for (let j = i; j < end; j++) {
      chars[j].className = j < value.length ? (value[j] === text[j] ? 'ok' : 'bad') : j === value.length ? 'now' : '';
    }
    typed = value;
  }

  function tick() {
    const s = seconds();
    const { wpm, accuracy } = score(typed, text, s);
    stats.textContent = `WPM ${wpm} · accuracy ${accuracy}% · ${s.toFixed(1)}s`;
  }

  function finish() {
    finished = true;
    clearInterval(timer);
    tick();
    const s = seconds();
    const { wpm, accuracy } = score(typed, text, s);
    const best = store.get('typing-best', 0);
    if (wpm > best) store.set('typing-best', wpm);
    result.append(
      line(acc(`${wpm} WPM`), ` with ${accuracy}% accuracy in ${s.toFixed(1)} seconds.`),
      line(dim(wpm > best && best ? `New personal best (previous: ${best} WPM). ` : best ? `Your best: ${Math.max(best, wpm)} WPM. ` : ''),
        dim(`My best is ${MY_BEST} WPM on monkeytype.com.`)),
      hint('Press Enter to try again or Esc to quit. ', cmd('Play again', 'games typing'), '.'),
    );
    t.update();
  }

  t.enterMode({
    prompt: 'typing>',
    onInput(value) {
      if (finished) return;
      if (!startedAt && value) {
        startedAt = performance.now();
        timer = setInterval(tick, 250);
      }
      paint(value.slice(0, text.length));
      if (value.length >= text.length) finish();
    },
    onKey(e) {
      if (e.key === 'Enter') {
        if (finished) setTimeout(() => t.run('games typing'));
        return true;
      }
      return e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown';
    },
    exit() {
      clearInterval(timer);
      if (!finished) result.append(hint('Typing test closed. ', cmd('Try again', 'games typing'), '.'));
    },
  });
}
