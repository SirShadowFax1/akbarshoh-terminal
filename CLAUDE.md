# CLAUDE.md: rules for this project

Personal portfolio of Akbarshokh Turobov, built as an interactive terminal. The readers are teachers and university admissions officers, so the site must feel finished, polished, and easy for non-technical people.

## Content rules
- The site must feel 100% complete. Do not leave any to-do or fix-me markers, filler or dummy text, "soon" or "later" promises, sample domains, fake data, dead links, empty sections, or stub commands. This applies to the UI, code comments, and the README.
- A section without real content must not exist. It must not appear in help, ls, tab-completion, chips, search, the plain page, or the sitemap. It appears automatically once real entries are added to `public/js/content.js`. Right now `projects` is empty, so there is no projects section.
- Use only the facts in `public/js/content.js`. Never invent projects, awards, quotes, numbers, links, or proficiency levels. The "about" bio is first person and built only from those facts, with no superlatives.
- Never show the phone number, home address, or date of birth anywhere.

## Privacy rules
- `assets/originals/` holds private source files. It is gitignored and must never be copied into `public/` or referenced by the site.
- Sensitive values (phone, date of birth, candidate number/ID, test report form number, record locator) are never written into any tracked file, commit message, or chat. Grep patterns for them live only in the gitignored `.private-patterns`.
- Every image in `public/` has its metadata stripped. Run `tools/assets/media.py` for new photos.
- Certificate redactions are solid opaque black rectangles drawn into the pixels. Never use blur or CSS overlays.

## Structure
- `public/` is the whole deployable site, and every path inside it is relative. Vanilla HTML/CSS/JS (ES modules) with zero runtime dependencies and no framework. Deploy needs no build step.
- `public/js/content.js`: all content, as pure data.
- `public/js/registry.js`: command registry. Adding a command means one `register({...})` call.
- `tools/`: zero-dependency Node scripts (`serve`, `sync`, `check`, `set-site-url`) and uv-run Python asset scripts.
- Workflow after editing content: `node tools/sync.mjs` (regenerates plain.html, the static fallbacks in index.html, sitemap, service worker version, and CSP hashes), then `node tools/check.mjs`. The pre-commit hook in `.githooks/` enforces this.

## Performance budget (hard requirement)
- Critical path (HTML + CSS + core JS) under 50 KB gzipped. Critical CSS is inlined. No render-blocking requests besides CSS.
- First contentful paint under 0.8 s on throttled Fast 4G. The prompt is focusable and typeable immediately. The boot animation never blocks input, any keypress skips it, and it plays only on the first visit per session.
- Commands respond instantly, with no artificial delay. Typing animation is used only for the boot banner, and it is skippable.
- Lighthouse mobile: Performance 99-100, Accessibility 100, Best Practices 100, SEO 100. CLS 0, TBT near 0.
- Self-hosted JetBrains Mono: Latin subset, woff2, preloaded, `font-display: swap`, with a metrically matched system monospace fallback.
- Images have explicit width/height and are lazy-loaded. Thumbnails load first; the full image loads only when opened and is preloaded on hover/focus. The ASCII portrait is inline text.
- Games and easter eggs load via dynamic `import()` only when first used.
- Service worker: cache-first for static assets, offline-capable, versioned cache. `public/_headers` sets cache and security headers (Cloudflare Pages and Netlify).
- Rendering: DocumentFragment appends, no forced reflows, animate only transform/opacity, scrollback capped at about 500 entries, never re-render the whole terminal.

## Definition of done
- Every fact in content.js appears accurately and is reachable by a command and on the plain page.
- `/plain.html` shows all content as semantic HTML, and the same content is served in a `<noscript>` fallback.
- Fully keyboard-operable, with an aria-live region for terminal output, visible focus, sufficient contrast, and screen-reader friendliness.
- Title, meta description, canonical, Open Graph and Twitter card with a generated OG image, favicon set, manifest, robots.txt, and sitemap.xml are all in place.
- No trackers, no external requests, no console errors.
- `node tools/check.mjs` passes, including the banned-word scan, the metadata scan, and the critical-path budget.
