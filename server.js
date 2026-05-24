#!/usr/bin/env node
// server.js — zero-dependency dev server for Louisa's Game
// Usage: node server.js   (or: npm run dev)
// Serves the project at http://localhost:3000 and auto-reloads the
// browser whenever any file in the project directory changes.

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || process.argv[2], 10) || 3000;
const ROOT = __dirname;

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.json':  'application/json',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.png':   'image/png',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.css':   'text/css',
  '.ico':   'image/x-icon',
};

// ── SSE clients waiting for reload signals ─────────────────────────────────
const clients = new Set();

function broadcast() {
  for (const res of clients) {
    try { res.write('data: reload\n\n'); } catch (_) { clients.delete(res); }
  }
}

// ── File watcher ───────────────────────────────────────────────────────────
fs.watch(ROOT, { recursive: true }, (event, filename) => {
  if (!filename) return;
  // Skip hidden files, node_modules, and the server script itself
  if (
    filename.startsWith('.') ||
    filename.startsWith('node_modules') ||
    filename === 'server.js'
  ) return;
  console.log(`  ↻  ${filename}`);
  broadcast();
});

// ── Live-reload snippet injected into every HTML response ──────────────────
const RELOAD_SNIPPET = `
<script>
(function () {
  var src = new EventSource('/~~livereload');
  src.onmessage = function () { location.reload(); };
  src.onerror   = function () { src.close(); };
})();
</script>`;

// ── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {

  // SSE live-reload endpoint
  if (req.url === '/~~livereload') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    });
    res.write(':ok\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Static file serving
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));

  // Prevent path-traversal escaping ROOT
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      const code = err.code === 'ENOENT' ? 404 : 500;
      res.writeHead(code); res.end(String(code)); return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });

    if (ext === '.html') {
      // Inject the live-reload listener right before </body>
      res.end(data.toString().replace(/<\/body>/i, RELOAD_SNIPPET + '\n</body>'));
    } else {
      res.end(data);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🎮  Louisa's Game  →  http://localhost:${PORT}\n`);
  console.log('    Watching for changes — browser auto-reloads on save.\n');
});
