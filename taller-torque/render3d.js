'use strict';
/* =====================================================================
   TALLER TORQUE · 3D
   Three.js con sombreado de caricatura (3 tonos), contorno negro y
   resolución baja escalada sin suavizado: pixel art en 3D.
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
  const d = new Uint8Array([64, 64, 64, 255, 135, 135, 135, 255, 215, 215, 215, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const MATS = {};
function M3(col, opt) {
  const k = col + (opt ? JSON.stringify(opt) : '');
  if (!MATS[k]) MATS[k] = new THREE.MeshToonMaterial(Object.assign({ color: col, gradientMap: GRAD }, opt || {}));
  return MATS[k];
}
let OUT, OUT_SEL;
function outline(mesh, sx, sy, sz) {
  const o = new THREE.Mesh(mesh.geometry, OUT);
  o.scale.set(sx, sy, sz); o.userData.outline = true; o.raycast = () => {};
  mesh.add(o); return o;
}
function bx(par, w, h, d, col, x, y, z, opt) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M3(col, opt));
  m.position.set(x, y, z);
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
    outline(m, 1 + 1.3 / r, 1 + 0.5 / L, 1 + 1.3 / r);
    par.add(m);
    if (joints !== false && i > 0) sph(par, r, col, ...pts[i]);
  }
}
function tag(g, id) { g.traverse(o => { if (o.isMesh && !o.userData.outline) o.userData.slot = id; }); return g; }

/* ---------- inicio ---------- */
function init3D(canvas) {
  if (typeof THREE === 'undefined') return false;
  try {
    R3.canvas = canvas;
    R3.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch (e) { return false; }
  R3.renderer.setPixelRatio(1);
  R3.renderer.setClearColor(0x16181d);
  OUT = new THREE.MeshBasicMaterial({ color: 0x0b0c10, side: THREE.BackSide });
  OUT_SEL = new THREE.MeshBasicMaterial({ color: 0xf0b429, side: THREE.BackSide });
  const sc = new THREE.Scene();
  sc.fog = new THREE.Fog(0x16181d, 1400, 2600);
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3226, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6); sun.position.set(220, 600, 380); sc.add(sun);
  const fill = new THREE.DirectionalLight(0xffe2b8, 0.25); fill.position.set(-400, -200, 300); sc.add(fill);
  R3.scene = sc;
  R3.cam = new THREE.PerspectiveCamera(40, 4 / 3, 5, 5000);
  buildShop(sc);
  R3.carGroup = new THREE.Group(); sc.add(R3.carGroup);
  R3.ok = true;
  bindOrbit(canvas);
  return true;
}

function buildShop(sc) {
  const g = new THREE.Group();
  const floorY = -232;
  bxr(g, -900, floorY - 10, -1400, 2100, 10, 2600, '#4a4e57');
  for (let z = -1300; z < 1200; z += 160) bxr(g, -900, floorY, z, 2100, 0.6, 2, '#3c4048');
  bxr(g, -260, floorY + 0.5, -900, 8, 0.6, 1300, '#f0b429'); bxr(g, 572, floorY + 0.5, -900, 8, 0.6, 1300, '#f0b429');
  // pared del fondo y herramientas
  bxr(g, -900, floorY, -1400, 2100, 700, 12, '#5d6370');
  bxr(g, -500, floorY + 260, -1386, 700, 220, 6, '#8a6a42');
  for (let i = 0; i < 9; i++) bxr(g, -460 + i * 74, floorY + 300 + (i % 3) * 40, -1378, 10, 70, 6, i % 2 ? '#a3abb6' : '#d8443a');
  // caja de herramientas roja
  bxr(g, 620, floorY, -500, 160, 220, 110, '#b8322a');
  for (let i = 0; i < 5; i++) bxr(g, 626, floorY + 30 + i * 38, -392, 148, 6, 4, '#7c1f19');
  // elevador: postes
  for (const x of [-140, 460]) { bxr(g, x - 20, floorY, 40, 40, 520, 40, '#2e5f9e'); bxr(g, x - 30, floorY, 30, 60, 10, 60, '#1d3e69'); }
  // lámparas
  for (const z of [-300, 200]) bxr(g, 0, 380, z, 320, 8, 30, '#e6e9ed');
  sc.add(g);
  R3.shop = g;
}

/* ---------- carrocería ---------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f)), gg = Math.min(255, Math.round(((n >> 8) & 255) * f)), b = Math.min(255, Math.round((n & 255) * f));
  return '#' + ((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1);
}
function buildBody(modelId, openBay) {
  const Md = MODELOS[modelId];
  const col = Md.color, dk = shade(col, 0.7), glass = '#9fc4dd', blk = '#1a1b1f';
  const g = new THREE.Group();
  const shape = Md.shape;
  const len = shape === 'pickup' ? 1020 : shape === 'hatch' ? 820 : 960;
  const rear = 250 - len;
  const sill = -150, belt = 40;
  // largueros y piso
  bxr(g, -30, sill, rear + 40, 380, 20, -80 - rear, '#2a2d33');
  // costados
  bxr(g, -42, sill, rear, 14, belt - sill, len - 10, col);
  bxr(g, 348, sill, rear, 14, belt - sill, len - 10, col);
  // salpicaderas sobre el cofre
  bxr(g, -42, belt - 8, 0, 50, 8, 245, col); bxr(g, 312, belt - 8, 0, 50, 8, 245, col);
  // frente
  bxr(g, -42, -150, 238, 404, 120, 22, col);
  bxr(g, 20, -110, 252, 280, 50, 6, blk);
  for (let x = 30; x < 290; x += 22) bxr(g, x, -104, 255, 12, 38, 3, '#2c2e34');
  bxr(g, -32, -70, 252, 60, 26, 6, '#fff3c4'); bxr(g, 292, -70, 252, 60, 26, 6, '#fff3c4');
  bxr(g, -44, -150, 250, 408, 26, 14, '#2a2d33');
  // torreta y parabrisas
  bxr(g, -42, -10, -40, 404, 52, 40, blk);
  const roofH = shape === 'muscle' ? 150 : shape === 'coupe' ? 150 : 175;
  const cabF = -60, cabR = shape === 'pickup' ? -330 : shape === 'hatch' ? -470 : shape === 'coupe' ? -400 : -440;
  const ws = bx(g, 380, Math.hypot(roofH - belt, 150), 4, glass, 160, (belt + roofH) / 2, cabF - 75, { transparent: true, opacity: 0.45 });
  ws.rotation.x = -Math.atan2(150, roofH - belt);
  const rz0 = cabR + 40, rz1 = cabF - 150;
  bx(g, 392, 10, Math.max(20, rz1 - rz0), col, 160, roofH + 1, (rz0 + rz1) / 2);
  // pilares y ventanas laterales
  for (const x of [-38, 352]) {
    tube(g, [[x, belt, cabF - 2], [x, roofH, cabF - 150]], 5, dk, false);
    tube(g, [[x, belt, cabR], [x, roofH, cabR + 40]], 6, dk, false);
    const w = bx(g, 4, roofH - belt - 12, Math.abs(cabR - cabF) - 110, glass, x + (x < 0 ? -2 : 2), (belt + roofH) / 2, (cabF - 150 + cabR + 40) / 2, { transparent: true, opacity: 0.5 });
  }
  // atrás
  if (shape === 'pickup') {
    bxr(g, -42, sill, rear, 404, 120, 14, col);
    bxr(g, -36, -30, rear + 14, 392, 10, cabR - rear - 30, '#3a3d45');
  } else {
    const trunkH = shape === 'hatch' ? roofH - 20 : belt + 20;
    bxr(g, -42, belt - 10, rear, 404, trunkH - belt + 10, Math.max(20, cabR - rear), col);
    bxr(g, -42, sill, rear - 8, 404, 70, 14, '#2a2d33');
    bxr(g, -30, belt - 30, rear - 10, 70, 20, 4, '#d8443a'); bxr(g, 290, belt - 30, rear - 10, 70, 20, 4, '#d8443a');
  }
  if (shape === 'muscle') { bxr(g, 120, belt + 6, rear + 6, 80, 6, 40, blk); }
  // cofre abierto
  if (openBay) {
    const hood = new THREE.Group();
    bxr(hood, -40, 0, -6, 400, 240, 8, col);
    bxr(hood, -30, 10, 3, 380, 220, 3, dk);
    hood.position.set(0, belt, -40); hood.rotation.x = -0.32;
    g.add(hood);
    tube(g, [[20, belt, -30], [20, belt + 200, -100]], 2, '#a3abb6', false);
  } else {
    bxr(g, -36, belt - 4, -40, 392, 8, 290, col);
    if (shape === 'muscle' || Md.drive === 'RWD') bxr(g, 120, belt + 4, 40, 80, 8, 120, dk);
  }
  // ruedas traseras (las delanteras son piezas)
  for (const x of [-22, 342]) wheel3D(g, x, -164, rear + 150, false);
  return g;
}
function wheel3D(par, x, y, z, front) {
  const w = new THREE.Group();
  cy(w, 66, 42, '#1a1b1f', 0, 0, 0, 'x', 20);
  cy(w, 40, 44, '#a3abb6', 0, 0, 0, 'x', 12);
  cy(w, 16, 46, '#6a727e', 0, 0, 0, 'x', 8);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; bx(w, 48, 5, 5, '#d3d8de', 0, Math.sin(a) * 26, Math.cos(a) * 26); }
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

/* bloque, múltiples y lo que no se desarma */
function engineCore(c) {
  const g = new THREE.Group();
  const e = MOTORES[c.engId];
  const ST = '#4a515d', AL = '#a3abb6';
  bxr(g, 100, -60, 44, 152, 100, 106, ST);
  if (e.layout === 'V') {
    for (const [z, rx] of [[62, 0.12], [86, -0.12]]) { const b = bxr(g, 118, 30, z, 120, 12, 22, AL); b.rotation.x = rx; }
    bxr(g, 118, 28, 84, 120, 10, 4, '#2a2d33');
  } else bxr(g, 118, 30, 62, 120, 12, 46, AL);
  bxr(g, 108, 30, 28, 140, 16, 18, '#26282d');
  cy(g, 8, 16, AL, 104, 40, 40, 'x');
  for (let i = 0; i < e.cyl; i++) { const x = injX(e.cyl, i); bxr(g, x - 4, 26, 44, 8, 12, 8, '#26282d'); }
  // escape
  const exCol = '#8a4128';
  const n = Math.min(4, e.cyl);
  for (let i = 0; i < n; i++) {
    const x = 140 + i * 26;
    tube(g, e.turbo ? [[x, 6, 142], [x + 10, 4, 152], [236, 14, 162]] : [[x, 6, 142], [x + 10, 0, 156], [236, -10, 168]], 3.5, exCol);
  }
  if (!e.turbo) tube(g, [[236, -10, 168], [246, -40, 175], [250, -110, 150]], 6, exCol);
  else tube(g, [[246, 8, 176], [248, -40, 178], [250, -110, 150]], 6, exCol);
  // poleas
  for (const [x, z, r] of [[76, 138, 10], [70, 108, 6], [88, 84, 5], [96, 118, 4]]) cy(g, r, 5, '#5b6473', x, 22, z, 'y');
  // cárter y abajo
  bxr(g, 108, -100, 58, 104, 40, 84, '#3b414c');
  return g;
}
function chassisFixed(c) {
  const g = new THREE.Group();
  // piso de la bahía, radiador, intercooler, caja de fusibles y del filtro
  bxr(g, -28, -64, -2, 376, 4, 248, '#1c1f25');
  bxr(g, 16, -56, 196, 298, 56, 12, '#1d1e22');
  for (let x = 20; x < 310; x += 6) bxr(g, x, -50, 207.5, 2, 44, 1, '#34363d');
  if (hasTurbo(c)) { bxr(g, 28, -50, 210, 268, 40, 22, '#a3abb6'); for (let x = 32; x < 292; x += 5) bxr(g, x, -46, 231.5, 1.5, 32, 1, '#6a727e'); }
  bxr(g, 6, -12, 66, 32, 22, 20, '#1d1e22');
  bxr(g, 262, -12, 16, 52, 38, 46, '#1d1e22');
  // escape trasero
  tube(g, [[250, -112, 150], [250, -118, 40], [250, -120, -650]], 6, '#6a727e', true);
  bxr(g, 238, -128, 60, 24, 20, 50, '#3b414c');
  // subchasís
  bxr(g, 40, -140, 116, 240, 8, 12, '#2a2d33');
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
  const bodyKey = c.uid + '|' + c.model + '|' + (c.engId || '-') + '|' + (c.caja ? c.caja.uid + (c.caja.health > 0 ? 'ok' : 'x') : '-');
  if (bodyKey !== R3.bodyKey) {
    R3.bodyKey = bodyKey;
    R3.carGroup.clear(); R3.slotGroups = {}; R3.keys = {}; R3.dyn = {};
    R3.carGroup.add(buildBody(c.model, true));
    R3.carGroup.add(chassisFixed(c));
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
    if (R3.slotGroups[id]) { R3.slotGroups[id].parent.remove(R3.slotGroups[id]); }
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

/* ---------- selección ---------- */
function setSelected3D(id) {
  for (const sid in R3.slotGroups) {
    R3.slotGroups[sid].traverse(o => { if (o.userData.outline) o.material = sid === id ? OUT_SEL : OUT; });
  }
  if (R3.gear) R3.gear.traverse(o => { if (o.userData.outline) o.material = id === 'caja' ? OUT_SEL : OUT; });
  if (R3.engGroup) R3.engGroup.children.forEach(ch => { if (!Object.values(R3.slotGroups).includes(ch)) ch.traverse(o => { if (o.userData.outline) o.material = id === 'motor' ? OUT_SEL : OUT; }); });
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
  else if (R3.view === 'pista') o.pitch = Math.max(0.05, Math.min(1.3, o.pitch));
  else o.pitch = Math.max(0.2, Math.min(1.45, o.pitch));
  o.yaw = Math.max(-1.6, Math.min(1.6, o.yaw));
  o.dist = Math.max(140, Math.min(1100, o.dist));
}
function setView3D(view) {
  R3.view = view;
  const o = R3.orbit;
  if (view === 'cofre') Object.assign(o, { yaw: 0.12, pitch: 1.0, dist: 440 });
  if (view === 'abajo') Object.assign(o, { yaw: 0.25, pitch: -0.7, dist: 420 });
}

/* ---------- cuadro ---------- */
function resize3D() {
  if (!R3.ok) return;
  const r = R3.canvas.getBoundingClientRect();
  if (!r.width) return;
  const target = r.width < 500 ? 300 : 400;
  const w = Math.round(target), h = Math.round(target * r.height / r.width);
  if (R3.w !== w || R3.h !== h) { R3.w = w; R3.h = h; R3.renderer.setSize(w, h, false); R3.cam.aspect = w / h; R3.cam.updateProjectionMatrix(); }
}
function frame3D(g, dt) {
  if (!R3.ok) return;
  const c = g.car, s = c.sim;
  resize3D();
  sync3D(c);
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
  if (R3.dyn.turbHousing) { const t = (s.Tt - 650) / 450; R3.dyn.turbHousing.material = M3(t > 0.5 ? '#e2702b' : t > 0 ? '#a33a1f' : '#8a4128'); }
  // cámara
  const o = R3.orbit;
  const ty = (R3.view === 'abajo' ? -90 : 10) + R3.lift;
  const tgt = new THREE.Vector3(160, ty, 120);
  const cp = Math.cos(o.pitch);
  R3.cam.position.set(tgt.x + Math.sin(o.yaw) * cp * o.dist, tgt.y + Math.sin(o.pitch) * o.dist, tgt.z + Math.cos(o.yaw) * cp * o.dist);
  if (R3.view === 'abajo' && R3.cam.position.y < -225) R3.cam.position.y = -225;
  R3.cam.lookAt(tgt);
  if (R3.pan) { R3.pan.position.x = 0; if (R3.panOil) { const lv = Math.min(1, c.oil.pan / 5); R3.panOil.scale.y = 1; R3.panOil.position.y = 2 + lv * 9; R3.panOil.visible = lv > 0.01; } }
  R3.renderer.render(R3.scene, R3.cam);
}
