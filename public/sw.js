// Service worker: makes repeat visits instant and keeps the site usable
// offline. VERSION and PRECACHE are written by tools/sync.mjs.

const VERSION = 'c1dc3c07c61b';
const PRECACHE = [
  './',
  '404.html',
  'apple-touch-icon.png',
  'assets/certs/ielts-thumb.webp',
  'assets/certs/sat-thumb.webp',
  'assets/fonts/jetbrains-mono-bold.woff2',
  'assets/fonts/jetbrains-mono-regular.woff2',
  'assets/photo/akbarshoh.avif',
  'assets/photo/akbarshoh.webp',
  'favicon.ico',
  'favicon.svg',
  'icon-192.png',
  'index.html',
  'js/commands.js',
  'js/content.js',
  'js/eggs.js',
  'js/fs.js',
  'js/games/games.css',
  'js/games/scramble.js',
  'js/games/typing.js',
  'js/main.js',
  'js/registry.js',
  'js/util.js',
  'js/viewer.js',
  'manifest.webmanifest',
  'plain.html'
];
const CACHE = `akbarshoh-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('akbarshoh-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Fonts, images and documents never change in place: serve from cache first.
const STATIC = /\/assets\/|\.(?:png|ico|svg|webp|avif|woff2|pdf)$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (STATIC.test(url.pathname)) event.respondWith(cacheFirst(req));
  else event.respondWith(staleWhileRevalidate(req, event));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && !res.redirected) cache.put(req, res.clone());
  return res;
}

// Pages and scripts: answer from cache at once, refresh it in the background.
async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE);
  const keys = cacheKeys(req);
  let hit = null;
  for (const key of keys) {
    hit = await cache.match(key, { ignoreSearch: true });
    if (hit) break;
  }
  const network = fetch(req)
    .then((res) => {
      if (res.ok && !res.redirected && res.type === 'basic') cache.put(keys[0], res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(network);
    return hit;
  }
  const res = await network;
  if (res) return res;
  if (req.mode === 'navigate') return (await cache.match('404.html')) || Response.error();
  return Response.error();
}

function cacheKeys(req) {
  if (req.mode !== 'navigate') return [req];
  const url = new URL(req.url);
  url.search = '';
  if (url.pathname.endsWith('/')) return [new URL('index.html', url).href, url.href];
  if (!/\.[a-z0-9]+$/i.test(url.pathname)) return [url.href, `${url.href}.html`];
  return [url.href];
}
