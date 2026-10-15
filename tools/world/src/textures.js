// Procedural textures for the Atlas world, painted on canvases at load time
// (no image downloads; the CSP stays same-origin). Each is made once, on first
// use, and cached. Colours follow the page palette.
import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';
import { NATIONS, IRELAND, LAND } from './geo.js';

const cache = new Map();
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function finish(c, { repeat, anisotropy = 4, srgb = true } = {}) {
  const t = new CanvasTexture(c);
  if (srgb) t.colorSpace = SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function once(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }

// speckle: many tiny translucent dots/strokes for grain
function grain(x, w, h, n, colours, size = [1, 3], alpha = [0.04, 0.12]) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = alpha[0] + rand() * (alpha[1] - alpha[0]);
    x.fillStyle = colours[(rand() * colours.length) | 0];
    const s = size[0] + rand() * (size[1] - size[0]);
    x.fillRect(rand() * w, rand() * h, s, s);
  }
  x.globalAlpha = 1;
}
function blotches(x, w, h, n, colours, r = [10, 60], alpha = [0.05, 0.16]) {
  for (let i = 0; i < n; i++) {
    const cx = rand() * w, cy = rand() * h, rr = r[0] + rand() * (r[1] - r[0]);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
    const col = colours[(rand() * colours.length) | 0];
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = alpha[0] + rand() * (alpha[1] - alpha[0]);
    x.fillStyle = g; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  x.globalAlpha = 1;
}

/* ------------------------------------------------------------- materials */
export const wood = (tint = '#7b4f2c') => once('wood' + tint, () => {
  const c = canvas(1024, 1024), x = c.getContext('2d');
  x.fillStyle = tint; x.fillRect(0, 0, 1024, 1024);
  // planks
  for (let p = 0; p < 4; p++) {
    const y0 = p * 256;
    x.fillStyle = `rgba(${p % 2 ? '255,230,200' : '40,20,5'},${0.04 + rand() * 0.05})`; x.fillRect(0, y0, 1024, 256);
    for (let i = 0; i < 70; i++) { // grain lines
      const yy = y0 + rand() * 256, amp = 2 + rand() * 6, f = 0.004 + rand() * 0.01, ph = rand() * 6;
      x.strokeStyle = `rgba(${rand() > 0.5 ? '35,18,6' : '200,150,100'},${0.08 + rand() * 0.14})`;
      x.lineWidth = 0.6 + rand() * 1.8; x.beginPath();
      for (let xx = 0; xx <= 1024; xx += 16) x.lineTo(xx, yy + Math.sin(xx * f + ph) * amp);
      x.stroke();
    }
    x.fillStyle = 'rgba(25,12,4,.55)'; x.fillRect(0, y0, 1024, 2);
  }
  grain(x, 1024, 1024, 9000, ['#2a160a', '#c99a6b'], [1, 2]);
  return finish(c, { repeat: [1, 1] });
});

export const paper = () => once('paper', () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = '#f4eee1'; x.fillRect(0, 0, 512, 512);
  blotches(x, 512, 512, 60, ['#e6d8bd', '#fffaf0'], [20, 80], [0.15, 0.35]);
  grain(x, 512, 512, 6000, ['#b8a684', '#ffffff'], [1, 2]);
  return finish(c, { repeat: [1, 1] });
});

export const stone = (base = '#cfc6b4', block = true) => once('stone' + base + block, () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  blotches(x, 512, 512, 90, ['#a49a86', '#e9e2d3', '#8f8774'], [10, 50], [0.1, 0.25]);
  grain(x, 512, 512, 14000, ['#6d6556', '#ffffff', '#9a917f'], [1, 2.5]);
  if (block) { // ashlar courses
    x.strokeStyle = 'rgba(70,62,50,.45)'; x.lineWidth = 2;
    for (let r = 0; r < 8; r++) {
      const y = r * 64; x.beginPath(); x.moveTo(0, y); x.lineTo(512, y); x.stroke();
      for (let k = 0; k < 5; k++) { const xx = ((k + (r % 2) * 0.5) * 112) % 512; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 64); x.stroke(); }
    }
  }
  return finish(c, { repeat: [1, 1] });
});

export const slate = () => once('slate', () => {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#4a5560'; x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 16; r++) {
    x.fillStyle = `rgba(${rand() > 0.5 ? '255,255,255' : '0,0,0'},${0.04 + rand() * 0.08})`; x.fillRect(0, r * 16, 256, 15);
    x.fillStyle = 'rgba(20,25,30,.5)'; x.fillRect(0, r * 16 + 15, 256, 1);
    for (let k = 0; k < 8; k++) { const xx = ((k + (r % 2) * 0.5) * 32) % 256; x.fillRect(xx, r * 16, 1, 16); }
  }
  grain(x, 256, 256, 3000, ['#202830', '#8a96a2']);
  return finish(c, { repeat: [2, 2] });
});

export const grass = () => once('grass', () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = '#5f8f45'; x.fillRect(0, 0, 512, 512);
  blotches(x, 512, 512, 120, ['#7aa556', '#4c7a37', '#8db365'], [15, 70], [0.15, 0.35]);
  for (let i = 0; i < 9000; i++) { // blades
    x.strokeStyle = rand() > 0.5 ? 'rgba(40,80,25,.35)' : 'rgba(170,205,120,.3)';
    const px = rand() * 512, py = rand() * 512; x.beginPath(); x.moveTo(px, py); x.lineTo(px + rand() * 2 - 1, py - 2 - rand() * 4); x.stroke();
  }
  return finish(c, { repeat: [4, 4] });
});

export const terrain = () => once('terrain', () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = '#7fa25c'; x.fillRect(0, 0, 512, 512);
  blotches(x, 512, 512, 160, ['#94b46a', '#6a8e4a', '#b4b77a', '#a39466', '#5d7f43'], [10, 60], [0.2, 0.45]);
  // field boundaries (hedgerows)
  x.strokeStyle = 'rgba(60,85,40,.35)'; x.lineWidth = 1.2;
  for (let i = 0; i < 70; i++) { const px = rand() * 512, py = rand() * 512, s = 14 + rand() * 30; x.strokeRect(px, py, s, s * (0.6 + rand())); }
  grain(x, 512, 512, 9000, ['#3f5d2c', '#c9d39a']);
  return finish(c, { repeat: [0.35, 0.35] });
});

export const sea = () => once('sea', () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 512, 512); g.addColorStop(0, '#5e93ad'); g.addColorStop(1, '#3f7590');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { // wave glints
    x.strokeStyle = `rgba(230,245,250,${0.06 + rand() * 0.14})`; x.lineWidth = 1 + rand();
    const px = rand() * 512, py = rand() * 512, l = 6 + rand() * 18; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py - 2, px + l, py); x.stroke();
  }
  grain(x, 512, 512, 4000, ['#1f4b61', '#a9d0df']);
  return finish(c, { repeat: [3, 3] });
});

export const leather = (base = '#6b1f24') => once('leather' + base, () => {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  blotches(x, 256, 256, 40, ['#000000', '#ffffff'], [8, 30], [0.03, 0.08]);
  grain(x, 256, 256, 9000, ['#1a0507', '#c87a7a'], [1, 2], [0.05, 0.15]);
  return finish(c);
});

export const felt = (base = '#2f5d4a') => once('felt' + base, () => {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  grain(x, 256, 256, 16000, ['#163a2c', '#6f9d86'], [1, 2], [0.06, 0.16]);
  return finish(c, { repeat: [3, 3] });
});

export const basalt = () => stone('#3b3d40', false);
export const rock = () => once('rock', () => {
  const c = canvas(256, 256), x = c.getContext('2d');
  x.fillStyle = '#5b5a52'; x.fillRect(0, 0, 256, 256);
  blotches(x, 256, 256, 70, ['#7b7a6e', '#3e3d38', '#6f7a55'], [8, 40], [0.2, 0.45]);
  grain(x, 256, 256, 8000, ['#2b2a26', '#a3a294']);
  return finish(c, { repeat: [2, 2] });
});
export const cobbles = () => once('cobbles', () => {
  const c = canvas(512, 512), x = c.getContext('2d');
  x.fillStyle = '#6e6a62'; x.fillRect(0, 0, 512, 512);
  for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) {
    const cx = k * 32 + (r % 2) * 16 + 16, cy = r * 32 + 16, v = 120 + rand() * 60;
    x.fillStyle = `rgb(${v},${v - 6},${v - 14})`; x.beginPath(); x.ellipse(cx, cy, 13 + rand() * 2, 12 + rand() * 2, rand(), 0, Math.PI * 2); x.fill();
  }
  grain(x, 512, 512, 6000, ['#2d2b27', '#d6d0c2']);
  return finish(c, { repeat: [10, 10] });
});

/* ------------------------------------------------------------- the maps */
const LON0 = -3, LAT0 = 54.5, KX = Math.cos(LAT0 * Math.PI / 180);

// a printed atlas sheet of the British Isles with the route drawn on it
export const atlasSheet = () => once('atlasSheet', () => {
  const W = 1536, H = 1152, c = canvas(W, H), x = c.getContext('2d');
  // area shown: lon -11 → 7, lat 49 → 60.5
  const px = (lon, lat) => [((lon + 11) / 18) * W, ((60.5 - lat) / 11.5) * H * 1.0];
  x.fillStyle = '#f1e8d2'; x.fillRect(0, 0, W, H);
  blotches(x, W, H, 120, ['#e2d2ad', '#fbf6ea'], [30, 140], [0.2, 0.4]);
  // sea
  x.fillStyle = '#c7dde0'; x.fillRect(40, 40, W - 80, H - 80);
  for (let i = 0; i < 1600; i++) { x.strokeStyle = `rgba(80,130,150,${0.05 + rand() * 0.1})`; const a = rand() * W, b = rand() * H; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 8, b); x.stroke(); }
  // graticule
  x.strokeStyle = 'rgba(70,90,110,.35)'; x.lineWidth = 1.2; x.setLineDash([6, 6]);
  for (let lon = -10; lon <= 6; lon += 2) { const [a] = px(lon, 0); x.beginPath(); x.moveTo(a, 40); x.lineTo(a, H - 40); x.stroke(); }
  for (let lat = 50; lat <= 60; lat += 2) { const [, b] = px(0, lat); x.beginPath(); x.moveTo(40, b); x.lineTo(W - 40, b); x.stroke(); }
  x.setLineDash([]);
  const poly = (pts, fill, stroke) => {
    x.beginPath(); pts.forEach(([lo, la], i) => { const [a, b] = px(lo, la); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath();
    // coastal halo, then the land
    x.save(); x.strokeStyle = 'rgba(70,120,140,.35)'; x.lineWidth = 14; x.stroke(); x.restore();
    x.fillStyle = fill; x.fill(); x.strokeStyle = stroke; x.lineWidth = 2.2; x.stroke();
  };
  poly(IRELAND, '#d9d3a5', '#5a4a36');
  ['england', 'wales', 'scotland', 'ni'].forEach((k, i) => poly(NATIONS[k], ['#b9cf8f', '#a8c78a', '#c3cf93', '#b3cc8d'][i], '#4a3b2a'));
  // relief shading on the land
  x.save(); x.globalCompositeOperation = 'multiply';
  blotches(x, W, H, 90, ['#8fa46a', '#b3a377'], [20, 70], [0.15, 0.3]);
  x.restore();
  // re-paint the sea over the multiply (so it stays clean)
  // route: from the south-east edge to London, red dashes and arrow
  const [lx, ly] = px(-0.13, 51.51);
  x.strokeStyle = '#c62a1f'; x.lineWidth = 6; x.setLineDash([18, 12]); x.lineCap = 'round';
  x.beginPath(); x.moveTo(W - 60, H - 90); x.bezierCurveTo(W - 260, H - 120, W - 360, ly + 40, lx + 8, ly + 6); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#c62a1f'; x.beginPath(); x.arc(lx, ly, 11, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff8ea'; x.lineWidth = 3; x.stroke();
  // labels (decorative, as printed on a map)
  x.fillStyle = '#3b2f22'; x.textAlign = 'center';
  x.font = 'italic 600 40px Georgia, "Times New Roman", serif'; x.fillText('The British Isles', W / 2, 100);
  x.font = '600 22px Georgia, serif'; x.letterSpacing = '6px';
  x.fillText('NORTH SEA', ...px(3.2, 56.5)); x.fillText('ATLANTIC OCEAN', ...px(-9, 52.3));
  x.font = '600 18px Georgia, serif'; x.fillText('LONDON', lx - 70, ly - 12);
  // compass rose
  const cx = 230, cy = H - 230; x.save(); x.translate(cx, cy);
  x.strokeStyle = '#5a4a36'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 90, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(0, 0, 70, 0, Math.PI * 2); x.stroke();
  for (let k = 0; k < 8; k++) { x.rotate(Math.PI / 4); x.fillStyle = k % 2 ? '#5a4a36' : '#c62a1f'; x.beginPath(); x.moveTo(0, -(k % 2 ? 60 : 105)); x.lineTo(10, 0); x.lineTo(-10, 0); x.closePath(); x.fill(); }
  x.restore(); x.font = '700 26px Georgia, serif'; x.fillStyle = '#3b2f22'; x.fillText('N', cx, cy - 116);
  // border
  x.strokeStyle = '#5a4a36'; x.lineWidth = 3; x.strokeRect(30, 30, W - 60, H - 60); x.lineWidth = 1; x.strokeRect(40, 40, W - 80, H - 80);
  grain(x, W, H, 20000, ['#6b5a40', '#ffffff'], [1, 2], [0.03, 0.08]);
  return finish(c, { anisotropy: 8 });
});

// equirectangular Earth for the globe: sea, land coloured by climate band, ice
export const earth = () => once('earth', () => {
  const W = 2048, H = 1024, c = canvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2f5f7c'); g.addColorStop(0.5, '#2c6f94'); g.addColorStop(1, '#2f5f7c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  blotches(x, W, H, 260, ['#3b84a8', '#24526d', '#4a93b3'], [20, 120], [0.12, 0.3]);
  const px = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  // land, clipped, then painted by latitude bands
  x.save(); x.beginPath();
  LAND.forEach((ring) => { ring.forEach(([lo, la], i) => { const [a, b] = px(lo, la); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); });
  x.clip();
  const lg = x.createLinearGradient(0, 0, 0, H);
  [[0, '#e9eef0'], [0.1, '#8fa375'], [0.2, '#4f7d3a'], [0.28, '#5e8a3e'], [0.34, '#a8935a'], [0.4, '#d7b06a'], [0.46, '#c9a463'], [0.5, '#3f7d35'], [0.56, '#4a8a3c'], [0.62, '#cfa967'], [0.7, '#7f9c58'], [0.85, '#8a9d74'], [0.93, '#e9eef0'], [1, '#f4f7f8']].forEach(([o, col]) => lg.addColorStop(o, col));
  x.fillStyle = lg; x.fillRect(0, 0, W, H);
  blotches(x, W, H, 500, ['#5c7d3f', '#c9ad73', '#8a9a5e', '#a08a5a'], [10, 60], [0.2, 0.4]);
  grain(x, W, H, 30000, ['#3d5528', '#e6d6a6']);
  x.restore();
  // coast line
  x.strokeStyle = 'rgba(240,235,215,.35)'; x.lineWidth = 1.5;
  LAND.forEach((ring) => { x.beginPath(); ring.forEach(([lo, la], i) => { const [a, b] = px(lo, la); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); x.stroke(); });
  // polar ice
  x.fillStyle = 'rgba(240,246,248,.85)'; x.fillRect(0, 0, W, H * 0.018); x.fillRect(0, H * 0.965, W, H * 0.035);
  return finish(c, { anisotropy: 8 });
});

export const clouds = () => once('clouds', () => {
  const W = 1024, H = 512, c = canvas(W, H), x = c.getContext('2d');
  x.clearRect(0, 0, W, H);
  for (let i = 0; i < 150; i++) {
    const cx = rand() * W, cy = H * 0.12 + rand() * H * 0.76, rr = 6 + rand() * 30;
    for (let k = 0; k < 4; k++) {
      const gx = cx + (rand() - 0.5) * rr * 2.4, gy = cy + (rand() - 0.5) * rr * 0.8, gr = rr * (0.5 + rand() * 0.6);
      const g = x.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
  }
  return finish(c);
});

/* ------------------------------------------------------- printed items */
function card(w, h, draw, opts) { const c = canvas(w, h); draw(c.getContext('2d'), w, h); return finish(c, opts); }

export const passportCover = () => once('passport', () => card(512, 720, (x, w, h) => {
  x.fillStyle = '#6b1f24'; x.fillRect(0, 0, w, h);
  grain(x, w, h, 14000, ['#2a0a0c', '#c87a7a'], [1, 2], [0.05, 0.14]);
  x.strokeStyle = '#d8b56a'; x.fillStyle = '#d8b56a'; x.lineWidth = 6;
  x.beginPath(); x.arc(w / 2, h * 0.45, 90, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.ellipse(w / 2, h * 0.45, 40, 90, 0, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(w / 2 - 90, h * 0.45); x.lineTo(w / 2 + 90, h * 0.45); x.stroke();
  x.textAlign = 'center'; x.font = '700 46px Georgia, serif'; x.fillText('PASSPORT', w / 2, h * 0.78);
}));

export const boardingPass = () => once('pass', () => card(1024, 420, (x, w, h) => {
  x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#0f1b2d'; x.fillRect(0, 0, w, 96);
  x.fillStyle = '#c62a1f'; x.fillRect(0, 96, w, 10);
  x.fillStyle = '#fbf8f1'; x.font = '700 40px Arial, sans-serif'; x.fillText('ROUTE TICKET', 40, 64);
  x.textAlign = 'right'; x.font = '700 26px Arial, sans-serif'; x.fillText('FREE CONSULTATION', w - 40, 62); x.textAlign = 'left';
  x.fillStyle = '#5a6373'; x.font = '700 22px Arial, sans-serif'; x.fillText('FROM', 40, 168); x.fillText('TO', 600, 168);
  x.fillStyle = '#0f1b2d'; x.font = '300 72px Arial, sans-serif'; x.fillText('YOUR CITY', 40, 260); x.fillText('UK', 600, 260);
  x.strokeStyle = '#c62a1f'; x.lineWidth = 4; x.setLineDash([14, 10]); x.beginPath(); x.moveTo(440, 236); x.lineTo(580, 236); x.stroke(); x.setLineDash([]);
  x.strokeStyle = 'rgba(15,27,45,.35)'; x.setLineDash([8, 8]); x.beginPath(); x.moveTo(790, 110); x.lineTo(790, h); x.stroke(); x.setLineDash([]);
  for (let i = 0; i < 46; i++) { x.fillStyle = '#0f1b2d'; const bw = 1 + (rand() * 4) | 0; x.fillRect(830 + i * 3.6, 300, bw, 80); }
  x.fillStyle = '#5a6373'; x.font = '600 22px Arial, sans-serif'; x.fillText('Tutee Connect', 40, 370);
}));

export const docPage = () => once('doc', () => card(512, 680, (x, w, h) => {
  x.fillStyle = '#fbf9f3'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#0f1b2d'; x.fillRect(48, 56, 220, 14);
  x.fillStyle = 'rgba(58,69,88,.55)';
  for (let r = 0; r < 24; r++) x.fillRect(48, 110 + r * 22, 300 + rand() * 120, 6);
  x.strokeStyle = 'rgba(198,42,31,.75)'; x.lineWidth = 6; x.beginPath(); x.arc(380, 560, 58, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(380, 560, 44, 0, Math.PI * 2); x.stroke();
  grain(x, w, h, 3000, ['#c8bfae', '#ffffff']);
}));

export const clockFace = () => once('clock', () => card(256, 256, (x, w) => {
  x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2b2a26'; x.lineWidth = 8; x.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.lineWidth = 6; x.beginPath(); x.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); x.lineTo(128 + Math.sin(a) * 108, 128 - Math.cos(a) * 108); x.stroke(); }
  x.lineWidth = 7; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + 55, 128 - 30); x.stroke();
  x.lineWidth = 5; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 - 10, 128 - 85); x.stroke();
}));

export const compassRose = () => once('rose', () => card(256, 256, (x) => {
  x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#3b2f22'; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, l = i % 9 === 0 ? 16 : 7; x.lineWidth = 1.5; x.beginPath(); x.moveTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); x.lineTo(128 + Math.sin(a) * (112 - l), 128 - Math.cos(a) * (112 - l)); x.stroke(); }
  x.fillStyle = '#3b2f22'; x.font = '700 22px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([t, d]) => { const a = d * Math.PI / 180; x.fillText(t, 128 + Math.sin(a) * 82, 128 - Math.cos(a) * 82); });
}));

// postcards from each student's city (texture changes per card)
export function postcard(city) {
  return once('card' + city, () => card(512, 340, (x, w, h) => {
    x.fillStyle = '#fbf6ea'; x.fillRect(0, 0, w, h);
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2c6e8f'); g.addColorStop(1, '#c4693f');
    x.fillStyle = g; x.fillRect(16, 16, w - 32, h - 120);
    // a skyline silhouette
    x.fillStyle = 'rgba(15,27,45,.75)'; let xx = 16;
    while (xx < w - 16) { const bw = 14 + rand() * 36, bh = 30 + rand() * 90; x.fillRect(xx, h - 104 - bh, bw, bh); if (rand() > 0.7) { x.beginPath(); x.moveTo(xx, h - 104 - bh); x.lineTo(xx + bw / 2, h - 134 - bh); x.lineTo(xx + bw, h - 104 - bh); x.fill(); } xx += bw + 2; }
    x.fillStyle = '#fbf6ea'; x.font = 'italic 600 26px Georgia, serif'; x.fillText('Greetings from', 34, 52);
    x.font = '800 54px Arial, sans-serif'; x.fillText(city.toUpperCase(), 34, 110);
    x.fillStyle = '#0f1b2d'; x.font = '600 22px Georgia, serif'; x.fillText('Tutee Connect student story', 30, h - 60);
    x.fillStyle = '#c62a1f'; x.fillRect(w - 90, h - 92, 60, 72); x.strokeStyle = '#fbf6ea'; x.lineWidth = 3; x.setLineDash([4, 4]); x.strokeRect(w - 86, h - 88, 52, 64); x.setLineDash([]);
  }));
}

// the banner on the college gate tower (redrawn when the city changes)
export function banner() {
  const c = canvas(512, 768), x = c.getContext('2d'), t = finish(c);
  t.draw = (city, n) => {
    x.fillStyle = '#9e2219'; x.fillRect(0, 0, 512, 768);
    grain(x, 512, 768, 6000, ['#5a120c', '#e0786c'], [1, 2], [0.06, 0.14]);
    x.strokeStyle = '#d8b56a'; x.lineWidth = 10; x.strokeRect(24, 24, 464, 720);
    x.fillStyle = '#f6e7c4'; x.textAlign = 'center';
    x.font = '800 74px Arial, sans-serif'; x.fillText(city.toUpperCase(), 256, 260, 430);
    x.font = '600 34px Georgia, serif'; x.fillText(n + (n === 1 ? ' top-ranked' : ' top-ranked'), 256, 360);
    x.fillText(n === 1 ? 'university' : 'universities', 256, 404);
    x.beginPath(); x.moveTo(256 - 60, 520); x.lineTo(256, 470); x.lineTo(256 + 60, 520); x.lineTo(256 + 60, 600); x.lineTo(256, 650); x.lineTo(256 - 60, 600); x.closePath(); x.stroke();
    t.needsUpdate = true;
  };
  return t;
}

export function facade(colour) {
  return once('facade' + colour, () => card(256, 512, (x, w, h) => {
    x.fillStyle = colour; x.fillRect(0, 0, w, h);
    grain(x, w, h, 4000, ['#000000', '#ffffff'], [1, 2], [0.02, 0.06]);
    const win = (wx, wy, ww, wh) => { x.fillStyle = '#fbf8f1'; x.fillRect(wx - 6, wy - 6, ww + 12, wh + 12); x.fillStyle = '#2d3b4d'; x.fillRect(wx, wy, ww, wh); x.fillStyle = '#fbf8f1'; x.fillRect(wx + ww / 2 - 2, wy, 4, wh); x.fillRect(wx, wy + wh / 2 - 2, ww, 4); };
    win(40, 50, 60, 90); win(156, 50, 60, 90); win(40, 200, 60, 90); win(156, 200, 60, 90);
    x.fillStyle = '#fbf8f1'; x.fillRect(0, 170, w, 8); x.fillRect(0, 330, w, 8);
    win(156, 370, 60, 80);
    x.fillStyle = '#fbf8f1'; x.fillRect(34, 352, 76, 160); x.fillStyle = '#1f3b2f'; x.fillRect(44, 366, 56, 146);
    x.fillStyle = '#d8b56a'; x.beginPath(); x.arc(92, 440, 4, 0, Math.PI * 2); x.fill();
  }));
}

export const collegeWall = () => once('collegeWall', () => {
  const c = canvas(512, 256), x = c.getContext('2d');
  x.drawImage(stone('#d6c7a3').image, 0, 0, 512, 256);
  for (let i = 0; i < 6; i++) { // gothic windows
    const wx = 30 + i * 82, wy = 70, ww = 40, wh = 110;
    x.fillStyle = '#e8ddc2'; x.beginPath(); x.moveTo(wx - 6, wy + wh + 6); x.lineTo(wx - 6, wy + 14); x.quadraticCurveTo(wx + ww / 2, wy - 30, wx + ww + 6, wy + 14); x.lineTo(wx + ww + 6, wy + wh + 6); x.fill();
    x.fillStyle = '#2f3d4f'; x.beginPath(); x.moveTo(wx, wy + wh); x.lineTo(wx, wy + 18); x.quadraticCurveTo(wx + ww / 2, wy - 20, wx + ww, wy + 18); x.lineTo(wx + ww, wy + wh); x.fill();
    x.strokeStyle = '#d6c7a3'; x.lineWidth = 3; x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.moveTo(wx, wy + 60); x.lineTo(wx + ww, wy + 60); x.stroke();
  }
  return finish(c, { repeat: [1, 1] });
});

export const bookCover = () => once('book', () => card(256, 256, (x, w, h) => {
  x.fillStyle = '#1f4a3c'; x.fillRect(0, 0, w, h);
  grain(x, w, h, 4000, ['#0c2219', '#5d8a78']);
  x.strokeStyle = '#d8b56a'; x.lineWidth = 4; x.strokeRect(16, 16, w - 32, h - 32);
}));
