'use strict';
/* =====================================================================
   TALLER TORQUE · 3D
   Three.js con materiales físicos (pintura con barniz, metal que refleja),
   mapa de reflejos de estudio, sombras suaves y resolución completa.
   Unidades: 1 = 1 pixel del plano 2D original (≈ 4.7 mm).
   x: izquierda→derecha · z: parabrisas (0) → defensa (240) · y: arriba.
   ===================================================================== */

const R3 = {
  ok: false, renderer: null, scene: null, cam: null, canvas: null,
  car: null, carGroup: null, engGroup: null, slotGroups: {}, keys: {}, bodyKey: '',
  orbit: { yaw: 0, pitch: 0.95, dist: 430, tx: 160, ty: 10, tz: 120, want: null },
  dyn: {}, pick: [], px: 3, lift: 0, race: null,
};

const GRAD = (() => {
  if (typeof THREE === 'undefined') return null;
  const d = new Uint8Array([46, 46, 46, 255, 92, 92, 92, 255, 142, 142, 142, 255, 194, 194, 194, 255, 238, 238, 238, 255]);
  const t = new THREE.DataTexture(d, 5, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const MATS = {};
const METALS = new Set(['#a3abb6', '#d3d8de', '#b8bec7', '#8b929c', '#6a727e', '#7d8591', '#5b6473', '#d3d8de', '#e6e9ed', '#c47a3d']);
const RUBBER = new Set(['#1a1b1f', '#121318', '#1d1e22', '#26282d', '#0d0e11', '#2a2d33', '#16171b', '#26272c']);
const PAINTS = new Set();
function M3(col, opt) {
  const k = col + (opt ? JSON.stringify(opt) : '');
  if (MATS[k]) return MATS[k];
  const c = new THREE.Color(col).convertSRGBToLinear();
  let m;
  const lc = col.toLowerCase();
  if (opt && opt.transparent) m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.1, roughness: 0.06, transparent: true, opacity: Math.max(0.55, opt.opacity || 0.5), envMapIntensity: 1.6 });
  else if (opt && opt.paint || PAINTS.has(lc)) m = new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.35, roughness: opt && opt.rough !== undefined ? opt.rough : 0.32, clearcoat: opt && opt.rough > 0.6 ? 0 : 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1 });
  else if (METALS.has(lc)) m = new THREE.MeshStandardMaterial({ color: c, metalness: 0.75, roughness: 0.3, envMapIntensity: 1.2 });
  else if (RUBBER.has(lc)) m = new THREE.MeshStandardMaterial({ color: c, metalness: 0, roughness: 0.85 });
  else m = new THREE.MeshStandardMaterial({ color: c, metalness: 0.08, roughness: 0.62 });
  return (MATS[k] = m);
}
let OUT, OUT_SEL;
function outline(mesh, sx, sy, sz) {
  if (!R3.outlines) return null;
  const o = new THREE.Mesh(mesh.geometry, OUT);
  o.scale.set(sx, sy, sz); o.userData.outline = true; o.raycast = () => {};
  mesh.add(o); return o;
}
function bx(par, w, h, d, col, x, y, z, opt) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M3(col, opt));
  m.position.set(x, y, z);
  m.castShadow = !(opt && opt.transparent); m.receiveShadow = true;
  if (!opt || !opt.transparent) outline(m, 1 + 2.4 / w, 1 + 2.4 / h, 1 + 2.4 / d);
  par.add(m); return m;
}
// caja por esquinas (como los rectángulos del plano)
function bxr(par, x0, y0, z0, w, h, d, col, opt) { return bx(par, w, h, d, col, x0 + w / 2, y0 + h / 2, z0 + d / 2, opt); }
function cy(par, r, h, col, x, y, z, axis, seg, r2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 14), M3(col));
  m.position.set(x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  m.castShadow = m.receiveShadow = true;
  outline(m, 1 + 1.3 / r, 1 + 2.4 / h, 1 + 1.3 / r);
  par.add(m); return m;
}
function sph(par, r, col, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), M3(col));
  m.position.set(x, y, z); outline(m, 1 + 1.3 / r, 1 + 1.3 / r, 1 + 1.3 / r); par.add(m); return m;
}
const _up = typeof THREE !== 'undefined' ? new THREE.Vector3(0, 1, 0) : null;
function tube(par, pts, r, col, joints) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
    const L = a.distanceTo(b); if (L < 0.01) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), M3(col));
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(_up, b.clone().sub(a).normalize());
    m.castShadow = m.receiveShadow = true;
    outline(m, 1 + 1.3 / r, 1 + 0.5 / L, 1 + 1.3 / r);
    par.add(m);
    if (joints !== false && i > 0) sph(par, r, col, ...pts[i]);
  }
}

/* ---------- lotes: muchas piezas fijas en pocas llamadas de dibujo ---------- */
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(g => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}
const _m4 = typeof THREE !== 'undefined' ? new THREE.Matrix4() : null;
const _q = typeof THREE !== 'undefined' ? new THREE.Quaternion() : null;
const _e = typeof THREE !== 'undefined' ? new THREE.Euler() : null;
class Batch {
  constructor() { this.cols = {}; this.outs = []; }
  _add(geo, col, og, x, y, z, rx, ry, rz) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e);
    _m4.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(1, 1, 1));
    geo.applyMatrix4(_m4); (this.cols[col] = this.cols[col] || []).push(geo);
    if (og) { og.applyMatrix4(_m4); this.outs.push(og); }
  }
  // caja por esquina inferior
  box(x0, y0, z0, w, h, d, col, o) {
    o = o || {};
    this._add(new THREE.BoxGeometry(w, h, d), col, o.ol === false ? null : new THREE.BoxGeometry(w + 2.4, h + 2.4, d + 2.4), x0 + w / 2, y0 + h / 2, z0 + d / 2, o.rx, o.ry, o.rz);
  }
  // caja por centro
  boxc(x, y, z, w, h, d, col, o) { o = o || {}; this._add(new THREE.BoxGeometry(w, h, d), col, o.ol === false ? null : new THREE.BoxGeometry(w + 2.4, h + 2.4, d + 2.4), x, y, z, o.rx, o.ry, o.rz); }
  cyl(r, h, col, x, y, z, axis, o) {
    o = o || {};
    const seg = o.seg || 14;
    const rx = axis === 'z' ? Math.PI / 2 : (o.rx || 0), rz = axis === 'x' ? Math.PI / 2 : (o.rz || 0);
    this._add(new THREE.CylinderGeometry(o.r2 === undefined ? r : o.r2, r, h, seg), col, o.ol === false ? null : new THREE.CylinderGeometry((o.r2 === undefined ? r : o.r2) + 1.2, r + 1.2, h + 2.4, seg), x, y, z, rx, o.ry || 0, rz);
  }
  tube(pts, r, col, o) {
    o = o || {};
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
      const L = a.distanceTo(b); if (L < 0.01) continue;
      const g = new THREE.CylinderGeometry(r, r, L, 8), og = o.ol === false ? null : new THREE.CylinderGeometry(r + 1.2, r + 1.2, L + 0.6, 8);
      _q.setFromUnitVectors(_up, b.clone().sub(a).normalize());
      _m4.compose(a.clone().add(b).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1));
      g.applyMatrix4(_m4); (this.cols[col] = this.cols[col] || []).push(g);
      if (og) { og.applyMatrix4(_m4); this.outs.push(og); }
    }
  }
  build(par, slot) {
    const made = [];
    for (const col in this.cols) {
      const glass = col.startsWith('G:');
      const mat = glass ? M3(col.slice(2), { transparent: true, opacity: 0.42 }) : col.startsWith('E:') ? new THREE.MeshBasicMaterial({ color: new THREE.Color(col.slice(2)).convertSRGBToLinear() }) : col.startsWith('P:') ? M3(col.slice(2).split('|')[0], { paint: true, rough: +(col.split('|')[1] || 0.32) }) : M3(col);
      const m = new THREE.Mesh(mergeGeos(this.cols[col]), mat);
      m.castShadow = !glass; m.receiveShadow = !glass;
      if (slot !== undefined) m.userData.slot = slot;
      par.add(m); made.push(m);
    }
    if (this.outs.length && R3.outlines) {
      const o = new THREE.Mesh(mergeGeos(this.outs), OUT); o.userData.outline = true; o.raycast = () => {};
      par.add(o);
    }
    this.cols = {}; this.outs = [];
    return made;
  }
}

/* ---------- partículas (vapor, humo, goteo, chispas del escape) ---------- */
const FX3 = { pool: [], scene: null };
function fx3(scene, x, y, z, vx, vy, vz, life, col, size, grow) {
  let p = FX3.pool.find(q => !q.alive && q.scene === scene);
  if (!p) {
    if (FX3.pool.length > 160) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false }));
    p = { m, scene }; scene.add(m); FX3.pool.push(p);
  }
  Object.assign(p, { alive: true, x, y, z, vx, vy, vz, life, t: 0, size, grow: grow || 0 });
  p.m.material.color.set(col); p.m.visible = true;
}
function stepFx3(dt) {
  for (const p of FX3.pool) {
    if (!p.alive) continue;
    p.t += dt;
    if (p.t >= p.life) { p.alive = false; p.m.visible = false; continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const k = p.t / p.life, s = p.size * (1 + p.grow * k);
    p.m.position.set(p.x, p.y, p.z); p.m.scale.set(s, s, s);
    p.m.material.opacity = 0.85 * (1 - k);
  }
}

function tag(g, id) { g.traverse(o => { if (o.isMesh && !o.userData.outline) o.userData.slot = id; }); return g; }

/* ---------- inicio ---------- */
function init3D(canvas) {
  if (typeof THREE === 'undefined') return false;
  try {
    R3.canvas = canvas;
    R3.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  R3.renderer.setPixelRatio(1);
  R3.renderer.setClearColor(0x1b1e24);
  R3.renderer.shadowMap.enabled = true;
  R3.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R3.renderer.outputEncoding = THREE.sRGBEncoding;
  R3.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  R3.renderer.toneMappingExposure = 1.05;
  R3.renderer.physicallyCorrectLights = false;
  R3.env = studioEnv(R3.renderer);
  OUT = new THREE.MeshBasicMaterial({ color: 0x0b0c10, side: THREE.BackSide });
  OUT_SEL = new THREE.MeshBasicMaterial({ color: 0xf0b429, side: THREE.BackSide });
  const sc = new THREE.Scene();
  sc.environment = R3.env;
  sc.background = new THREE.Color(0x2a2e36);
  sc.fog = new THREE.Fog(0x2a2e36, 1800, 3400);
  sc.add(new THREE.HemisphereLight(0xe6eeff, 0x4a4036, 0.5));
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.1); sun.position.set(420, 980, 620);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 200, far: 3200 });
  sun.target.position.set(160, -120, -120); sc.add(sun.target); sc.add(sun);
  const fill = new THREE.DirectionalLight(0xd8e4ff, 0.35); fill.position.set(-500, 300, 500); sc.add(fill);
  const lamp = new THREE.PointLight(0xfff1d0, 0.5, 1100, 1.4); lamp.position.set(160, 340, 160); sc.add(lamp);
  R3.scene = sc;
  R3.cam = new THREE.PerspectiveCamera(40, 4 / 3, 5, 5000);
  buildShop(sc);
  R3.carGroup = new THREE.Group(); sc.add(R3.carGroup);
  R3.ok = true;
  bindOrbit(canvas);
  return true;
}

/* fondo de plano azul para el banco de motor */
function blueprintTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#2a6fb0'); gr.addColorStop(1, '#174a80');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 1;
  for (let i = 0; i <= 512; i += 16) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + 0.5); x.lineTo(512, i + 0.5); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.25)';
  for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i + 0.5, 0); x.lineTo(i + 0.5, 512); x.stroke(); x.beginPath(); x.moveTo(0, i + 0.5); x.lineTo(512, i + 0.5); x.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
  return t;
}
/* mapa de reflejos de estudio: paredes grises con barras de luz */
function studioEnv(renderer) {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(100, 60, 100), new THREE.MeshBasicMaterial({ color: 0x3c424c, side: THREE.BackSide })));
  const L = c => new THREE.MeshBasicMaterial({ color: c });
  for (const [x, z, w, d] of [[0, 0, 70, 6], [-28, 18, 6, 50], [28, -18, 6, 50]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), L(0xffffff)); m.position.set(x, 29, z); es.add(m); }
  const side = new THREE.Mesh(new THREE.BoxGeometry(1, 20, 70), L(0xbfd4ff)); side.position.set(49, 5, 0); es.add(side);
  const warm = new THREE.Mesh(new THREE.BoxGeometry(1, 16, 50), L(0xffd6a0)); warm.position.set(-49, 0, 10); es.add(warm);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), L(0x22252b)); floor.position.y = -29.5; es.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(es, 0.03).texture;
  pm.dispose();
  return tex;
}
function buildShop(sc) {
  const g = new THREE.Group();
  const B = new Batch();
  const F = -232;
  // piso de concreto con juntas, manchas y líneas
  B.box(-1100, F - 10, -1500, 2500, 10, 2900, '#555a63', { ol: false });
  for (let z = -1500; z < 1400; z += 220) B.box(-1100, F, z, 2500, 0.5, 3, '#474b53', { ol: false });
  for (let x = -1100; x < 1400; x += 220) B.box(x, F, -1500, 3, 0.5, 2900, '#474b53', { ol: false });
  for (const [x, z, r] of [[90, 40, 60], [260, -260, 40], [-40, -520, 70], [520, 180, 35], [180, 320, 45]]) B.cyl(r, 0.6, '#3d3f44', x, F + 0.6, z, 'y', { ol: false, seg: 10 });
  B.box(-300, F + 0.5, -950, 10, 0.6, 1450, '#f0b429', { ol: false }); B.box(610, F + 0.5, -950, 10, 0.6, 1450, '#f0b429', { ol: false });
  for (let x = -300; x < 620; x += 60) B.box(x, F + 0.5, 495, 30, 0.6, 10, '#f0b429', { ol: false, ry: 0.5 });
  // pared trasera, zoclo, tablero de herramientas, repisas
  B.box(-1100, F, -1500, 2500, 760, 14, '#6a707c');
  B.box(-1100, F, -1486, 2500, 40, 6, '#3a3d44');
  B.box(-560, F + 250, -1484, 640, 240, 6, '#9a7a4e');
  for (let i = 0; i < 12; i++) {
    const x = -540 + i * 52, y = F + 300 + (i % 3) * 52;
    if (i % 3 === 0) { B.box(x, y, -1478, 34, 8, 4, '#a3abb6', { ol: false }); B.box(x + 26, y - 14, -1478, 8, 22, 4, '#a3abb6', { ol: false }); }
    else if (i % 3 === 1) { B.box(x + 12, y - 20, -1478, 6, 48, 4, '#d8443a', { ol: false }); B.box(x + 8, y + 22, -1478, 14, 8, 4, '#d3d8de', { ol: false }); }
    else { B.box(x + 4, y - 10, -1478, 26, 26, 4, '#2e5f9e', { ol: false }); B.box(x + 10, y - 4, -1476, 14, 14, 4, '#9a7a4e', { ol: false }); }
  }
  for (let s = 0; s < 3; s++) {
    B.box(140, F + 200 + s * 120, -1480, 420, 8, 60, '#7d6447');
    for (let k = 0; k < 9; k++) B.box(150 + k * 45, F + 208 + s * 120, -1468, 26, 40 + (k % 2) * 12, 26, k % 3 === 0 ? '#f0b429' : k % 3 === 1 ? '#3fb8a6' : '#d8443a');
  }
  B.box(-900, F + 540, -1484, 120, 160, 4, '#e6e9ed'); B.box(-890, F + 550, -1482, 100, 90, 4, '#d8443a', { ol: false });
  B.box(700, F + 520, -1484, 90, 90, 4, '#e6e9ed'); B.box(744, F + 560, -1481, 4, 34, 2, '#121318', { ol: false });
  // cortina del taller
  B.box(-1100, F, -1200, 14, 700, 900, '#8b929c');
  for (let y = F + 20; y < F + 700; y += 22) B.box(-1088, y, -1190, 3, 4, 880, '#6a727e', { ol: false });
  // caja de herramientas roja con cajones
  B.box(700, F, -560, 180, 230, 120, '#b8322a');
  for (let i = 0; i < 6; i++) { B.box(706, F + 22 + i * 34, -442, 168, 4, 4, '#7c1f19', { ol: false }); B.box(770, F + 34 + i * 34, -441, 40, 4, 4, '#d3d8de', { ol: false }); }
  for (const [x, z] of [[710, -550], [870, -550], [710, -450], [870, -450]]) B.cyl(8, 10, '#121318', x, F + 5, z, 'x');
  // banco de trabajo con prensa
  B.box(-900, F + 180, -700, 300, 14, 140, '#9a7a4e');
  for (const [x, z] of [[-890, -690], [-620, -690], [-890, -580], [-620, -580]]) B.box(x, F, z, 12, 180, 12, '#3b414c');
  B.box(-860, F + 194, -660, 50, 30, 36, '#2e5f9e'); B.box(-870, F + 210, -650, 70, 8, 16, '#5b6473');
  // llantas apiladas y tambos
  for (let i = 0; i < 4; i++) B.cyl(70, 44, '#1a1b1f', -760, F + 22 + i * 46, 300, 'y', { seg: 18 });
  for (const [x, z, c] of [[860, 260, '#2e5f9e'], [960, 300, '#d8443a'], [910, 380, '#2e5f9e']]) { B.cyl(55, 170, c, x, F + 85, z, 'y', { seg: 16 }); B.cyl(57, 6, '#121318', x, F + 60, z, 'y', { seg: 16 }); B.cyl(57, 6, '#121318', x, F + 120, z, 'y', { seg: 16 }); }
  // postes del elevador
  for (const x of [-170, 490]) { B.box(x - 24, F, 10, 48, 560, 48, '#2e5f9e'); B.box(x - 36, F, 0, 72, 12, 68, '#1d3e69'); B.box(x - 10, F + 30, 58, 20, 500, 4, '#f0b429', { ol: false }); }
  B.box(-194, F + 548, 10, 708, 18, 30, '#1d3e69');
  // lámparas fluorescentes
  for (const z of [-350, 160]) { B.box(-20, 400, z, 360, 10, 40, '#3a3d44'); B.box(-14, 394, z + 6, 348, 6, 28, 'E:#f4f7ff', { ol: false }); }
  B.build(g);
  sc.add(g);
  // brazos del elevador (se mueven con el auto)
  const arms = new THREE.Group();
  const A = new Batch();
  for (const x of [-170, 490]) for (const z of [-10, -380]) {
    const dir = x < 0 ? 1 : -1;
    A.box(Math.min(x, x + dir * 170), -150 - 22, z - 10, 170, 12, 20, '#2e5f9e');
    A.cyl(14, 10, '#f0b429', x + dir * 160, -150 - 12, z, 'y');
  }
  A.build(arms);
  sc.add(arms);
  R3.arms = arms;
  // pluma para motor
  const crane = new THREE.Group();
  const C = new Batch();
  C.box(-60, F, -60, 380, 14, 24, '#f0b429'); C.box(-60, F, 40, 380, 14, 24, '#f0b429');
  C.box(280, F, -60, 30, 600, 30, '#f0b429');
  C.tube([[295, F + 560, -45], [40, F + 620, -45]], 12, '#f0b429');
  C.tube([[40, F + 620, -45], [40, F + 420, -45]], 2, '#3a3d44', { ol: false });
  C.box(30, F + 410, -55, 20, 16, 20, '#3a3d44');
  for (const x of [-50, 300]) for (const z of [-48, 52]) C.cyl(8, 8, '#121318', x, F + 6, z, 'x');
  C.build(crane);
  sc.add(crane);
  R3.crane = crane;
  R3.shop = g;
}

/* ---------- carrocería: silueta lateral extruida con bordes redondeados ---------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f)), gg = Math.min(255, Math.round(((n >> 8) & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
function mixHex(a, b, t) {
  const A = new THREE.Color(a), Bc = new THREE.Color(b);
  return '#' + A.lerp(Bc, Math.max(0, Math.min(1, t))).getHexString();
}
// perfiles (z, y): z hacia el frente, y hacia arriba
function bodyDims(shape) {
  const len = shape === 'pickup' ? 1020 : shape === 'hatch' ? 820 : 960;
  const rear = 250 - len;
  const roofH = shape === 'muscle' || shape === 'coupe' ? 150 : 172;
  const cabR = shape === 'pickup' ? -330 : shape === 'hatch' ? -470 : shape === 'coupe' ? -430 : -450;
  return { len, rear, roofH, cabR, rw: rear + 150, fw: 171, belt: 40 };
}
function extrude(pts, depth, bevel, x0) {
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  geo.rotateY(Math.PI / 2);
  geo.translate(x0, 0, 0);
  geo.computeVertexNormals();
  return geo;
}
function arch(zc, yc, r, from, to, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = from + (to - from) * i / n; out.push([zc + Math.cos(a) * r, yc + Math.sin(a) * r]); }
  return out;
}
function lowerProfile(D, shape, openBay) {
  const { rear, rw, fw, belt } = D;
  const sill = -148, ar = 88, yc = -164;
  const front = openBay
    ? [[262, -102], [258, -44], [248, -40], [242, -60], [-30, -60], [-40, belt + 4]]
    : [[262, -102], [258, -44], [246, belt - 12], [150, belt - 2], [0, belt + 2], [-40, belt + 4]];
  const tailTop = shape === 'pickup' ? belt + 6 : shape === 'hatch' ? belt + 20 : belt + 12;
  const pts = [[262, -150], ...front];
  pts.push([D.cabR, belt + 6], [rear + 40, tailTop], [rear + 6, tailTop - 14], [rear, -60], [rear + 4, -150]);
  // bajo con arcos de rueda (de atrás hacia adelante)
  const yA = sill;
  const dz = Math.sqrt(ar * ar - (yA - yc) * (yA - yc));
  const k = Math.asin((yA - yc) / ar);
  pts.push([rw - dz, yA]);
  arch(rw, yc, ar, Math.PI - k, k, 14).forEach(p => pts.push(p));
  pts.push([fw - dz, yA]);
  arch(fw, yc, ar, Math.PI - k, k, 14).forEach(p => pts.push(p));
  pts.push([262, -150]);
  return pts;
}
function cabinProfile(D, shape) {
  const { belt, roofH, cabR } = D;
  const ws = shape === 'muscle' ? 170 : 150;
  if (shape === 'hatch') return [[-36, belt + 2], [-36 - ws, roofH], [cabR + 30, roofH - 2], [cabR - 4, belt + 22], [cabR, belt + 2]];
  if (shape === 'coupe' || shape === 'muscle') return [[-36, belt + 2], [-36 - ws, roofH], [cabR + 140, roofH - 4], [cabR - 30, belt + 10], [cabR - 20, belt + 2]];
  if (shape === 'pickup') return [[-36, belt + 2], [-36 - ws, roofH], [cabR + 10, roofH], [cabR + 4, belt + 2]];
  return [[-36, belt + 2], [-36 - ws, roofH], [cabR + 80, roofH], [cabR - 26, belt + 14], [cabR - 40, belt + 2]];
}
function buildBody(modelId, openBay, look) {
  const Md = MODELOS[modelId];
  look = look || {};
  const rust = look.rust || 0;
  const base = look.color || Md.color;
  const col = rust > 0.05 ? mixHex(base, '#7a4426', rust * 0.75) : base;
  const paint = 'P:' + col + '|' + (0.3 + rust * 0.6).toFixed(2);
  const trim = '#16171b', chrome = '#d3d8de';
  const g = new THREE.Group();
  const shape = Md.shape;
  const D = bodyDims(shape);
  const add = (geo, matKey) => {
    const m = new THREE.Mesh(geo, matKey.startsWith('P:') ? M3(matKey.slice(2).split('|')[0], { paint: true, rough: +(matKey.split('|')[1]) }) : matKey.startsWith('G:') ? M3(matKey.slice(2), { transparent: true, opacity: 0.8 }) : M3(matKey));
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  // carrocería baja (de lado a lado)
  add(extrude(lowerProfile(D, shape, openBay), 380, 12, -32), paint);
  if (openBay) {
    // salpicaderas a los lados del cofre abierto
    const fender = [[262, -150], [262, -102], [258, -44], [246, D.belt - 12], [150, D.belt - 2], [0, D.belt + 2], [-40, D.belt + 4], [-40, -60], [100, -60], [262, -60]];
    add(extrude(fender, 40, 8, -40), paint);
    add(extrude(fender, 40, 8, 320), paint);
  }
  // cabina de vidrio polarizado, más angosta
  const cab = cabinProfile(D, shape);
  add(extrude(cab, 340, 10, -12), 'G:#1e2a36');
  // techo y pilares del color de la carrocería
  const roofPts = [cab[1], cab[2]];
  const rz0 = Math.min(roofPts[0][0], roofPts[1][0]), rz1 = Math.max(roofPts[0][0], roofPts[1][0]);
  const B = new Batch();
  B.box(-14, D.roofH - 2, rz0 + 4, 364, 10, rz1 - rz0 - 8, paint, { ol: false });
  for (const x of [-16, 336]) {
    B.tube([[x + 6, D.belt + 4, cab[0][0]], [x + 6, D.roofH + 2, cab[1][0]]], 8, paint, { ol: false });
    B.tube([[x + 6, D.belt + 4, cab[cab.length - 1][0]], [x + 6, D.roofH + 2, cab[2][0]]], 10, paint, { ol: false });
    B.box(x, D.belt, -235, 18, D.roofH - D.belt, 14, paint, { ol: false });
    B.box(x + (x < 0 ? -26 : 14), D.belt + 8, -70, 24, 18, 26, paint, { ol: false });
    B.box(x + (x < 0 ? -24 : 16), D.belt + 10, -73, 20, 14, 3, chrome, { ol: false });
  }
  // líneas de puertas y manijas
  for (const x of [-45, 361]) {
    for (const z of [-60, -235, -400]) if (z > D.cabR - 20) B.box(x, -130, z, 2, 160, 2.5, trim, { ol: false });
    B.box(x + (x < 0 ? -2 : 0), 8, -120, 3, 7, 26, chrome, { ol: false });
    B.box(x + (x < 0 ? -2 : 0), 8, -300, 3, 7, 26, chrome, { ol: false });
    B.box(x + (x < 0 ? -3 : 0), -150, D.rw + 90, 4, 16, D.fw - D.rw - 180, trim, { ol: false });
  }
  // frente: faros, parrilla, defensa, placa
  B.box(20, -108, 262, 280, 48, 8, trim, { ol: false });
  for (let y = -100; y < -66; y += 8) B.box(26, y, 268, 268, 3, 3, '#3a3d44', { ol: false });
  for (const x of [-28, 288]) { B.box(x, -78, 258, 60, 28, 10, '#dfe6ef', { ol: false }); B.box(x + 6, -73, 266, 48, 18, 3, 'E:#fff6d8', { ol: false }); B.box(x + (x < 0 ? -2 : 54), -96, 260, 12, 10, 6, '#f0a02a', { ol: false }); }
  B.box(-44, -162, 252, 408, 30, 18, trim, { ol: false });
  B.box(115, -142, 268, 90, 24, 3, '#e6e9ed', { ol: false }); B.box(125, -134, 270, 70, 8, 2, '#2e5f9e', { ol: false });
  // atrás: calaveras, defensa, placa, escape
  const tailY = shape === 'pickup' ? D.belt - 30 : D.belt - 36;
  for (const x of [-30, 290]) { B.box(x, tailY, D.rear - 4, 70, 26, 8, '#9e2a22', { ol: false }); B.box(x + 6, tailY + 6, D.rear - 7, 58, 14, 3, 'E:#ff5a4a', { ol: false }); }
  B.box(-44, -162, D.rear - 8, 408, 34, 18, trim, { ol: false });
  B.box(115, -110, D.rear - 6, 90, 24, 3, '#e6e9ed', { ol: false });
  B.cyl(8, 30, chrome, 250, -132, D.rear - 16, 'z', { ol: false, seg: 16 });
  if (shape === 'pickup') { B.box(-20, D.belt - 70, D.rear + 14, 360, 70, D.cabR - D.rear - 28, '#2a2d33', { ol: false }); }
  if (shape === 'muscle') { B.box(110, D.belt + 14, -30 + (openBay ? 400 : 0), 100, 12, 150, shade(col, 0.6), { ol: false }); }
  // interior: asientos y volante
  for (const x of [40, 210]) { B.box(x, -60, -330, 90, 70, 90, '#26282d', { ol: false }); B.box(x, 10, -345, 90, 110, 20, '#26282d', { ol: false }); }
  B.cyl(34, 6, trim, 85, 72, -190, 'z', { ol: false, seg: 18, rx: 0.4 });
  // piso, tanque, eje y escape
  B.box(-30, -150, D.rear + 40, 380, 16, -80 - D.rear, '#2a2d33', { ol: false });
  B.box(40, -188, D.rear + 60, 240, 36, 110, '#26282d', { ol: false });
  if (Md.drive === 'RWD') { B.cyl(9, 380, '#3b414c', 160, -164, D.rw, 'x', { ol: false }); B.cyl(30, 40, '#3b414c', 160, -164, D.rw, 'z', { ol: false, seg: 16 }); B.tube([[160, -150, D.rw + 30], [160, -140, -40], [100, -100, 60]], 7, '#3b414c', { ol: false }); }
  else B.cyl(10, 380, '#3b414c', 160, -152, D.rw + 10, 'x', { ol: false });
  B.tube([[250, -128, -40], [250, -130, D.rear + 40], [250, -132, D.rear - 6]], 6, '#6a727e', { ol: false });
  B.build(g);
  // puertas (se abren) y cajuela
  const fourDoor = shape === 'sedan' || shape === 'hatch';
  const doorSpans = fourDoor ? [[-60, -235], [-235, D.cabR + (shape === 'hatch' ? 20 : 40)]] : [[-60, -270]];
  const glassTop = D.roofH - 16;
  for (const side of [-1, 1]) {
    const xo = side < 0 ? -47 : 361;
    doorSpans.forEach(([z0, z1], di) => {
      const L = z0 - z1;
      const door = new THREE.Group();
      const DB = new Batch();
      DB.box(side < 0 ? -2 : -4, -138, -L, 6, D.belt - 2 + 138, L, paint, { ol: false });
      DB.box(side < 0 ? 0 : -2, D.belt, -L + 10, 3, glassTop - D.belt - (di === 0 ? 0 : 6), L - 22, 'G:#1e2a36', { ol: false });
      DB.box(side < 0 ? -4 : 2, D.belt - 2, -L, 4, 6, L, trim, { ol: false });
      DB.box(side < 0 ? -5 : 4, 6, -L + 16, 3, 7, 26, chrome, { ol: false });
      DB.box(side < 0 ? 4 : -10, -120, -L + 8, 6, D.belt + 110, L - 16, '#3a3d45', { ol: false });
      DB.build(door);
      door.position.set(xo, 0, z0);
      if (look.doors) door.rotation.y = side < 0 ? 1.05 : -1.05;
      g.add(door);
      if (look.doors) { const hole = new Batch(); hole.box(side < 0 ? -45 : 359, -136, z1 + 2, 2, D.belt + 132, L - 4, '#202328', { ol: false }); hole.box(side < 0 ? -44 : 352, -140, z1 + 4, 8, 8, L - 8, '#3a3d45', { ol: false }); hole.build(g); }
    });
  }
  const tailTop = shape === 'pickup' ? D.belt + 6 : shape === 'hatch' ? D.belt + 20 : D.belt + 12;
  const lid = new THREE.Group();
  const LB = new Batch();
  if (shape === 'pickup') {
    LB.box(-40, 0, -4, 400, 110, 8, paint, { ol: false });
    lid.position.set(0, D.belt - 114, D.rear + 6);
    if (look.trunk) lid.rotation.x = -1.45;
  } else {
    const tl = (D.cabR - 40) - (D.rear + 6);
    LB.box(-36, -2, -tl, 392, 8, tl, paint, { ol: false });
    LB.box(-36, -40, -tl - 4, 392, 40, 6, paint, { ol: false });
    lid.position.set(0, tailTop + 6, D.cabR - 40);
    if (look.trunk) lid.rotation.x = 1.15;
    if (look.trunk) { const tb = new Batch(); tb.box(-20, tailTop + 6, D.rear + 16, 360, 3, tl - 24, '#1c1e22', { ol: false }); tb.cyl(46, 4, '#26272c', 70, tailTop + 9, D.rear + 90, 'y', { ol: false, seg: 24 }); tb.box(190, tailTop + 9, D.rear + 40, 90, 20, 60, '#d8443a', { ol: false }); tb.build(g); }
  }
  LB.build(lid);
  g.add(lid);
  // cofre abierto
  if (openBay) {
    const hood = new THREE.Group();
    const hm = new THREE.Mesh(extrude([[0, 0], [0, 8], [235, 8], [240, 0]], 380, 4, -30), M3(col, { paint: true, rough: 0.3 + rust * 0.6 }));
    hm.castShadow = true; hood.add(hm);
    hood.position.set(0, D.belt, -36); hood.rotation.x = -1.22;
    g.add(hood);
    const Bh = new Batch(); Bh.tube([[20, D.belt, -30], [20, D.belt + 210, -90]], 2, '#a3abb6', { ol: false }); Bh.build(g);
  }
  for (const x of [-22, 342]) wheel3D(g, x, -164, D.rw, false);
  return g;
}
function wheel3D(par, x, y, z, front) {
  const w = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(50, 17, 14, 32), M3('#1a1b1f'));
  tire.rotation.y = Math.PI / 2; tire.scale.set(1, 1, 1.15); tire.castShadow = true; w.add(tire);
  const B = new Batch();
  B.cyl(44, 30, '#2a2b30', 0, 0, 0, 'x', { ol: false, seg: 32 });
  B.cyl(40, 34, '#b8bec7', 0, 0, 0, 'x', { ol: false, seg: 32 });
  B.cyl(34, 35, '#5b6473', 0, 0, 0, 'x', { ol: false, seg: 24 });
  B.cyl(11, 40, '#d3d8de', 0, 0, 0, 'x', { ol: false, seg: 16 });
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; B.boxc(0, Math.sin(a) * 22, Math.cos(a) * 22, 37, 8, 22, '#d3d8de', { ol: false, rx: -a }); }
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + 0.63; B.cyl(2.5, 41, '#8b929c', 0, Math.sin(a) * 15, Math.cos(a) * 15, 'x', { ol: false, seg: 6 }); }
  B.build(w);
  w.position.set(x, y, z);
  par.add(w);
  return w;
}

/* ---------- piezas del motor ---------- */
function slotGroup(c, id) {
  const d = c.defs[id];
  const g = new THREE.Group();
  const present = d.conn ? c.slots[id].on : !!(c.slots[id] && c.slots[id].item);
  const it = c.slots[id] && c.slots[id].item;
  const e = c.engId ? MOTORES[c.engId] : null;
  const AL = '#a3abb6', ALH = '#d3d8de', ST = '#4a515d', BK = '#1d1e22', RU = '#8a4128';
  switch (id) {
    case 'bateria':
      if (present) { bxr(g, 8, -30, 22, 46, 50, 36, BK); bxr(g, 10, 20, 24, 42, 3, 32, '#34363d'); bxr(g, 12, -2, 57.5, 38, 10, 1, '#3d7ccf'); cy(g, 3, 6, '#8b929c', 17, 23, 19); cy(g, 3, 6, '#8b929c', 45, 23, 19); }
      else { bxr(g, 6, -34, 24, 50, 4, 34, ST); }
      break;
    case 'batNeg': if (present && has(c, 'bateria')) bxr(g, 12, 23, 14, 10, 7, 9, '#34363d'); else bxr(g, 10, 30, 2, 9, 6, 8, '#34363d'); tube(g, [[17, 28, 12], [17, 30, -30]], 3, BK, false); break;
    case 'batPos': if (present && has(c, 'bateria')) bxr(g, 40, 23, 14, 11, 7, 9, '#d8443a'); else bxr(g, 52, 30, 4, 9, 6, 8, '#d8443a'); tube(g, [[45, 28, 12], [70, 26, -30]], 3, '#8a2420', false); break;
    case 'fusGas': case 'fusVent': {
      const [x, z] = [d.r[0], d.r[1]];
      if (present) { bxr(g, x + 1, 10, z, 7, 8, 10, '#3d7ccf'); bxr(g, x + 2, 18, z + 2, 5, 2, 4, '#9cc7f2'); }
      else { bxr(g, x + 2, 9, z + 3, 1.5, 1, 5, '#6a727e'); bxr(g, x + 5.5, 9, z + 3, 1.5, 1, 5, '#6a727e'); }
      break; }
    case 'filtroAire':
      if (present) { bxr(g, 264, 26, 18, 48, 6, 42, '#2a2c32'); for (const [x, z] of [[266, 22], [306, 22], [266, 54], [306, 54]]) bxr(g, x, 22, z, 4, 8, 4, '#8b929c'); if (it.type === 'filtroAlto') bxr(g, 278, 32, 30, 24, 2, 18, '#d8443a'); }
      else { for (let z = 22; z < 58; z += 5) bxr(g, 268, 18, z, 40, 1, 2, '#2a2c32'); }
      break;
    case 'tuboAdm':
      if (e.turbo) { if (present) tube(g, [[300, 10, 60], [300, 18, 120], [298, 22, 156]], 6, BK); else cy(g, 6, 4, '#0d0e11', 300, 10, 62, 'z'); }
      else { if (present) tube(g, [[268, 20, 18], [180, 34, 18], [112, 40, 22], [104, 40, 36]], 7, BK); else cy(g, 7, 4, '#0d0e11', 262, 20, 18, 'x'); }
      break;
    case 'mangIcCal': if (present) { tube(g, [[282, 16, 182], [282, 0, 196], [282, -20, 212]], 5, BK); if (it.seen && it.health < 0.6) bxr(g, 286, -2, 196, 2, 6, 6, '#e2702b'); } else cy(g, 5, 3, '#0d0e11', 282, 16, 184, 'z'); break;
    case 'mangIcFria': if (present) { tube(g, [[48, -20, 210], [48, -6, 150], [48, 6, 66], [98, 26, 66], [104, 40, 50]], 5, BK); if (it.seen && it.health < 0.6) bxr(g, 52, 0, 120, 2, 6, 8, '#e2702b'); } else cy(g, 5, 3, '#0d0e11', 48, -20, 208, 'y'); break;
    case 'bov': if (present) { cy(g, 6, 12, AL, 35, 6, 153, 'x'); cy(g, 3, 4, ALH, 26, 6, 153, 'x'); tube(g, [[35, 12, 153], [42, 14, 140], [98, 34, 46]], 1, BK, false); } break;
    case 'protector': if (present) { const m = cy(g, 17, 26, ALH, 246, 22, 170, 'x', 12); m.scale.set(1, 1, 1); for (let i = 0; i < 6; i++) bxr(g, 236 + i * 4, 38, 162, 1.5, 1, 1.5, AL); } break;
    case 'lineaTurbo': if (present) tube(g, [[238, 12, 142], [250, 18, 148], [262, 20, 162]], 1.6, ALH); break;
    case 'turbo':
      if (present) {
        const big = it.type === 'turboGrande' ? 1.2 : 1;
        R3.dyn.turbHousing = cy(g, 14 * big, 18, RU, 246, 20, 170, 'x');
        cy(g, 6, 14, ST, 264, 20, 170, 'x');
        cy(g, 15 * big, 16, AL, 282, 20, 170, 'x');
        tube(g, [[282, 20, 170], [282, 16, 184]], 7, AL, false);
        if (!has(c, 'tuboAdm')) {
          const w = new THREE.Group(); w.position.set(300, 22, 158);
          cy(w, 8, 2, '#0d0e11', 0, 0, 0, 'z');
          for (let k = 0; k < 6; k++) { const b = bx(w, 1.5, 7, 3, ALH, 0, 0, 1); b.rotation.z = k * Math.PI / 3; b.position.set(Math.sin(k * Math.PI / 3) * 3.5, Math.cos(k * Math.PI / 3) * 3.5, 1); }
          g.add(w); R3.dyn.compWheel = w;
        }
      } else { cy(g, 8, 4, RU, 246, 12, 164, 'y'); for (const [x, z] of [[240, 158], [252, 158], [240, 170], [252, 170]]) cy(g, 1.5, 6, ALH, x, 14, z); }
      break;
    case 'tapaMotor':
      if (present) {
        if (e.layout === 'V') { for (const z of [74, 97]) { const b = bxr(g, 120, 44, z - 12, 116, 10, 24, '#26282d'); b.rotation.x = z < 85 ? 0.12 : -0.12; } }
        else bxr(g, 118, 44, 62, 120, 12, 46, '#26282d');
        bxr(g, 158, 56, 79, 40, 2, 12, '#3a3d45');
      }
      break;
    case 'riel': if (present) { cy(g, 4, 132, ALH, 181, 44, 52, 'x'); cy(g, 2.5, 6, BK, 244, 44, 52, 'y'); } break;
    case 'banda': if (present) { const pts = [[66, 22, 140], [64, 22, 108], [70, 22, 101], [84, 22, 79], [93, 22, 84], [100, 22, 118], [86, 22, 141], [76, 22, 149], [66, 22, 140]]; tube(g, pts, 1.8, it.seen && it.health < 0.5 ? '#5a5e66' : BK); } break;
    case 'alternador':
      if (present) { cy(g, 13, 26, AL, 74, 6, 83, 'y'); for (let i = 0; i < 4; i++) bxr(g, 62, -4 + i * 5, 70, 24, 1, 1, '#6a727e'); bxr(g, 60, 18, 72, 6, 4, 5, '#d8443a'); }
      else { bxr(g, 62, -8, 80, 24, 4, 6, ST); }
      break;
    case 'termostato': if (present) { bxr(g, 250, 6, 94, 13, 16, 16, AL); tube(g, [[262, 14, 102], [314, 14, 102], [314, -10, 192]], 4, BK); } else cy(g, 5, 2, '#1f6d63', 256, 4, 102, 'y'); break;
    case 'tapaRad': if (present) { cy(g, 6, 4, '#5b6473', 306, 4, 198, 'y'); cy(g, 4, 5, '#f0b429', 306, 5, 198, 'y'); } else cy(g, 5, 2, c.cool.level > 0.7 ? '#3fb8a6' : '#1f6d63', 306, 1, 198, 'y'); break;
    case 'tapaAceite': if (present) cy(g, 5, 5, '#f0b429', 246, 46, 74, 'y'); else cy(g, 4, 2, '#3a2c0c', 246, 43, 74, 'y'); break;
    case 'bayoneta': tube(g, [[108, -20, 128], [108, 30, 122]], 1.2, '#4a515d', false); cy(g, 5, 2, '#f0b429', 108, 33, 121, 'z'); break;
    case 'tapon': if (present) cy(g, 5, 5, ALH, 160, -103, 132, 'y', 6); else cy(g, 4, 1, '#2a210a', 160, -100.5, 132, 'y'); break;
    case 'filtroAceite': if (present) { cy(g, 11, 28, '#2e5f9e', 225, -84, 89, 'y'); bxr(g, 214, -86, 78, 22, 3, 0.5, '#1d3e69'); } else cy(g, 6, 2, ALH, 225, -70, 89, 'y'); break;
    case 'marcha': if (present) { cy(g, 10, 34, BK, 80, -78, 95, 'x'); cy(g, 5, 14, AL, 72, -66, 95, 'x'); } break;
    case 'sensorO2': if (present) { cy(g, 3, 10, '#5b6473', 262, -112, 150, 'x'); bxr(g, 266, -114, 148, 4, 4, 4, '#f0b429'); } break;
    case 'ruedaI': case 'ruedaD': {
      const x = id === 'ruedaI' ? -22 : 342;
      if (present) R3.dyn[id] = wheel3D(g, x, -164, 171, true);
      else { cy(g, 52, 6, '#5d646f', x + (id === 'ruedaI' ? 14 : -14), -164, 171, 'x', 18); cy(g, 22, 14, ST, x + (id === 'ruedaI' ? 14 : -14), -164, 171, 'x', 10); }
      break; }
    case 'balataI': case 'balataD': {
      const x = id === 'balataI' ? 2 : 318;
      if (present) { bxr(g, x, -150, 150, 18, 30, 26, '#d8443a'); const th = Math.max(0.5, it.thick / 11 * 4); bxr(g, x + 2, -150 - th, 152, 14, th, 22, '#6b5a43'); }
      break; }
    default: {
      const m = /^(bob|buj|iny)(\d+)$/.exec(id);
      if (m) {
        const i = +m[2] - 1, P = cylPos(e)[i];
        const zc = P.y + P.h / 2;
        if (m[1] === 'bob' && present) { bxr(g, P.x - 5, 42, P.y, 10, 16, P.h, BK); bxr(g, P.x - 4, 58, P.y, 8, 4, 7, '#8b929c'); }
        if (m[1] === 'buj') {
          cy(g, 5, 2, '#0d0e11', P.x, 41.5, zc, 'y');
          if (present && !has(c, 'bob' + m[2])) { cy(g, 3, 8, '#e6e9ed', P.x, 44, zc, 'y'); cy(g, 1.4, 3, '#8b929c', P.x, 49, zc, 'y'); }
        }
        if (m[1] === 'iny') {
          const x = injX(e.cyl, i);
          if (present) { cy(g, 3, 14, BK, x, 40, 52, 'y'); cy(g, 3.3, 2, it.type === 'inyectorAlto' ? '#d8443a' : '#5aa65b', x, 44, 52, 'y'); }
          else cy(g, 2, 1, '#0d0e11', x, 33.5, 52, 'y');
        }
      }
    }
  }
  return tag(g, id);
}

/* bloque, cabeza, múltiples, arnés y lo que no se desarma */
function engineCore(c) {
  const g = new THREE.Group();
  const e = MOTORES[c.engId];
  const B = new Batch();
  const ST = '#4a515d', STD = '#3b414c', AL = '#a3abb6', BK = '#26282d';
  // bloque con costillas y cabeza
  B.box(100, -60, 44, 152, 70, 106, ST);
  for (let x = 112; x < 250; x += 18) { B.box(x, -56, 148.5, 5, 60, 3, STD, { ol: false }); B.box(x, -56, 42.5, 5, 60, 3, STD, { ol: false }); }
  B.box(104, 10, 48, 144, 22, 98, '#565e6b');
  B.box(96, -50, 60, 6, 70, 80, STD);
  // tapa de punterías con tornillos
  const covers = e.layout === 'V' ? [[62, 22, 0.12], [86, 22, -0.12]] : [[62, 46, 0]];
  for (const [z, d, rx] of covers) {
    B.box(118, 32, z, 120, 10, d, AL, { rx });
    for (let x = 124; x < 236; x += 22) { B.cyl(1.6, 3, '#d3d8de', x, 43, z + 2, 'y', { ol: false, seg: 6 }); B.cyl(1.6, 3, '#d3d8de', x, 43, z + d - 2, 'y', { ol: false, seg: 6 }); }
  }
  // múltiple de admisión: pleno + ductos curvos a cada cilindro
  B.box(108, 34, 26, 140, 16, 18, BK);
  for (let i = 0; i < e.cyl; i++) { const x = injX(e.cyl, i); B.tube([[x, 42, 30], [x, 44, 40], [x, 34, 48]], 4.5, BK); }
  B.cyl(8, 16, AL, 104, 40, 40, 'x');
  B.box(92, 34, 34, 8, 12, 12, '#121318');
  // arnés de cables con ramales
  B.tube([[114, 50, 58], [180, 52, 58], [244, 50, 60]], 1.6, '#121318', { ol: false });
  for (let i = 0; i < e.cyl; i++) { const P = cylPos(e)[i]; B.tube([[P.x, 52, 58], [P.x, 58, P.y + 3]], 1, '#121318', { ol: false }); }
  // escape
  const exCol = '#8a4128';
  const n = Math.min(4, e.cyl);
  for (let i = 0; i < n; i++) {
    const x = 140 + i * 26;
    B.tube(e.turbo ? [[x, 6, 142], [x + 10, 4, 152], [236, 14, 162]] : [[x, 6, 142], [x + 10, 0, 156], [236, -10, 168]], 3.5, exCol);
  }
  if (!e.turbo) B.tube([[236, -10, 168], [246, -40, 175], [250, -110, 150]], 6, exCol);
  else B.tube([[246, 8, 176], [248, -40, 178], [250, -110, 150]], 6, exCol);
  // poleas
  for (const [x, z, r] of [[76, 138, 10], [70, 108, 6], [88, 84, 5], [96, 118, 4]]) B.cyl(r, 5, '#5b6473', x, 22, z, 'y', { seg: 12 });
  // soportes de motor
  for (const [x, z] of [[100, 60], [252, 60], [176, 150]]) { B.box(x - 10, -40, z - 8, 20, 18, 16, '#121318'); B.box(x - 6, -26, z - 4, 12, 8, 8, '#8b929c', { ol: false }); }
  // cárter con aletas
  B.box(108, -100, 58, 104, 40, 84, '#3b414c');
  for (let x = 114; x < 210; x += 10) B.box(x, -104, 64, 3, 6, 72, '#2a2d33', { ol: false });
  B.build(g);
  // poleas que giran
  const pul = new THREE.Group(); pul.position.set(76, 22, 138);
  const P2 = new Batch(); P2.cyl(11, 6, '#7d8591', 0, 0, 0, 'y', { seg: 12 }); for (let k = 0; k < 4; k++) P2.boxc(Math.cos(k * 1.57) * 6, 3.5, Math.sin(k * 1.57) * 6, 3, 2, 3, '#2a2d33', { ol: false }); P2.build(pul);
  g.add(pul); R3.dyn.crankPulley = pul;
  return g;
}
function chassisFixed(c) {
  const g = new THREE.Group();
  const B = new Batch();
  // piso de la bahía y estructura
  B.box(-28, -64, -2, 376, 4, 248, '#1c1f25', { ol: false });
  B.box(-28, -150, 0, 18, 30, 250, '#2a2d33'); B.box(330, -150, 0, 18, 30, 250, '#2a2d33');
  // torres de suspensión
  for (const x of [-14, 334]) { B.cyl(22, 70, '#2a2d33', x, 4, 171, 'y'); B.cyl(14, 6, '#4a515d', x, 42, 171, 'y'); for (let k = 0; k < 3; k++) B.cyl(2, 6, '#d3d8de', x + Math.cos(k * 2.1) * 9, 45, 171 + Math.sin(k * 2.1) * 9, 'y', { ol: false, seg: 6 }); }
  // radiador, intercooler
  B.box(16, -56, 196, 298, 56, 12, '#1d1e22');
  for (let x = 20; x < 310; x += 6) B.box(x, -50, 207.5, 2, 44, 1, '#34363d', { ol: false });
  if (hasTurbo(c)) { B.box(28, -50, 210, 268, 40, 22, '#a3abb6'); for (let x = 32; x < 292; x += 5) B.box(x, -46, 231.5, 1.5, 32, 1, '#6a727e', { ol: false }); }
  // cubierta del ventilador
  B.box(150, -58, 182, 100, 60, 8, '#121318');
  // caja de fusibles y del filtro
  B.box(6, -12, 66, 32, 22, 20, '#1d1e22');
  B.box(262, -12, 16, 52, 38, 46, '#1d1e22');
  // servofreno y bomba de frenos
  B.cyl(30, 22, '#121318', 70, 4, 10, 'z');
  B.cyl(8, 30, '#8b929c', 70, 6, 30, 'z');
  B.box(62, 14, 26, 16, 12, 14, 'G:#e8dca0', { ol: false });
  // depósito de anticongelante
  B.box(272, -14, 118, 30, 38, 30, 'G:#e6e9ed', { ol: false });
  B.box(280, 24, 126, 14, 6, 14, '#121318');
  // escape trasero, convertidor, colgantes
  B.tube([[250, -112, 150], [250, -118, 40], [250, -120, -650]], 6, '#6a727e');
  B.box(238, -130, 60, 24, 22, 50, '#3b414c');
  for (const z of [-200, -450]) B.box(246, -110, z, 8, 8, 8, '#121318', { ol: false });
  // subchasís, cremallera, brazos y flechas
  B.box(40, -140, 116, 240, 8, 14, '#2a2d33');
  B.cyl(6, 240, '#5b6473', 160, -120, 158, 'x');
  for (const s of [-1, 1]) {
    const xw = s < 0 ? -10 : 330, xr = s < 0 ? 40 : 280;
    B.tube([[xr, -120, 158], [xw, -140, 178]], 3, '#8b929c');
    B.tube([[xr, -148, 130], [xw, -164, 171], [xr, -148, 196]], 4, '#2a2d33');
    B.cyl(42, 4, '#7d8591', xw + (s < 0 ? 14 : -14), -164, 171, 'x', { seg: 18 });
    B.cyl(10, 70, '#d8443a', xw, -120, 171, 'y', { seg: 8 });
  }
  if (c.caja && MODELOS[c.model].drive === 'FWD') for (const xw of [-4, 324]) B.tube([[100, -82, 100], [xw, -164, 171]], 5, '#3b414c');
  B.build(g);
  // líquido del depósito y ventilador
  const lvl = new THREE.Mesh(new THREE.BoxGeometry(26, 1, 26), M3('#3fb8a6'));
  lvl.position.set(287, -14, 133); g.add(lvl); R3.dyn.coolant = lvl;
  const fan = new THREE.Group(); fan.position.set(200, -28, 186);
  const FB = new Batch(); for (let k = 0; k < 6; k++) FB.boxc(Math.cos(k * 1.047) * 13, Math.sin(k * 1.047) * 13, 0, 22, 8, 2, '#2a2d33', { rz: k * 1.047 + 0.3 }); FB.cyl(5, 6, '#121318', 0, 0, 0, 'z'); FB.build(fan);
  g.add(fan); R3.dyn.fan = fan;
  return g;
}

function gearbox3D(c) {
  const g = new THREE.Group();
  if (c.caja) {
    bxr(g, 14, -100, 26, 92, 76, 86, '#b8bec7');
    cy(g, 38, 30, '#a3abb6', 100, -60, 70, 'x', 16);
    for (let i = 0; i < 6; i++) bxr(g, 20 + i * 14, -102, 30, 2, 2, 78, '#7d8591');
    if (c.caja.health <= 0) bxr(g, 40, -103, 60, 30, 1, 20, '#3a2e10');
  } else for (const [x, z] of [[100, 50], [100, 90]]) cy(g, 2, 6, '#d3d8de', x, -60, z, 'x');
  return tag(g, 'caja');
}

/* reconstruir lo que cambió */
function partKey(c, id) {
  const d = c.defs[id], s = c.slots[id] || {};
  const it = s.item;
  let k = (d.conn ? (s.on ? 1 : 0) : (it ? it.uid + it.type : 0)) + '|' + (slotVisible(c, id) ? 'v' : 'h');
  if (it) k += '|' + (it.seen ? 's' : '') + (it.thick ? Math.round(it.thick) : '');
  if (id === 'turbo') k += has(c, 'tuboAdm') ? 'T' : 't';
  if (id.startsWith('buj')) k += has(c, 'bob' + id.slice(3)) ? 'B' : 'b';
  if (id === 'batNeg' || id === 'batPos') k += has(c, 'bateria') ? 'Y' : 'n';
  if (id === 'tapaRad') k += c.cool.level > 0.7 ? 'L' : 'l';
  return k;
}
function sync3D(c) {
  if (!R3.ok) return;
  const op = c.open || {};
  const bodyKey = c.uid + '|' + c.model + '|' + (c.color || '') + (c.rust || 0).toFixed(2) + (op.doors ? 'D' : '') + (op.trunk ? 'T' : '') + '|' + (c.engId || '-') + '|' + (c.caja ? c.caja.uid + (c.caja.health > 0 ? 'ok' : 'x') : '-');
  if (bodyKey !== R3.bodyKey) {
    R3.bodyKey = bodyKey;
    R3.carGroup.clear(); R3.slotGroups = {}; R3.keys = {}; R3.dyn = {};
    R3.bodyG = buildBody(c.model, true, { color: c.color, rust: c.rust, doors: op.doors, trunk: op.trunk });
    R3.chassisG = chassisFixed(c);
    R3.carGroup.add(R3.bodyG);
    R3.carGroup.add(R3.chassisG);
    R3.engGroup = new THREE.Group(); R3.carGroup.add(R3.engGroup);
    if (c.engId) R3.engGroup.add(engineCore(c));
    else { for (const [x, z] of [[110, 60], [240, 60], [110, 140], [240, 140]]) cy(R3.carGroup, 4, 10, '#5b6473', x, -40, z, 'y'); }
    R3.gear = gearbox3D(c); R3.carGroup.add(R3.gear);
    tag(R3.carGroup, c.engId ? null : 'motor');
    tag(R3.engGroup, 'motor');
    tag(R3.gear, 'caja');
  }
  for (const id in c.defs) {
    const d = c.defs[id];
    if (d.macro) continue;
    const k = partKey(c, id);
    if (R3.keys[id] === k) continue;
    R3.keys[id] = k;
    if (R3.slotGroups[id]) {
      const old = R3.slotGroups[id];
      if (!d.conn && c.slots[id] && !c.slots[id].item) { R3.flying = R3.flying || []; R3.flying.push({ g: old, t: 0 }); old.traverse(o => { o.userData.slot = undefined; }); }
      else old.parent.remove(old);
    }
    if (!slotVisible(c, id)) { delete R3.slotGroups[id]; continue; }
    const g = slotGroup(c, id);
    (d.own === 'motor' && !d.lift ? R3.engGroup : R3.carGroup).add(g);
    R3.slotGroups[id] = g;
  }
  for (const id in R3.slotGroups) if (!c.defs[id]) { R3.slotGroups[id].parent.remove(R3.slotGroups[id]); delete R3.slotGroups[id]; delete R3.keys[id]; }
  // charola y charco
  if (!R3.pan) { R3.pan = new THREE.Group(); bxr(R3.pan, 128, 0, 108, 64, 12, 48, '#1a1b1f'); R3.panOil = bxr(R3.pan, 131, 2, 111, 58, 1, 42, '#d4a21f'); R3.scene.add(R3.pan); }
  R3.pan.visible = !!c.pan;
  R3.pan.position.y = -232;
  R3.pan.position.z = 0;
}

/* ---------- selección: la pieza brilla en amarillo ---------- */
function glowGroup(g, on) {
  g.traverse(o => {
    if (!o.isMesh || o.userData.outline || !o.material || !o.material.isMeshStandardMaterial) return;
    if (on) { if (!o.userData.mat0) { o.userData.mat0 = o.material; o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x6b4a00); o.material.emissiveIntensity = 1; } }
    else if (o.userData.mat0) { o.material.dispose(); o.material = o.userData.mat0; delete o.userData.mat0; }
  });
}
function setSelected3D(id) {
  for (const sid in R3.slotGroups) glowGroup(R3.slotGroups[sid], sid === id);
  if (R3.gear) glowGroup(R3.gear, id === 'caja');
  if (R3.engGroup) R3.engGroup.children.forEach(ch => { if (!Object.values(R3.slotGroups).includes(ch)) glowGroup(ch, id === 'motor'); });
}
const _ray = typeof THREE !== 'undefined' ? new THREE.Raycaster() : null;
function pick3D(nx, ny, view) {
  if (!R3.ok) return null;
  _ray.setFromCamera({ x: nx * 2 - 1, y: -(ny * 2 - 1) }, R3.cam);
  const hits = _ray.intersectObjects(R3.carGroup.children, true);
  for (const h of hits) {
    const id = h.object.userData.slot;
    if (id === undefined || id === null) continue;
    const d = G.car.defs[id];
    if (!d) continue;
    if (view === 'banco') { if (d.own !== 'motor' || d.macro || ['mangIcCal', 'mangIcFria', 'bov', 'filtroAire', 'tuboAdm'].includes(id)) continue; return id; }
    if (d.view !== view && !(id === 'motor' && view === 'cofre') && !(id === 'caja' && view === 'abajo')) continue;
    return id;
  }
  return null;
}

/* ---------- cámara orbital ---------- */
function bindOrbit(cv) {
  const pts = new Map();
  let moved = 0, lastPinch = 0;
  cv.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; try { cv.setPointerCapture(e.pointerId); } catch (er) { } });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId);
    const dxp = e.clientX - p.x, dyp = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      moved += Math.abs(dxp) + Math.abs(dyp);
      if (moved > 6) { R3.orbit.yaw -= dxp * 0.008; R3.orbit.pitch += dyp * 0.006 * (R3.orbit.pitch < 0 ? -1 : 1) * (R3.view === 'abajo' ? -1 : 1); clampOrbit(); R3.orbit.want = null; }
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinch) { R3.orbit.dist *= lastPinch / d; clampOrbit(); }
      lastPinch = d; moved = 99;
    }
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) lastPinch = 0; };
  cv.addEventListener('pointerup', e => {
    const wasTap = moved < 6 && pts.size === 1;
    up(e);
    const hint = document.getElementById('camHint'); if (hint && moved > 6) hint.classList.add('gone');
    if (wasTap && R3.onTap) { const r = cv.getBoundingClientRect(); R3.onTap((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }
  });
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); R3.orbit.dist *= Math.exp(e.deltaY * 0.001); clampOrbit(); }, { passive: false });
}
function clampOrbit() {
  const o = R3.orbit;
  if (R3.view === 'abajo') o.pitch = Math.max(-1.35, Math.min(-0.2, o.pitch));
  else if (R3.view === 'banco') { o.pitch = Math.max(-0.9, Math.min(1.45, o.pitch)); o.yaw = ((o.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; o.dist = Math.max(140, Math.min(700, o.dist)); return; }
  else if (R3.view === 'pista') o.pitch = Math.max(0.05, Math.min(1.3, o.pitch));
  else o.pitch = Math.max(0.2, Math.min(1.45, o.pitch));
  o.yaw = ((o.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  o.dist = Math.max(140, Math.min(1100, o.dist));
}
function setView3D(view) {
  R3.view = view;
  R3.focusZ = undefined;
  const o = R3.orbit;
  if (view === 'cofre') Object.assign(o, { yaw: 0.12, pitch: 1.0, dist: 440 });
  if (view === 'abajo') Object.assign(o, { yaw: 0.25, pitch: -0.7, dist: 420 });
  if (view === 'banco') Object.assign(o, { yaw: 0.7, pitch: 0.45, dist: 360 });
}

/* ---------- cuadro ---------- */
function resize3D() {
  if (!R3.ok) return;
  const r = R3.canvas.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (R3.w !== w || R3.h !== h) { R3.w = w; R3.h = h; R3.renderer.setSize(w, h, false); R3.cam.aspect = w / h; R3.cam.updateProjectionMatrix(); }
}
function frame3D(g, dt) {
  if (!R3.ok) return;
  const c = g.car, s = c.sim;
  resize3D();
  sync3D(c);
  // banco de motor: solo el motor sobre un plano azul
  const banco = R3.view === 'banco';
  if (R3.bancoWas !== banco) {
    R3.bancoWas = banco;
    if (!R3.blueprint) R3.blueprint = blueprintTex();
    R3.scene.background = banco ? R3.blueprint : new THREE.Color(0x2a2e36);
    R3.scene.fog = banco ? null : new THREE.Fog(0x2a2e36, 1800, 3400);
  }
  R3.shop.visible = !banco; if (R3.arms) R3.arms.visible = !banco;
  if (R3.crane && banco) R3.crane.visible = false;
  if (R3.bodyG) R3.bodyG.visible = !banco;
  if (R3.chassisG) R3.chassisG.visible = !banco;
  if (R3.gear) R3.gear.visible = !banco;
  const BODYMOUNT = { mangIcCal: 1, mangIcFria: 1, bov: 1, filtroAire: 1, tuboAdm: 1 };
  for (const id in R3.slotGroups) { const d = c.defs[id]; R3.slotGroups[id].visible = !banco || (d && d.own === 'motor' && !BODYMOUNT[id]); }
  if (R3.pan && banco) R3.pan.visible = false;
  // piezas que salen volando
  if (R3.flying) for (let i = R3.flying.length - 1; i >= 0; i--) {
    const f = R3.flying[i]; f.t += dt;
    f.g.position.y += dt * 520 * (1 - f.t); f.g.position.x += dt * 120;
    f.g.rotation.z += dt * 1.2;
    if (f.t > 0.55) { if (f.g.parent) f.g.parent.remove(f.g); R3.flying.splice(i, 1); }
  }
  // elevador
  const liftT = c.lift ? 230 : 0;
  R3.lift += (liftT - R3.lift) * Math.min(1, dt * 3);
  R3.carGroup.position.y = R3.lift;
  // vibración del motor
  if (R3.engGroup) {
    let j = 0;
    if (s.running) { const rough = s.cylMis.some(m => m) ? 1.5 : 0.4; j = (Math.random() - 0.5) * rough * (s.om < 130 ? 1.4 : 0.6); }
    else if (s.cranking) j = Math.sin(g.t * 50) * 0.8;
    R3.engGroup.position.set(j, Math.abs(j) * 0.4, 0);
  }
  if (R3.dyn.compWheel) R3.dyn.compWheel.rotation.z += Math.min(0.9, s.wt * dt * 0.02);
  if (R3.dyn.fan && s.fanOn) R3.dyn.fan.rotation.z += dt * 22;
  if (R3.dyn.crankPulley) R3.dyn.crankPulley.rotation.y += Math.min(0.7, s.om * dt);
  if (R3.dyn.coolant) { R3.dyn.coolant.position.y = -12 + 30 * Math.min(1.05, c.cool.level); R3.dyn.coolant.visible = c.cool.level > 0.03; }
  if (R3.arms) R3.arms.position.y = R3.lift;
  if (R3.crane) {
    R3.crane.visible = G.upg && G.upg.has('pluma');
    const over = c.proc && /Motor/.test(c.proc.type);
    const tx = over ? 136 : 760, tz = over ? 150 : -260;
    R3.crane.position.x += (tx - R3.crane.position.x) * Math.min(1, dt * 2);
    R3.crane.position.z += (tz - R3.crane.position.z) * Math.min(1, dt * 2);
  }
  // partículas: vapor del radiador y chorro de aceite al drenar
  const L = R3.lift;
  if (c.engId && (s.ECT > 118 || (!has(c, 'tapaRad') && s.ECT > 96)) && Math.random() < dt * 25) fx3(R3.scene, 306 + (Math.random() - 0.5) * 8, 8 + L, 198, (Math.random() - 0.5) * 20, 70 + Math.random() * 40, (Math.random() - 0.5) * 20, 1.4, '#e8edf2', 6, 3);
  if (c.engId && !has(c, 'tapon') && c.oil.level > 0.12 && Math.random() < dt * 40) fx3(R3.scene, 160 + (Math.random() - 0.5) * 3, -106 + L, 132, 0, -160, 0, (L + 120) / 160 / 1.4, c.oil.quality < 0.5 ? '#3a2e10' : '#d4a21f', 3, 0);
  if (c.engId && s.running && c.smokeOut !== false && (s.smoke.b > 0.2 || s.smoke.k > 0.25 || s.smoke.w > 0.2) && Math.random() < dt * 20) fx3(R3.scene, 250, -126 + L, 250 - (MODELOS[c.model].shape === 'pickup' ? 1020 : MODELOS[c.model].shape === 'hatch' ? 820 : 960) - 20, (Math.random() - 0.5) * 30, 20, -60, 2.2, s.smoke.b > 0.2 ? '#8fa8d8' : s.smoke.k > 0.25 ? '#2a2a2e' : '#eef2f5', 10, 4);
  stepFx3(dt);
  if (R3.dyn.turbHousing) { const t = (s.Tt - 650) / 450; R3.dyn.turbHousing.material = M3(t > 0.5 ? '#e2702b' : t > 0 ? '#a33a1f' : '#8a4128'); }
  // cámara
  const o = R3.orbit;
  const ty = (R3.view === 'abajo' ? -90 : banco ? -10 : 10) + R3.lift;
  const tgt = new THREE.Vector3(banco ? 176 : 160, ty, banco ? 100 : (R3.focusZ !== undefined && R3.view === 'cofre' ? R3.focusZ : 120));
  const cp = Math.cos(o.pitch);
  const dd = o.dist * Math.pow(Math.max(1, 1.1 / (R3.cam.aspect || 1)), 0.75);
  R3.cam.position.set(tgt.x + Math.sin(o.yaw) * cp * dd, tgt.y + Math.sin(o.pitch) * dd, tgt.z + Math.cos(o.yaw) * cp * dd);
  if (R3.view === 'abajo' && R3.cam.position.y < -225) R3.cam.position.y = -225;
  R3.cam.lookAt(tgt);
  if (R3.pan) { R3.pan.position.x = 0; if (R3.panOil) { const lv = Math.min(1, c.oil.pan / 5); R3.panOil.scale.y = 1; R3.panOil.position.y = 2 + lv * 9; R3.panOil.visible = lv > 0.01; } }
  R3.renderer.render(R3.scene, R3.cam);
}
