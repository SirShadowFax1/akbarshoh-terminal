#!/usr/bin/env node
// Changes the site's public address (canonical links, social previews,
// sitemap, robots.txt, 404 home link) in one step.
//
//   node tools/set-site-url.mjs https://akbarshoh.netlify.app/

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = process.argv[2];
let url;
try {
  url = new URL(arg);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
} catch {
  console.error('Usage: node tools/set-site-url.mjs https://your-site-address/');
  process.exit(1);
}
const href = url.href.endsWith('/') ? url.href : `${url.href}/`;

const file = fileURLToPath(new URL('../public/js/content.js', import.meta.url));
const src = readFileSync(file, 'utf8');
const next = src.replace(/(export const site = \{\s*url: )'[^']*'/, `$1'${href}'`);
if (next === src && !src.includes(`url: '${href}'`)) {
  console.error('Could not find site.url in public/js/content.js');
  process.exit(1);
}
writeFileSync(file, next);
console.log(`Site address set to ${href}`);
execFileSync(process.execPath, [fileURLToPath(new URL('./sync.mjs', import.meta.url))], { stdio: 'inherit' });
