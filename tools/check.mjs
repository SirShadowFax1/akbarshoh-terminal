#!/usr/bin/env node
// Project checks. Exit code 1 if anything fails.
//
//   node tools/check.mjs          everything below
//   node tools/check.mjs --quick  skips the git-history privacy scan (used by the pre-commit hook)
//
// 1. Critical path (index.html + statically imported JS) under 50 KB gzipped.
// 2. No unfinished-work markers anywhere in the repo.
// 3. No metadata (EXIF, XMP, ICC, text chunks) in any published image.
// 4. Private source files are not tracked; private values (listed in the
//    gitignored .private-patterns file) appear nowhere in the repo or its history.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUB = join(ROOT, 'public');
const QUICK = process.argv.includes('--quick');
const BUDGET = 50 * 1024;
let failed = false;
const fail = (msg) => {
  failed = true;
  console.log(`  FAIL ${msg}`);
};
const pass = (msg) => console.log(`  ok   ${msg}`);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const repoFiles = () =>
  git('ls-files', '-co', '--exclude-standard')
    .split('\n')
    .filter(Boolean)
    .filter((f) => existsSync(join(ROOT, f)));

/* 1. critical path */
console.log('Critical path');
{
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?['"](\.[^'"]+)['"]/gm)) walk(join(dirname(file), m[1]));
  };
  walk(join(PUB, 'js', 'main.js'));
  const parts = [join(PUB, 'index.html'), ...seen];
  let total = 0;
  for (const p of parts) {
    const gz = gzipSync(readFileSync(p), { level: 9 }).length;
    total += gz;
    console.log(`       ${(gz / 1024).toFixed(1).padStart(5)} KB  ${p.slice(PUB.length + 1).replace(/\\/g, '/')}`);
  }
  const msg = `${(total / 1024).toFixed(1)} KB gzipped (budget 50 KB)`;
  if (total > BUDGET) fail(msg);
  else pass(msg);
}

/* 2. unfinished-work markers (split so this file never matches itself) */
console.log('Unfinished-work markers');
{
  const words = [['TO', 'DO'], ['FIX', 'ME'], ['place', 'holder'], ['lor', 'em'], ['coming', ' soon'], ['add', ' later'], ['example', '\\.com']];
  const re = new RegExp(words.map((w) => w.join('')).join('|'), 'i');
  const textExt = /\.(html|js|mjs|css|md|txt|json|webmanifest|xml|py|svg|sh)$|^_headers$|(^|\/)\.git(ignore|hooks\/.*)$/;
  let hits = 0;
  for (const f of repoFiles()) {
    if (!textExt.test(f) && !f.endsWith('pre-commit')) continue;
    const lines = readFileSync(join(ROOT, f), 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (re.test(l)) {
        hits++;
        fail(`${f}:${i + 1}`);
      }
    });
  }
  if (!hits) pass('none found');
}

/* 3. image metadata */
console.log('Image metadata');
{
  const problems = [];
  for (const f of repoFiles().filter((x) => x.startsWith('public/'))) {
    const ext = extname(f).toLowerCase();
    const buf = readFileSync(join(ROOT, f));
    if (ext === '.webp') {
      for (let i = 12; i + 8 <= buf.length; ) {
        const id = buf.toString('latin1', i, i + 4);
        const size = buf.readUInt32LE(i + 4);
        if (['EXIF', 'XMP ', 'ICCP'].includes(id)) problems.push(`${f} has a ${id.trim()} chunk`);
        i += 8 + size + (size & 1);
      }
    } else if (ext === '.png') {
      for (let i = 8; i + 8 <= buf.length; ) {
        const size = buf.readUInt32BE(i);
        const id = buf.toString('latin1', i + 4, i + 8);
        if (['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME', 'iCCP'].includes(id)) problems.push(`${f} has a ${id} chunk`);
        i += 12 + size;
      }
    } else if (ext === '.jpg' || ext === '.jpeg') {
      if (buf.includes(Buffer.from([0xff, 0xe1]))) problems.push(`${f} has an APP1 (EXIF/XMP) segment`);
    } else if (ext === '.avif') {
      if (buf.includes('Exif') || buf.includes('xmpmeta')) problems.push(`${f} has EXIF or XMP`);
    } else if (ext === '.pdf') {
      if (buf.includes('xmpmeta')) problems.push(`${f} has XMP metadata`);
    }
  }
  if (problems.length) problems.forEach(fail);
  else pass('no EXIF, XMP, ICC or text chunks');
}

/* 4. privacy */
console.log('Privacy');
{
  const tracked = git('ls-files', 'assets/originals').trim();
  if (tracked) fail('files in assets/originals/ are tracked by git');
  else pass('assets/originals/ is not tracked');
  try {
    git('check-ignore', '-q', 'assets/originals/x');
  } catch {
    fail('assets/originals/ is not gitignored');
  }
  const patternFile = join(ROOT, '.private-patterns');
  if (!existsSync(patternFile)) {
    pass('no .private-patterns file, value scan skipped');
  } else {
    const patterns = readFileSync(patternFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    let hits = 0;
    for (const f of repoFiles().filter((x) => x !== '.private-patterns')) {
      const buf = readFileSync(join(ROOT, f));
      patterns.forEach((p, n) => {
        if (buf.includes(p)) {
          hits++;
          fail(`${f} contains private pattern #${n + 1}`);
        }
      });
    }
    if (!QUICK) {
      const history = git('log', '-p', '--all', '--format=%H %s%n%b');
      patterns.forEach((p, n) => {
        if (history.includes(p)) {
          hits++;
          fail(`git history contains private pattern #${n + 1}`);
        }
      });
    }
    if (!hits) pass(`${patterns.length} private patterns: none found in files${QUICK ? '' : ' or git history'}`);
  }
}

console.log(failed ? '\nChecks failed.' : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
