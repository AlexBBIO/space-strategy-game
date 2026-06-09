// Inline the built JS and CSS into one self-contained HTML file
// (dist/phaselane.html) that can be opened directly from disk.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

html = html.replace(
  /<script type="module"[^>]*src="\.?\/?(assets\/[^"]+)"[^>]*><\/script>/,
  (_, src) => `<script type="module">${readFileSync(join(dist, src), 'utf8')}</script>`,
);
html = html.replace(
  /<link rel="stylesheet"[^>]*href="\.?\/?(assets\/[^"]+)"[^>]*>/,
  (_, href) => `<style>${readFileSync(join(dist, href), 'utf8')}</style>`,
);

if (html.includes('assets/')) {
  throw new Error('singlefile: some assets were not inlined');
}

const out = join(dist, 'phaselane.html');
writeFileSync(out, html);
// Also serve the inlined build as the site itself: GitHub Pages caches HTML
// for ~10 minutes while deploys delete old hashed assets, so an index.html
// that references external bundles goes blank for returning visitors right
// after every deploy. A self-contained index can never dangle.
writeFileSync(join(dist, 'index.html'), html);
console.log(`wrote ${out} and index.html (${(html.length / 1024).toFixed(0)} KB each)`);
