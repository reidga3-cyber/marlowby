// copy-vendor.mjs
// Copies the libraries and fonts we use out of node_modules and into the site
// folder, so the finished site never needs the internet (no CDN links).
// Run with: npm run vendor

import { cpSync, mkdirSync } from 'node:fs';

const copies = [
  // [from, to]
  ['node_modules/gsap/dist/gsap.min.js', 'vendor/gsap/gsap.min.js'],
  ['node_modules/gsap/dist/ScrollTrigger.min.js', 'vendor/gsap/ScrollTrigger.min.js'],
  ['node_modules/lenis/dist/lenis.min.js', 'vendor/lenis/lenis.min.js'],

  // Fonts (SIL Open Font License 1.1) — Latin subsets only, to keep downloads small
  ['node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-normal.woff2', 'fonts/bodoni-moda-latin-opsz-normal.woff2'],
  ['node_modules/@fontsource-variable/bodoni-moda/files/bodoni-moda-latin-opsz-italic.woff2', 'fonts/bodoni-moda-latin-opsz-italic.woff2'],
  ['node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2', 'fonts/instrument-sans-latin-400-normal.woff2'],
  ['node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2', 'fonts/instrument-sans-latin-500-normal.woff2'],
  ['node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2', 'fonts/instrument-sans-latin-600-normal.woff2'],
  ['node_modules/@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2', 'fonts/dm-mono-latin-400-normal.woff2'],
  ['node_modules/@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2', 'fonts/dm-mono-latin-500-normal.woff2'],

  // License files travel with the code they cover
  ['node_modules/gsap/README.md', 'vendor/gsap/README.md'],
  ['node_modules/lenis/LICENSE', 'vendor/lenis/LICENSE'],
  ['node_modules/three/LICENSE', 'vendor/three-LICENSE.txt'],
  ['node_modules/@fontsource-variable/bodoni-moda/LICENSE', 'fonts/LICENSE-bodoni-moda.txt'],
  ['node_modules/@fontsource/instrument-sans/LICENSE', 'fonts/LICENSE-instrument-sans.txt'],
  ['node_modules/@fontsource/dm-mono/LICENSE', 'fonts/LICENSE-dm-mono.txt'],
];

for (const [from, to] of copies) {
  mkdirSync(to.substring(0, to.lastIndexOf('/')), { recursive: true });
  cpSync(from, to);
  console.log('copied', to);
}
