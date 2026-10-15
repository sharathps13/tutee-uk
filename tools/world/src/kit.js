// Modelling kit: shared materials and primitive builders for the scenes.
// Everything is built from primitives + procedural textures (textures.js).
import {
  Mesh, Group, MeshStandardMaterial, MeshBasicMaterial, BoxGeometry, CylinderGeometry, ConeGeometry,
  SphereGeometry, TorusGeometry, PlaneGeometry, CapsuleGeometry, IcosahedronGeometry, Shape,
  ExtrudeGeometry, Vector3, DoubleSide
} from 'three';
import * as TX from './textures.js';

export const PALETTE = {
  ink: '#0f1b2d', red: '#c62a1f', brass: '#c69a3e', gold: '#d8b56a', paper: '#fbf8f1',
  green: '#1f4a3c', sea: '#2c6e8f', sand: '#ead7b1', terracotta: '#c4693f'
};

const mats = new Map();
export function mat(key, opts) {
  if (!mats.has(key)) mats.set(key, new MeshStandardMaterial(opts));
  return mats.get(key);
}
// common materials
export const M = {
  brass: () => mat('brass', { color: '#c69a3e', metalness: 0.9, roughness: 0.32 }),
  gold: () => mat('gold', { color: '#e0b552', metalness: 1, roughness: 0.25 }),
  steel: () => mat('steel', { color: '#9aa3ad', metalness: 0.85, roughness: 0.35 }),
  darkMetal: () => mat('darkMetal', { color: '#2b2f35', metalness: 0.7, roughness: 0.45 }),
  red: () => mat('red', { color: '#c62a1f', roughness: 0.45 }),
  redGlow: () => mat('redGlow', { color: '#c62a1f', emissive: '#c62a1f', emissiveIntensity: 0.55, roughness: 0.4 }),
  white: () => mat('white', { color: '#f7f3ea', roughness: 0.55 }),
  ceramic: () => mat('ceramic', { color: '#f2eee6', roughness: 0.25 }),
  ink: () => mat('ink', { color: '#0f1b2d', roughness: 0.6 }),
  paper: () => mat('paper', { map: TX.paper(), roughness: 0.9 }),
  wood: (tint) => mat('wood' + (tint || ''), { map: TX.wood(tint), roughness: 0.62 }),
  stone: (base) => mat('stone' + (base || ''), { map: TX.stone(base), roughness: 0.92 }),
  stoneSmooth: (base) => mat('stoneS' + (base || ''), { map: TX.stone(base, false), roughness: 0.9 }),
  slate: () => mat('slate', { map: TX.slate(), roughness: 0.8 }),
  grass: () => mat('grass', { map: TX.grass(), roughness: 0.95 }),
  leaf: () => mat('leaf', { color: '#4f7c3a', roughness: 0.9 }),
  leaf2: () => mat('leaf2', { color: '#6e9a45', roughness: 0.9 }),
  bark: () => mat('bark', { color: '#5a4030', roughness: 0.95 }),
  leather: (c) => mat('leather' + (c || ''), { map: TX.leather(c), roughness: 0.6 }),
  felt: (c) => mat('felt' + (c || ''), { map: TX.felt(c), roughness: 1 }),
  rock: () => mat('rock', { map: TX.rock(), roughness: 1, flatShading: true }),
  basalt: () => mat('basalt', { map: TX.basalt(), roughness: 0.85, flatShading: true }),
  glass: () => mat('glass', { color: '#dfeef3', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28 }),
  skin: (i = 0) => mat('skin' + i, { color: ['#a8755a', '#7d5440', '#c49270'][i % 3], roughness: 0.7 }),
  cloth: (c) => mat('cloth' + c, { color: c, roughness: 0.85 })
};

function place(m, o = {}) {
  if (o.x !== undefined || o.y !== undefined || o.z !== undefined) m.position.set(o.x || 0, o.y || 0, o.z || 0);
  if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  if (o.s) m.scale.setScalar(o.s);
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  if (o.parent) o.parent.add(m);
  return m;
}
export const box = (w, h, d, material, o) => place(new Mesh(new BoxGeometry(w, h, d), material), o);
export const cyl = (rt, rb, h, material, o = {}) => place(new Mesh(new CylinderGeometry(rt, rb, h, o.seg || 32, 1, !!o.open), material), o);
export const cone = (r, h, material, o = {}) => place(new Mesh(new ConeGeometry(r, h, o.seg || 32), material), o);
export const sphere = (r, material, o = {}) => place(new Mesh(new SphereGeometry(r, o.seg || 32, o.seg2 || 20), material), o);
export const torus = (r, t, material, o = {}) => place(new Mesh(new TorusGeometry(r, t, o.seg2 || 12, o.seg || 48, o.arc || Math.PI * 2), material), o);
export const plane = (w, h, material, o) => place(new Mesh(new PlaneGeometry(w, h), material), o);
export const capsule = (r, l, material, o) => place(new Mesh(new CapsuleGeometry(r, l, 6, 12), material), o);
export function group(o = {}) { const g = new Group(); if (o.x !== undefined || o.y !== undefined || o.z !== undefined) g.position.set(o.x || 0, o.y || 0, o.z || 0); if (o.ry) g.rotation.y = o.ry; if (o.s) g.scale.setScalar(o.s); if (o.parent) o.parent.add(g); return g; }

// a pitched roof (triangular prism) of width w (x), depth d (z), height h
export function roof(w, d, h, material, o) {
  const s = new Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return place(new Mesh(g, material), o);
}
// a crenellated top ring for towers/walls
export function crenels(r, h, n, material, o = {}) {
  const g = group(o);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; box(r * 0.42, h, r * 0.28, material, { x: Math.cos(a) * r, z: Math.sin(a) * r, y: h / 2, ry: -a, parent: g }); }
  return g;
}
// a low-poly tree
export function tree(o = {}) {
  const g = group(o), s = o.size || 1;
  cyl(0.06 * s, 0.09 * s, 0.6 * s, M.bark(), { y: 0.3 * s, seg: 6, parent: g });
  if (o.kind === 'cone') cone(0.42 * s, 1.2 * s, M.leaf(), { y: 1.1 * s, seg: 8, parent: g });
  else { sphere(0.45 * s, o.light ? M.leaf2() : M.leaf(), { y: 0.95 * s, seg: 8, seg2: 6, parent: g }); sphere(0.32 * s, M.leaf2(), { x: 0.22 * s, y: 1.2 * s, seg: 8, seg2: 6, parent: g }); }
  return g;
}
// a simple person (capsule body + head); colour = clothing
export function person(o = {}) {
  const g = group(o), s = o.size || 1;
  capsule(0.16 * s, 0.42 * s, M.cloth(o.colour || '#2c6e8f'), { y: 0.38 * s, parent: g });
  sphere(0.13 * s, M.skin(o.skin || 0), { y: 0.82 * s, seg: 16, seg2: 12, parent: g });
  if (o.cap) { box(0.34 * s, 0.03 * s, 0.34 * s, M.ink(), { y: 0.98 * s, ry: 0.4, parent: g }); cyl(0.11 * s, 0.11 * s, 0.07 * s, M.ink(), { y: 0.94 * s, parent: g }); }
  return g;
}
// a rough rock (displaced icosahedron)
export function boulder(r, o = {}) {
  const geo = new IcosahedronGeometry(r, 2), p = geo.attributes.position, v = new Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + (Math.sin(v.x * 3.1) + Math.cos(v.z * 2.7) + Math.sin(v.y * 4.3)) * 0.07; p.setXYZ(i, v.x * k, v.y * k * (o.flat || 0.7), v.z * k); }
  geo.computeVertexNormals();
  return place(new Mesh(geo, M.rock()), o);
}
// a printed sheet (paper, ticket…) with a slight curl
export function sheet(w, h, map, o = {}) {
  const geo = new PlaneGeometry(w, h, 16, 8), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, (o.curl || 0.04) * (Math.pow(x / (w / 2), 2) + 0.5 * Math.pow(y / (h / 2), 4))); }
  geo.computeVertexNormals();
  const m = new Mesh(geo, new MeshStandardMaterial({ map, roughness: 0.85, side: DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  return place(m, { ...o, rx: -Math.PI / 2 });
}
export const unlit = (color, o = {}) => new MeshBasicMaterial({ color, transparent: !!o.opacity, opacity: o.opacity ?? 1, depthWrite: !o.opacity });
