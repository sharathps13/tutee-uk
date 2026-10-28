// Local test server: static files (gzip, like Netlify) + /api/enquiry through the
// REAL netlify/functions/enquiry.mjs, forwarding to a local MOCK Apps Script.
// No production endpoint is ever contacted.
//   node tools/dev/serve-with-api.mjs <siteRoot> [port=8790]
// The stand-in runs the real apps-script/Code.gs; create tools/dev/mock-fail.flag to make it refuse
// (tests the fallback). What it receives, the sheet row and the email go to tools/dev/mock-leads.jsonl
// (git-ignored). Pages are served with netlify.toml's production headers, CSP included.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import vm from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = +(process.argv[3] || 8790);
const MOCK_PORT = PORT + 9;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOG = path.join(HERE, 'mock-leads.jsonl');
const FAIL_FLAG = path.join(HERE, 'mock-fail.flag');

process.env.APPS_SCRIPT_URL = `http://127.0.0.1:${MOCK_PORT}/exec`;
process.env.APPS_SCRIPT_TOKEN = 'local-test-token-not-real';
process.env.SITE_COUNTRY = 'UK';
// never reach a real inbox or database from a local test
delete process.env.RESEND_API_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const fn = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/enquiry.mjs')).href);

// Stand-in Apps Script: runs the real apps-script/Code.gs (token check, sheet
// row, email) in a sandbox with Google's services stubbed, and records the row
// and the email it would have produced. Script Properties hold other sites'
// tokens too, so only this site's own LEADS_TOKEN_UK is accepted for UK.
const GS = fs.readFileSync(path.join(ROOT, 'apps-script/Code.gs'), 'utf8');
const PROPS = { LEADS_TOKEN: 'shared-token-of-other-sites', LEADS_TOKEN_NEW_ZEALAND: 'nz-token', LEADS_TOKEN_POLAND: 'pl-token', LEADS_TOKEN_UK: process.env.APPS_SCRIPT_TOKEN };
function runCodeGs(contents) {
  const rec = { rows: [], mails: [] };
  const fmt = (d, zone, f) => new Intl.DateTimeFormat('en-GB', f === 'dd/MM/yyyy'
    ? { timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric' }
    : { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  const sheet = (name) => ({ getName: () => name, appendRow: (row) => rec.rows.push({ tab: name, row }) });
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => PROPS[k] ?? null, setProperty() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t }) },
    Utilities: { formatDate: fmt },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: sheet }), openById: () => ({ getSheetByName: sheet }) },
    MailApp: { sendEmail: (m) => rec.mails.push({ to: m.to, replyTo: m.replyTo, name: m.name, subject: m.subject, body: m.body }) },
    console,
  };
  vm.createContext(sb);
  vm.runInContext(GS, sb);
  return { reply: sb.doPost({ postData: { contents } }), ...rec };
}
http.createServer((req, res) => {
  let b = '';
  req.on('data', (c) => (b += c));
  req.on('end', () => {
    let j = {};
    try { j = JSON.parse(b); } catch {}
    const fail = fs.existsSync(FAIL_FLAG);
    const received = { ...j, token: !j.token ? '<none>' : j.token === process.env.APPS_SCRIPT_TOKEN ? "<this site's token>" : '<other token>' };
    const r = fail ? { reply: JSON.stringify({ success: false, message: 'mock failure' }), rows: [], mails: [] } : runCodeGs(b);
    fs.appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), fail, received, reply: JSON.parse(r.reply), sheet_rows: r.rows, emails: r.mails }) + '\n');
    res.writeHead(fail ? 500 : 200, { 'Content-Type': 'application/json' });
    res.end(r.reply);
  });
}).listen(MOCK_PORT, '127.0.0.1');

// netlify.toml's production headers for "/*", so pages are tested under the
// real Content-Security-Policy
const TOML = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
const CSP = (TOML.match(/Content-Security-Policy = """([\s\S]*?)"""/) || [, ''])[1].replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();
const PROD_HEADERS = { 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' };

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
  const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store', ...PROD_HEADERS };
  let data = fs.readFileSync(p);
  if (ZIP.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { data = zlib.gzipSync(data); h['Content-Encoding'] = 'gzip'; }
  res.writeHead(200, h);
  res.end(data);
}).listen(PORT, () => console.log(`site http://localhost:${PORT}  (mock apps script :${MOCK_PORT}, log ${LOG})`));
