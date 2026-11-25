// serve.mjs
// A tiny offline web server for testing the site on a laptop with no internet.
// It also serves 404.html for missing pages, the way GitHub Pages does.
// Run with: npm run serve   then open http://localhost:8080

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const PORT = 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  // Strip the query string and block "../" tricks
  let path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (path.endsWith('/')) path += 'index.html';
  let file = join(ROOT, path);
  let status = 200;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(ROOT, '404.html');
    status = 404;
  }
  try {
    let body = await readFile(file);
    const headers = { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' };
    // Compress text files like GitHub Pages does, so local Lighthouse scores match the live site
    if (/gzip/.test(req.headers['accept-encoding'] || '') && /\.(html|css|js|svg|json|txt)$/.test(file)) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    res.writeHead(status, headers);
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(PORT, () => console.log(`Marlowby running at http://localhost:${PORT}`));
