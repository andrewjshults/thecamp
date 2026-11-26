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

// ── NPC dialogue (Claude) ──────────────────────────────────────────────────
// POST /api/npc-reply  { npc, playerName, mapName, places, backpack, history }
//   npc: { name, what, desc, personality, sidekick }
//   → 200 { reply: "..." }  or { reply: null } when Claude declined
//   → 503 when the SDK isn't installed / no credentials (browser falls back
//     to its built-in reply generator).
// The SDK is optional: `npm install` adds it; without it the game still runs.
let anthropic = null;
let AnthropicSDK = null;
try {
  const mod = require('@anthropic-ai/sdk');
  AnthropicSDK = mod.default || mod;
  anthropic = new AnthropicSDK({ timeout: 30_000, maxRetries: 1 });
} catch (err) {
  console.log('    (NPC chat: @anthropic-ai/sdk unavailable — using built-in replies.\n' +
              '     Run `npm install` and set ANTHROPIC_API_KEY to let characters think for themselves.)\n');
}

const NPC_MODEL = 'claude-opus-5-5';
const MAX_HISTORY = 20;
const MAX_LINE = 300;

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}

function buildNpcSystemPrompt(b) {
  const npc = b.npc || {};
  const places = Array.isArray(b.places) ? b.places.map(p => clean(p, 40)).filter(Boolean).slice(0, 30) : [];
  const backpack = Array.isArray(b.backpack) ? b.backpack.map(p => clean(p, 40)).filter(Boolean).slice(0, 10) : [];
  // Critter NPCs (e.g. a frog) say what they are; everyone else is a kid camper
  const what = clean(npc.what, 120);
  return [
    `You are ${clean(npc.name, 40)}, ${what || 'a kid camper'} in a cozy, hand-drawn exploration game made for young children.`,
    npc.desc ? `About you: ${clean(npc.desc, 120)}.` : '',
    npc.personality ? `Your personality: ${clean(npc.personality, 400)}` : '',
    `You are hanging out at "${clean(b.mapName, 60)}". Things around here: ${places.join(', ') || 'lots of fun spots'}.`,
    npc.sidekick === true
      ? `Right now you are ${clean(b.playerName, 40)}'s sidekick: you follow them everywhere they go, and if the Glug Glub Blob (a silly monster living in a cave at the camp) catches them, you'll fight it right beside them with your own sword. You're proud and excited to be their sidekick.`
      : '',
    (what
      ? `You are talking with ${clean(b.playerName, 40)}, a kid camper who came to visit you.`
      : `You are talking with your friend ${clean(b.playerName, 40)}, another camper.`) +
      (backpack.length ? ` They're carrying: ${backpack.join(', ')}.` : ''),
    '',
    'How to talk:',
    '- Your words appear in a speech bubble that a 6-8 year old reads, so reply with one or two short sentences (under 25 words) using simple words.',
    `- Stay in character as a friendly, playful ${what ? 'creature' : 'camper'}. Be warm and silly, and sometimes ask a question back or suggest something fun to do at the camp.`,
    '- Plain text only: no markdown, no stage directions in asterisks, no quotation marks around your reply. An emoji now and then is fine.',
    '- Keep everything kind, polite and age-appropriate. Never tease or put down anyone or anything, and never call foods, places or people yucky, gross or icky. If your friend says something mean or scary, respond gently and steer toward something fun.',
    '- You are a character in the game; never talk about being an AI, a model, or a computer program.',
  ].filter(Boolean).join('\n');
}

async function generateNpcReply(body) {
  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY)
    .map(t => ({
      role: t.speaker === 'npc' ? 'assistant' : 'user',
      content: clean(t.text, MAX_LINE),
    }))
    .filter(m => m.content);
  // The conversation must start and end with the player speaking.
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') {
    throw Object.assign(new Error('history must end with the player speaking'), { status: 400 });
  }

  const response = await anthropic.beta.messages.create({
    model: NPC_MODEL,
    max_tokens: 2000,
    output_config: { effort: 'low' },   // snappy chat replies
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',               // re-run on a fallback model if declined
    system: buildNpcSystemPrompt(body),
    messages: history,
  });

  if (response.stop_reason === 'refusal') return null;
  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join(' ');
  return clean(text, 220) || null;
}

function handleNpcReply(req, res) {
  const send = (code, obj) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  if (!anthropic) return send(503, { error: 'npc chat unavailable' });

  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 32_000) { send(413, { error: 'too large' }); req.destroy(); }
  });
  req.on('end', async () => {
    if (res.writableEnded) return;
    let body;
    try { body = JSON.parse(raw); } catch (_) { return send(400, { error: 'bad json' }); }
    try {
      const reply = await generateNpcReply(body);
      send(200, { reply });
    } catch (err) {
      if (err.status === 400 && !(err instanceof AnthropicSDK.APIError)) {
        return send(400, { error: err.message });
      }
      if (err instanceof AnthropicSDK.AuthenticationError) {
        console.log('  ✗  NPC chat: no valid Anthropic credentials (set ANTHROPIC_API_KEY)');
        return send(503, { error: 'no credentials' });
      }
      if (err instanceof AnthropicSDK.RateLimitError) {
        console.log('  ✗  NPC chat: rate limited');
        return send(503, { error: 'rate limited' });
      }
      if (err instanceof AnthropicSDK.APIError) {
        console.log(`  ✗  NPC chat: API error ${err.status}: ${err.message}`);
        return send(502, { error: 'api error' });
      }
      console.log(`  ✗  NPC chat: ${err.message}`);
      send(503, { error: 'unavailable' });
    }
  });
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {

  if (req.method === 'POST' && req.url === '/api/npc-reply') {
    handleNpcReply(req, res);
    return;
  }

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
