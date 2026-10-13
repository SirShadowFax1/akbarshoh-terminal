# Akbarshokh Turobov: terminal portfolio

My personal portfolio, built as an interactive terminal. Visitors type commands (or tap the buttons under the prompt) and the portfolio appears. A plain, printable version lives at `/plain`, and the same content is shown automatically when JavaScript is turned off.

It is plain HTML, CSS and JavaScript with no framework, no runtime dependencies and no build step. Everything the site serves is in `public/`.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
node tools/serve.mjs
```

Then open http://localhost:8080. The local server behaves like Cloudflare Pages and Netlify: it applies `public/_headers`, compresses files, serves `/plain` and shows the 404 page for unknown addresses.

## Edit the content

All the text, scores, links and entries live in one file: `public/js/content.js`. Edit it, then run:

```bash
node tools/sync.mjs
```

```bash
node tools/check.mjs
```

`sync.mjs` rebuilds everything that is generated from the content: the plain page, the no-JavaScript fallback, the boot screen lines and quick-command buttons in `index.html`, the sitemap, the 404 page, the service worker cache list and the security headers. `check.mjs` checks the speed budget, image metadata and privacy.

A git hook runs both before every commit. After cloning the repository, turn the hook on once:

```bash
git config core.hooksPath .githooks
```

Sections only appear when they have entries. `projects` is empty today, so there is no projects command, folder, button or page section. Add the first project and it shows up everywhere.

### Add an achievement with photos

1. Prepare the photos. This shrinks them, removes their metadata (including GPS location) and prints the code to paste. You need [uv](https://docs.astral.sh/uv/) (on Windows: `winget install astral-sh.uv`).

   ```bash
   uv run --with-requirements tools/assets/requirements.txt tools/assets/media.py olympiad-2026 photo1.jpg photo2.jpg
   ```

2. Add an entry to the `achievements` list in `public/js/content.js`. Every field except `id` and `title` is optional. `ref` points to the entry with the full story, if there is one.

   ```js
   {
     id: 'olympiad-2026',
     title: 'Name of the award or place',
     detail: 'Competition name, city',
     date: 'Month and year, like Jun 2026',
     media: {
       images: [
         {
           src: 'assets/media/olympiad-2026-1.webp',
           thumb: 'assets/media/olympiad-2026-1-thumb.webp',
           width: 1600,
           height: 1200,
           thumbWidth: 480,
           thumbHeight: 360,
           alt: 'Describe what the photo shows',
         },
       ],
     },
   },
   ```

   Use the exact `media` block that `media.py` printed, because it has the real image sizes.

3. Run `node tools/sync.mjs` and `node tools/check.mjs`, then commit.

### Add a project with a video

Add an entry to the `projects` list. Experience entries use the same fields.

```js
export const projects = [
  {
    id: 'my-project',
    title: 'Project name',
    date: 'Month and year, like Jul 2026',
    summary: 'One sentence about what it is.',
    points: ['What I built.', 'What I learned.'],
    links: [{ label: 'Source code', url: 'Full https:// address of the repository' }],
    media: {
      video: { youtube: 'Code after v= in the YouTube link', title: 'Project demo' },
    },
  },
];
```

- **YouTube:** `youtube` is the part after `v=` in the video address. The site shows a play button and loads YouTube (privacy-enhanced mode) only when someone clicks it.
- **Your own video file:** put the `.mp4` in `public/assets/media/` and use `video: { src: 'assets/media/demo.mp4', poster: 'assets/media/demo-poster.webp', width: 1280, height: 720, title: 'Project demo' }`. It only loads when played. Remove its metadata first, for example with `ffmpeg -i in.mp4 -map_metadata -1 -c copy demo.mp4`, and make the poster from a screenshot with `media.py`.

Photos and a video can go in the same `media` block.

## Deploy

The publish directory is `public`, and there is no build command.

### Cloudflare Pages

1. Sign in at https://dash.cloudflare.com and open **Workers & Pages**, then **Create**, then the **Pages** tab.
2. Either choose **Upload assets** and drag in the `public` folder, or choose **Connect to Git** and pick this repository.
3. With Git, set **Build command** to nothing and **Build output directory** to `public`.
4. Name the project `akbarshoh` so the address is `https://akbarshoh.pages.dev/`.

From a terminal you can also run:

```bash
npx wrangler pages deploy public --project-name akbarshoh
```

### Netlify

1. Drag the `public` folder onto https://app.netlify.com/drop, or use **Add new site**, then **Import an existing project** with this repository.
2. With Git, leave **Build command** empty and set **Publish directory** to `public`.

### If the address is different

The canonical links, social previews, sitemap and robots.txt use `https://akbarshoh.pages.dev/`. If the site ends up at another address, update them all at once:

```bash
node tools/set-site-url.mjs https://akbarshoh.netlify.app/
```

Then commit and deploy again.

## How it is built

| Path | What it is |
| --- | --- |
| `public/index.html` | The terminal. Critical CSS is inline, so the first paint needs no extra requests. |
| `public/js/content.js` | All content. |
| `public/js/main.js` | Prompt, history, tab completion, output, buttons and boot screen. |
| `public/js/registry.js` | The command registry. A new command is one `register({ ... })` call. |
| `public/js/commands.js` | Every command. |
| `public/js/fs.js` | The pretend file system (`ls`, `cd`, `cat`, `tree`), built from the content. |
| `public/js/viewer.js`, `eggs.js`, `games/` | Loaded only when first used. |
| `public/sw.js` | Service worker: instant repeat visits and offline use. |
| `public/_headers` | Security and cache headers for Cloudflare Pages and Netlify. |
| `tools/` | Local server, sync, checks, address switch, and the Python scripts that prepared the images, fonts and public CV. |

Speed budget: the HTML, CSS and JavaScript needed for the first screen stay under 50 KB gzipped (currently about 29 KB), and Lighthouse scores 100 in all four categories on mobile and desktop.

## Privacy

- `assets/originals/` holds the private source files (full CV, score reports, photo). It is listed in `.gitignore`, never committed and never published.
- The public CV has no phone number. The score report images have personal identifiers covered by solid black boxes drawn into the pixels.
- Every published image has its metadata removed. `node tools/check.mjs` fails if one does not.
- The site uses no trackers, no analytics and no third-party requests.

## Credits

The font is [JetBrains Mono](https://www.jetbrains.com/lp/mono/), used under the SIL Open Font License (`public/assets/fonts/OFL.txt`).
