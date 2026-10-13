// Command registry. Adding a command is one call:
//
//   register({
//     name: 'hello',
//     group: 'Terminal',            // section in `help`
//     summary: 'Say hello',         // one line for `help`
//     usage: 'hello [name]',
//     examples: ['hello', 'hello world'],
//     run(args, t) { t.print(line('hello')); },
//   });
//
// Optional fields: aliases, hidden (left out of help and completion),
// when() (command exists only while it returns true, used for sections that
// depend on content), complete(args, t) (tab-completion candidates).

import { h, cmd, dim, line, heading, hint } from './util.js';

const commands = new Map();
const aliases = new Map();

export const GROUPS = ['Portfolio', 'Links', 'Explore', 'Fun', 'Terminal'];

export function register(def) {
  commands.set(def.name, def);
  for (const a of def.aliases || []) aliases.set(a, def.name);
}

const live = (def) => def && (!def.when || def.when());

export function lookup(name) {
  const def = commands.get(name) || commands.get(aliases.get(name));
  return live(def) ? def : null;
}

export function list({ hidden = false } = {}) {
  return [...commands.values()].filter((d) => live(d) && (hidden || !d.hidden));
}

export function names() {
  return list().map((d) => d.name);
}

export function helpFor(def) {
  return [
    line(h('b', { class: 'acc' }, def.name), dim(' · '), def.summary),
    line(dim('usage: '), def.usage || def.name),
    def.aliases?.length ? line(dim('aliases: '), def.aliases.join(', ')) : null,
    def.examples?.length
      ? line(dim('examples: '), ...def.examples.flatMap((e, i) => [i ? dim('  ') : null, cmd(e)]))
      : null,
  ];
}

export function helpIndex() {
  const out = [heading('Commands')];
  for (const group of GROUPS) {
    const defs = list().filter((d) => d.group === group);
    if (!defs.length) continue;
    out.push(
      h('div', { class: 'help-group' },
        h('p', { class: 'ln sub' }, group),
        h('dl', { class: 'kv help' },
          defs.map((d) => h('div', null, h('dt', null, cmd(d.name)), h('dd', null, d.summary))),
        ),
      ),
    );
  }
  out.push(
    hint('Type ', cmd('help <command>', 'help help'), ' or ', h('code', null, '<command> --help'),
      ' for usage and examples. Tab completes, ↑/↓ walk your history, and a few commands are hidden.'),
  );
  return out;
}
