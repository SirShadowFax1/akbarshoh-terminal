// Every command the terminal understands. Each one is a register() call;
// see registry.js for the fields.

import * as C from './content.js';
import { register, lookup, list, names, helpFor, helpIndex } from './registry.js';
import { entries, root, resolve, display, absolute, completePath, walk } from './fs.js';
import {
  h, line, heading, dim, acc, warn, cmd, link, bullets, kv, art, hint, joinNodes,
  copyText, openTab, store, suggest, preloadImage,
} from './util.js';

const { profile } = C;
const linkById = (id) => profile.links.find((l) => l.id === id);
const prettyUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, '');
const metaLine = (...parts) => {
  const text = parts.filter(Boolean).join(' · ');
  return text ? line(dim(text)) : null;
};

/* ---------- renderers ---------- */

function picture(photo, size, cls = 'photo') {
  return h('picture', { class: cls },
    h('source', { srcset: photo.avif, type: 'image/avif' }),
    h('img', { src: photo.webp, width: size, height: size, alt: photo.alt, decoding: 'async' }),
  );
}

function thumb(image, gallery, index, label) {
  return h('button', {
    type: 'button',
    class: 'thumb',
    dataset: { gallery, index, full: image.full || image.src },
    'aria-label': label,
  },
  h('img', {
    src: image.thumb || image.src,
    width: image.thumbWidth || image.width,
    height: image.thumbHeight || image.height,
    alt: image.alt,
    loading: 'lazy',
    decoding: 'async',
  }));
}

function youtube(video) {
  return h('button', {
    type: 'button',
    class: 'yt',
    dataset: { yt: video.youtube, title: video.title || 'Video' },
    'aria-label': `Play video: ${video.title || 'video'} (loads YouTube)`,
  },
  video.poster ? h('img', { src: video.poster, alt: '', loading: 'lazy', decoding: 'async', width: 480, height: 270 }) : null,
  h('span', { class: 'yt-play', 'aria-hidden': 'true' }, '▸'),
  h('span', { class: 'yt-label' }, video.title || 'Play video'));
}

function media(entry) {
  const m = entry.media;
  if (!m) return null;
  const out = [];
  if (m.images?.length) {
    out.push(h('div', { class: 'gallery' },
      m.images.map((img, i) => thumb(img, entry.id, i, `View image ${i + 1} of ${m.images.length}: ${img.alt}`))));
  }
  if (m.video?.youtube) out.push(youtube(m.video));
  else if (m.video?.src) {
    out.push(h('video', {
      class: 'vid',
      controls: true,
      preload: 'none',
      playsinline: true,
      src: m.video.src,
      poster: m.video.poster,
      width: m.video.width,
      height: m.video.height,
      title: m.video.title,
    }));
  }
  return out;
}

function card(e, { inList = false } = {}) {
  return h('article', { class: 'card' },
    h('p', { class: 'ln et' }, inList ? cmd(e.title, `open ${e.id}`, 'title') : h('b', { class: 'acc' }, e.title)),
    metaLine(e.role, e.location, e.date),
    e.summary ? line(e.summary) : null,
    e.points?.length ? bullets(e.points) : null,
    e.links?.length ? line(...joinNodes(e.links.map((l) => link(l.label, l.url)), dim(' · '))) : null,
    media(e),
  );
}

function achievementRow(a) {
  const target = entries.get(a.ref);
  return h('li', null,
    cmd(a.title, `open ${a.id}`, 'title'),
    h('span', { class: 'dim' }, ` ${[a.detail, a.date].filter(Boolean).join(' · ')}`),
    target && target.kind !== 'achievement' ? [' ', cmd('details', `open ${a.ref}`, 'more')] : null,
  );
}

function certCard(c) {
  return h('article', { class: 'card cert' },
    h('p', { class: 'ln et' }, h('b', { class: 'acc' }, c.title), dim(` · ${c.date}`)),
    kv(c.scores),
    thumb(c.image, 'certs', C.certificates.indexOf(c), `View ${c.title} score report full size`),
  );
}

const sections = {
  about() {
    return [
      heading('About me'),
      ...C.about.map((p) => h('p', { class: 'ln para' }, p)),
      hint('Next: ', ...joinNodes(['experience', 'achievements', 'certs', 'contact'].map((c) => cmd(c)), '  ')),
    ];
  },
  education() {
    return [heading('Education'), ...C.education.map((e) => card(e))];
  },
  experience() {
    return [
      heading('Leadership and activities'),
      ...C.experience.map((e) => card(e, { inList: true })),
      hint('Tap a title, or type ', cmd('open <name>', 'help open'), '. The same entries live in ', cmd('~/experience', 'ls experience'), '.'),
    ];
  },
  achievements() {
    return [
      heading('Achievements'),
      h('ul', { class: 'rows' }, C.achievements.map(achievementRow)),
      hint('Score reports: ', cmd('certs'), '. Full stories: ', cmd('experience'), '.'),
    ];
  },
  projects() {
    return [heading('Projects'), ...C.projects.map((p) => card(p, { inList: true }))];
  },
  certs() {
    return [
      heading('Certificates and test scores'),
      ...C.certificates.map(certCard),
      hint('Tap a report to view it full size. Personal identifiers are blacked out.'),
    ];
  },
  skills() {
    return [
      heading('Skills'),
      kv([
        ...C.skills.map((s) => [s.group, s.items.join(', ')]),
        ['Languages', C.languages.map((l) => `${l.name} (${l.level})`).join(', ')],
      ]),
    ];
  },
  interests() {
    return [
      heading('Interests'),
      kv(C.interests.map((i) => [
        i.title,
        [i.detail, i.game ? [' ', cmd(i.game === 'typing' ? 'take the typing test' : 'try the scramble timer', `games ${i.game}`, 'more')] : null],
      ])),
    ];
  },
  contact() {
    return [
      heading('Contact'),
      kv([
        ['Email', [h('a', { class: 'lk', href: `mailto:${profile.email}` }, profile.email), ' ', cmd('copy', 'email copy', 'more')]],
        ...profile.links.map((l) => [l.label, link(l.handle, l.url)]),
        ['CV', [cmd(`download ${profile.cv.name}`, 'cv', 'more')]],
        ['Based in', profile.location],
      ]),
    ];
  },
};

function photoBlock() {
  return h('div', { class: 'pair' },
    picture(profile.photo, profile.photo.width),
    art(profile.portrait, 40),
  );
}

function neofetch() {
  const school = C.education[0];
  const rows = [
    ['Name', profile.name],
    ['Location', profile.location],
    school ? ['School', school.title] : null,
    school ? ['Status', `${school.role} · ${school.date}`] : null,
    ...C.certificates.map((c) => [c.title, c.summary]),
    ...C.skills.map((s) => [s.group.replace('Programming languages', 'Code'), s.items.join(', ')]),
    ['Languages', C.languages.map((l) => `${l.name} (${l.level})`).join(', ')],
    ...C.interests.map((i) => [i.title, i.detail]),
  ].filter(Boolean);
  return h('div', { class: 'neo' },
    art(profile.portrait, 40),
    h('div', { class: 'neo-info' },
      h('div', { class: 'neo-head' },
        picture(profile.photo, 72, 'photo sm'),
        h('div', null,
          line(h('b', { class: 'acc' }, 'guest'), '@', h('b', { class: 'acc' }, 'akbarshoh')),
          line(dim('─'.repeat(15))),
        ),
      ),
      kv(rows),
      h('p', { class: 'swatches', 'aria-hidden': 'true' }, ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'].map((c) => h('span', { class: c }))),
    ),
  );
}

/* ---------- entries: cat and open ---------- */

function showRef(ref, t, { open = false } = {}) {
  if (sections[ref]) return t.print(sections[ref]());
  const entry = entries.get(ref);
  if (!entry) return t.print(warn(`nothing called ${ref}`));
  const { kind, item } = entry;
  switch (kind) {
    case 'education':
    case 'experience':
    case 'project':
      t.print(card(item), hint('Back to ', cmd(kind === 'education' ? 'education' : kind === 'project' ? 'projects' : 'experience'), '.'));
      break;
    case 'achievement': {
      const target = entries.get(item.ref);
      t.print(
        h('p', { class: 'ln et' }, h('b', { class: 'acc' }, item.title)),
        metaLine(item.detail, item.date),
        target ? hint('Full details: ', cmd(target.item.title, `open ${item.ref}`), '.') : null,
        media(item),
      );
      break;
    }
    case 'cert':
      t.print(certCard(item));
      if (open) t.view('certs', C.certificates.indexOf(item));
      break;
    case 'game':
      if (open) return startGame(item.id, t);
      t.print(line(h('b', { class: 'acc' }, item.title)), line(item.summary), hint('Play it: ', cmd(`games ${item.id}`), '.'));
      break;
    case 'link':
      if (open) openTab(item.url);
      t.print(line(open ? 'Opening ' : '', `${item.label}: `, link(prettyUrl(item.url), item.url)));
      break;
    case 'email':
      return open ? lookup('email').run([], t) : t.print(line('Email: ', h('a', { class: 'lk', href: `mailto:${item.address}` }, item.address)));
    case 'cv':
      return open
        ? lookup('cv').run([], t)
        : t.print(line(`${item.name}: PDF, ${item.pages} pages, ${item.size}.`), hint('Download it with ', cmd('cv'), '.'));
    case 'photo':
      return t.print(photoBlock());
  }
}

function pathTarget(arg, t) {
  const found = resolve(t.cwd, arg);
  if (found) return found;
  const clean = arg.replace(/\/$/, '').split('/').pop().replace(/\.(txt|webp|pdf)$/, '');
  if (entries.has(clean)) return { node: { type: 'file', ref: clean, name: clean }, parts: null };
  return null;
}

function allPaths() {
  const out = [];
  walk(root, (node, prefix) => out.push([...prefix, node.name].join('/')));
  return out;
}

function notFound(prefix, arg, t, pool) {
  const s = suggest(arg, pool);
  t.print(warn(`${prefix}: ${arg}: No such file or directory`));
  if (s) t.print(line('Did you mean ', cmd(s.includes(' ') ? s : `${prefix} ${s}`), '?'));
}

const pathComplete = (args, t) => completePath(t.cwd, args[args.length - 1] || '');

/* ---------- games ---------- */

const gameLoaders = {
  typing: () => import('./games/typing.js'),
  scramble: () => import('./games/scramble.js'),
};

export function prefetchGames() {
  for (const k in gameLoaders) gameLoaders[k]();
}

async function startGame(id, t) {
  const load = gameLoaders[id];
  if (!load) return;
  const [mod] = await Promise.all([load(), t.loadStyle(import.meta.resolve('./games/games.css'))]);
  mod.start(t);
}

/* ---------- search ---------- */

let searchIndex = null;
function buildIndex() {
  const idx = [];
  const add = (section, title, text, run) => idx.push({ section, title, text: `${title} ${text}`.toLowerCase(), raw: text, run });
  add('about', 'About me', C.about.join(' '), 'about');
  for (const e of C.education) add('education', e.title, [e.role, e.location, e.date, ...e.points].join(' '), `open ${e.id}`);
  for (const e of C.experience) add('experience', e.title, [e.role, e.location, e.date, ...e.points].filter(Boolean).join(' '), `open ${e.id}`);
  for (const a of C.achievements) add('achievement', a.title, [a.detail, a.date].filter(Boolean).join(' '), `open ${a.id}`);
  for (const p of C.projects) add('project', p.title, [p.summary, p.date, ...(p.points || [])].filter(Boolean).join(' '), `open ${p.id}`);
  for (const c of C.certificates) add('certificate', c.title, [c.date, c.summary, ...c.scores.map((s) => s.join(' '))].join(' '), `open ${c.id}`);
  for (const s of C.skills) add('skills', s.group, s.items.join(', '), 'skills');
  add('skills', 'Languages', C.languages.map((l) => `${l.name} (${l.level})`).join(', '), 'skills');
  for (const i of C.interests) add('interests', i.title, i.detail, 'interests');
  for (const g of C.games) add('game', g.title, g.summary, `games ${g.id}`);
  for (const l of profile.links) add('link', l.label, `${l.handle} ${prettyUrl(l.url)}`, l.id);
  add('contact', 'Email', profile.email, 'email');
  add('document', 'CV', `${profile.cv.name} curriculum vitae resume`, 'cv');
  for (const d of list()) add('command', d.name, d.summary, d.name);
  return idx;
}

function snippet(raw, terms) {
  const lower = raw.toLowerCase();
  let at = -1;
  for (const term of terms) {
    at = lower.indexOf(term);
    if (at >= 0) break;
  }
  if (at < 0) return raw.length > 90 ? `${raw.slice(0, 90)}…` : raw;
  const start = Math.max(0, at - 30);
  const end = Math.min(raw.length, at + 60);
  const text = `${start ? '…' : ''}${raw.slice(start, end)}${end < raw.length ? '…' : ''}`;
  const parts = [];
  const re = new RegExp(`(${terms.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  let last = 0;
  for (const m of text.matchAll(re)) {
    parts.push(text.slice(last, m.index), h('mark', null, m[0]));
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

/* ---------- themes ---------- */

export const THEMES = ['green', 'amber', 'cyan', 'violet'];

export function applyTheme(name) {
  document.documentElement.dataset.accent = name;
}

/* ---------- registrations ---------- */

const simple = (name, group, summary, extra = {}) =>
  register({ name, group, summary, usage: name, examples: [name], run: (_, t) => t.print(sections[name]()), ...extra });

simple('about', 'Portfolio', 'Who I am, in a few lines');
register({
  name: 'whoami',
  group: 'Portfolio',
  summary: 'Who you are here',
  usage: 'whoami',
  examples: ['whoami'],
  run(_, t) {
    t.print(line(acc('guest')), hint("You're a guest in Akbarshokh Turobov's portfolio. Try ", cmd('about'), ' or ', cmd('neofetch'), '.'));
  },
});
simple('education', 'Portfolio', 'School, scholarship and class rank');
simple('experience', 'Portfolio', 'Leadership and activities', { aliases: ['activities', 'leadership'] });
simple('achievements', 'Portfolio', 'Awards, places and scores', { aliases: ['awards'] });
simple('projects', 'Portfolio', 'Things I have built', { when: () => C.projects.length > 0 });
simple('certs', 'Portfolio', 'IELTS and SAT score reports', { aliases: ['certificates', 'scores'] });
simple('skills', 'Portfolio', 'Programming, tools and languages');
simple('interests', 'Portfolio', 'Chess, speedcubing, speedtyping', { aliases: ['hobbies'] });

register({
  name: 'photo',
  group: 'Portfolio',
  summary: 'My photo and its ASCII twin',
  usage: 'photo',
  examples: ['photo'],
  run(_, t) {
    t.print(photoBlock());
  },
});
register({
  name: 'neofetch',
  group: 'Portfolio',
  summary: 'Photo, ASCII portrait and key facts',
  usage: 'neofetch',
  examples: ['neofetch'],
  aliases: ['fastfetch'],
  run(_, t) {
    t.print(neofetch());
  },
});
register({
  name: 'cv',
  group: 'Portfolio',
  summary: 'Download my CV (PDF)',
  usage: 'cv',
  examples: ['cv'],
  aliases: ['resume'],
  run(_, t) {
    const a = h('a', { href: profile.cv.file, download: profile.cv.name, hidden: true });
    document.body.append(a);
    a.click();
    a.remove();
    t.print(
      line(`Downloading ${profile.cv.name} (PDF, ${profile.cv.pages} pages, ${profile.cv.size}).`),
      hint('Nothing happening? ', link('Open the PDF in a new tab', profile.cv.file), '.'),
    );
  },
});

simple('contact', 'Links', 'All the ways to reach me');
register({
  name: 'socials',
  group: 'Links',
  summary: 'GitHub, LinkedIn and Telegram',
  usage: 'socials',
  examples: ['socials'],
  run(_, t) {
    t.print(heading('Socials'), kv(profile.links.map((l) => [cmd(l.id), link(prettyUrl(l.url), l.url)])));
  },
});
register({
  name: 'email',
  group: 'Links',
  summary: 'Copy my email and open your mail app',
  usage: 'email [copy]',
  examples: ['email', 'email copy'],
  async run(args, t) {
    const copied = await copyText(profile.email);
    const onlyCopy = args[0] === 'copy';
    if (!onlyCopy) location.href = `mailto:${profile.email}`;
    t.print(
      line(
        copied ? `Copied ${profile.email} to your clipboard.` : `My email is ${profile.email}.`,
        onlyCopy ? '' : ' Opening your mail app…',
      ),
      onlyCopy ? null : hint('Or write directly: ', h('a', { class: 'lk', href: `mailto:${profile.email}` }, profile.email)),
    );
  },
});
for (const l of profile.links) {
  register({
    name: l.id,
    group: 'Links',
    summary: `Open my ${l.label} (${l.handle})`,
    usage: l.id,
    examples: [l.id],
    run(_, t) {
      openTab(l.url);
      t.print(line(`Opening ${l.label}: `, link(prettyUrl(l.url), l.url)));
    },
  });
}
register({
  name: 'share',
  group: 'Links',
  summary: 'Copy the link to this site',
  usage: 'share',
  examples: ['share'],
  async run(_, t) {
    const url = new URL('./', location.href).href;
    const copied = await copyText(url);
    t.print(line(copied ? 'Copied the link to your clipboard: ' : 'Here is the link: ', link(url, url)));
  },
});
register({
  name: 'plain',
  group: 'Links',
  summary: 'Open the plain, printable version',
  usage: 'plain',
  examples: ['plain'],
  run(_, t) {
    t.print(line('Opening the plain version…'));
    location.assign('plain.html');
  },
});

register({
  name: 'ls',
  group: 'Explore',
  summary: 'List files and folders',
  usage: 'ls [folder]',
  examples: ['ls', 'ls experience', 'ls certificates'],
  aliases: ['dir'],
  complete: pathComplete,
  run(args, t) {
    const arg = args.find((a) => !a.startsWith('-')) || '.';
    const found = resolve(t.cwd, arg);
    if (!found) return notFound('ls', arg, t, allPaths());
    if (found.node.type === 'file') return t.print(line(found.node.name));
    const base = arg === '.' ? '' : `${arg.replace(/\/$/, '')}/`;
    t.print(h('ul', { class: 'ls' }, found.node.children.map((c) => h('li', null,
      c.type === 'dir'
        ? cmd(`${c.name}/`, `ls ${base}${c.name}`, 'dir')
        : cmd(c.name, `cat ${base}${c.name}`, 'file'),
    ))));
  },
});
register({
  name: 'cd',
  group: 'Explore',
  summary: 'Change folder',
  usage: 'cd [folder]',
  examples: ['cd experience', 'cd ..', 'cd ~'],
  complete: (args, t) => pathComplete(args, t).filter((p) => p.endsWith('/')),
  run(args, t) {
    const arg = args[0] || '~';
    if (arg === '/' || (arg.startsWith('/') && !arg.startsWith('/home/akbarshoh'))) {
      return t.print(warn(`cd: ${arg}: Permission denied`), hint('Guests can explore everything under ', cmd('~', 'cd ~'), '.'));
    }
    const found = resolve(t.cwd, arg);
    if (!found) return notFound('cd', arg, t, allPaths().filter((p) => resolve([], p)?.node.type === 'dir'));
    if (found.node.type !== 'dir') return t.print(warn(`cd: ${arg}: Not a directory`), hint('Read it with ', cmd(`cat ${arg}`), '.'));
    t.setCwd(found.parts);
  },
});
register({
  name: 'pwd',
  group: 'Explore',
  summary: 'Show the current folder',
  usage: 'pwd',
  examples: ['pwd'],
  run(_, t) {
    t.print(line(absolute(t.cwd)));
  },
});
register({
  name: 'tree',
  group: 'Explore',
  summary: 'Show every file at once',
  usage: 'tree [folder]',
  examples: ['tree', 'tree experience'],
  complete: (args, t) => pathComplete(args, t).filter((p) => p.endsWith('/')),
  run(args, t) {
    const arg = args[0] || '.';
    const found = resolve(t.cwd, arg);
    if (!found || found.node.type !== 'dir') return notFound('tree', arg, t, allPaths());
    const rows = [line(acc(display(found.parts)))];
    let widest = 0;
    let dirs = 0;
    let files = 0;
    const draw = (node, path, pad) => {
      node.children.forEach((c, i) => {
        const last = i === node.children.length - 1;
        const p = [...path, c.name].join('/');
        const rel = found.parts.length ? p.split('/').slice(found.parts.length).join('/') : p;
        const target = arg === '.' ? rel : `${arg.replace(/\/$/, '')}/${rel}`;
        widest = Math.max(widest, pad.length + 5 + c.name.length);
        rows.push(h('p', { class: 'ln tree' }, dim(pad + (last ? '└── ' : '├── ')),
          c.type === 'dir' ? cmd(`${c.name}/`, `ls ${target}`, 'dir') : cmd(c.name, `cat ${target}`, 'file')));
        if (c.type === 'dir') {
          dirs++;
          draw(c, [...path, c.name], pad + (last ? '    ' : '│   '));
        } else files++;
      });
    };
    draw(found.node, found.parts, '');
    rows.push(line(dim(`${dirs} directories, ${files} files`)));
    t.print(h('div', { class: 'fit', vars: { cols: widest } }, rows));
  },
});
register({
  name: 'cat',
  group: 'Explore',
  summary: 'Show a file',
  usage: 'cat <file>',
  examples: ['cat about.txt', 'cat experience/irn-ivoc.txt'],
  complete: pathComplete,
  run(args, t) {
    if (!args.length) return t.print(warn('cat: missing file name'), hint('Try ', cmd('cat about.txt'), ' or ', cmd('ls'), '.'));
    for (const arg of args) {
      const found = pathTarget(arg, t);
      if (!found) {
        notFound('cat', arg, t, allPaths());
        continue;
      }
      if (found.node.type === 'dir') {
        t.print(warn(`cat: ${arg}: Is a directory`), hint('List it with ', cmd(`ls ${arg}`), '.'));
        continue;
      }
      showRef(found.node.ref, t);
    }
  },
});
register({
  name: 'open',
  group: 'Explore',
  summary: 'Open an entry, image, link or game',
  usage: 'open <name or path>',
  examples: ['open bosimov-research-challenge', 'open ielts', 'open cv'],
  complete: (args, t) => {
    const partial = args[args.length - 1] || '';
    return [...new Set([...entries.keys(), ...completePath(t.cwd, partial)])].filter((x) => x.startsWith(partial));
  },
  run(args, t) {
    if (!args.length) {
      t.print(line('Open any of these:'));
      const groups = {};
      for (const e of entries.values()) (groups[e.kind] ||= []).push(e.id);
      return t.print(kv(Object.entries(groups).map(([k, ids]) => [k, ids.map((id) => [cmd(id, `open ${id}`), ' '])])));
    }
    const arg = args[0];
    const found = pathTarget(arg, t);
    if (!found) {
      const s = suggest(arg, [...entries.keys()]);
      t.print(warn(`open: ${arg}: not found`));
      if (s) t.print(line('Did you mean ', cmd(`open ${s}`), '?'));
      return;
    }
    if (found.node.type === 'dir') return lookup('ls').run([arg], t);
    showRef(found.node.ref, t, { open: true });
  },
});
register({
  name: 'search',
  group: 'Explore',
  summary: 'Search everything (shortcut: /)',
  usage: 'search <words>',
  examples: ['search olympiad', 'search python', 'search 2026'],
  aliases: ['find', 'grep'],
  run(args, t) {
    const terms = args.join(' ').toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return t.print(warn('search: what should I look for?'), hint('Example: ', cmd('search olympiad'), '. Press / to start a search.'));
    searchIndex ||= buildIndex();
    const hits = searchIndex
      .map((it) => ({ it, score: terms.every((x) => it.text.includes(x)) ? terms.reduce((s, x) => s + (it.title.toLowerCase().includes(x) ? 3 : 1), 0) : 0 }))
      .filter((x) => x.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    if (!hits.length) {
      const words = [...new Set(searchIndex.flatMap((it) => it.text.split(/[^a-z0-9+#]+/)).filter((w) => w.length > 2))];
      const s = suggest(terms[0], words);
      t.print(warn(`No results for "${terms.join(' ')}".`));
      if (s) t.print(line('Did you mean ', cmd(`search ${s}`), '?'));
      return;
    }
    t.print(
      line(dim(`${hits.length} result${hits.length > 1 ? 's' : ''} for "${terms.join(' ')}"`)),
      h('ul', { class: 'rows results' }, hits.map(({ it }) => h('li', null,
        h('span', { class: 'tag' }, it.section), ' ', cmd(it.title, it.run, 'title'),
        h('span', { class: 'snip' }, snippet(it.raw, terms)),
      ))),
    );
  },
});

register({
  name: 'games',
  group: 'Fun',
  summary: 'Typing test and 3x3 scramble timer',
  usage: 'games [typing|scramble]',
  examples: ['games', 'games typing', 'games scramble'],
  aliases: ['play'],
  complete: (args) => C.games.map((g) => g.id).filter((id) => id.startsWith(args[0] || '')),
  run(args, t) {
    const id = args[0];
    if (!id) {
      return t.print(
        heading('Games'),
        h('ul', { class: 'rows' }, C.games.map((g) => h('li', null, cmd(g.id, `games ${g.id}`, 'title'), h('span', { class: 'dim' }, ` ${g.summary}`)))),
        hint('Esc or Ctrl+C quits a game.'),
      );
    }
    if (!gameLoaders[id]) {
      const s = suggest(id, Object.keys(gameLoaders));
      return t.print(warn(`games: no game called ${id}`), s ? line('Did you mean ', cmd(`games ${s}`), '?') : null);
    }
    return startGame(id, t);
  },
});
for (const g of C.games) {
  register({ name: g.id, group: 'Fun', hidden: true, summary: g.title, usage: g.id, run: (_, t) => startGame(g.id, t) });
}
register({
  name: 'theme',
  group: 'Fun',
  summary: 'Change the accent colour',
  usage: `theme [${THEMES.join('|')}]`,
  examples: ['theme', 'theme amber', 'theme green'],
  complete: (args) => THEMES.filter((x) => x.startsWith(args[0] || '')),
  run(args, t) {
    const current = document.documentElement.dataset.accent || 'green';
    const name = args[0];
    if (!name) {
      return t.print(
        line('Accent colours (the background always stays dark):'),
        h('ul', { class: 'ls themes' }, THEMES.map((x) => h('li', null,
          cmd([h('span', { class: `sw sw-${x}`, 'aria-hidden': 'true' }), x, x === current ? ' (current)' : ''], `theme ${x}`)))),
      );
    }
    if (!THEMES.includes(name)) {
      const s = suggest(name, THEMES);
      return t.print(warn(`theme: unknown colour ${name}`), s ? line('Did you mean ', cmd(`theme ${s}`), '?') : null);
    }
    applyTheme(name);
    store.set('accent', name);
    t.print(line('Accent set to ', acc(name), '.'));
  },
});

register({
  name: 'help',
  group: 'Terminal',
  summary: 'List commands, or explain one',
  usage: 'help [command]',
  examples: ['help', 'help open', 'help search'],
  aliases: ['?', 'man'],
  complete: (args) => names().filter((n) => n.startsWith(args[0] || '')),
  run(args, t) {
    if (!args.length) return t.print(helpIndex());
    const def = lookup(args[0]);
    if (!def) {
      const s = suggest(args[0], names());
      return t.print(warn(`help: no command called ${args[0]}`), s ? line('Did you mean ', cmd(`help ${s}`), '?') : null);
    }
    t.print(helpFor(def));
  },
});
register({
  name: 'clear',
  group: 'Terminal',
  summary: 'Clear the screen (Ctrl+L)',
  usage: 'clear',
  examples: ['clear'],
  aliases: ['cls'],
  run(_, t) {
    t.clear();
  },
});
register({
  name: 'history',
  group: 'Terminal',
  summary: 'Commands you have typed',
  usage: 'history [-c]',
  examples: ['history', 'history -c'],
  run(args, t) {
    if (args[0] === '-c') {
      t.history.length = 0;
      store.set('history', []);
      return t.print(line('History cleared.'));
    }
    if (!t.history.length) return t.print(line(dim('No history yet.')));
    t.print(h('ol', { class: 'hist' }, t.history.map((c) => h('li', null, cmd(c)))));
  },
});
register({
  name: 'date',
  group: 'Terminal',
  summary: 'Current date and time',
  usage: 'date',
  examples: ['date'],
  run(_, t) {
    const d = new Date();
    const time = d.toLocaleTimeString('en-GB', { hour12: false, timeZoneName: 'short' });
    t.print(line(`${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} ${time}`));
  },
});
register({
  name: 'echo',
  group: 'Terminal',
  summary: 'Print text back',
  usage: 'echo <text>',
  examples: ['echo hello world'],
  run(args, t) {
    t.print(line(args.join(' ')));
  },
});

/* ---------- hidden easter eggs (loaded on first use) ---------- */

const egg = (name, summary, usage) =>
  register({
    name,
    group: 'Fun',
    hidden: true,
    summary,
    usage: usage || name,
    run: (args, t) => import('./eggs.js').then((m) => m[name](args, t)),
  });
egg('sudo', 'Try to become root', 'sudo <command>');
egg('rm', 'Remove files (read-only here)', 'rm -rf /');
egg('cowsay', 'A cow says something', 'cowsay [text]');
egg('matrix', 'Follow the white rabbit');
egg('hack', 'Hack the mainframe');
egg('coffee', 'Take a break');

export { sections, showRef };
