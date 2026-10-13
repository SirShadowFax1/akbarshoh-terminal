// All portfolio content lives in this file. It is plain data: the terminal,
// the plain page, the <noscript> fallback, search and the sitemap are all
// built from it. After editing, run `node tools/sync.mjs` (see README.md).
//
// A section with no entries (for example `projects: []`) is hidden
// everywhere until you add one.
//
// Any entry in experience, achievements or projects can carry optional media:
//   media: {
//     images: [{ src, thumb, width, height, alt }],
//     video: { youtube: id, title, poster }   // id: the part after v= in the URL
//        or  { src: 'assets/media/clip.mp4', poster, width, height, title },
//   }

export const site = {
  url: 'https://akbarshoh.pages.dev/',
  title: 'Akbarshokh Turobov · Terminal portfolio',
  description:
    'Akbarshokh Turobov: student, competitor and programmer from Gulistan, Uzbekistan. ' +
    'IELTS 8.0, SAT 1490, 1st place nationally at IRN IVOC. Explore the portfolio in an interactive terminal.',
};

export const profile = {
  name: 'Akbarshokh Turobov',
  firstName: 'Akbarshokh',
  location: 'Gulistan, Syrdarya, Uzbekistan',
  tagline: 'Student, competitor and programmer from Gulistan, Uzbekistan.',
  email: 'akbarshoh542@gmail.com',
  links: [
    { id: 'github', label: 'GitHub', handle: 'SirShadowFax1', url: 'https://github.com/SirShadowFax1' },
    { id: 'linkedin', label: 'LinkedIn', handle: 'akbarshoh-turobovat', url: 'https://www.linkedin.com/in/akbarshoh-turobovat' },
    { id: 'telegram', label: 'Telegram', handle: '@akbarshoh_turobov', url: 'https://t.me/akbarshoh_turobov' },
  ],
  cv: { file: 'docs/Akbarshokh_Turobov_CV.pdf', name: 'Akbarshokh_Turobov_CV.pdf', size: '110 KB', pages: 2 },
  photo: {
    avif: 'assets/photo/akbarshoh.avif',
    webp: 'assets/photo/akbarshoh.webp',
    width: 140,
    height: 140,
    alt: 'Portrait photo of Akbarshokh Turobov wearing glasses',
  },
  // 40-column ASCII version of the photo (tools/assets/photo.py).
  portrait: String.raw`          .,.......
       ,,....
     .:,
    ,:it1;;:...
   ,:t8@@@80CCf1i;:,,..
   .i8@@888800GGCCLft1:.
  ;:L@@@@@@@80GCLLLLLL1,...
 ;tti;1LG00800GGCCLfft;,,....
:,;t;:,;iii;;;;ii1tfff1:,,....
;:LCii;;t;;:,,,::;;1ffft:,,,...
 f0GGCfC8i:i;::;::ii111t;,,:;;:
  CGC0@@0titftt11tffffff1;1i11,
  1GLLLLLL11ffftfLLLLLfftt1;it,
   C0fi;;11tfffffffffftft1i1i1
   tLftt11tffffttttttttt1ttffi
   :i;;;;iiittttttttttt11tt1:
    tf1i;;;;i1tttttttttfLi
     Lfftt1iii11iiiii1tf
     :i;;;;;:::::;;ii1t
      f1:,,:::;;iiii111`,
};

export const about = [
  "I'm Akbarshokh Turobov, a high school student at Rustam Bosimov International School (RBIS) in Gulistan, Uzbekistan, with expected graduation in June 2027. I hold a Merit Scholarship at RBIS, awarded based on academic certifications, and I'm in the top 2% of my class.",
  'I program in Python, C++ and C, and I take part in academic competitions. I placed 1st nationally at IRN IVOC (the International Olympiad in Vocabulary), won 2nd place at the Bosimov Research Challenge, and was a competition coordinator and test-maker for the National Academic Challenge Uzbekistan.',
  'My test scores are IELTS Academic 8.0 (CEFR C1) and SAT 1490. Outside class I play chess, speedcube and speedtype.',
];

export const education = [
  {
    id: 'rbis',
    title: 'Rustam Bosimov International School (RBIS)',
    role: 'High school student',
    location: 'Gulistan, Uzbekistan',
    date: 'Expected graduation: June 2027',
    points: [
      'Merit Scholarship at RBIS (2023–present), awarded based on academic certifications.',
      'Top 2% of class.',
    ],
  },
];

export const certificates = [
  {
    id: 'ielts',
    title: 'IELTS Academic',
    date: '24 Dec 2025',
    summary: 'Overall 8.0 · CEFR C1',
    scores: [
      ['Overall', '8.0'],
      ['CEFR level', 'C1'],
      ['Listening', '8.0'],
      ['Reading', '9.0'],
      ['Writing', '7.0'],
      ['Speaking', '7.0'],
    ],
    image: {
      full: 'assets/certs/ielts.webp',
      thumb: 'assets/certs/ielts-thumb.webp',
      width: 1456,
      height: 2056,
      thumbWidth: 480,
      thumbHeight: 678,
      alt: 'IELTS Academic Test Report Form for Akbarshokh Turobov, test date 24 December 2025, overall band 8.0, CEFR C1. Personal identifiers are blacked out.',
    },
  },
  {
    id: 'sat',
    title: 'SAT',
    date: '14 Mar 2026',
    summary: '1490 total',
    scores: [
      ['Total', '1490'],
      ['Math', '780'],
      ['Reading and Writing', '710'],
    ],
    image: {
      full: 'assets/certs/sat.webp',
      thumb: 'assets/certs/sat-thumb.webp',
      width: 1700,
      height: 1416,
      thumbWidth: 480,
      thumbHeight: 400,
      alt: 'SAT score report for Akbarshokh Turobov, test date 14 March 2026, total score 1490, Math 780, Reading and Writing 710. The record locator and QR code are blacked out.',
    },
  },
];

// Leadership and activities.
export const experience = [
  {
    id: 'national-academic-challenge',
    title: 'National Academic Challenge Uzbekistan',
    role: 'Competition coordinator and test-maker',
    date: 'Mar 2026',
    points: [
      'Developed original demo tests for Grade 5 and 6 participants in Mathematics, English and Biology.',
      'Translated all materials into Uzbek, English and Russian.',
      'Supervised participant groups, managing test administration across sessions at regional scale.',
    ],
  },
  {
    id: 'econ-case-competition',
    title: 'Econ Case Competition',
    role: 'Competitor and team researcher',
    location: 'Gulistan',
    date: 'May 2026',
    points: [
      "Researched and structured data supporting the team's position that product quality, not marketing, is the primary bottleneck for youth-led startups.",
      'Argued that marketing without a strong product compounds acquisition costs without retention.',
      'Prepared targeted questions to challenge the opposing team.',
    ],
  },
  {
    id: 'bosimov-research-challenge',
    title: 'Bosimov Research Challenge',
    role: 'Competitor, speaker and presentation maker',
    location: 'Gulistan',
    date: 'May 2026',
    points: [
      '2nd place, winning 7,000,000 UZS.',
      'Researched top Korean universities and offered solutions to my school.',
      'Made the presentations and delivered the speech.',
    ],
  },
  {
    id: 'irn-ivoc',
    title: 'IRN IVOC',
    role: 'International Olympiad in Vocabulary',
    location: 'Tashkent',
    date: 'May 2025',
    points: ['Placed 1st nationally in the International Olympiad in Vocabulary.'],
  },
  {
    id: 'veritas-ai',
    title: 'Veritas AI',
    role: 'Selected scholar',
    points: ['Selected as a scholar in a competitive AI program.'],
  },
];

// Each achievement links to the entry with the full story (`ref`).
export const achievements = [
  {
    id: 'irn-ivoc-1st-place',
    title: '1st place nationally, IRN IVOC',
    detail: 'International Olympiad in Vocabulary, Tashkent',
    date: 'May 2025',
    ref: 'irn-ivoc',
  },
  {
    id: 'bosimov-2nd-place',
    title: '2nd place, Bosimov Research Challenge',
    detail: 'Won 7,000,000 UZS, Gulistan',
    date: 'May 2026',
    ref: 'bosimov-research-challenge',
  },
  {
    id: 'ielts-8',
    title: 'IELTS Academic 8.0 (CEFR C1)',
    detail: 'Listening 8.0, Reading 9.0, Writing 7.0, Speaking 7.0',
    date: '24 Dec 2025',
    ref: 'ielts',
  },
  {
    id: 'sat-1490',
    title: 'SAT 1490',
    detail: 'Math 780, Reading and Writing 710',
    date: '14 Mar 2026',
    ref: 'sat',
  },
  {
    id: 'merit-scholarship',
    title: 'Merit Scholarship at RBIS',
    detail: 'Awarded based on academic certifications',
    date: '2023–present',
    ref: 'rbis',
  },
  {
    id: 'top-2-percent',
    title: 'Top 2% of class',
    detail: 'Rustam Bosimov International School',
    ref: 'rbis',
  },
  {
    id: 'veritas-ai-scholar',
    title: 'Veritas AI selected scholar',
    detail: 'Competitive AI program',
    ref: 'veritas-ai',
  },
];

// Add entries here to create the projects section, for example:
// { id, title, date, summary, points: [], links: [{ label, url }], media }
export const projects = [];

export const skills = [
  { group: 'Programming languages', items: ['Python', 'C++', 'C'] },
  { group: 'Tools and platforms', items: ['Git/GitHub', 'VS Code', 'Linux'] },
  { group: 'UI/UX', items: ['Figma'] },
];

export const languages = [
  { name: 'Uzbek', level: 'native' },
  { name: 'English', level: 'advanced' },
];

export const interests = [
  { id: 'chess', title: 'Chess', detail: '1400 Elo on Chess.com' },
  { id: 'speedcubing', title: 'Speedcubing', detail: '3x3 sub-8.5, 2x2 sub-2', game: 'scramble' },
  { id: 'speedtyping', title: 'Speedtyping', detail: '135 WPM on monkeytype.com', game: 'typing' },
];

export const games = [
  {
    id: 'typing',
    title: 'Typing test',
    summary: 'A 30-word speed test. My personal best is 135 WPM on monkeytype.com.',
  },
  {
    id: 'scramble',
    title: '3x3 scramble and timer',
    summary: "A random 3x3 scramble with a cube preview and a timer. I'm sub-8.5 on the 3x3.",
  },
];
