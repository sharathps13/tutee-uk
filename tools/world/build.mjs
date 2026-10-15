// Builds assets/js/world.js (ES module) from src/world.js with only the three.js
// classes the scene imports. Run from tools/world: npm run build
import { build } from 'esbuild';
import { statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const out = '../../assets/js/world.js';
await build({
  entryPoints: ['src/world.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2019'],
  outfile: out,
  legalComments: 'eof',
  banner: { js: '/* Tutee Connect UK — Atlas world. Built from tools/world (three.js r186, MIT). */' }
});
const size = statSync(out).size, gz = gzipSync(readFileSync(out)).length;
console.log(`world.js ${(size / 1024).toFixed(1)} KB, gzip ${(gz / 1024).toFixed(1)} KB`);
