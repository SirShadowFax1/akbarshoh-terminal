// The fake filesystem and the entry index, both derived from content.js.
// Folders only exist for sections that have entries.

import * as C from './content.js';

export const HOME = '/home/akbarshoh';

// Every addressable thing on the site, by id: what `open <id>` resolves.
export const entries = new Map();
const add = (id, kind, item, extra) => entries.set(id, { id, kind, item, ...extra });

for (const e of C.education) add(e.id, 'education', e);
for (const e of C.experience) add(e.id, 'experience', e);
for (const e of C.achievements) add(e.id, 'achievement', e);
for (const e of C.projects) add(e.id, 'project', e);
for (const e of C.certificates) add(e.id, 'cert', e);
for (const g of C.games) add(g.id, 'game', g);
for (const l of C.profile.links) add(l.id, 'link', l);
add('email', 'email', { title: 'Email', address: C.profile.email });
add('cv', 'cv', C.profile.cv);
add('photo', 'photo', C.profile.photo);

const file = (name, ref) => ({ name, type: 'file', ref });
const dir = (name, children) => ({ name, type: 'dir', children });

function buildTree() {
  const kids = [
    file('about.txt', 'about'),
    file('education.txt', 'education'),
    file('skills.txt', 'skills'),
    file('interests.txt', 'interests'),
    file('contact.txt', 'contact'),
  ];
  const section = (name, items, ext = '.txt') => {
    if (items.length) kids.push(dir(name, items.map((i) => file(i.id + ext, i.id))));
  };
  section('experience', C.experience);
  section('achievements', C.achievements);
  section('projects', C.projects);
  section('certificates', C.certificates, '.webp');
  kids.push(dir('pictures', [file('akbarshoh.webp', 'photo')]));
  kids.push(dir('documents', [file(C.profile.cv.name, 'cv')]));
  section('games', C.games, '');
  return dir('~', kids);
}

export const root = buildTree();

// Resolves a path (relative to `cwd`, an array of folder names) to
// { node, parts } or null. Supports ~, /home/akbarshoh, . and ..
export function resolve(cwd, path = '') {
  let parts = [...cwd];
  let p = path.trim();
  if (p === '~' || p.startsWith('~/')) {
    parts = [];
    p = p.slice(1);
  } else if (p === HOME || p.startsWith(HOME + '/')) {
    parts = [];
    p = p.slice(HOME.length);
  } else if (p === '/' || p.startsWith('/')) {
    return p === '/' ? null : resolveAbsoluteOutsideHome();
  }
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  let node = root;
  for (const seg of parts) {
    if (node.type !== 'dir') return null;
    node = node.children.find((c) => c.name === seg);
    if (!node) return null;
  }
  return { node, parts };
}

function resolveAbsoluteOutsideHome() {
  return null;
}

export const display = (parts) => (parts.length ? `~/${parts.join('/')}` : '~');
export const absolute = (parts) => (parts.length ? `${HOME}/${parts.join('/')}` : HOME);

// Tab-completion candidates for a partial path. Directories end with '/'.
export function completePath(cwd, partial) {
  const slash = partial.lastIndexOf('/');
  const base = slash >= 0 ? partial.slice(0, slash + 1) : '';
  const stem = slash >= 0 ? partial.slice(slash + 1) : partial;
  const target = base ? resolve(cwd, base) : { node: resolve(cwd, '.').node };
  if (!target || target.node.type !== 'dir') return [];
  return target.node.children
    .filter((c) => c.name.startsWith(stem))
    .map((c) => base + c.name + (c.type === 'dir' ? '/' : ''));
}

export function walk(node, visit, prefix = []) {
  for (const child of node.children || []) {
    visit(child, prefix);
    if (child.type === 'dir') walk(child, visit, [...prefix, child.name]);
  }
}
