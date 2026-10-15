// The Atlas scenes: one small, purpose-built set per chapter. Each builder
// returns { group, update(st, k) → moving?, focus(st) → Vector3|null } where
// `st` is the shared world state and `k` the easing factor for this frame.
import {
  Mesh, Group, Vector3, Quaternion, CatmullRomCurve3, TubeGeometry, SphereGeometry, CircleGeometry,
  MeshStandardMaterial, MeshBasicMaterial, ShaderMaterial, AdditiveBlending, BackSide, Shape,
  ExtrudeGeometry, InstancedMesh, Object3D, CylinderGeometry, Color, PlaneGeometry, BufferGeometry,
  LineDashedMaterial, Line
} from 'three';
import * as TX from './textures.js';
import { M, mat, box, cyl, cone, sphere, torus, plane, roof, crenels, tree, person, boulder, sheet, group } from './kit.js';
import { NATIONS, IRELAND, NATION_CITIES } from './geo.js';

const ease = (o, key, want, k) => { const d = want - o[key]; if (Math.abs(d) < 0.001) { o[key] = want; return false; } o[key] += d * k; return true; };

/* ----------------------------------------------------------- shared props */
function compass(o = {}) {
  const g = group(o);
  cyl(1.1, 1.15, 0.28, M.brass(), { y: 0.14, parent: g });
  const face = new Mesh(new CircleGeometry(0.98, 48), new MeshStandardMaterial({ map: TX.compassRose(), roughness: 0.6 }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.285; face.receiveShadow = true; g.add(face);
  const needle = group({ y: 0.31, parent: g, ry: 0.5 });
  cone(0.09, 0.85, M.red(), { z: -0.42, rx: -Math.PI / 2, seg: 4, parent: needle });
  cone(0.09, 0.85, M.white(), { z: 0.42, rx: Math.PI / 2, seg: 4, parent: needle });
  cyl(0.06, 0.06, 0.06, M.brass(), { y: 0.02, parent: needle });
  cyl(1.0, 1.0, 0.04, M.glass(), { y: 0.37, cast: false, parent: g });
  torus(1.1, 0.07, M.brass(), { y: 0.3, rx: Math.PI / 2, parent: g });
  torus(0.14, 0.04, M.brass(), { y: 0.28, z: -1.2, parent: g });
  return g;
}
function passport(o = {}, open = false) {
  const g = group(o), cover = new MeshStandardMaterial({ map: TX.passportCover(), roughness: 0.55 }), edge = M.leather();
  if (!open) { box(2.2, 0.16, 3.1, [edge, edge, cover, edge, edge, edge], { y: 0.08, parent: g }); return g; }
  box(2.2, 0.06, 3.1, edge, { x: -1.12, y: 0.03, parent: g });
  const page = new MeshStandardMaterial({ map: TX.docPage(), roughness: 0.9 });
  box(2.1, 0.08, 3.0, [M.white(), M.white(), page, M.white(), M.white(), M.white()], { x: 1.08, y: 0.04, parent: g });
  box(0.06, 0.1, 3.1, edge, { y: 0.05, parent: g });
  return g;
}
function coinStacks(o = {}, n = 4) {
  const g = group(o), heights = [7, 4, 9, 5, 6];
  for (let s = 0; s < n; s++) {
    const sx = (s - (n - 1) / 2) * 0.62, sz = (s % 2) * 0.35;
    for (let i = 0; i < heights[s]; i++) cyl(0.27, 0.27, 0.07, M.gold(), { x: sx + Math.sin(i * 1.7) * 0.02, y: 0.036 + i * 0.072, z: sz, seg: 24, parent: g });
  }
  return g;
}
function paperStack(o = {}) {
  const g = group(o), page = new MeshStandardMaterial({ map: TX.docPage(), roughness: 0.9 });
  for (let i = 0; i < 6; i++) box(1.5, 0.02, 2.0, [M.white(), M.white(), page, M.white(), M.white(), M.white()], { y: 0.01 + i * 0.022, ry: (Math.sin(i * 2.3)) * 0.12, parent: g });
  cyl(0.22, 0.24, 0.05, M.redGlow(), { x: 0.35, y: 0.16, z: 0.55, parent: g });          // wax seal
  const pen = group({ x: -0.3, y: 0.18, z: 0.1, ry: 0.7, parent: g });
  cyl(0.06, 0.06, 1.4, M.ink(), { rz: Math.PI / 2, parent: pen });
  cone(0.06, 0.25, M.gold(), { x: 0.82, rz: -Math.PI / 2, seg: 12, parent: pen });
  cyl(0.065, 0.065, 0.12, M.gold(), { x: -0.3, rz: Math.PI / 2, parent: pen });
  return g;
}
function microphone(o = {}) {
  const g = group(o);
  cyl(0.45, 0.5, 0.08, M.darkMetal(), { y: 0.04, parent: g });
  cyl(0.04, 0.04, 1.3, M.steel(), { y: 0.7, parent: g });
  const head = group({ y: 1.45, rx: -0.35, parent: g });
  capsule2(head);
  return g;
}
function capsule2(parent) {
  cyl(0.17, 0.12, 0.5, M.darkMetal(), { y: -0.18, parent });
  sphere(0.24, mat('grille', { color: '#55595f', metalness: 0.8, roughness: 0.5, wireframe: false }), { y: 0.12, parent });
  torus(0.235, 0.025, M.steel(), { y: 0.06, rx: Math.PI / 2, parent });
}
function suitcase(o = {}, colour = '#a8703c') {
  const g = group(o), l = M.leather(colour);
  box(1.6, 1.15, 0.52, l, { y: 0.6, parent: g });
  [-0.55, 0.55].forEach((x) => box(0.1, 1.17, 0.54, M.leather('#5a3a1f'), { x, y: 0.6, parent: g }));
  torus(0.2, 0.05, M.leather('#5a3a1f'), { y: 1.22, arc: Math.PI, parent: g });
  [[-0.78, 0.04], [0.78, 0.04], [-0.78, 1.16], [0.78, 1.16]].forEach(([x, y]) => box(0.08, 0.08, 0.56, M.brass(), { x, y, parent: g }));
  box(0.32, 0.46, 0.02, M.red(), { x: 0.5, y: 0.98, z: 0.33, rz: 0.25, parent: g });      // luggage tag
  return g;
}
function house(o = {}, colour = '#e8a5a0') {
  const g = group(o);
  box(1.1, 0.9, 0.9, mat('house' + colour, { color: colour, roughness: 0.8 }), { y: 0.45, parent: g });
  roof(1.25, 1.0, 0.55, M.slate(), { y: 0.9, parent: g });
  box(0.26, 0.5, 0.02, M.ink(), { y: 0.25, z: 0.46, parent: g });
  box(0.22, 0.22, 0.02, mat('win', { color: '#a9c6d6', roughness: 0.2 }), { x: 0.3, y: 0.55, z: 0.46, parent: g });
  box(0.12, 0.35, 0.12, mat('brick', { color: '#9b4a35', roughness: 0.9 }), { x: 0.3, y: 1.25, z: -0.15, parent: g });
  return g;
}
function key(o = {}) {
  const g = group(o);
  torus(0.18, 0.05, M.brass(), { rx: Math.PI / 2, parent: g });
  cyl(0.04, 0.04, 0.7, M.brass(), { x: 0.52, rz: Math.PI / 2, parent: g });
  box(0.08, 0.02, 0.16, M.brass(), { x: 0.75, z: 0.08, parent: g });
  box(0.08, 0.02, 0.12, M.brass(), { x: 0.6, z: 0.06, parent: g });
  return g;
}
function gradCap(o = {}) {
  const g = group(o);
  cyl(0.4, 0.42, 0.32, M.ink(), { y: 0.16, parent: g });
  box(1.2, 0.06, 1.2, M.ink(), { y: 0.36, ry: Math.PI / 4, parent: g });
  cyl(0.06, 0.06, 0.04, M.gold(), { y: 0.41, parent: g });
  cyl(0.015, 0.015, 0.55, M.gold(), { x: 0.55, y: 0.15, rz: 0.2, parent: g });
  sphere(0.06, M.gold(), { x: 0.6, y: -0.12, parent: g });
  return g;
}
function headphonesOnBook(o = {}) {
  const g = group(o), cover = new MeshStandardMaterial({ map: TX.bookCover(), roughness: 0.7 });
  box(1.25, 0.08, 1.7, cover, { x: -0.64, y: 0.06, rz: 0.06, parent: g });
  box(1.25, 0.08, 1.7, cover, { x: 0.64, y: 0.06, rz: -0.06, parent: g });
  box(1.15, 0.06, 1.6, M.white(), { x: -0.6, y: 0.13, rz: 0.06, parent: g });
  box(1.15, 0.06, 1.6, M.white(), { x: 0.6, y: 0.13, rz: -0.06, parent: g });
  const h = group({ y: 0.2, z: 0.1, parent: g });
  torus(0.6, 0.06, M.darkMetal(), { y: 0.3, arc: Math.PI, rx: -1.2, parent: h });
  [-0.6, 0.6].forEach((x) => cyl(0.24, 0.24, 0.16, M.ink(), { x, y: 0.12, rz: Math.PI / 2, parent: h }));
  return g;
}
function family(o = {}) {
  const g = group(o);
  person({ x: -0.35, colour: '#2c6e8f', parent: g, skin: 0 });
  person({ x: 0.35, colour: '#c4693f', parent: g, skin: 1 });
  person({ x: 0, z: 0.25, colour: '#e0b552', size: 0.65, parent: g, skin: 2 });
  return g;
}
function mug(o = {}, colour = '#c4693f') {
  const g = group(o), glaze = mat('mug' + colour, { color: colour, roughness: 0.3 });
  cyl(0.62, 0.55, 1.2, glaze, { y: 0.6, parent: g });
  cyl(0.55, 0.55, 0.02, mat('coffee', { color: '#3b2314', roughness: 0.2 }), { y: 1.12, parent: g });
  torus(0.32, 0.08, glaze, { x: 0.7, y: 0.62, parent: g });
  return g;
}
function deskGlobe(o = {}) {
  const g = group(o);
  cyl(0.7, 0.85, 0.18, M.brass(), { y: 0.09, parent: g });
  cyl(0.06, 0.06, 0.6, M.brass(), { y: 0.45, parent: g });
  const ball = sphere(1.15, new MeshStandardMaterial({ map: TX.earth(), roughness: 0.55 }), { y: 1.9, seg: 48, seg2: 32, parent: g });
  ball.rotation.set(0.35, -1.9, 0.2);
  torus(1.25, 0.05, M.brass(), { y: 1.9, rx: 0.2, ry: Math.PI / 2, arc: Math.PI * 1.4, parent: g });
  return g;
}

/* =============================================================== 0 START */
export function buildStart() {
  const g = new Group();
  box(28, 0.6, 20, M.wood('#7b4f2c'), { y: -0.3, parent: g });
  sheet(12.6, 9.45, TX.atlasSheet(), { y: 0.03, rz: 0.05, curl: 0.12, parent: g });
  compass({ x: 6.2, y: 0, z: 3.0, parent: g });
  passport({ x: -7.6, z: 3.2, ry: 0.35, parent: g });
  const pencil = group({ x: 2.5, y: 0.13, z: -5.6, ry: 0.35, parent: g });
  cyl(0.13, 0.13, 4.2, mat('pencil', { color: '#e2b13c', roughness: 0.5 }), { rz: Math.PI / 2, seg: 6, parent: pencil });
  cone(0.13, 0.5, mat('pwood', { color: '#d9b48a', roughness: 0.8 }), { x: 2.35, rz: -Math.PI / 2, seg: 6, parent: pencil });
  cyl(0.14, 0.14, 0.3, M.brass(), { x: -2.0, rz: Math.PI / 2, parent: pencil });
  mug({ x: -8.2, z: -4.2, parent: g });
  return { group: g, update: () => false };
}

/* ======================================================= 1 THE HARD PARTS */
export function buildWorries() {
  const g = new Group();
  plane(60, 60, M.stoneSmooth('#cfc8ba'), { rx: -Math.PI / 2, parent: g });
  const objs = [coinStacks({}, 4), paperStack(), microphone(), suitcase()];
  const items = objs.map((obj, i) => {
    const x = (i - 1.5) * 2.9, z = -Math.abs(i - 1.5) * 0.8;
    const plinth = cyl(1.2, 1.3, 1.2, M.stoneSmooth('#e2dccf'), { x, y: 0.6, z, parent: g });
    torus(1.22, 0.06, M.brass(), { x, y: 1.2, z, rx: Math.PI / 2, parent: g });
    const ring = torus(1.22, 0.05, M.redGlow(), { x, y: 1.21, z, rx: Math.PI / 2, parent: g });
    ring.visible = false;
    const holder = group({ x, y: 1.2, z, parent: g });
    holder.add(obj);
    return { holder, ring, k: 0, base: 1.2 };
  });
  return {
    group: g,
    update(st, k) {
      let moving = false;
      items.forEach((it, i) => {
        moving = ease(it, 'k', st.worry === i ? 1 : 0, k) || moving;
        it.holder.position.y = it.base + it.k * 0.45;
        it.holder.rotation.y = it.k * 0.5;
        it.holder.scale.setScalar(1 + it.k * 0.15);
        it.ring.visible = it.k > 0.05; it.ring.scale.setScalar(0.8 + it.k * 0.2);
      });
      return moving;
    },
    focusAt: (st) => (st.worry >= 0 ? items[st.worry].holder.getWorldPosition(new Vector3()) : null)
  };
}

/* ============================================================ 2 THE ROUTE */
const R = 5;
function ll2v(lon, lat, r = R) {
  const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI;
  return new Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th));
}
export const WP_T = [0.08, 0.26, 0.44, 0.62, 0.8];
export function buildRoute(ctx) {
  const g = new Group(), globe = new Group(); g.add(globe);
  const earth = new Mesh(new SphereGeometry(R, 96, 64), new MeshStandardMaterial({ map: TX.earth(), roughness: 0.75, metalness: 0 }));
  earth.receiveShadow = true; globe.add(earth);
  const cloudMesh = new Mesh(new SphereGeometry(R * 1.018, 64, 48), new MeshStandardMaterial({ map: TX.clouds(), transparent: true, opacity: 0.55, depthWrite: false, roughness: 1 }));
  cloudMesh.rotation.y = 0.6; globe.add(cloudMesh);
  const atmo = new Mesh(new SphereGeometry(R * 1.06, 64, 48), new ShaderMaterial({
    transparent: true, blending: AdditiveBlending, side: BackSide, depthWrite: false,
    uniforms: { c: { value: new Color('#8ec5ff') } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 4.0); gl_FragColor = vec4(c * f * 1.1, f * 0.8); }'
  }));
  g.add(atmo);
  // the arc India → UK (great circle, lifted)
  const A = ll2v(77.2, 28.6).normalize(), B = ll2v(-0.13, 51.51).normalize();
  const pts = [], q = new Quaternion(), qa = new Quaternion(), qb = new Quaternion().setFromUnitVectors(A, B);
  for (let i = 0; i <= 64; i++) {
    const t = i / 64; q.copy(qa).slerp(qb, t);
    pts.push(A.clone().applyQuaternion(q).multiplyScalar(R + 0.04 + Math.sin(Math.PI * t) * 1.25));
  }
  const arc = new CatmullRomCurve3(pts);
  const tube = new Mesh(new TubeGeometry(arc, 240, 0.055, 8, false), M.redGlow());
  tube.geometry.setDrawRange(0, 0); globe.add(tube);
  const total = tube.geometry.index.count;
  // dashed plan
  const dash = new Line(new BufferGeometry().setFromPoints(arc.getPoints(160)), new LineDashedMaterial({ color: '#0f1b2d', dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.4 }));
  dash.computeLineDistances(); globe.add(dash);
  // the plane
  const jet = group({ parent: globe });
  const body = group({ parent: jet });
  cyl(0.09, 0.06, 0.8, M.white(), { rx: Math.PI / 2, parent: body });
  cone(0.09, 0.2, M.white(), { z: 0.5, rx: Math.PI / 2, parent: body });
  box(0.9, 0.02, 0.22, M.white(), { z: 0.02, parent: body });
  box(0.32, 0.02, 0.12, M.white(), { z: -0.34, parent: body });
  box(0.02, 0.18, 0.14, M.red(), { y: 0.09, z: -0.34, parent: body });
  // waypoints
  const LONDON = ll2v(-0.13, 51.51), up = LONDON.clone().normalize();
  const wpPos = WP_T.map((t) => arc.getPointAt(t)).concat([LONDON.clone().addScaledVector(up, 0.05), LONDON.clone().addScaledVector(up, 0.9), LONDON.clone().addScaledVector(up, 1.6)]);
  const wps = wpPos.map((p, i) => {
    const r = torus(0.16, 0.035, M.brass(), { parent: globe });
    r.position.copy(p); r.lookAt(p.clone().multiplyScalar(2)); return { r, k: 0, i };
  });
  const stalk = new Line(new BufferGeometry().setFromPoints([wpPos[5], wpPos[7]]), new LineDashedMaterial({ color: '#c62a1f', dashSize: 0.08, gapSize: 0.06 }));
  stalk.computeLineDistances(); globe.add(stalk);
  // face the arc's middle towards the viewer
  // turn the globe so the arc's middle faces the camera (+z) with north up
  const mid = arc.getPointAt(0.5).clone().normalize(), q1 = new Quaternion().setFromUnitVectors(mid, new Vector3(0.08, 0.28, 0.96).normalize());
  const north = new Vector3(0, 1, 0).applyQuaternion(q1), view = new Vector3(0.08, 0.28, 0.96).normalize();
  const nProj = north.clone().addScaledVector(view, -north.dot(view)).normalize(), upProj = new Vector3(0, 1, 0).addScaledVector(view, -view.y).normalize();
  const twist = new Quaternion().setFromUnitVectors(nProj, upProj);
  globe.quaternion.copy(twist.multiply(q1));
  const NAMES = ['Free profile evaluation', 'English test', 'University offer', 'Documents & CAS', 'Student visa', 'Landing in the UK', 'Graduate Route', 'Settlement'];
  const labels = wps.map((w, i) => ctx.label(String(i + 1).padStart(2, '0') + ' ' + NAMES[i], 'wl-step', w.r));
  const tan = new Vector3(), pos = new Vector3(), look = new Vector3(), state = { a: 0, b: 0 };
  return {
    group: g,
    update(st, k) {
      let moving = ease(state, 'a', st.routeA, k);
      moving = ease(state, 'b', st.routeB, k) || moving;
      tube.geometry.setDrawRange(0, Math.floor(state.a * total / 6) * 6);
      const t = Math.max(0.001, Math.min(0.999, state.a));
      arc.getPointAt(t, pos); arc.getTangentAt(t, tan);
      // the jet sits on the arc, nose along it, belly towards the Earth
      jet.position.copy(pos);
      const centre = g.getWorldPosition(new Vector3()), wp = globe.localToWorld(pos.clone());
      jet.up.copy(wp).sub(centre).normalize();
      look.copy(pos).add(tan); jet.lookAt(globe.localToWorld(look));
      jet.visible = state.a > 0.01 && state.a < 0.995;
      stalk.visible = state.b > 0.02;
      wps.forEach((w) => {
        const on = st.steps.indexOf(w.i) !== -1;
        moving = ease(w, 'k', on ? 1 : 0, k) || moving;
        w.r.scale.setScalar(1 + w.k * 0.9);
        w.r.material = w.k > 0.5 ? M.redGlow() : M.brass();
        w.r.visible = w.i < 6 ? true : state.b > (w.i === 6 ? 0.3 : 0.8);
        const lab = labels[w.i];
        // the step being read is labelled; earlier steps keep a label only while the route is still over India/Asia
        lab.show = w.r.visible && (on || (w.i < 4 && state.a >= WP_T[w.i] && st.steps[0] < 5));
        lab.active = on;
      });
      return moving;
    },
    focusAt: (st) => (st.steps.length ? wps[st.steps[0]].r.getWorldPosition(new Vector3()) : null)
  };
}

/* ========================================================= 3 WHY THE UK */
const LON0 = -3, LAT0 = 54.5, KX = Math.cos(LAT0 * Math.PI / 180);
const P = (lon, lat, y = 0) => new Vector3((lon - LON0) * KX, y, -(lat - LAT0));
function shapeOf(poly) { const s = new Shape(); poly.forEach(([lo, la], i) => { const p = P(lo, la); i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z); }); s.closePath(); return s; }
function inside(poly, lon, lat) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) c = !c; } return c; }

function clockTower(o) {
  const g = group(o), honey = M.stone('#d9c391');
  box(1.3, 0.45, 0.35, honey, { x: 0.75, y: 0.22, parent: g });               // the palace wing
  box(0.36, 1.7, 0.36, honey, { y: 0.85, parent: g });
  box(0.46, 0.46, 0.46, honey, { y: 1.9, parent: g });
  const face = new MeshStandardMaterial({ map: TX.clockFace(), roughness: 0.5, emissive: '#f2e2b6', emissiveIntensity: 0.15 });
  // a clock face on each side of the belfry
  [[0, 0, 0.235], [Math.PI / 2, 0.235, 0], [Math.PI, 0, -0.235], [-Math.PI / 2, -0.235, 0]].forEach(([ry, x, z]) => {
    const p = plane(0.36, 0.36, face, { x, y: 1.9, z, parent: g, cast: false });
    p.rotation.y = ry;
  });
  cone(0.34, 0.75, M.slate(), { y: 2.5, ry: Math.PI / 4, seg: 4, parent: g });
  cone(0.05, 0.4, M.gold(), { y: 3.05, seg: 8, parent: g });
  return g;
}
function castleOnRock(o) {
  const g = group(o);
  boulder(0.85, { y: 0.25, flat: 0.75, parent: g });
  const st = M.stone('#9c978a');
  box(1.0, 0.35, 0.5, st, { y: 0.78, parent: g });
  [[-0.45, -0.2], [0.45, 0.2]].forEach(([x, z]) => { cyl(0.16, 0.18, 0.6, st, { x, y: 0.9, z, parent: g }); crenels(0.15, 0.08, 8, st, { x, y: 1.2, z, parent: g }); });
  box(0.36, 0.5, 0.36, st, { x: 0.05, y: 1.05, parent: g });
  roof(0.42, 0.38, 0.26, M.slate(), { x: 0.05, y: 1.3, parent: g });
  return g;
}
function welshCastle(o) {
  const g = group(o), st = M.stone('#b8ad98');
  const towers = [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]];
  towers.forEach(([x, z]) => { cyl(0.17, 0.19, 0.75, st, { x, y: 0.37, z, parent: g }); crenels(0.16, 0.08, 8, st, { x, y: 0.75, z, parent: g }); });
  box(1.1, 0.5, 0.08, st, { y: 0.25, z: 0.4, parent: g }); box(1.1, 0.5, 0.08, st, { y: 0.25, z: -0.4, parent: g });
  box(0.08, 0.5, 0.8, st, { x: 0.55, y: 0.25, parent: g }); box(0.08, 0.5, 0.8, st, { x: -0.55, y: 0.25, parent: g });
  box(0.3, 0.32, 0.12, mat('gateDark', { color: '#2b2620', roughness: 1 }), { y: 0.16, z: 0.42, parent: g });
  cyl(0.012, 0.012, 0.6, M.darkMetal(), { x: 0.55, y: 1.05, z: -0.4, parent: g });
  box(0.3, 0.18, 0.01, mat('flagGW', { color: '#2e7d3b', roughness: 0.8 }), { x: 0.7, y: 1.24, z: -0.4, parent: g });
  box(0.3, 0.09, 0.012, M.white(), { x: 0.7, y: 1.29, z: -0.4, parent: g });
  return g;
}
function causeway(o) {
  const g = group(o), geo = new CylinderGeometry(0.12, 0.12, 1, 6), m = M.basalt();
  const inst = new InstancedMesh(geo, m, 34), d = new Object3D();
  for (let i = 0; i < 34; i++) {
    const r = Math.floor(i / 7), c = i % 7, h = 0.05 + Math.abs(Math.sin(i * 1.7)) * 0.22 + (4 - r) * 0.03;
    d.position.set((c - 3) * 0.21 + (r % 2) * 0.105, h / 2, (r - 2) * 0.18); d.scale.set(1, h, 1); d.rotation.y = 0.1; d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
  }
  inst.castShadow = inst.receiveShadow = true; g.add(inst);
  return g;
}
const LANDMARK = { england: [-0.13, 51.51], scotland: [-3.19, 55.95], wales: [-3.18, 51.48], ni: [-6.51, 55.24] };
export function buildWhy() {
  const g = new Group();
  plane(70, 70, mat('seaPlane', { map: TX.sea(), roughness: 0.35, metalness: 0.1 }), { rx: -Math.PI / 2, y: -0.02, parent: g });
  const cliff = M.stone('#e6dfcd', false), top = mat('terrain', { map: TX.terrain(), roughness: 0.95 });
  const topIre = mat('terrainIre', { map: TX.terrain(), color: '#d8dcb6', roughness: 0.95 });
  const ire = new Mesh(new ExtrudeGeometry(shapeOf(IRELAND), { depth: 0.12, bevelEnabled: false, curveSegments: 1 }), [topIre, cliff]);
  ire.rotation.x = -Math.PI / 2; ire.receiveShadow = true; g.add(ire);
  const nations = {};
  Object.keys(NATIONS).forEach((k) => {
    const ng = group({ parent: g });
    const m = new Mesh(new ExtrudeGeometry(shapeOf(NATIONS[k]), { depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 1 }), [top, cliff]);
    m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = true; ng.add(m);
    const ll = LANDMARK[k], at = P(ll[0], ll[1], 0.3);
    const lm = (k === 'england' ? clockTower : k === 'scotland' ? castleOnRock : k === 'wales' ? welshCastle : causeway)({ x: at.x, y: at.y, z: at.z, s: k === 'ni' ? 0.55 : 0.75, parent: ng });
    const ring = torus(0.7, 0.04, M.redGlow(), { x: at.x, y: 0.33, z: at.z, rx: Math.PI / 2, parent: ng }); ring.visible = false;
    nations[k] = { ng, lm, ring, k: 0 };
  });
  // trees in the countryside (instanced)
  const N = 70, trunk = new InstancedMesh(new CylinderGeometry(0.02, 0.03, 0.16, 5), M.bark(), N), crown = new InstancedMesh(new SphereGeometry(0.11, 7, 5), M.leaf(), N), d = new Object3D();
  let n = 0, tries = 0;
  while (n < N && tries < 4000) {
    tries++; const lon = -5.5 + Math.random() * 7.2, lat = 50.3 + Math.random() * 8;
    const nation = ['england', 'wales', 'scotland'].find((k) => inside(NATIONS[k], lon, lat));
    if (!nation) continue;
    if (Object.values(LANDMARK).some(([a, b]) => Math.abs(a - lon) < 0.7 && Math.abs(b - lat) < 0.45)) continue;
    const p = P(lon, lat, 0.3), s = 0.7 + Math.random() * 0.6;
    d.position.set(p.x, 0.38 * s, p.z); d.scale.setScalar(s); d.updateMatrix(); trunk.setMatrixAt(n, d.matrix);
    d.position.y = 0.5 * s; d.updateMatrix(); crown.setMatrixAt(n, d.matrix); n++;
  }
  trunk.count = crown.count = n; trunk.castShadow = crown.castShadow = true; g.add(trunk, crown);
  return {
    group: g,
    update(st, k) {
      let moving = false;
      Object.keys(nations).forEach((key) => {
        const o = nations[key];
        moving = ease(o, 'k', st.nation === key ? 1 : 0, k) || moving;
        o.ng.position.y = o.k * 0.25;
        o.lm.scale.setScalar(0.75 + o.k * 0.35);
        o.ring.visible = o.k > 0.05;
      });
      return moving;
    },
    focusAt: (st) => (st.nation && LANDMARK[st.nation] ? g.localToWorld(P(LANDMARK[st.nation][0], LANDMARK[st.nation][1], 0.5)) : null)
  };
}

/* ======================================================= 4 UNIVERSITIES */
export function buildCampus(ctx) {
  const g = new Group();
  plane(70, 70, M.grass(), { rx: -Math.PI / 2, parent: g });
  const path = M.stoneSmooth('#d8cdb5');
  box(2.0, 0.04, 16, path, { y: 0.02, z: 2, parent: g });
  box(16, 0.04, 1.6, path, { y: 0.02, z: 2.5, parent: g });
  cyl(1.6, 1.6, 0.05, path, { y: 0.03, z: 2.5, parent: g });
  cyl(0.5, 0.6, 0.5, M.stone('#cfc4a8'), { y: 0.25, z: 2.5, parent: g });                     // fountain
  cyl(0.45, 0.45, 0.04, mat('water', { color: '#6fa3bf', roughness: 0.1, metalness: 0.2 }), { y: 0.5, z: 2.5, parent: g });
  const wallMat = new MeshStandardMaterial({ map: TX.collegeWall(), roughness: 0.92 }), plain = M.stone('#d6c7a3');
  const hall = (w, h, d, o) => {
    const b = group(o);
    const front = wallMat.clone(); front.map = TX.collegeWall().clone(); front.map.repeat.set(w / 4, 1); front.map.needsUpdate = true;
    box(w, h, d, [plain, plain, plain, plain, front, front], { y: h / 2, parent: b });
    roof(d * 1.1, w, h * 0.45, M.slate(), { y: h, ry: Math.PI / 2, parent: b });
    return b;
  };
  hall(10, 2.2, 1.6, { z: -3, parent: g });
  hall(6, 2.0, 1.4, { x: -5.6, z: 1.2, ry: Math.PI / 2, parent: g });
  hall(6, 2.0, 1.4, { x: 5.6, z: 1.2, ry: -Math.PI / 2, parent: g });
  // gate tower with the city banner
  const gate = group({ z: -2.6, parent: g });
  box(2.0, 4.0, 2.2, plain, { y: 2.0, parent: gate });
  crenels(1.0, 0.25, 10, plain, { y: 4.0, parent: gate });
  box(0.9, 1.5, 0.1, mat('gateDark', { color: '#2b2620', roughness: 1 }), { y: 0.75, z: 1.11, parent: gate });
  const bTex = TX.banner();
  const ban = plane(1.05, 1.58, new MeshStandardMaterial({ map: bTex, roughness: 0.8 }), { y: 2.7, z: 1.13, parent: gate, cast: false });
  // corner towers + spires
  [[-5.2, -3.0], [5.2, -3.0]].forEach(([x, z]) => {
    cyl(0.5, 0.55, 3.2, plain, { x, y: 1.6, z, seg: 8, parent: g });
    cone(0.6, 1.8, M.slate(), { x, y: 4.1, z, seg: 8, parent: g });
    cone(0.05, 0.5, M.gold(), { x, y: 5.15, z, seg: 8, parent: g });
  });
  // flags: one per top-ranked university in the chosen city (max 4)
  const flags = [-3.6, -2.2, 2.2, 3.6].map((x) => {
    const f = group({ x, y: 3.2, z: -3, parent: g });
    cyl(0.025, 0.025, 1.3, M.darkMetal(), { y: 0.65, parent: f });
    box(0.55, 0.34, 0.02, M.red(), { x: 0.29, y: 1.1, parent: f });
    return f;
  });
  // trees and students
  [[-7.5, 5], [7.5, 5.5], [-8, -1.5], [8.2, -2], [-3, 7], [3.5, 7.4]].forEach(([x, z], i) => tree({ x, z, size: 1.6 + (i % 3) * 0.2, parent: g, light: i % 2 }));
  [['#2c6e8f', -1.4, 4.4], ['#c4693f', 1.2, 5.2], ['#e0b552', 2.6, 3.4], ['#6b3a5b', -2.8, 3.0], ['#1f4a3c', 0.4, 6.2]].forEach(([c, x, z], i) => person({ x, z, colour: c, skin: i, parent: g, cap: i === 2 }));
  let shown = null;
  return {
    group: g,
    update(st) {
      const id = st.city || 'london';
      if (id !== shown) {
        shown = id;
        const c = (ctx.cities.find((x) => x.id === id) || ctx.cities[0]);
        bTex.draw(c.name, c.n);
        flags.forEach((f, i) => { f.visible = i < c.n; });
        // one flag stands centre-left when there is only one
        if (c.n === 1) flags[0].position.x = -2.2; else flags[0].position.x = -3.6;
      }
      return false;
    }
  };
}

/* =========================================================== 5 SERVICES */
export function buildServices(ctx) {
  const g = new Group();
  box(26, 0.6, 18, M.wood('#5e3b22'), { y: -0.3, parent: g });
  box(15.5, 0.04, 10.4, M.felt('#2f5d4a'), { y: 0.02, parent: g });
  const builders = [
    () => compass({ s: 0.75 }),
    () => headphonesOnBook({ s: 0.85 }),
    () => gradCap({ s: 1.0 }),
    () => paperStack({ s: 0.9 }),
    () => passport({ s: 0.7 }, true),
    () => { const h = group(); house({ parent: h, x: -0.3 }); key({ parent: h, x: 0.5, y: 0.05, z: 0.75 }); return h; },
    () => coinStacks({ s: 0.9 }, 4),
    () => suitcase({ s: 0.8 }, '#2c6e8f'),
    () => family({ s: 1.1 })
  ];
  const items = builders.map((b, i) => {
    const x = ((i % 3) - 1) * 4.6, z = (Math.floor(i / 3) - 1) * 3.1;
    const holder = group({ x, y: 0.05, z, parent: g });
    holder.add(b());
    const ring = torus(1.25, 0.05, M.redGlow(), { x, y: 0.07, z, rx: Math.PI / 2, parent: g }); ring.visible = false;
    return { holder, ring, k: 0 };
  });
  const NAMES = ['Career Consultation', 'Language Test', 'College Selection', 'Documentation', 'Student Visa & Interviews', 'E2E Settlement', 'Financial Aid', 'Post-Landing', 'Family Migration'];
  const labels = items.map((it, i) => ctx.label(String(i + 1).padStart(2, '0') + ' ' + NAMES[i], 'wl-step', it.holder, new Vector3(0, 2.0, 0)));
  return {
    group: g,
    update(st, k) {
      let moving = false;
      items.forEach((it, i) => {
        moving = ease(it, 'k', st.service === i ? 1 : 0, k) || moving;
        it.holder.position.y = 0.05 + it.k * 0.6;
        it.holder.rotation.y = it.k * 0.6;
        it.holder.scale.setScalar(1 + it.k * 0.25);
        it.ring.visible = it.k > 0.05;
        labels[i].show = st.service === i;
      });
      return moving;
    },
    focusAt: (st) => (st.service >= 0 ? items[st.service].holder.getWorldPosition(new Vector3()) : null)
  };
}

/* ============================================================= 6 SETTLE */
export function buildSettle(ctx) {
  const g = new Group();
  plane(70, 70, mat('pavement', { map: TX.cobbles(), roughness: 0.95 }), { rx: -Math.PI / 2, parent: g });
  const step = M.stoneSmooth('#ddd3bd'), carpet = mat('carpet', { color: '#b3261d', roughness: 0.85 });
  const steps = [];
  for (let i = 0; i < 4; i++) {
    const h = 0.7 * (i + 1), z = -i * 1.6;
    box(5, h, 1.6, step, { y: h / 2, z, parent: g });
    box(1.6, 0.03, 1.6, carpet, { y: h + 0.015, z, parent: g });
    box(1.6, 0.7, 0.03, carpet, { y: h - 0.35, z: z + 0.8, parent: g });
    steps.push({ top: new Vector3(0, h, z), k: 0 });
  }
  // the terraced houses at the top (colours after Notting Hill)
  const top = 0.7 * 4, back = -4 * 1.6 - 1.2;
  box(14, top, 4, step, { y: top / 2, z: back - 0.8, parent: g });
  ['#e8a5a0', '#9ec1d9', '#f0d48a', '#a9d3b5', '#d9b8e0'].forEach((c, i) => {
    const x = (i - 2) * 2.3, h = 3.2;
    const face = new MeshStandardMaterial({ map: TX.facade(c), roughness: 0.85 }), side = mat('side' + c, { color: c, roughness: 0.9 });
    box(2.2, h, 2.4, [side, side, side, side, face, side], { x, y: top + h / 2, z: back - 1.4, parent: g });
    box(2.3, 0.18, 2.5, M.white(), { x, y: top + h + 0.09, z: back - 1.4, parent: g });
    box(0.35, 0.6, 0.35, mat('brick', { color: '#9b4a35', roughness: 0.9 }), { x: x + 0.6, y: top + h + 0.45, z: back - 1.9, parent: g });
  });
  family({ x: 1.2, y: top, z: back + 0.1, s: 1.2, parent: g });
  const lamp = group({ x: -3.6, y: top, z: back + 0.2, parent: g });
  cyl(0.06, 0.09, 2.6, mat('lampGreen', { color: '#22382e', metalness: 0.5, roughness: 0.5 }), { y: 1.3, parent: lamp });
  box(0.36, 0.42, 0.36, mat('lampGlass', { color: '#fff1c9', emissive: '#ffd27a', emissiveIntensity: 0.8 }), { y: 2.75, parent: lamp });
  tree({ x: 5.8, y: top, z: back + 0.4, size: 1.5, parent: g });
  tree({ x: -5.6, y: 0, z: 1.5, size: 1.4, light: true, parent: g });
  const grad = person({ cap: true, colour: '#0f1b2d', size: 1.25, parent: g });
  const NAMES = ['Student visa', 'Graduate Route', 'Skilled Worker visa', 'Indefinite Leave to Remain'];
  const labels = steps.map((s, i) => ctx.label(NAMES[i], 'wl-stair', null, new Vector3(1.8, s.top.y + 0.35, s.top.z + 0.5)));
  const pos = { y: 0, z: 1.2 };
  return {
    group: g,
    update(st, k) {
      let moving = false;
      const i = Math.max(0, st.stair), s = steps[i];
      moving = ease(pos, 'y', st.stair < 0 ? 0 : s.top.y, k) || moving;
      moving = ease(pos, 'z', st.stair < 0 ? 1.4 : s.top.z, k) || moving;
      grad.position.set(-0.2, pos.y, pos.z);
      labels.forEach((l, j) => { l.show = true; l.active = j === st.stair; });
      return moving;
    }
  };
}

/* ============================================================ 7 STORIES */
export function buildStories(ctx) {
  const g = new Group();
  plane(70, 70, mat('pavement', { map: TX.cobbles(), roughness: 0.95 }), { rx: -Math.PI / 2, parent: g });
  // the pillar box
  const red = mat('pillar', { color: '#c41e15', roughness: 0.3, metalness: 0.1 });
  cyl(0.75, 0.8, 0.25, M.darkMetal(), { y: 0.12, parent: g });
  cyl(0.62, 0.66, 2.3, red, { y: 1.4, parent: g });
  const cap = new Mesh(new SphereGeometry(0.68, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), red); cap.position.y = 2.55; cap.castShadow = true; g.add(cap);
  torus(0.66, 0.05, red, { y: 2.55, rx: Math.PI / 2, parent: g });
  box(0.6, 0.08, 0.1, M.ink(), { y: 2.1, z: 0.62, parent: g });
  box(0.4, 0.3, 0.02, M.white(), { y: 1.6, z: 0.66, parent: g });
  // a lamp post and a bench
  const lamp = group({ x: 3.2, z: -1.2, parent: g });
  cyl(0.07, 0.1, 3.6, mat('lampGreen', { color: '#22382e', metalness: 0.5, roughness: 0.5 }), { y: 1.8, parent: lamp });
  box(0.42, 0.5, 0.42, mat('lampGlass', { color: '#fff1c9', emissive: '#ffd27a', emissiveIntensity: 0.8 }), { y: 3.75, parent: lamp });
  tree({ x: -4.5, z: -2.5, size: 1.8, parent: g });
  // the postcards, fanned in an arc above
  const cards = ctx.stories.map((city, i, all) => {
    const n = all.length, a = (i - (n - 1) / 2) * 0.32;
    const m = plane(1.5, 1.0, new MeshStandardMaterial({ map: TX.postcard(city || 'the UK'), roughness: 0.8 }), { parent: g });
    const home = new Vector3(Math.sin(a) * 4.2, 3.0 + Math.cos(i * 1.3) * 0.5, -Math.cos(a) * 1.2 - 0.6);
    m.position.copy(home); m.rotation.set(-0.05, -a * 0.8, Math.sin(i * 2.1) * 0.12);
    return { m, home, rot: m.rotation.clone(), k: 0 };
  });
  const front = new Vector3(0, 2.6, 2.4);
  return {
    group: g,
    update(st, k) {
      let moving = false;
      cards.forEach((c, i) => {
        moving = ease(c, 'k', st.story === i ? 1 : 0, k) || moving;
        c.m.position.lerpVectors(c.home, front, c.k);
        c.m.rotation.set(c.rot.x * (1 - c.k), c.rot.y * (1 - c.k), c.rot.z * (1 - c.k));
        c.m.scale.setScalar(1 + c.k * 0.7);
      });
      return moving;
    }
  };
}


/* ============================================================ FUNDING */
// a banking hall at dusk: a classical portico (the lending partners) and a
// lectern with three scholarship scrolls; the chosen one unrolls
function scroll(o = {}, ribbon = '#c62a1f') {
  const g = group(o);
  cyl(0.22, 0.22, 1.6, mat('parch', { color: '#efe2c0', roughness: 0.85 }), { rz: Math.PI / 2, parent: g });
  [-0.82, 0.82].forEach((x) => cyl(0.24, 0.24, 0.06, M.gold(), { x, rz: Math.PI / 2, parent: g }));
  torus(0.235, 0.05, mat('ribbon' + ribbon, { color: ribbon, roughness: 0.5 }), { ry: Math.PI / 2, parent: g });
  return g;
}
export function buildFunding() {
  const g = new Group();
  plane(70, 70, M.stoneSmooth('#5c5650'), { rx: -Math.PI / 2, parent: g });
  // portico
  const marble = M.stoneSmooth('#e8e2d4');
  box(14, 0.5, 5, marble, { y: 0.25, z: -4.5, parent: g });
  box(13, 0.4, 4.4, marble, { y: 0.7, z: -4.5, parent: g });
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 2.3;
    cyl(0.38, 0.42, 5.2, marble, { x, y: 3.5, z: -3.2, seg: 20, parent: g });
    box(1.0, 0.25, 1.0, marble, { x, y: 6.2, z: -3.2, parent: g });
  }
  box(14, 0.9, 1.4, marble, { y: 6.75, z: -3.4, parent: g });
  roof(14.6, 1.6, 2.0, marble, { y: 7.2, z: -3.4, ry: 0, parent: g });
  box(12, 5.6, 0.4, mat('hallWall', { color: '#c9bfa8', roughness: 0.9 }), { y: 3.6, z: -5.6, parent: g });
  [-3.5, 0, 3.5].forEach((x) => box(1.4, 3.4, 0.1, mat('doorGlow', { color: '#ffe0a3', emissive: '#ffc970', emissiveIntensity: 0.6 }), { x, y: 2.6, z: -5.35, parent: g }));
  // lectern + scrolls
  const lect = group({ x: 0, z: 2.2, parent: g });
  box(3.8, 1.6, 1.4, M.wood('#5e3b22'), { y: 0.8, parent: lect });
  box(4.2, 0.12, 1.8, M.wood('#5e3b22'), { y: 1.66, rx: -0.12, parent: lect });
  const scrolls = ['#c62a1f', '#2c6e8f', '#d8b56a'].map((c, i) => {
    const h = group({ x: (i - 1) * 1.25, y: 1.95, z: 0.05, ry: Math.PI / 2, parent: lect });
    const s = scroll({ parent: h, s: 0.6 }, c);
    const sheet = plane(0.9, 1.25, mat('parchSheet', { color: '#f4ead0', roughness: 0.85, side: 2 }), { y: 0.0, z: 0, rx: -Math.PI / 2, parent: h });
    sheet.scale.set(1, 0.001, 1); sheet.visible = false;
    return { h, s, sheet, k: 0 };
  });
  // coin stacks on a side table (loans)
  coinStacks({ x: 5.2, z: 2.6, parent: g }, 4);
  box(3.0, 0.1, 1.6, M.wood('#5e3b22'), { x: 5.2, y: -0.05 + 0.0, z: 2.6, parent: g });
  // street lamps
  [-6.5, 6.5].forEach((x) => { const l = group({ x, z: 1, parent: g }); cyl(0.07, 0.1, 4, mat('lampGreen', { color: '#22382e', metalness: 0.5, roughness: 0.5 }), { y: 2, parent: l }); box(0.42, 0.5, 0.42, mat('lampGlass', { color: '#fff1c9', emissive: '#ffd27a', emissiveIntensity: 0.9 }), { y: 4.2, parent: l }); });
  return {
    group: g,
    update(st, k) {
      let moving = false;
      scrolls.forEach((o, i) => {
        moving = ease(o, 'k', st.grant === i ? 1 : 0, k) || moving;
        o.s.position.y = o.k * 0.5; o.s.rotation.x = o.k * 0.3;
        o.sheet.visible = o.k > 0.02; o.sheet.scale.set(1, 1, Math.max(0.001, o.k)); o.sheet.position.set(0, 0.1 + o.k * 0.35, 0);
        o.sheet.rotation.x = -Math.PI / 2 + o.k * 1.1;
      });
      return moving;
    },
    focusAt: (st) => (st.grant >= 0 ? scrolls[st.grant].h.getWorldPosition(new Vector3()) : null)
  };
}

/* ============================================================ 8 CONTACT */
export function buildContact() {
  const g = new Group();
  box(28, 0.6, 20, M.wood('#7b4f2c'), { y: -0.3, parent: g });
  sheet(7.6, 3.1, TX.boardingPass(), { x: 1.2, y: 0.03, z: 1.4, rz: -0.08, curl: 0.06, parent: g });
  passport({ x: -4.6, z: 2.6, ry: 0.25, parent: g }, true);
  deskGlobe({ x: 6.2, z: -2.6, parent: g });
  const pen = group({ x: 0.2, y: 0.08, z: -1.0, ry: -0.5, parent: g });
  cyl(0.08, 0.08, 2.4, M.ink(), { rz: Math.PI / 2, parent: pen });
  cone(0.08, 0.35, M.gold(), { x: 1.37, rz: -Math.PI / 2, seg: 12, parent: pen });
  cyl(0.085, 0.085, 0.18, M.gold(), { x: -0.6, rz: Math.PI / 2, parent: pen });
  mug({ x: -7.4, z: -3.6, parent: g }, '#2c6e8f');
  compass({ x: -1.6, z: -4.6, s: 0.7, parent: g });
  return { group: g, update: () => false };
}
