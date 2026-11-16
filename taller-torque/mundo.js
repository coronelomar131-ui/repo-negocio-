'use strict';
/* =====================================================================
   TALLER TORQUE · mundo libre
   Caminas con tu mecánico, te subes a tus autos y manejas por la
   colonia: taller, refaccionaria, lote de autos, deshuesadero y pista.
   El auto que manejas usa el mismo simulador de motor y transmisión.
   ===================================================================== */

const MW = U;                     // unidades por metro (igual que la pista)
const GROUND = -232;
const MUNDO = {
  built: false, scene: null, cam: null, mode: 'pie', // 'pie' | 'auto'
  p: { x: 0, z: 14 * MW, h: Math.PI, vx: 0 }, walkT: 0,
  car: null, V: null, gas: 0, brake: 0, steer: 0, rev: false, gear: 1, shiftT: 0,
  joy: { x: 0, y: 0, on: false }, camYaw: 0, prompt: null, carGroups: {}, carKey: '', solids: [],
};
const LIFT = { x: 0, z: -2 * MW, h: 0 };
const SPOTS = [[-9, 15], [-3, 15], [3, 15], [9, 15], [-15, 15], [15, 15]].map(([x, z]) => ({ x: x * MW, z: z * MW, h: Math.PI }));
const LUGARES = [
  { id: 'taller', name: 'Tu taller', x: 0, z: 0, r: 0, col: '#f0b429' },
  { id: 'tienda', name: 'Refaccionaria', x: 58, z: 46, r: 6, col: '#3d7ccf', act: 'Entrar a la refaccionaria' },
  { id: 'lote', name: 'Lote de autos', x: 62, z: -42, r: 9, col: '#5aa65b', act: 'Ver autos en venta' },
  { id: 'deshue', name: 'Deshuesadero', x: -64, z: 48, r: 9, col: '#8a4128', act: 'Ver motores y cajas' },
  { id: 'pista', name: 'Pista de arrancones', x: 0, z: 96, r: 10, col: '#d8443a', act: 'Ir a la pista' },
];

/* ---------- construcción del mundo ---------- */
function buildMundo() {
  if (MUNDO.built || !R3.ok) return;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x9cc3e4);
  sc.environment = R3.env;
  sc.fog = new THREE.Fog(0x9cc3e4, 9000, 26000);
  sc.add(new THREE.HemisphereLight(0xeaf3ff, 0x5b5040, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.85); sun.position.set(-1200, 2400, 900);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008;
  Object.assign(sun.shadow.camera, { left: -2200, right: 2200, top: 2200, bottom: -2200, near: 100, far: 6000 });
  sc.add(sun); sc.add(sun.target); MUNDO.sun = sun;
  const g = new THREE.Group();
  const B = new Batch();
  const m = v => v * MW;
  const solid = (x0, z0, x1, z1) => MUNDO.solids.push([m(x0), m(z0), m(x1), m(z1)]);
  // pasto y calles
  B.box(m(-140), GROUND - 8, m(-140), m(280), 8, m(280), '#6b8f4e', { ol: false });
  const roadH = (z, x0, x1) => { B.box(m(x0), GROUND, m(z - 5), m(x1 - x0), 1, m(10), '#3a3d44', { ol: false }); for (let x = x0; x < x1; x += 6) B.box(m(x), GROUND + 1, m(z - 0.12), m(3), 0.5, m(0.24), '#e6e9ed', { ol: false }); B.box(m(x0), GROUND, m(z + 5), m(x1 - x0), 6, m(2), '#9aa0a8', { ol: false }); B.box(m(x0), GROUND, m(z - 7), m(x1 - x0), 6, m(2), '#9aa0a8', { ol: false }); };
  const roadV = (x, z0, z1) => { B.box(m(x - 5), GROUND + 0.4, m(z0), m(10), 1, m(z1 - z0), '#3a3d44', { ol: false }); for (let z = z0; z < z1; z += 6) B.box(m(x - 0.12), GROUND + 1.4, m(z), m(0.24), 0.5, m(3), '#e6e9ed', { ol: false }); };
  roadH(26, -130, 130); roadH(-26, -130, 130); roadH(80, -130, 130);
  roadV(-38, -130, 130); roadV(38, -130, 130);
  B.box(m(-14), GROUND + 0.5, m(10), m(28), 1, m(16), '#4a4e57', { ol: false });
  for (const s of SPOTS) B.box(s.x - m(1.4), GROUND + 1.2, s.z - m(2.6), m(0.15), 0.5, m(5.2), '#e6e9ed', { ol: false });
  // TU TALLER: muros, techo con hueco al frente, letrero
  B.box(m(-13), GROUND, m(-13), m(26), m(6), m(0.6), '#c8b89a');
  B.box(m(-13), GROUND, m(-13), m(0.6), m(6), m(23), '#c8b89a');
  B.box(m(12.4), GROUND, m(-13), m(0.6), m(6), m(23), '#c8b89a');
  B.box(m(-13), GROUND + m(6), m(-13), m(26), m(0.5), m(23), '#6a707c');
  B.box(m(-13), GROUND + m(4.2), m(9.4), m(26), m(1.8), m(0.6), '#c8b89a');
  B.box(m(-6), GROUND + m(4.4), m(10.05), m(12), m(1.3), m(0.3), '#121318');
  for (let i = 0; i < 12; i++) B.box(m(-5.6 + i * 0.95), GROUND + m(4.6), m(10.3), m(0.7), m(0.9), m(0.1), '#f0b429', { ol: false });
  B.box(m(-12.4), GROUND, m(-12.4), m(24.8), 1, m(21.8), '#555a63', { ol: false });
  for (const x of [-4, 4]) { B.box(m(x - 0.25), GROUND, m(-4), m(0.5), m(2.6), m(0.5), '#2e5f9e'); }
  B.box(m(9), GROUND, m(-11), m(1.8), m(1.1), m(0.9), '#b8322a');
  B.box(m(-12), GROUND, m(-11), m(3), m(0.9), m(1.2), '#9a7a4e');
  solid(-13, -13, 13, -12.4); solid(-13, -13, -12.4, 10); solid(12.4, -13, 13, 10);
  // REFACCIONARIA
  B.box(m(50), GROUND, m(36), m(16), m(5), m(8), '#e6e9ed'); B.box(m(50), GROUND + m(5), m(36), m(16), m(0.4), m(8), '#3d7ccf');
  B.box(m(53), GROUND + m(3.6), m(44.05), m(10), m(1), m(0.2), '#3d7ccf'); B.box(m(55.5), GROUND, m(44.05), m(5), m(2.6), m(0.1), '#2c3e50', { ol: false });
  for (let i = 0; i < 6; i++) B.box(m(53.6 + i * 1.5), GROUND + m(3.8), m(44.3), m(1), m(0.6), m(0.05), '#f0b429', { ol: false });
  solid(50, 36, 66, 44);
  // LOTE DE AUTOS
  B.box(m(52), GROUND + 0.6, m(-52), m(22), 1, m(20), '#4a4e57', { ol: false });
  for (let i = 0; i < 12; i++) B.box(m(52 + i * 2), GROUND, m(-32.2), m(0.2), m(1.2), m(0.2), '#f0b429', { ol: false });
  B.box(m(52), GROUND + m(3), m(-31.8), m(22), m(0.25), m(0.1), '#d8443a', { ol: false });
  B.box(m(56), GROUND, m(-50), m(5), m(2.8), m(4), '#e6e9ed');
  // DESHUESADERO: barda, montañas de chatarra
  for (const [x0, z0, w, d] of [[-76, 38, 24, 0.4], [-76, 38, 0.4, 22], [-52.4, 38, 0.4, 22]]) { B.box(m(x0), GROUND, m(z0), m(w), m(2.4), m(d), '#8b929c'); solid(x0, z0, x0 + w, z0 + d); }
  B.box(m(-76), GROUND, m(60), m(9), m(2.4), m(0.4), '#8b929c'); B.box(m(-61), GROUND, m(60), m(9), m(2.4), m(0.4), '#8b929c'); solid(-76, 60, -67, 60.4); solid(-61, 60, -52, 60.4);
  const junk = ['#7a3a24', '#5d6370', '#8a4128', '#3d5a7c', '#6b5a43'];
  for (let i = 0; i < 18; i++) { const x = -73 + (i % 6) * 3.4, z = 41 + Math.floor(i / 6) * 4.5, h = 1.2 + (i % 3) * 0.9; B.box(m(x), GROUND, m(z), m(3), m(h), m(2.2), junk[i % 5], { ry: (i % 4) * 0.2 }); }
  for (let i = 0; i < 8; i++) B.cyl(m(0.35), m(0.25), '#1a1b1f', m(-56 + (i % 2) * 0.2), GROUND + m(0.12 + i * 0.25), m(55), 'y', { seg: 14 });
  B.box(m(-70), GROUND + m(3), m(60.2), m(12), m(1), m(0.2), '#121318'); for (let i = 0; i < 8; i++) B.box(m(-69.2 + i * 1.4), GROUND + m(3.2), m(60.45), m(1), m(0.6), m(0.05), '#d8443a', { ol: false });
  // PISTA: arco de entrada y gradas
  B.box(m(-9), GROUND, m(90), m(1), m(7), m(1), '#d8443a'); B.box(m(8), GROUND, m(90), m(1), m(7), m(1), '#d8443a');
  B.box(m(-9), GROUND + m(6), m(90), m(18), m(1.4), m(1), '#e6e9ed');
  for (let i = 0; i < 10; i++) B.box(m(-7.5 + i * 1.6), GROUND + m(6.25), m(91.05), m(1.1), m(0.9), m(0.05), '#d8443a', { ol: false });
  B.box(m(-30), GROUND, m(100), m(60), m(3), m(10), '#7a8190');
  solid(-30, 100, 30, 110);
  // colonia: casas y edificios en las cuadras libres
  const cols = ['#d9b38c', '#c87f63', '#a3b5c7', '#e6d8b8', '#9fb48f', '#d8c26a', '#b07a9a'];
  let k = 0;
  for (const [cx, cz] of [[-90, -60], [-90, 0], [-90, 55], [90, 10], [90, 55], [90, -60], [-60, -60], [0, -60], [-10, 50], [10, 55], [-90, 110], [90, 110], [-60, 110], [60, 110]]) {
    for (let i = 0; i < 4; i++) {
      const x = cx - 14 + (i % 2) * 16, z = cz - 12 + Math.floor(i / 2) * 15, w = 11 + (k % 3), d = 10, h = 4 + (k % 4) * 3;
      if (Math.abs(x) < 16 && z > -16 && z < 20) continue;
      if (x > 46 && x < 76 && z > -56 && z < 50) continue;
      if (x > -80 && x < -48 && z > 34 && z < 64) continue;
      if (Math.abs(x) < 34 && z > 86) continue;
      B.box(m(x), GROUND, m(z), m(w), m(h), m(d), cols[k % cols.length]);
      B.box(m(x - 0.2), GROUND + m(h), m(z - 0.2), m(w + 0.4), m(0.4), m(d + 0.4), '#6a4a3a');
      for (let wy = 1.2; wy < h - 0.8; wy += 2.6) for (let wx = 1.2; wx < w - 1; wx += 2.8) B.box(m(x + wx), GROUND + m(wy), m(z + d + 0.02), m(1.4), m(1.3), m(0.05), '#2c3e50', { ol: false });
      B.box(m(x + w / 2 - 0.6), GROUND, m(z + d + 0.03), m(1.2), m(2.2), m(0.05), '#5a3a2a', { ol: false });
      solid(x, z, x + w, z + d);
      k++;
    }
  }
  // árboles y postes
  for (let i = 0; i < 40; i++) {
    const x = -125 + (i * 37) % 250, z = -120 + ((i * 53) % 240);
    if (Math.abs(Math.abs(z) - 26) < 8 || Math.abs(z - 80) < 8 || Math.abs(Math.abs(x) - 38) < 8) continue;
    if (Math.abs(x) < 16 && z > -16 && z < 22) continue;
    B.cyl(m(0.25), m(2.5), '#6b4a2a', m(x), GROUND + m(1.25), m(z), 'y', { seg: 6 });
    B.box(m(x - 1.4), GROUND + m(2.2), m(z - 1.4), m(2.8), m(2.6), m(2.8), i % 2 ? '#4f7a3a' : '#5a8c43');
  }
  for (let x = -120; x < 130; x += 24) for (const z of [33, -33]) { B.cyl(m(0.12), m(6), '#8b929c', m(x), GROUND + m(3), m(z), 'y', { seg: 6 }); B.box(m(x - 0.2), GROUND + m(6), m(z - (z > 0 ? 1.4 : 0)), m(0.4), m(0.2), m(1.4), '#8b929c'); }
  B.build(g);
  sc.add(g);
  // personaje
  MUNDO.char = buildChar();
  sc.add(MUNDO.char);
  MUNDO.scene = sc;
  MUNDO.cam = new THREE.PerspectiveCamera(55, 4 / 3, 10, 40000);
  MUNDO.built = true;
}
function buildChar() {
  const g = new THREE.Group();
  const B = new Batch();
  // torso con overol, cabeza, gorra
  B.boxc(0, 250, 0, 90, 120, 56, '#2e5f9e');
  B.boxc(0, 280, 29, 50, 30, 2, '#f0b429', { ol: false });
  B.boxc(0, 340, 0, 60, 60, 60, '#e0a77a');
  B.boxc(0, 376, 0, 64, 16, 64, '#d8443a');
  B.boxc(0, 372, 36, 50, 6, 26, '#d8443a');
  B.boxc(-14, 344, 31, 8, 8, 2, '#121318', { ol: false }); B.boxc(14, 344, 31, 8, 8, 2, '#121318', { ol: false });
  B.build(g);
  const limb = (x, y, w, h, col, foot) => { const p = new THREE.Group(); p.position.set(x, y, 0); const L = new Batch(); L.boxc(0, -h / 2, 0, w, h, w, col); if (foot) L.boxc(0, -h + 6, 10, w + 4, 14, w + 18, '#1a1b1f'); L.build(p); g.add(p); return p; };
  MUNDO.legs = [limb(-24, 190, 36, 180, '#24467a', true), limb(24, 190, 36, 180, '#24467a', true)];
  MUNDO.arms = [limb(-60, 300, 28, 130, '#2e5f9e'), limb(60, 300, 28, 130, '#2e5f9e')];
  MUNDO.arms.forEach(a => { const h = new Batch(); h.boxc(0, -136, 0, 26, 22, 26, '#e0a77a'); h.build(a); });
  g.scale.setScalar(0.62);
  return g;
}

/* ---------- autos en el mundo ---------- */
function freeSpot(except) {
  for (const s of SPOTS) if (!G.cars.some(c => c !== except && c.pos && Math.hypot(c.pos.x - s.x, c.pos.z - s.z) < MW)) return Object.assign({}, s);
  return Object.assign({}, SPOTS[0], { x: SPOTS[0].x + Math.random() * 3 * MW });
}
function carPose(c) {
  if (!c.pos) c.pos = c === G.car && G.view !== 'mundo' ? Object.assign({}, LIFT) : freeSpot(c);
  return c.pos;
}
function putOnLift(c) {
  if (c.pos && Math.hypot(c.pos.x - LIFT.x, c.pos.z - LIFT.z) < MW) return;
  for (const o of G.cars) if (o !== c && o.pos && Math.hypot(o.pos.x - LIFT.x, o.pos.z - LIFT.z) < MW) o.pos = freeSpot(o);
  c.pos = Object.assign({}, LIFT);
}
function worldCarGroup(c) {
  const pivot = new THREE.Group();
  const body = raceCar(c.model, { color: c.color, rust: c.rust });
  body.position.set(-160, 0, 230);
  pivot.add(body);
  pivot.userData.wheels = body.userData.wheels;
  pivot.userData.front = body.userData.wheels.slice(-2);
  pivot.userData.front.forEach(w => { w.rotation.order = 'YXZ'; });
  return pivot;
}
function syncWorldCars() {
  const key = G.cars.map(c => c.uid + c.model + (c.engId || '') + (c.color || '') + (c.rust || 0).toFixed(1)).join('|') + '#' + G.market.cars.map(L => L.car.uid).join(',');
  if (key === MUNDO.carKey) return;
  MUNDO.carKey = key;
  for (const k in MUNDO.carGroups) MUNDO.scene.remove(MUNDO.carGroups[k]);
  MUNDO.carGroups = {};
  G.cars.forEach((c, i) => { const g = worldCarGroup(c); MUNDO.scene.add(g); MUNDO.carGroups[c.uid] = g; carPose(c, i); });
  G.market.cars.slice(0, 4).forEach((L, i) => {
    const g = worldCarGroup(L.car); g.position.set(MW * (56 + (i % 2) * 9), 0, MW * (-46 + Math.floor(i / 2) * 7)); g.rotation.y = -Math.PI / 2;
    MUNDO.scene.add(g); MUNDO.carGroups['m' + L.car.uid] = g;
  });
}

/* ---------- control ---------- */
function startMundo() {
  buildMundo();
  syncWorldCars();
  G.cars.forEach((c, i) => carPose(c, i));
  renderMundoBox();
}
function nearCar() {
  let best = null, bd = 1e9;
  for (const c of G.cars) {
    const p = c.pos; if (!p) continue;
    const d = Math.hypot(p.x - MUNDO.p.x, p.z - MUNDO.p.z);
    if (d < bd) { bd = d; best = c; }
  }
  return bd < 3.4 * MW ? best : null;
}
function nearPlace() {
  for (const L of LUGARES) if (L.r && Math.hypot(L.x * MW - MUNDO.p.x, L.z * MW - MUNDO.p.z) < L.r * MW) return L;
  return null;
}
function inShop(x, z) { return Math.abs(x) < 11 * MW && z > -12 * MW && z < 9 * MW; }
function mundoPrompt() {
  if (MUNDO.mode === 'auto') {
    const c = MUNDO.car;
    if (MUNDO.V && MUNDO.V.v < 0.6) return inShop(MUNDO.car.pos.x, MUNDO.car.pos.z) ? { act: 'exit', text: 'Bajarte y dejarlo en el elevador' } : { act: 'exit', text: 'Bajarte del ' + MODELOS[c.model].name };
    return null;
  }
  const c = nearCar();
  if (c) {
    const onLift = c.pos && Math.hypot(c.pos.x - LIFT.x, c.pos.z - LIFT.z) < MW;
    return onLift ? { act: 'work', car: c, text: 'Trabajar en el ' + carName(c), alt: { act: 'drive', car: c, text: 'Manejar' } } : { act: 'drive', car: c, text: 'Manejar el ' + carName(c) + (c.owner === 'cliente' ? ' (cliente)' : '') };
  }
  const L = nearPlace();
  if (L) return { act: 'place', place: L, text: L.act };
  return null;
}
function mundoAction(which) {
  const pr = which === 'alt' ? (MUNDO.prompt && MUNDO.prompt.alt) : MUNDO.prompt;
  if (!pr) return;
  if (pr.act === 'drive') enterCar(pr.car);
  else if (pr.act === 'exit') exitCar();
  else if (pr.act === 'work') { if (G.car && G.car !== pr.car && G.car.sim.om > 1) { toast('Apaga el motor del otro auto primero.', 'warn'); return; } setCar(pr.car); pr.car.pos = Object.assign({}, LIFT); G.view = 'cofre'; syncViews(); refreshAll(); }
  else if (pr.act === 'place') {
    const id = pr.place.id;
    if (id === 'tienda') { setTab('tienda'); scrollSide(); }
    if (id === 'lote' || id === 'deshue') { setTab('autos'); scrollSide(); }
    if (id === 'pista') { toast('Súbete a uno de tus autos y entra manejando por el arco de la pista.', 'info'); }
  }
}
function scrollSide() { const s = document.querySelector('.side'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function enterCar(c) {
  const why = !c.engId ? 'no tiene motor' : !c.caja ? 'no tiene caja' : c.caja.health <= 0 ? 'tiene la caja rota' : (!has(c, 'ruedaI') || !has(c, 'ruedaD')) ? 'le falta una rueda' : c.lift ? 'está en el elevador arriba' : '';
  if (why) { toast(`No se puede manejar: ${why}.`, 'warn'); return; }
  if (G.car && G.car !== c && G.car.sim.om > 1) { G.key = 0; }
  setCar(c);
  const M = MODELOS[c.model], K = CAJAS[c.caja.id], k = MOTORES[c.engId].Vd / 1.6e-3;
  MUNDO.car = c; MUNDO.mode = 'auto'; MUNDO.gear = 1; MUNDO.rev = false; MUNDO.shiftT = 0;
  MUNDO.V = { m: carMass(c), r: M.r, cdA: M.cdA, grip: M.grip, drive: M.drive, G: K.ratios[0] * K.final, clutch: 350 * k + 150,
    auto: K.type === 'auto', K: 0.0022 * k, engaged: false, lockup: false, v: 0, x: 0, locked: false, a: 0, brake: 0 };
  G.key = 1; G.starter = !c.sim.running; MUNDO.crank = c.sim.running ? 0 : 2.2;
  MUNDO.char.visible = false;
  renderMundoBox();
}
function exitCar() {
  const c = MUNDO.car;
  if (inShop(c.pos.x, c.pos.z)) {
    const other = G.cars.find(x => x !== c && x.pos && Math.hypot(x.pos.x - LIFT.x, x.pos.z - LIFT.z) < MW);
    if (other) toast('El elevador ya tiene un auto. Lo dejé estacionado aquí.', 'warn');
    else { c.pos = Object.assign({}, LIFT); toast('Auto en el elevador. Acércate y toca "Trabajar".', 'info'); }
  }
  MUNDO.mode = 'pie'; MUNDO.V = null; G.key = 0; G.full = false;
  MUNDO.p.x = c.pos.x + Math.cos(c.pos.h) * 2.6 * MW; MUNDO.p.z = c.pos.z - Math.sin(c.pos.h) * 2.6 * MW;
  MUNDO.char.visible = true;
  MUNDO.car = null;
  renderMundoBox();
  save();
}
function blocked(x, z, rad) {
  if (Math.abs(x) > 135 * MW || Math.abs(z) > 135 * MW) return true;
  for (const [x0, z0, x1, z1] of MUNDO.solids) if (x > x0 - rad && x < x1 + rad && z > z0 - rad && z < z1 + rad) return true;
  return false;
}

/* ---------- cada cuadro ---------- */
function mundoTick(dt) {
  const J = MUNDO.joy;
  let jx = J.x, jy = J.y;
  const K = MUNDO.keys || {};
  if (K.left) jx = -1; if (K.right) jx = 1; if (K.up) jy = -1; if (K.down) jy = 1;
  if (MUNDO.mode === 'pie') {
    const mag = Math.min(1, Math.hypot(jx, jy));
    if (mag > 0.12) {
      const ang = Math.atan2(jx, -jy) + MUNDO.camYaw;
      const sp = (K.run ? 7 : 4.2) * MW * mag * dt;
      const nx = MUNDO.p.x + Math.sin(ang) * sp, nz = MUNDO.p.z + Math.cos(ang) * sp;
      if (!blocked(nx, MUNDO.p.z, 0.4 * MW)) MUNDO.p.x = nx;
      if (!blocked(MUNDO.p.x, nz, 0.4 * MW)) MUNDO.p.z = nz;
      MUNDO.p.h = ang; MUNDO.walkT += dt * 9 * mag;
    } else MUNDO.walkT *= 0.85;
    // empujar al personaje fuera de los autos
    for (const c of G.cars) if (c.pos) { const dx = MUNDO.p.x - c.pos.x, dz = MUNDO.p.z - c.pos.z, d = Math.hypot(dx, dz); if (d < 1.6 * MW && d > 1) { MUNDO.p.x = c.pos.x + dx / d * 1.6 * MW; MUNDO.p.z = c.pos.z + dz / d * 1.6 * MW; } }
    return null;
  }
  // manejando
  const c = MUNDO.car, V = MUNDO.V, s = c.sim, E = MOTORES[c.engId], Kx = CAJAS[c.caja.id];
  if (MUNDO.crank > 0) { MUNDO.crank -= dt; G.starter = !s.running; if (s.running) MUNDO.crank = 0; }
  const gas = Math.max(MUNDO.gasBtn ? 1 : 0, K.up ? 1 : 0, jy < -0.15 ? -jy : 0);
  const brk = Math.max(MUNDO.brakeBtn ? 1 : 0, K.down ? 1 : 0, jy > 0.15 ? jy : 0);
  MUNDO.steer += ((jx || 0) * Math.max(0.12, 0.55 - V.v * 0.012) - MUNDO.steer) * Math.min(1, dt * 6);
  if (MUNDO.rev) {
    V.engaged = false; V.brake = 0;
    const tv = gas > 0.1 ? -3.2 * gas : 0;
    MUNDO.revV = (MUNDO.revV || 0) + (tv - (MUNDO.revV || 0)) * Math.min(1, dt * (brk ? 6 : 2));
    if (brk) MUNDO.revV *= Math.max(0, 1 - dt * 8);
    G.thr = gas * 0.25;
  } else {
    MUNDO.revV = 0;
    G.thr = gas;
    V.brake = brk * V.m * 8.5;
    // embrague automático: suelto en arrancada, abierto parado sin gas
    if (MUNDO.shiftT > 0) { MUNDO.shiftT -= dt; V.engaged = false; if (MUNDO.shiftT <= 0) { V.G = Kx.ratios[MUNDO.gear - 1] * Kx.final; V.engaged = true; V.locked = false; } }
    else if (V.v < 1.5 && gas < 0.05 && !V.auto) { V.engaged = false; V.locked = false; }
    else V.engaged = true;
    const wr = V.v * V.G / V.r * 9.5493;
    if (MUNDO.shiftT <= 0 && wr > E.redline - 350 && MUNDO.gear < Kx.ratios.length) { MUNDO.gear++; MUNDO.shiftT = Kx.shift; }
    else if (MUNDO.shiftT <= 0 && MUNDO.gear > 1 && wr < (gas > 0.6 ? 2600 : 1400)) { MUNDO.gear--; V.G = Kx.ratios[MUNDO.gear - 1] * Kx.final; V.locked = false; }
    V.lockup = V.auto && MUNDO.gear >= 2;
  }
  return V;
}
function mundoAfterSim(dt) {
  if (MUNDO.mode !== 'auto') return;
  const c = MUNDO.car, V = MUNDO.V, p = c.pos;
  const v = MUNDO.rev ? MUNDO.revV : V.v;
  const wb = 2.6;
  const yaw = v / wb * Math.tan(MUNDO.steer) * dt;
  const nh = p.h + yaw;
  const nx = p.x + Math.sin(nh) * v * dt * MW, nz = p.z + Math.cos(nh) * v * dt * MW;
  if (blocked(nx, nz, 1.3 * MW) && !blocked(p.x, p.z, 1.3 * MW)) {
    if (Math.abs(v) > 6) { toast(`¡Chocaste a ${Math.round(Math.abs(v) * 3.6)} km/h!`, 'bad'); vibrate(200); }
    V.v = 0; V.locked = false; MUNDO.revV = 0;
  } else { p.x = nx; p.z = nz; p.h = nh; }
  // ¿entró a la pista?
  if (Math.hypot(p.x, p.z - 96 * MW) < 7 * MW && !MUNDO.toRace) {
    MUNDO.toRace = true;
    exitCar(); c.pos = { x: 0, z: 88 * MW, h: Math.PI };
    G.view = 'pista'; syncViews();
  }
  if (Math.hypot(p.x, p.z - 96 * MW) > 12 * MW) MUNDO.toRace = false;
}
function frameMundo(dt) {
  if (!MUNDO.built) return;
  resize3D();
  syncWorldCars();
  MUNDO.cam.aspect = R3.cam.aspect; MUNDO.cam.updateProjectionMatrix();
  // autos
  for (const c of G.cars) {
    const g = MUNDO.carGroups[c.uid]; if (!g || !c.pos) continue;
    g.position.set(c.pos.x, 0, c.pos.z); g.rotation.y = c.pos.h;
    if (c === MUNDO.car) {
      const v = MUNDO.rev ? MUNDO.revV : MUNDO.V.v;
      for (const w of g.userData.wheels) w.rotation.x += v / 0.32 * dt;
      for (const w of g.userData.front) w.rotation.y = MUNDO.steer;
      if (MUNDO.V.spin && Math.random() < dt * 40) fx3(MUNDO.scene, c.pos.x - Math.sin(c.pos.h) * 2 * MW, GROUND + 20, c.pos.z - Math.cos(c.pos.h) * 2 * MW, (Math.random() - 0.5) * 60, 60, (Math.random() - 0.5) * 60, 1.5, '#e8ebee', 22, 4);
    }
  }
  // personaje
  const ch = MUNDO.char;
  if (ch.visible) {
    ch.position.set(MUNDO.p.x, GROUND, MUNDO.p.z); ch.rotation.y = MUNDO.p.h;
    const sw = Math.sin(MUNDO.walkT) * 0.7 * Math.min(1, Math.abs(MUNDO.walkT) > 0.01 ? 1 : 0);
    MUNDO.legs[0].rotation.x = sw; MUNDO.legs[1].rotation.x = -sw; MUNDO.arms[0].rotation.x = -sw * 0.8; MUNDO.arms[1].rotation.x = sw * 0.8;
  }
  stepFx3(dt);
  // cámara
  const tgt = MUNDO.mode === 'auto' ? MUNDO.car.pos : { x: MUNDO.p.x, z: MUNDO.p.z, h: MUNDO.p.h };
  const want = MUNDO.mode === 'auto' ? tgt.h + MUNDO.camYaw : MUNDO.camYaw;
  MUNDO.camH = MUNDO.camH === undefined ? want : MUNDO.camH + angDiff(want, MUNDO.camH) * Math.min(1, dt * (MUNDO.mode === 'auto' ? 3 : 8));
  const dist = MUNDO.mode === 'auto' ? 1500 + (MUNDO.V ? MUNDO.V.v * 10 : 0) : 1100;
  const hgt = MUNDO.mode === 'auto' ? 620 : 650;
  MUNDO.cam.position.set(tgt.x - Math.sin(MUNDO.camH) * dist, GROUND + hgt + 232, tgt.z - Math.cos(MUNDO.camH) * dist);
  MUNDO.cam.lookAt(tgt.x + Math.sin(MUNDO.camH) * 300, GROUND + 220, tgt.z + Math.cos(MUNDO.camH) * 300);
  MUNDO.sun.position.set(tgt.x - 1200, 2400, tgt.z + 900); MUNDO.sun.target.position.set(tgt.x, GROUND, tgt.z);
  R3.renderer.render(MUNDO.scene, MUNDO.cam);
  updateMundoHud();
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

/* ---------- interfaz del mundo ---------- */
function updateMundoHud() {
  MUNDO.prompt = mundoPrompt();
  const pr = MUNDO.prompt;
  const btn = $('#mAct'), alt = $('#mAlt');
  if (btn) { btn.hidden = !pr; if (pr) btn.textContent = pr.text; }
  if (alt) { alt.hidden = !(pr && pr.alt); if (pr && pr.alt) alt.textContent = pr.alt.text; }
  const drv = MUNDO.mode === 'auto';
  $('#mDrive').hidden = !drv;
  if (drv) {
    const s = MUNDO.car.sim, v = MUNDO.rev ? MUNDO.revV : MUNDO.V.v;
    $('#mSpd').textContent = Math.round(Math.abs(v) * 3.6);
    $('#mGear').textContent = MUNDO.rev ? 'R' : (MUNDO.shiftT > 0 ? '·' : MUNDO.gear);
    $('#mRpm').textContent = Math.round(s.om * 9.5493) + ' rpm' + (!s.running ? ' · apagado' : '');
    $('#mRev').classList.toggle('on', MUNDO.rev);
  }
  // minimapa
  const mm = $('#minimap'); if (!mm) return;
  const x = mm.getContext('2d'), W2 = mm.width, k = W2 / (270 * MW);
  const P = (wx, wz) => [W2 / 2 + wx * k, W2 / 2 - wz * k];
  x.fillStyle = '#4f6e3e'; x.fillRect(0, 0, W2, W2);
  x.fillStyle = '#3a3d44';
  for (const z of [26, -26, 80]) { const [a, b] = P(-130 * MW, z * MW); x.fillRect(a, b - 3, 260 * MW * k, 6); }
  for (const xx of [-38, 38]) { const [a, b] = P(xx * MW, 130 * MW); x.fillRect(a - 3, b, 6, 260 * MW * k); }
  for (const L of LUGARES) { const [a, b] = P(L.x * MW, L.z * MW); x.fillStyle = L.col; x.fillRect(a - 5, b - 5, 10, 10); }
  x.fillStyle = '#cfd4da';
  for (const c of G.cars) if (c.pos && c !== MUNDO.car) { const [a, b] = P(c.pos.x, c.pos.z); x.fillRect(a - 2, b - 2, 4, 4); }
  const me = MUNDO.mode === 'auto' ? MUNDO.car.pos : MUNDO.p;
  const [a, b] = P(me.x, me.z);
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(a + Math.sin(me.h) * 7, b - Math.cos(me.h) * 7); x.lineTo(a + Math.sin(me.h + 2.5) * 5, b - Math.cos(me.h + 2.5) * 5); x.lineTo(a + Math.sin(me.h - 2.5) * 5, b - Math.cos(me.h - 2.5) * 5); x.fill();
}
function renderMundoBox() {
  const el = $('#mundoBox'); if (!el) return;
  el.innerHTML = MUNDO.mode === 'auto'
    ? `<p class="ctl-k">Manejando · ${esc(carName(MUNDO.car))}</p><p class="muted small">Joystick: arriba acelera, abajo frena, a los lados das vuelta. Entra al taller y bájate para dejarlo en el elevador. Pasa por el arco rojo para ir a la pista.</p>`
    : `<p class="ctl-k">Mundo libre</p><ul class="places">${LUGARES.map(L => `<li><span class="dot" style="background:${L.col}"></span>${esc(L.name)}</li>`).join('')}</ul><p class="muted small">Camina con el joystick (en PC: W A S D o flechas, Shift para correr). Acércate a un auto o a un lugar y toca el botón amarillo.</p>`;
}
function bindMundo() {
  const pad = $('#joy'), knob = $('#joyK');
  const setJ = e => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    MUNDO.joy.x = x; MUNDO.joy.y = y;
    knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (er) { } MUNDO.joy.on = true; setJ(e); });
  pad.addEventListener('pointermove', e => { if (MUNDO.joy.on) setJ(e); });
  const rel = () => { MUNDO.joy.on = false; MUNDO.joy.x = MUNDO.joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', rel); pad.addEventListener('pointercancel', rel);
  $('#mAct').onclick = () => mundoAction();
  $('#mAlt').onclick = () => mundoAction('alt');
  holdBtn($('#mGas'), () => { MUNDO.gasBtn = true; }, () => { MUNDO.gasBtn = false; });
  holdBtn($('#mBrk'), () => { MUNDO.brakeBtn = true; }, () => { MUNDO.brakeBtn = false; });
  $('#mRev').onclick = () => { if (MUNDO.V && MUNDO.V.v > 1) { toast('Detente para meter reversa.', 'warn'); return; } MUNDO.rev = !MUNDO.rev; };
  // girar la cámara arrastrando sobre el lienzo
  const cv = $('#cv3');
  let drag = null;
  cv.addEventListener('pointerdown', e => { if (G.view === 'mundo') drag = e.clientX; });
  cv.addEventListener('pointermove', e => { if (G.view === 'mundo' && drag !== null) { MUNDO.camYaw -= (e.clientX - drag) * 0.008; drag = e.clientX; } });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { drag = null; }));
  const keymap = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', shift: 'run' };
  MUNDO.keys = {};
  window.addEventListener('keydown', e => { if (G.view !== 'mundo' || e.target.matches('input, select, textarea')) return; const k = keymap[e.key.toLowerCase()]; if (k) { MUNDO.keys[k] = true; e.preventDefault(); } if (e.key.toLowerCase() === 'e' && !e.repeat) mundoAction(); if (e.key === ' ') MUNDO.brakeBtn = true; });
  window.addEventListener('keyup', e => { const k = keymap[e.key.toLowerCase()]; if (k) MUNDO.keys[k] = false; if (e.key === ' ') MUNDO.brakeBtn = false; });
}
