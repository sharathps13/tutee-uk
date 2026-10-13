// Refreshes assets/data/news.json, the snapshot the news strip falls back to
// when /api/news isn't available (local preview, or the function failing).
// Uses the same feeds and filters as the live function.
//
//   node tools/refresh-news.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { collect } = await import(pathToFileURL(path.join(root, 'netlify/functions/news.mjs')).href);
const data = await collect();
if (!data.items.length) {
  console.error('No items came back from the feeds; snapshot left unchanged.');
  process.exit(1);
}
const out = path.join(root, 'assets/data/news.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n', 'utf8');
console.log(`Wrote ${data.items.length} stories to assets/data/news.json`);
