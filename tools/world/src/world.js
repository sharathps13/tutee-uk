/* Tutee Connect UK — "The Atlas" 3D world.
 *
 * A row of small, purpose-built scenes, one per chapter, that the camera flies
 * between as the visitor scrolls:
 *   start     a planning desk: printed map of the British Isles, compass, passport
 *   worries   four plinths: the cost, the paperwork, the interview, arriving
 *   route     a globe with the flight from India to the UK, step by step
 *   why       a relief map of the four nations with their landmarks
 *   campus    a college quad whose banner follows the chosen city
 *   services  a workbench with one object per service
 *   settle    stone steps with a red carpet up to terraced houses
 *   stories   a pillar box and postcards from each student's city
 *   contact   the desk again, with the route ticket ready
 * Everything is built from primitives and procedural textures (textures.js),
 * lit with image-based lighting and one soft shadow-casting sun. Rendering is
 * on demand. The page (assets/js/atlas.js) drives it; every label it draws
 * duplicates HTML text.
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, Vector3, MathUtils, HemisphereLight,
  DirectionalLight, PMREMGenerator, ACESFilmicToneMapping, SRGBColorSpace, VSMShadowMap,
  Mesh, SphereGeometry, ShaderMaterial, BackSide
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { UNI_CITIES } from './geo.js';
import { buildStart, buildWorries, buildRoute, buildWhy, buildCampus, buildServices, buildSettle, buildStories, buildContact, buildFunding } from './scenes.js';

const SPACING = 90;
const SETS = {
  start: { i: 0, build: buildStart }, worries: { i: 1, build: buildWorries }, route: { i: 2, build: buildRoute },
  why: { i: 3, build: buildWhy }, campus: { i: 4, build: buildCampus }, services: { i: 5, build: buildServices },
  settle: { i: 6, build: buildSettle }, stories: { i: 7, build: buildStories }, contact: { i: 8, build: buildContact },
  funding: { i: 9, build: buildFunding }
};
// Camera shots per chapter: the set, a target relative to it, azimuth/elevation
// (degrees), distance, sky colours (top, horizon) and the page wash behind text.
const SHOTS = {
  home:         { set: 'start',    t: [0, 0, 0.6],    az: 6,   el: 56, d: 20, sky: ['#e9dcc6', '#f6eee2'], wash: '#f3ebdf' },
  worries:      { set: 'worries',  t: [0, 1.7, -0.5], az: 0,   el: 20, d: 17, sky: ['#aebfd0', '#e9edf0'], wash: '#eceef0' },
  journey:      { set: 'route',    t: [0, 0.4, 0],    az: 0,   el: 6,  d: 27, sky: ['#8fb6db', '#f7dcc0'], wash: '#f6e7d8' },
  why:          { set: 'why',      t: [-0.6, 0, 0.5], az: -4,  el: 52, d: 18, sky: ['#86b7de', '#e5eef2'], wash: '#eaf1f4' },
  universities: { set: 'campus',   t: [0, 1.6, 0],    az: 16,  el: 22, d: 21, sky: ['#9cc4df', '#f5e6cc'], wash: '#f3eadb' },
  services:     { set: 'services', t: [0, 0.6, 0.3],  az: 0,   el: 58, d: 18, sky: ['#e3d0b6', '#f3eadc'], wash: '#f3ebe0' },
  funding:      { set: 'funding',  t: [0, 2.6, -0.5], az: 14,  el: 14, d: 21, sky: ['#1d2b4a', '#c98a5e'], wash: '#0e1828', dark: true },
  loans:        { set: 'funding',  t: [2.4, 2.0, 0.4], az: 34,  el: 22, d: 18, sky: ['#1d2b4a', '#d39a6a'], wash: '#0e1828', dark: true },
  settle:       { set: 'settle',   t: [0, 2.6, -3.0], az: 26,  el: 22, d: 22, sky: ['#9dbcd6', '#f7d8b4'], wash: '#f6e8d6' },
  stories:      { set: 'stories',  t: [0, 2.2, 0],    az: -8,  el: 10, d: 15, sky: ['#c7b6c6', '#f4e7e1'], wash: '#f4ebe7' },
  contact:      { set: 'contact',  t: [0.2, 0.4, 0.2], az: -6, el: 58, d: 21, sky: ['#e9dcc6', '#f6eee2'], wash: '#f3ebdf' }
};

export function supported() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

export function mountWorld(canvas, opts = {}) {
  const mobile = !!opts.mobile, reduced = !!opts.reduced, labelsEl = opts.labels || null;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = VSMShadowMap;
  const maxDpr = mobile ? 1.5 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = 0.55;
  const camera = new PerspectiveCamera(30, 1, 0.2, 900);

  // sky dome (follows the camera) and fog in the horizon colour
  const skyMat = new ShaderMaterial({
    side: BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new Color() }, horizon: { value: new Color() } },
    vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vW; void main(){ float h = clamp(vW.y * 1.6 + 0.05, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.8)), 1.0); }'
  });
  const sky = new Mesh(new SphereGeometry(400, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
  scene.fog = new Fog(new Color('#f6eee2'), 30, 80);

  const hemi = new HemisphereLight(0xfff6ea, 0x7d6a55, 0.55); scene.add(hemi);
  const sun = new DirectionalLight(0xfff1dc, 2.3);
  sun.castShadow = !mobile;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 6; sun.shadow.blurSamples = 12;
  scene.add(sun, sun.target);
  const SUN_OFFSET = new Vector3(-12, 26, 14);

  /* ------------------------------------------------------------ labels */
  const labels = [];
  function label(text, cls, obj, offset, setGroup) {
    if (!labelsEl) return { show: false };
    const el = document.createElement('span');
    el.className = 'wl ' + cls; el.textContent = text; el.setAttribute('aria-hidden', 'true');
    labelsEl.appendChild(el);
    const o = { el, obj, offset: offset || new Vector3(), set: setGroup, show: false, active: false, on: false, act: false };
    labels.push(o); return o;
  }
  /* -------------------------------------------------------------- sets */
  const built = {};
  const cities = UNI_CITIES.map((c) => ({ id: c.id, name: c.name, n: c.n }));
  function ensure(name) {
    if (built[name]) return built[name];
    const def = SETS[name], made = [];
    const ctx = { mobile, cities, stories: opts.stories || [], label: (t, c, obj, off) => { const l = label(t, c, obj, off, null); made.push(l); return l; } };
    const s = def.build(ctx);
    made.forEach((l) => { l.set = s.group; });
    s.group.position.set(def.i * SPACING, 0, 0);
    if (mobile) s.group.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    scene.add(s.group);
    s.name = name; built[name] = s;
    return s;
  }
  // build the remaining scenes one by one while the page is idle
  const order = ['start', 'worries', 'route', 'why', 'campus', 'services', 'funding', 'settle', 'stories', 'contact'];
  function prewarm() {
    const next = order.find((n) => !built[n]);
    if (!next || !active) return;
    ensure(next); built[next].group.visible = false;
    (window.requestIdleCallback || ((f) => setTimeout(f, 120)))(prewarm, { timeout: 1500 });
  }

  /* ------------------------------------------------------------- state */
  const st = {
    a: 'home', b: 'home', t: 0, frame: { x: 0, y: 0 }, px: 0, py: 0,
    routeA: 0, routeB: 0, steps: [], focusK: 0, worry: -1, nation: null, city: 'london', service: -1, stair: -1, story: -1, grant: -1
  };
  const cam = { tx: 0, ty: 0, tz: 0, az: 0, el: 0, d: 20, fx: 0, fy: 0, light: 1 };
  const skyNow = { top: new Color(), hor: new Color(), wash: new Color() }, tmp = new Color(), white = new Color('#ffffff');
  let primed = false, active = true, raf = 0, last = 0, W = 1, H = 1, washHex = '';
  const washFns = [], lostFns = [];

  // The camera never flies through the empty space between sets: framing
  // (angle, distance, offset within the set) blends over the whole transition,
  // but the set itself switches at the midpoint (the page dips the canvas then).
  let curSet = 'start';
  function goal() {
    const A = SHOTS[st.a], B = SHOTS[st.b], s = st.t * st.t * (3 - 2 * st.t);
    const L = (k) => MathUtils.lerp(A[k], B[k], s), T = (i) => MathUtils.lerp(A.t[i], B.t[i], s);
    const home = s < 0.5 ? A : B, ox = SETS[home.set].i * SPACING;
    const g = { tx: ox + T(0), ty: T(1), tz: T(2),
      az: L('az') + st.px * 2.5, el: L('el') + st.py * 1.5, d: L('d'), fx: st.frame.x, fy: st.frame.y, set: home.set };
    // within a chapter, drift towards the thing being read about
    const set = built[home.set], f = set && set.focusAt ? set.focusAt(st) : null;
    if (f && st.focusK) {
      const k = st.focusK * (s < 0.5 ? 1 - s * 2 : (s - 0.5) * 2);
      g.tx = MathUtils.lerp(g.tx, f.x, k); g.ty = MathUtils.lerp(g.ty, f.y, k); g.tz = MathUtils.lerp(g.tz, f.z, k);
      g.d *= 1 - k * 0.25;
    }
    if (camera.aspect < 1.25) g.d *= Math.min(2.3, Math.pow(1.25 / camera.aspect, 0.85));
    skyNow.top.set(A.sky[0]).lerp(tmp.set(B.sky[0]), s);
    skyNow.hor.set(A.sky[1]).lerp(tmp.set(B.sky[1]), s);
    skyNow.wash.set(A.wash).lerp(tmp.set(B.wash), s);
    g.light = MathUtils.lerp(A.dark ? 0.45 : 1, B.dark ? 0.45 : 1, s);
    return g;
  }

  function resize() {
    W = canvas.clientWidth || window.innerWidth; H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
  }
  const tv = new Vector3();
  function apply() {
    const r = cam.el * Math.PI / 180, a = cam.az * Math.PI / 180;
    camera.position.set(cam.tx + cam.d * Math.cos(r) * Math.sin(a), cam.ty + cam.d * Math.sin(r), cam.tz + cam.d * Math.cos(r) * Math.cos(a));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    // shift the subject beside (desktop) or above (phones) the text
    camera.setViewOffset(W, H, -cam.fx * W, -cam.fy * H, W, H);
    camera.updateProjectionMatrix();
    sky.position.copy(camera.position);
    skyMat.uniforms.top.value.copy(skyNow.top); skyMat.uniforms.horizon.value.copy(skyNow.hor);
    scene.fog.color.copy(skyNow.hor); scene.fog.near = cam.d * 1.15; scene.fog.far = cam.d * 3.2;
    hemi.color.copy(skyNow.top).lerp(white, 0.5);
    sun.intensity = 2.3 * cam.light; hemi.intensity = 0.55 * (0.6 + 0.4 * cam.light);
    scene.environmentIntensity = 0.55 * cam.light; sun.color.set(cam.light < 0.8 ? '#ffc98f' : '#fff1dc');
    tv.set(cam.tx, cam.ty, cam.tz); sun.target.position.copy(tv); sun.position.copy(tv).add(SUN_OFFSET);
    Object.values(built).forEach((s) => { s.group.visible = s.name === curSet; });
    const hex = '#' + skyNow.wash.getHexString();
    if (hex !== washHex) { washHex = hex; washFns.forEach((f) => f(hex)); }
  }

  const v3 = new Vector3();
  function placeLabels() {
    for (const l of labels) {
      let show = l.show && l.set && l.set.visible;
      if (show) {
        if (l.obj) l.obj.getWorldPosition(v3).add(l.offset); else v3.copy(l.offset).applyMatrix4(l.set.matrixWorld);
        v3.project(camera);
        if (v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05) show = false;
        else l.el.style.transform = 'translate3d(' + ((v3.x + 1) / 2 * W).toFixed(1) + 'px,' + ((1 - v3.y) / 2 * H).toFixed(1) + 'px,0)';
      }
      if (show !== l.on) { l.on = show; l.el.classList.toggle('is-on', show); }
      if (!!l.active !== l.act) { l.act = !!l.active; l.el.classList.toggle('is-active', l.act); }
    }
  }

  function frame(now) {
    raf = 0;
    if (!active) return;
    ensure(SHOTS[st.a].set); ensure(SHOTS[st.b].set);
    if (!primed) curSet = (st.t < 0.5 ? SHOTS[st.a] : SHOTS[st.b]).set;
    const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    const g = goal();
    // switching sets: move the camera with the set, so only the framing eases
    if (g.set !== curSet) { const dx = (SETS[g.set].i - SETS[curSet].i) * SPACING; cam.tx += dx; curSet = g.set; }
    delete g.set;
    const k = reduced || !primed ? 1 : 1 - Math.exp(-dt * 3.6);
    let moving = false;
    for (const key in g) { const d = g[key] - cam[key]; if (Math.abs(d) > 0.0005) { cam[key] += d * k; moving = true; } else cam[key] = g[key]; }
    primed = true;
    apply();
    const kp = reduced ? 1 : 1 - Math.exp(-dt * 6);
    Object.values(built).forEach((s) => { if (s.group.visible) moving = s.update(st, kp) || moving; });
    renderer.render(scene, camera);
    placeLabels();
    if (moving) mark();
  }
  function mark() { if (!raf && active) raf = requestAnimationFrame(frame); }

  resize();
  const onResize = () => { resize(); mark(); };
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); active = false; lostFns.forEach((f) => f()); });
  mark();
  setTimeout(prewarm, 800);

  const set = (key, v) => { if (st[key] !== v) { st[key] = v; mark(); } };
  return {
    shots: Object.keys(SHOTS),
    setOf: (shot) => (SHOTS[shot] || SHOTS.home).set,
    setView(a, b, t) { a = SHOTS[a] ? a : 'home'; b = SHOTS[b] ? b : a; if (st.a !== a || st.b !== b || Math.abs(st.t - t) > 1e-4) { st.a = a; st.b = b; st.t = MathUtils.clamp(t, 0, 1); mark(); } },
    setFrame(x, y) { if (st.frame.x !== x || st.frame.y !== y) { st.frame = { x, y }; mark(); } },
    setRoute(a, b) { st.routeA = MathUtils.clamp(a, 0, 1); st.routeB = MathUtils.clamp(b || 0, 0, 1); mark(); },
    setSteps(list, focusK) { st.steps = list || []; st.focusK = focusK || 0; mark(); },
    setFocus: (k) => set('focusK', k || 0),
    setWorry: (i) => set('worry', i),
    setNation: (id) => set('nation', id || null),
    setCity: (id) => set('city', id || 'london'),
    setService: (i) => set('service', i),
    setStair: (i) => set('stair', i),
    setStory: (i) => set('story', i),
    setGrant: (i) => set('grant', i),
    setPointer(x, y) { st.px = x; st.py = y; mark(); },
    setActive(on) { if (active === on) return; active = on; last = 0; if (on) { mark(); prewarm(); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } },
    setQuality(low) { renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr)); resize(); mark(); },
    onWash(fn) { washFns.push(fn); if (washHex) fn(washHex); },
    onLost(fn) { lostFns.push(fn); },
    render: mark,
    dispose() {
      active = false; if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
      if (labelsEl) labelsEl.textContent = '';
    }
  };
}
