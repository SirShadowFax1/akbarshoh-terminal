// Full-size image viewer, loaded the first time an image is opened.
// Native <dialog>: focus stays inside, Esc closes, focus returns to the
// thumbnail that opened it.

import { h } from './util.js';

let dlg;
let img;
let title;
let count;
let prev;
let next;
let zoom;
let images = [];
let index = 0;
let trigger = null;

function toggleZoom() {
  const on = dlg.classList.toggle('zoom');
  zoom.setAttribute('aria-pressed', String(on));
  zoom.textContent = on ? 'Fit' : 'Zoom';
}

function build() {
  img = h('img', { alt: '', decoding: 'async' });
  title = h('p', { id: 'viewer-title' });
  count = h('span', { class: 'dim' });
  prev = h('button', { type: 'button', 'aria-label': 'Previous image', onclick: () => show(index - 1) }, '←');
  next = h('button', { type: 'button', 'aria-label': 'Next image', onclick: () => show(index + 1) }, '→');
  zoom = h('button', { type: 'button', 'aria-pressed': 'false', onclick: toggleZoom }, 'Zoom');
  const close = h('button', { type: 'button', onclick: () => dlg.close() }, 'Close');
  const stage = h('div', { class: 'viewer-stage' }, img);
  dlg = h('dialog', { class: 'viewer', 'aria-labelledby': 'viewer-title' },
    h('div', { class: 'viewer-bar' }, title, count, prev, next, zoom, close),
    stage,
  );
  img.addEventListener('click', toggleZoom);
  stage.addEventListener('click', (e) => {
    if (e.target === stage) dlg.close();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'z' || e.key === '+' || e.key === '-') toggleZoom();
  });
  dlg.addEventListener('close', () => {
    dlg.classList.remove('zoom');
    img.removeAttribute('src');
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
  document.body.append(dlg);
}

function show(i) {
  index = (i + images.length) % images.length;
  const im = images[index];
  dlg.classList.remove('zoom');
  zoom.setAttribute('aria-pressed', 'false');
  zoom.textContent = 'Zoom';
  img.width = im.width;
  img.height = im.height;
  img.alt = im.alt;
  img.src = im.src;
  title.textContent = im.title || im.alt;
  count.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : '';
  prev.hidden = next.hidden = images.length < 2;
  const neighbour = images[(index + 1) % images.length];
  if (neighbour !== im) new Image().src = neighbour.src;
}

export function open(list, i = 0, from = null) {
  if (!dlg) build();
  images = list;
  trigger = from;
  show(i);
  if (!dlg.open) dlg.showModal();
}
