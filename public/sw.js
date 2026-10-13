// Service worker: makes repeat visits instant and keeps the site usable
// offline. VERSION and PRECACHE are written by tools/sync.mjs.

const VERSION = '37bb9364d42a';
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
  'js/commands.js?v=211a8e15bc',
  'js/content.js?v=03996f5012',
  'js/eggs.js?v=b3ab918648',
  'js/fs.js?v=5b06070430',
  'js/games/games.css?v=dbf5fdaca2',
  'js/games/scramble.js?v=d535f75165',
  'js/games/typing.js?v=090e77739c',
  'js/main.js?v=f73fd54e28',
  'js/registry.js?v=38d60a630a',
  'js/util.js?v=937ddc6082',
  'js/viewer.js?v=883706d253',
  'manifest.webmanifest',
  'plain.html'
];
const CACHE = `akbarshoh-${VERSION}`;

// Scripts and styles have content-hash URLs (see the import map in
// index.html), so everything except pages can be served cache-first.
// Pages go to the network first and fall back to the cached copy offline.

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

// Some hosts redirect page.html to /page. A redirected response cannot be
// served for a navigation, so each file is stored as a fresh copy, and one
// failed file does not stop the others from being cached.
async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    PRECACHE.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (!res.ok && url !== '404.html') return;
        const copy = res.redirected
          ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers })
          : res;
        await cache.put(url, copy);
      } catch {
        // Offline during install: this file is cached on its first normal visit.
      }
    }),
  );
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('akbarshoh-') && k !== CACHE).map((k) => caches.delete(k)))),
      self.registration.navigationPreload?.enable(),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(req.mode === 'navigate' ? page(event) : cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && !res.redirected && res.type === 'basic') cache.put(req, res.clone());
  return res;
}

async function page(event) {
  try {
    return (await event.preloadResponse) || (await fetch(event.request));
  } catch {
    const cache = await caches.open(CACHE);
    for (const key of pageKeys(event.request.url)) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
    }
    return (await cache.match('404.html')) || Response.error();
  }
}

function pageKeys(href) {
  const url = new URL(href);
  url.search = '';
  if (url.pathname.endsWith('/')) return [new URL('index.html', url).href, url.href];
  if (!/\.[a-z0-9]+$/i.test(url.pathname)) return [url.href, `${url.href}.html`];
  return [url.href];
}
