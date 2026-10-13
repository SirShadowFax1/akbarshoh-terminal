#!/usr/bin/env node
// Regenerates everything that is derived from public/js/content.js:
//   index.html  (marked blocks: head meta, boot lines, chips, <noscript>)
//   plain.html, 404.html, sitemap.xml, robots.txt, manifest.webmanifest
//   sw.js       (cache version and precache list)
//   _headers    (security headers, CSP hashes of inline scripts and styles)
//
//   node tools/sync.mjs          write the files
//   node tools/sync.mjs --check  exit 1 if any file is out of date

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUB = join(ROOT, 'public');
const CHECK = process.argv.includes('--check');

const C = await import(`${pathToFileURL(join(PUB, 'js', 'content.js')).href}?t=${Date.now()}`);
const { site, profile } = C;
const SITE = site.url.endsWith('/') ? site.url : `${site.url}/`;

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const prettyUrl = (url) => url.replace(/^https?:\/\/(www\.)?/, '');
const sha256 = (s) => createHash('sha256').update(s).digest('base64');

/* ---------- shared plain-content markup ---------- */

function media(entry) {
  const m = entry.media;
  if (!m) return '';
  let out = '';
  if (m.images?.length) {
    out += `<div class="gallery">${m.images
      .map(
        (im) =>
          `<a href="${esc(im.src)}"><img src="${esc(im.thumb || im.src)}" width="${im.thumbWidth || im.width}" height="${im.thumbHeight || im.height}" alt="${esc(im.alt)}" loading="lazy" decoding="async"></a>`,
      )
      .join('')}</div>`;
  }
  if (m.video?.youtube) {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(m.video.youtube)}`;
    out += `<p><a href="${url}" rel="noopener">Watch the video on YouTube: ${esc(m.video.title || entry.title)}</a></p>`;
  } else if (m.video?.src) {
    out += `<video controls preload="none" src="${esc(m.video.src)}"${m.video.poster ? ` poster="${esc(m.video.poster)}"` : ''}${m.video.width ? ` width="${m.video.width}" height="${m.video.height}"` : ''}></video>`;
  }
  return out;
}

const meta = (...parts) => {
  const text = parts.filter(Boolean).join(' · ');
  return text ? `<p class="meta">${esc(text)}</p>` : '';
};
const list = (items) => (items?.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');
const dl = (rows) => `<dl>${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

function entryArticle(e, h) {
  const links = e.links?.length
    ? `<p>${e.links.map((l) => `<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`).join(' · ')}</p>`
    : '';
  return `<article id="${esc(e.id)}"><${h}>${esc(e.title)}</${h}>${meta(e.role, e.location, e.date)}${e.summary ? `<p>${esc(e.summary)}</p>` : ''}${list(e.points)}${links}${media(e)}</article>`;
}

function sections() {
  const s = [];
  s.push(['about', 'About me', C.about.map((p) => `<p>${esc(p)}</p>`).join('')]);
  s.push(['education', 'Education', C.education.map((e) => entryArticle(e, 'h3')).join('')]);
  s.push([
    'test-scores',
    'Test scores',
    C.certificates
      .map(
        (c) =>
          `<article id="${c.id}"><h3>${esc(c.title)}</h3>${meta(c.date)}${dl(c.scores.map(([k, v]) => [k, esc(v)]))}<figure><a href="${c.image.full}"><img src="${c.image.thumb}" width="${c.image.thumbWidth}" height="${c.image.thumbHeight}" alt="${esc(c.image.alt)}" loading="lazy" decoding="async"></a><figcaption>Score report, personal identifiers blacked out. Select it to view full size.</figcaption></figure></article>`,
      )
      .join(''),
  ]);
  if (C.experience.length) s.push(['experience', 'Leadership and activities', C.experience.map((e) => entryArticle(e, 'h3')).join('')]);
  if (C.achievements.length) {
    s.push([
      'achievements',
      'Achievements',
      `<ul>${C.achievements
        .map((a) => `<li><strong>${esc(a.title)}</strong>${a.detail || a.date ? ` <span class="meta">${esc([a.detail, a.date].filter(Boolean).join(' · '))}</span>` : ''}${media(a)}</li>`)
        .join('')}</ul>`,
    ]);
  }
  if (C.projects.length) s.push(['projects', 'Projects', C.projects.map((p) => entryArticle(p, 'h3')).join('')]);
  s.push([
    'skills',
    'Skills',
    dl([
      ...C.skills.map((g) => [g.group, esc(g.items.join(', '))]),
      ['Languages', esc(C.languages.map((l) => `${l.name} (${l.level})`).join(', '))],
    ]),
  ]);
  s.push(['interests', 'Interests', dl(C.interests.map((i) => [i.title, esc(i.detail)]))]);
  s.push([
    'contact',
    'Contact',
    `<ul class="contact"><li>Email: <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></li>${profile.links
      .map((l) => `<li>${esc(l.label)}: <a href="${esc(l.url)}" rel="noopener">${esc(prettyUrl(l.url))}</a></li>`)
      .join('')}<li>CV: <a href="${esc(profile.cv.file)}" download>${esc(profile.cv.name)}</a> (PDF, ${profile.cv.pages} pages, ${esc(profile.cv.size)})</li><li>Based in ${esc(profile.location)}</li></ul>`,
  ]);
  return s;
}

const sectionHtml = (list) => list.map(([id, title, body]) => `<section id="${id}" aria-labelledby="${id}-h"><h2 id="${id}-h">${esc(title)}</h2>${body}</section>`).join('\n');

const photoTag = (size) =>
  `<picture><source srcset="${profile.photo.avif}" type="image/avif"><img class="me" src="${profile.photo.webp}" width="${size}" height="${size}" alt="${esc(profile.photo.alt)}"></picture>`;

/* ---------- index.html blocks ---------- */

function jsonLd() {
  const [locality, region, country] = profile.location.split(',').map((x) => x.trim());
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: SITE,
    image: `${SITE}${profile.photo.webp}`,
    email: `mailto:${profile.email}`,
    description: profile.tagline,
    address: { '@type': 'PostalAddress', addressLocality: locality, addressRegion: region, addressCountry: country },
    affiliation: { '@type': 'EducationalOrganization', name: C.education[0]?.title.replace(/\s*\(.*\)$/, '') },
    knowsLanguage: C.languages.map((l) => l.name),
    sameAs: profile.links.map((l) => l.url),
  };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function headBlock({ title, description, path }) {
  const url = SITE + path;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="profile">`,
    `<meta property="og:site_name" content="${esc(profile.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${SITE}og.png">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(`${profile.name}: ${profile.tagline}`)}">`,
    `<meta property="profile:first_name" content="${esc(profile.firstName)}">`,
    `<meta property="profile:last_name" content="${esc(profile.name.split(' ').slice(1).join(' '))}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${SITE}og.png">`,
    `<meta name="twitter:image:alt" content="${esc(`${profile.name}: ${profile.tagline}`)}">`,
    jsonLd(),
  ].join('\n');
}

function bootBlock() {
  const ok = (text, n) => `<p class="ln l b${n}"><span class="ok">[  OK  ]</span> ${esc(text)}</p>`;
  const stories = ['experience', 'achievements', 'projects'].filter((k) => C[k].length);
  const join = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}` : a[0]);
  return [
    `<p class="ln l b1">Booting akbarshoh@portfolio…</p>`,
    ok('Mounted /home/akbarshoh', 2),
    ok('Loaded about, education and skills', 3),
    ok(`Loaded ${join(stories)}`, 4),
    ok(`Loaded certificates: ${C.certificates.map((c) => c.title.split(' ')[0]).join(', ')}`, 5),
    ok(`Started games: ${C.games.map((g) => g.id).join(', ')}`, 6),
    ok('Started terminal session for guest', 7),
  ].join('\n');
}

function chipsBlock() {
  const chips = ['about', 'experience', 'achievements', 'projects', 'certs', 'skills', 'contact', 'cv', 'games', 'help'].filter(
    (c) => !['experience', 'achievements', 'projects'].includes(c) || C[c].length,
  );
  return chips.map((c) => `<button type="button" class="chip" data-cmd="${c}">${c}</button>`).join('\n');
}

const NOSCRIPT_CSS =
  '.prompt,.chips,#cmd-help{display:none}.plain-fallback{max-width:76ch;padding-bottom:24px}.plain-fallback h2{color:var(--acc);font-size:1em;margin:24px 0 8px}.plain-fallback h3{font-size:1em;margin:12px 0 2px}.plain-fallback .meta{color:var(--dim);margin:0}.plain-fallback a{color:var(--acc)}.plain-fallback img{max-width:100%;height:auto}.plain-fallback dl div{display:flex;gap:2ch}.plain-fallback dt{color:var(--dim)}.plain-fallback dd{margin:0}';

function noscriptBlock() {
  return `<noscript><style>${NOSCRIPT_CSS}</style><div class="plain-fallback"><p>JavaScript is off, so here is everything as plain text. You can also open the <a href="plain.html">plain version</a>.</p>${photoTag(140)}<p>${esc(profile.tagline)}</p>\n${sectionHtml(sections())}</div></noscript>`;
}

function replaceBlock(html, name, body) {
  const re = new RegExp(`(<!--sync:${name}-->)[\\s\\S]*?(<!--/sync:${name}-->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the sync:${name} markers`);
  return html.replace(re, `$1\n${body}\n$2`);
}

/* ---------- standalone pages ---------- */

const PLAIN_CSS = `:root{color-scheme:dark;--bg:#0a0d0b;--fg:#d6dcd4;--dim:#8b968d;--acc:#4fd88a;--line:#222b25}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 48px}
a{color:var(--acc);text-underline-offset:3px}
header{display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.me{display:block;border-radius:12px;border:1px solid var(--line)}
h1{margin:0;font-size:1.8rem;line-height:1.2}
h2{font-size:1.15rem;margin:36px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--line);color:var(--acc)}
h3{font-size:1rem;margin:18px 0 2px}
p{margin:6px 0}
.meta{color:var(--dim);margin:0}
.tagline{margin:4px 0 0}
nav ul{display:flex;flex-wrap:wrap;gap:6px 16px;padding:0;margin:20px 0 0;list-style:none}
nav a{display:inline-block;padding:4px 0}
.back{margin-top:16px}
ul{padding-left:1.2em}
dl{margin:8px 0}dl div{display:grid;grid-template-columns:minmax(9rem,max-content) 1fr;gap:12px}dt{color:var(--dim)}dd{margin:0}
figure{margin:12px 0}figure img{display:block;max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line);background:#fff}figcaption{color:var(--dim);font-size:.9rem;margin-top:4px}
.gallery{display:flex;flex-wrap:wrap;gap:8px}.gallery img{max-width:240px;height:auto;border-radius:8px}
video{max-width:100%;height:auto}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--dim)}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
@media (max-width:520px){dl div{grid-template-columns:1fr;gap:0}dd{margin-bottom:8px}}
@media print{:root{--bg:#fff;--fg:#000;--dim:#444;--acc:#000;--line:#ccc}nav,.back,footer{display:none}a{text-decoration:none}}`;

function plainPage() {
  const list = sections();
  const title = `${profile.name} · Portfolio (plain version)`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${headBlock({ title, description: site.description, path: 'plain' })}
<meta name="theme-color" content="#0a0d0b">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
<style>${PLAIN_CSS}</style>
</head>
<body>
<div class="wrap">
<header>
${photoTag(120)}
<div>
<h1>${esc(profile.name)}</h1>
<p class="tagline">${esc(profile.tagline)}</p>
<p class="meta">${esc(profile.location)} · <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></p>
</div>
</header>
<p class="back"><a href="./">Open the interactive terminal version</a></p>
<nav aria-label="Sections"><ul>${list.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></nav>
<main>
${sectionHtml(list)}
</main>
<footer><p>This is the plain version of my portfolio. <a href="./">Back to the terminal</a>.</p></footer>
</div>
</body>
</html>
`;
}

function notFoundPage() {
  const css = `:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#060807;color:#d6dcd4;font:15px/1.6 ui-monospace,"JetBrains Mono",Menlo,Consolas,"DejaVu Sans Mono",monospace}
.win{width:min(720px,calc(100vw - 32px));background:#0a0d0b;border:1px solid #222b25;border-radius:12px;overflow:hidden}
.bar{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;background:#111613;border-bottom:1px solid #222b25;color:#8b968d;font-size:13px}
.bar i{width:12px;height:12px;border-radius:50%;background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}.bar span{margin-left:auto;margin-right:auto}
main{padding:20px}p{margin:0 0 6px;white-space:pre-wrap;overflow-wrap:anywhere}h1{font-size:1em;margin:0 0 6px;color:#f2b45a}.ps1{color:#4fd88a}.dim{color:#8b968d}a{color:#4fd88a}
:focus-visible{outline:2px solid #4fd88a;outline-offset:2px}`;
  const script = `(function(){var p=document.getElementById('path');p.textContent=decodeURIComponent(location.pathname);var h=document.getElementById('home');if(location.origin!==new URL(h.href).origin)h.href='/'})()`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404: command not found · ${esc(profile.name)}</title>
<meta name="description" content="This page does not exist. Go back to the portfolio of ${esc(profile.name)}.">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0a0d0b">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#0a0d0b"/><path d="M8 10l7 6-7 6" fill="none" stroke="#4fd88a" stroke-width="3"/><path d="M17 23h8" stroke="#4fd88a" stroke-width="3"/></svg>')}">
<style>${css}</style>
</head>
<body>
<div class="win">
<div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>akbarshoh@portfolio: ~</span></div>
<main>
<p><span class="ps1">guest@akbarshoh:~$</span> cd <span id="path">this-page</span></p>
<h1>404: command not found</h1>
<p class="dim">This page does not exist. It may have moved, or the link has a typo.</p>
<p><span class="ps1">guest@akbarshoh:~$</span> <a id="home" href="${SITE}">cd ~</a> <span class="dim">(back to the portfolio)</span></p>
</main>
</div>
<script>${script}</script>
</body>
</html>
`;
}

function manifest() {
  return `${JSON.stringify(
    {
      name: `${profile.name} · Terminal portfolio`,
      short_name: profile.firstName,
      description: site.description,
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#0a0d0b',
      theme_color: '#0a0d0b',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  )}\n`;
}

/* ---------- headers, sitemap, service worker ---------- */

function inlineHashes(...pages) {
  const scripts = new Set();
  const styles = new Set();
  for (const html of pages) {
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[1])) continue;
      scripts.add(`'sha256-${sha256(m[2])}'`);
    }
    for (const m of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) styles.add(`'sha256-${sha256(m[1])}'`);
  }
  return { scripts: [...scripts].join(' '), styles: [...styles].join(' ') };
}

function headersFile(hashes) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${hashes.scripts}`,
    `style-src 'self' ${hashes.styles}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    'frame-src https://www.youtube-nocookie.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
  return `# Cloudflare Pages and Netlify read this file. Generated by tools/sync.mjs.
/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin

/assets/fonts/*
  Cache-Control: public, max-age=31536000, immutable

/assets/certs/*
  Cache-Control: public, max-age=2592000

/assets/photo/*
  Cache-Control: public, max-age=2592000

/assets/media/*
  Cache-Control: public, max-age=2592000

/docs/*
  Cache-Control: public, max-age=86400
`;
}

function sitemap(today) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${SITE}plain</loc><lastmod>${today}</lastmod></url>
</urlset>
`;
}

const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`;

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else out.push(p);
  }
  return out;
}

const PRECACHE_SKIP = /^(sw\.js|_headers|robots\.txt|sitemap\.xml|og\.png|icon-512\.png|icon-maskable-512\.png|docs\/.*|assets\/certs\/(ielts|sat)\.webp|assets\/fonts\/OFL\.txt|assets\/media\/.*)$/;

function serviceWorker(current, outputs) {
  const onDisk = files(PUB).map((p) => relative(PUB, p).split(sep).join('/'));
  const all = [...new Set([...onDisk, ...outputs.keys()])].filter((p) => p !== 'sw.js' && p !== '_headers').sort();
  const hash = createHash('sha256');
  for (const p of all) hash.update(p).update(outputs.get(p) ?? readFileSync(join(PUB, p)));
  const version = hash.digest('hex').slice(0, 12);
  const precache = ['./', ...all.filter((p) => !PRECACHE_SKIP.test(p))];
  return current
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
    .replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = ${JSON.stringify(precache, null, 2).replace(/"/g, "'")};`);
}

/* ---------- run ---------- */

const read = (p) => readFileSync(join(PUB, p), 'utf8');
const outputs = new Map();

let index = read('index.html');
index = replaceBlock(index, 'head', headBlock({ title: site.title, description: site.description, path: '' }));
index = replaceBlock(index, 'boot', bootBlock());
index = replaceBlock(index, 'chips', chipsBlock());
index = replaceBlock(index, 'noscript', noscriptBlock());
outputs.set('index.html', index);
outputs.set('plain.html', plainPage());
outputs.set('404.html', notFoundPage());
outputs.set('manifest.webmanifest', manifest());
outputs.set('robots.txt', robots());

// Keep the sitemap date unless the pages changed, so --check stays stable.
let sitemapOld = '';
try {
  sitemapOld = read('sitemap.xml');
} catch {
  sitemapOld = '';
}
const pagesChanged = ['index.html', 'plain.html'].some((p) => {
  try {
    return read(p) !== outputs.get(p);
  } catch {
    return true;
  }
});
const oldDate = sitemapOld.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
outputs.set('sitemap.xml', sitemap(!pagesChanged && oldDate ? oldDate : new Date().toISOString().slice(0, 10)));
outputs.set('_headers', headersFile(inlineHashes(outputs.get('index.html'), outputs.get('plain.html'), outputs.get('404.html'))));
outputs.set('sw.js', serviceWorker(read('sw.js'), outputs));

let stale = [];
for (const [name, body] of outputs) {
  let current = null;
  try {
    current = read(name);
  } catch {
    current = null;
  }
  if (current === body) continue;
  stale.push(name);
  if (!CHECK) writeFileSync(join(PUB, name), body);
}
if (CHECK && stale.length) {
  console.error(`Out of date: ${stale.join(', ')}. Run: node tools/sync.mjs`);
  process.exit(1);
}
console.log(stale.length ? `${CHECK ? 'Stale' : 'Updated'}: ${stale.join(', ')}` : 'Everything is in sync.');
