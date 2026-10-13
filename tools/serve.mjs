#!/usr/bin/env node
// Local static server for public/, close to how Cloudflare Pages and Netlify
// serve it: _headers rules, brotli/gzip, extensionless URLs (/plain), and
// 404.html for missing pages.
//
//   node tools/serve.mjs [port]     (default 8080)

import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const PUB = fileURLToPath(new URL('../public/', import.meta.url));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
};
const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json|xml)|image\/svg)/;

function headerRules() {
  const rules = [];
  let current = null;
  const text = existsSync(join(PUB, '_headers')) ? readFileSync(join(PUB, '_headers'), 'utf8') : '';
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      const pattern = raw.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      current = { re: new RegExp(`^${pattern}$`), headers: [] };
      rules.push(current);
    } else if (current) {
      const i = raw.indexOf(':');
      current.headers.push([raw.slice(0, i).trim(), raw.slice(i + 1).trim()]);
    }
  }
  return rules;
}

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  if (clean.startsWith('..') || clean.split(/[/\\]/).some((s) => s.startsWith('.') && s.length > 1 && s !== '.well-known')) return null;
  const base = join(PUB, clean);
  const candidates = pathname.endsWith('/') ? [join(base, 'index.html')] : [base, `${base}.html`, join(base, 'index.html')];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/_headers') url.pathname = '/__hidden__';
  let file = resolveFile(url.pathname);
  let status = 200;
  if (!file) {
    file = join(PUB, '404.html');
    status = 404;
  }
  const type = TYPES[extname(file)] || 'application/octet-stream';
  let body = readFileSync(file);
  const headers = { 'Content-Type': type, 'Cache-Control': 'public, max-age=0, must-revalidate', Vary: 'Accept-Encoding' };
  const merged = {};
  for (const rule of headerRules()) {
    if (!rule.re.test(url.pathname)) continue;
    for (const [k, v] of rule.headers) merged[k] = merged[k] ? `${merged[k]}, ${v}` : v;
  }
  Object.assign(headers, merged);
  const accept = req.headers['accept-encoding'] || '';
  if (COMPRESSIBLE.test(type) && body.length > 512) {
    if (/\bbr\b/.test(accept)) {
      body = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
      headers['Content-Encoding'] = 'br';
    } else if (/\bgzip\b/.test(accept)) {
      body = gzipSync(body, { level: 9 });
      headers['Content-Encoding'] = 'gzip';
    }
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}).listen(PORT, () => console.log(`Serving public/ at http://localhost:${PORT}/`));
