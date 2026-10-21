// Local test server: static files (gzip, like Netlify) + /api/enquiry through the
// REAL netlify/functions/enquiry.mjs, forwarding to a local MOCK Apps Script.
// No production endpoint is ever contacted.
//   node tools/dev/serve-with-api.mjs <siteRoot> [port=8790]
// Mock behaviour: create tools/dev/mock-fail.flag to make the mock refuse (tests the error path).
// Leads the mock receives are appended to tools/dev/mock-leads.jsonl (git-ignored).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = +(process.argv[3] || 8790);
const MOCK_PORT = PORT + 9;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(HERE, 'mock-leads.jsonl');
const FAIL_FLAG = path.join(HERE, 'mock-fail.flag');

process.env.APPS_SCRIPT_URL = `http://127.0.0.1:${MOCK_PORT}/exec`;
process.env.APPS_SCRIPT_SECRET = 'local-test-secret-not-real';
const fn = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/enquiry.mjs')).href);

// mock Apps Script
http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    let j = {};
    try { j = JSON.parse(b); } catch {}
    const fail = fs.existsSync(FAIL_FLAG);
    const okSecret = j.secret === process.env.APPS_SCRIPT_SECRET;
    delete j.secret;
    fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), fail, okSecret, lead: j }) + '\n');
    res.writeHead(fail ? 500 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(fail ? { ok: false, error: 'mock failure' } : { ok: okSecret }));
  });
}).listen(MOCK_PORT, '127.0.0.1');

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.txt': 'text/plain' };
const ZIP = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/enquiry' || url.pathname === '/.netlify/functions/enquiry') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      const r = await fn.default(new Request(url, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined }));
      res.writeHead(r.status, Object.fromEntries(r.headers));
      res.end(await r.text());
    });
    return;
  }
  if (url.pathname === '/api/news') {
    // the real function: live feeds, same filters as production
    const news = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/news.mjs')).href);
    const r = await news.default(new Request(url));
    res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(await r.text());
    return;
  }
  let p = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
  const ext = path.extname(p).toLowerCase();
  const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' };
  let data = fs.readFileSync(p);
  if (ZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { data = zlib.gzipSync(data); h['Content-Encoding'] = 'gzip'; }
  res.writeHead(200, h);
  res.end(data);
}).listen(PORT, () => console.log(`site http://localhost:${PORT}  (mock apps script :${MOCK_PORT}, log ${LOG})`));
