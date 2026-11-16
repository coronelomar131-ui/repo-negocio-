'use strict';
/* =====================================================================
   TALLER TORQUE · pista de arrancones (cuarto de milla, 402 m)
   El auto usa el mismo simulador del motor, acoplado a la caja,
   al embrague y al agarre de las llantas.
   ===================================================================== */

const U = 212.8;             // unidades 3D por metro
const QM = 402.3;            // cuarto de milla
const RACE = { built: false, state: 'menu', rival: -1, t: 0, gear: 0, shiftT: 0, V: null, res: null, startT: 0 };

function buildRace() {
  if (RACE.built || !R3.ok) return;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x9cc3e4);
  sc.fog = new THREE.Fog(0x9cc3e4, 7000, 32000);
  sc.add(new THREE.HemisphereLight(0xeaf3ff, 0x5b5040, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1d6, 0.85); sun.position.set(-700, 1400, 500);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006;
  Object.assign(sun.shadow.camera, { left: -1500, right: 1500, top: 1500, bottom: -1500, near: 100, far: 4000 });
  sc.add(sun); sc.add(sun.target); RACE.sun = sun;
  const g = new THREE.Group();
  const B = new Batch();
  B.box(-9000, -240, -4000, 18000, 6, 100000, '#6b8f4e', { ol: false });
  B.box(-820, -236, -4000, 1640, 4, 100000, '#3a3d44', { ol: false });
  for (let z = -2000; z < 92000; z += 1400) B.box(-8, -231.5, z, 16, 0.5, 700, '#e6e9ed', { ol: false });
  for (const x of [-820, 804]) B.box(x, -231.5, -4000, 16, 0.5, 100000, '#f0b429', { ol: false });
  for (const x of [-860, 820]) for (let z = -3000; z < 92000; z += 600) B.box(x, -236, z, 40, 60, 560, z % 1200 ? '#e6e9ed' : '#d8443a');
  // marcas de llanta en la salida
  for (const x of [-560 + 30, -560 + 290, 240 + 30, 240 + 290]) B.box(x - 18, -231.3, 300, 36, 0.4, 2400, '#26282c', { ol: false });
  B.box(-820, -231.4, 250, 1640, 0.6, 30, '#e6e9ed', { ol: false });
  const fin = QM * U + 250;
  for (let i = 0; i < 16; i++) B.box(-820 + i * 102.5, -231.4, fin, 102.5, 0.6, 60, i % 2 ? '#121318' : '#e6e9ed', { ol: false });
  B.box(-940, -232, fin - 20, 40, 900, 40, '#d8443a'); B.box(900, -232, fin - 20, 40, 900, 40, '#d8443a');
  B.box(-940, 640, fin - 20, 1880, 120, 30, '#e6e9ed');
  // gradas con público, edificios y postes
  const crowd = ['#d8443a', '#3d7ccf', '#f0b429', '#e6e9ed', '#5aa65b', '#7a3fb0', '#e0a77a'];
  for (let z = -1500; z < 92000; z += 5200) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? -1800 : 1100;
      for (let r = 0; r < 4; r++) B.box(x + (side < 0 ? r * 120 : 360 - r * 120), -232, z, 140, 40 + r * 50, 1400, r % 2 ? '#7a8190' : '#5d6370');
      if (z < 20000 || z > 80000) for (let k = 0; k < 40; k++) { const rr = k % 4; B.box(x + (side < 0 ? rr * 120 : 360 - rr * 120) + 40 + (k % 3) * 20, -192 + rr * 50, z + 40 + Math.floor(k / 4) * 130, 18, 34, 18, crowd[k % crowd.length], { ol: false }); }
      const bx0 = side < 0 ? -4200 : 2500;
      const h = 600 + ((z / 5200) % 5) * 260;
      B.box(bx0, -232, z + 200, 1400, h, 1600, ['#8b929c', '#a88a6a', '#6a727e', '#b8a690'][Math.abs(Math.round(z / 5200)) % 4]);
      for (let wy = -150; wy < -232 + h - 80; wy += 120) for (let wz = z + 300; wz < z + 1700; wz += 220) B.box(side < 0 ? bx0 + 1400 : bx0 - 2, wy, wz, 4, 60, 110, '#2c3e50', { ol: false });
    }
    B.box(-1000, -232, z + 2600, 20, 700, 20, '#a3abb6'); B.box(-1000, 460, z + 2600, 160, 14, 30, '#e6e9ed');
  }
  B.build(g);
  // árbol de luces
  const tree = new THREE.Group();
  bxr(tree, -14, -232, 120, 28, 560, 28, '#2a2d33');
  RACE.lights = [];
  for (let i = 0; i < 4; i++) {
    const L = [];
    for (const x of [-46, 18]) { const m = bx(tree, 26, 26, 10, '#3a3d44', x + 13, 230 - i * 42, 142); L.push(m); }
    RACE.lights.push(L);
  }
  g.add(tree);
  sc.add(g);
  RACE.scene = sc;
  RACE.cam = new THREE.PerspectiveCamera(50, 4 / 3, 10, 40000);
  RACE.built = true;
}
function raceCar(modelId) {
  const g = new THREE.Group();
  g.add(buildBody(modelId, false));
  const fl = wheel3D(g, -22, -164, 171, true), fr = wheel3D(g, 342, -164, 171, true);
  const wheels = g.children[0].children.filter(o => o.isGroup && o.children.length >= 4).concat([fl, fr]);
  g.userData.wheels = wheels;
  return g;
}
function setupRaceCars() {
  if (RACE.player) RACE.scene.remove(RACE.player);
  if (RACE.rivalG) RACE.scene.remove(RACE.rivalG);
  RACE.player = raceCar(G.car.model);
  RACE.player.position.set(-560, 0, 0);
  RACE.scene.add(RACE.player);
  if (RACE.rival >= 0) {
    const r = RIVALES[RACE.rival];
    const mid = Object.keys(MODELOS).find(k => r.auto.startsWith(MODELOS[k].name)) || 'torque';
    RACE.rivalG = raceCar(mid);
    RACE.rivalG.position.set(240, 0, 0);
    RACE.scene.add(RACE.rivalG);
  } else RACE.rivalG = null;
}

function raceCheck() {
  const c = G.car;
  if (!c) return 'No hay auto en el elevador.';
  if (!c.engId) return 'El auto no tiene motor.';
  if (!c.caja) return 'El auto no tiene caja.';
  if (c.caja.health <= 0) return 'La caja está rota.';
  if (c.lift) return 'Baja el elevador.';
  if (!has(c, 'ruedaI') || !has(c, 'ruedaD')) return 'Le falta una rueda.';
  for (const id of ['ruedaI', 'ruedaD']) if (c.slots[id].tq && c.slots[id].tq.lo < 0.7) return 'Los birlos de una rueda están flojos. No es seguro.';
  if (c.cfg && c.cfg.block) return c.cfg.block;
  if (RACE.rival >= 0 && c.owner !== 'mio') return 'No puedes apostar con el auto de un cliente. Solo prueba de manejo.';
  if (RACE.rival >= 0 && G.money < RIVALES[RACE.rival].bet && G.mode !== 'lab') return 'No te alcanza para la apuesta.';
  return '';
}
function raceStart() {
  const err = raceCheck();
  if (err) { toast(err, 'warn'); return; }
  buildRace(); setupRaceCars();
  const c = G.car, M = MODELOS[c.model], K = CAJAS[c.caja.id], E = MOTORES[c.engId];
  const k = E.Vd / 1.6e-3;
  RACE.V = { m: carMass(c), r: M.r, cdA: M.cdA, grip: M.grip, drive: M.drive, G: K.ratios[0] * K.final, clutch: (350 * k + 150) * (K.type === 'seq' ? 1.3 : 1),
    auto: K.type === 'auto', K: 0.0022 * k, engaged: K.type === 'auto', lockup: false, v: 0, x: 0, locked: false, a: 0 };
  RACE.gear = 1; RACE.shiftT = 0; RACE.t = 0; RACE.res = null; RACE.t100 = 0; RACE.state = 'stage'; RACE.stageT = 0;
  RACE.broken = false;
  if (!c.sim.running) { G.key = 1; RACE.cranking = 2.5; } else RACE.cranking = 0;
  c.dmg0race = { ...c.dmg };
  renderRaceBox();
}
function raceShift(dir) {
  const V = RACE.V; if (!V || RACE.state !== 'run' && RACE.state !== 'stage') return;
  const K = CAJAS[G.car.caja.id];
  const ng = RACE.gear + dir;
  if (ng < 1 || ng > K.ratios.length || RACE.shiftT > 0) return;
  RACE.gear = ng;
  if (RACE.state === 'stage') { V.G = K.ratios[ng - 1] * K.final; return; }
  V.engaged = false; RACE.shiftT = K.shift;
  if (G.car.ecu.tune.pops) G.car.sim.popT = G.car.sim.time;
}
function raceTick(dt) {
  const c = G.car, s = c.sim, V = RACE.V;
  if (!V) return;
  const K = CAJAS[c.caja ? c.caja.id : 'm5'];
  if (RACE.cranking > 0) { RACE.cranking -= dt; G.starter = !s.running && RACE.cranking > 0; if (s.running) RACE.cranking = 0; }
  if (RACE.state === 'stage') {
    RACE.stageT += dt;
    if (!V.auto) V.engaged = false;
    if (RACE.stageT >= 3.0 && s.running) { RACE.state = 'run'; RACE.t = 0; V.engaged = true; V.locked = false; }
    if (RACE.stageT > 6 && !s.running) { RACE.state = 'menu'; RACE.V = null; toast('El motor no arrancó: ' + ((c.cfg && c.cfg.block) || 'revisa la batería y la marcha.'), 'warn'); renderRaceBox(); return; }
  } else if (RACE.state === 'run') {
    RACE.t += dt;
    if (RACE.shiftT > 0) { RACE.shiftT -= dt; if (RACE.shiftT <= 0) { V.engaged = true; V.G = K.ratios[RACE.gear - 1] * K.final; V.locked = false; } }
    if (K.type === 'auto' && RACE.shiftT <= 0) {
      const wr = V.v * V.G / V.r * 9.5493;
      if (wr > MOTORES[c.engId].redline - 300 && RACE.gear < K.ratios.length) { RACE.gear++; V.engaged = false; RACE.shiftT = K.shift; }
      V.lockup = RACE.gear >= 2;
    }
    if (!RACE.t100 && V.v >= 27.78) RACE.t100 = RACE.t;
    if (V.x >= QM && !RACE.res) finishRace(false);
    if (RACE.t > 40 && !RACE.res) finishRace(true);
  } else if (RACE.state === 'done') {
    V.engaged = false; V.v = Math.max(0, V.v - 9 * dt);
    G.full = false;
  }
  if (c.caja && c.caja.health <= 0 && RACE.state === 'run' && !RACE.broken) { RACE.broken = true; V.G = 0; V.engaged = false; finishRace(true, 'caja'); }
}
function finishRace(dnf, why) {
  const V = RACE.V, c = G.car;
  RACE.state = 'done';
  const et = RACE.t, trap = V.v * 3.6;
  const r = RACE.rival >= 0 ? RIVALES[RACE.rival] : null;
  let win = false, pay = 0, txt;
  if (r) {
    win = !dnf && et < r.et + 0.4;
    pay = win ? r.bet : -r.bet;
    if (G.mode === 'taller') { G.money += pay; G.rep = Math.max(0, Math.min(5, G.rep + (win ? 0.15 : -0.05))); }
    txt = win ? `¡Le ganaste a ${r.name}! (${r.et.toFixed(2)} s)` : `${r.name} te ganó con ${r.et.toFixed(2)} s.`;
  } else txt = 'Prueba de manejo.';
  if (dnf) txt = why === 'caja' ? '¡Tronó la caja! Demasiado torque para lo que aguanta.' : 'No terminaste la carrera.';
  RACE.res = { et, trap, t100: RACE.t100, win, pay, txt, dnf };
  const d0 = c.dmg0race || c.dmg;
  const extra = [];
  if (c.dmg.knock - d0.knock > 0.02) extra.push('El motor cascabeleó o se pasó de revoluciones: revisa la compresión.');
  if (c.caja && c.caja.health < 0.3 && c.caja.health > 0) extra.push(`La caja quedó al ${Math.round(c.caja.health * 100)}%.`);
  RACE.res.extra = extra;
  G.best = G.best || {};
  if (!dnf && (!G.best[c.uid] || et < G.best[c.uid])) G.best[c.uid] = et;
  save();
  renderRaceBox();
}
function renderRaceBox() {
  const el = $('#raceBox'); if (!el) return;
  const c = G.car;
  if (RACE.state === 'menu' || !RACE.V) {
    let h = `<div class="race-menu"><p class="ctl-k">Arrancones · cuarto de milla (402 m)</p>`;
    h += `<p class="small">${c ? esc(carName(c)) + (c.caja ? ' · ' + esc(CAJAS[c.caja.id].name) : '') + ` · ${Math.round(c ? carMass(c) : 0)} kg` : ''}${G.best && c && G.best[c.uid] ? ` · mejor tiempo ${G.best[c.uid].toFixed(2)} s` : ''}</p>`;
    h += `<div class="race-list"><label class="rv"><input type="radio" name="rival" value="-1" ${RACE.rival < 0 ? 'checked' : ''}> Prueba sin rival</label>`;
    RIVALES.forEach((r, i) => { h += `<label class="rv"><input type="radio" name="rival" value="${i}" ${RACE.rival === i ? 'checked' : ''}> ${esc(r.name)} · ${esc(r.auto)} · ${r.et.toFixed(1)} s · apuesta ${fmt$(r.bet)}</label>`; });
    h += `</div><div class="acts"><button class="btn primary big" data-act="racego">A la línea</button></div></div>`;
    el.innerHTML = h;
    el.querySelectorAll('input[name=rival]').forEach(i => i.onchange = () => { RACE.rival = +i.value; });
    return;
  }
  if (RACE.state === 'done' && RACE.res) {
    const r = RACE.res;
    el.innerHTML = `<div class="race-menu"><p class="ctl-k">Resultado</p><p class="race-big">${r.dnf ? '—' : r.et.toFixed(2) + ' s'}</p>
      <p>${esc(r.txt)}${r.pay ? ` <b>${fmt$(r.pay)}</b>` : ''}</p>
      ${r.dnf ? '' : `<p class="small">0–100 km/h: ${r.t100 ? r.t100.toFixed(2) + ' s' : '—'} · Velocidad final: ${r.trap.toFixed(0)} km/h</p>`}
      ${r.extra.length ? `<ul class="warn">${r.extra.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      <div class="acts"><button class="btn primary" data-act="racemenu">Otra vez</button><button class="btn" data-act="raceexit">Volver al taller</button></div></div>`;
    return;
  }
  el.innerHTML = `<div class="race-ctl">
    <button id="rDn" class="btn big" data-act="shiftdn" aria-label="Bajar cambio">−</button>
    <button id="rGas" class="btn primary big hold">ACELERAR<small>mantén</small></button>
    <button id="rUp" class="btn big" data-act="shiftup" aria-label="Subir cambio">+</button></div>
    <p class="muted small">${RACE.state === 'stage' ? 'Mantén ACELERAR para subir revoluciones. Suelta el embrague con la luz verde.' : (CAJAS[c.caja.id].type === 'auto' ? 'Automática: cambia sola.' : 'Sube el cambio antes del corte de revoluciones.')}</p>`;
  const gas = $('#rGas');
  if (gas && !gas.dataset.b) { gas.dataset.b = 1; holdBtn(gas, () => { G.full = true; }, () => { G.full = false; }); }
}
function updateRaceHud() {
  const hud = $('#raceHud'); if (!hud) return;
  const V = RACE.V, c = G.car;
  if (G.view !== 'pista' || !V) { hud.hidden = true; return; }
  hud.hidden = false;
  const s = c.sim, rpm = s.om * 9.5493, e = MOTORES[c.engId];
  const frac = Math.min(1, rpm / (e.redline + 300));
  const shift = rpm > e.redline - 400;
  let tree = '';
  if (RACE.state === 'stage') { const t = RACE.stageT; tree = t < 1 ? 'PREPARADOS' : t < 3 ? '● ● ●'.slice(0, Math.min(5, Math.floor((t - 1) / 0.5 + 1) * 2 - 1)) : '¡VERDE!'; }
  hud.innerHTML = `<div class="hud-top"><span>${RACE.state === 'run' || RACE.state === 'done' ? RACE.t.toFixed(2) + ' s' : tree}</span><span>${Math.min(QM, V.x).toFixed(0)} / 402 m</span></div>
    <div class="hud-bot"><span class="hud-gear">${RACE.shiftT > 0 ? '·' : RACE.gear}</span><span class="hud-spd">${(V.v * 3.6).toFixed(0)}<small>km/h</small></span>
    <span class="hud-rpm${shift ? ' shift' : ''}"><i style="transform:scaleX(${frac})"></i><b>${Math.round(rpm)} rpm${V.spin ? ' · PATINA' : ''}${s.cut ? ' · CORTE' : ''}</b></span></div>`;
}
function frameRace(dt) {
  if (!RACE.built || !RACE.player || !RACE.V) {
    if (R3.ok && RACE.built) R3.renderer.render(RACE.scene, RACE.cam);
    return;
  }
  resize3D();
  RACE.cam.aspect = R3.cam.aspect; RACE.cam.updateProjectionMatrix();
  const V = RACE.V;
  RACE.player.position.z = V.x * U;
  const spin = V.v / V.r * dt + (V.spin ? 0.6 : 0);
  for (const w of RACE.player.userData.wheels) w.rotation.x += spin;
  if (RACE.rivalG) {
    const r = RIVALES[RACE.rival];
    let rx = 0;
    if (RACE.state === 'run' || RACE.state === 'done') { const t = Math.max(0, (RACE.state === 'run' ? RACE.t : RACE.rt || RACE.t) - 0.4); rx = QM * Math.pow(Math.min(1.2, t / r.et), 1.6); }
    RACE.rivalG.position.z = rx * U;
    for (const w of RACE.rivalG.userData.wheels) w.rotation.x += (RACE.state === 'run' ? 0.5 : 0);
  }
  // árbol
  if (RACE.lights) {
    const t = RACE.state === 'stage' ? RACE.stageT : 9;
    RACE.lights.forEach((L, i) => { const on = i < 3 ? (t >= 1 + i * 0.5 && t < 3) : t >= 3; L.forEach(m => m.material = M3(on ? (i < 3 ? '#f0b429' : '#5aa65b') : '#3a3d44')); });
  }
  // humo de llantas, flamazos y polvo
  const pzz = RACE.player.position.z, rearZ = pzz - (MODELOS[G.car.model].shape === 'pickup' ? 770 : MODELOS[G.car.model].shape === 'hatch' ? 570 : 710);
  const driveZ = MODELOS[G.car.model].drive === 'RWD' ? rearZ + 150 : pzz + 171;
  if (V.spin && Math.random() < dt * 60) for (const wx of [-22, 342]) fx3(RACE.scene, RACE.player.position.x + wx, -215, driveZ, (Math.random() - 0.5) * 60, 40 + Math.random() * 60, V.v * U * 0.6 - 80, 1.6, '#e8ebee', 22, 4);
  const s = G.car.sim;
  if ((s.time - s.popT < 0.08 || (RACE.shiftT > 0 && RACE.shiftT > CAJAS[G.car.caja.id].shift - 0.05)) && Math.random() < 0.7) for (let k = 0; k < 4; k++) fx3(RACE.scene, RACE.player.position.x + 250, -126, rearZ - 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, -200 + V.v * U, 0.18, k % 2 ? '#ffb04a' : '#ff5a2a', 10, 1.5);
  stepFx3(dt);
  if (RACE.sun) { RACE.sun.position.set(RACE.player.position.x - 700, 1400, pzz + 500); RACE.sun.target.position.set(RACE.player.position.x, -200, pzz); }
  const pz = RACE.player.position.z, px = RACE.player.position.x + 160;
  const shake = V.v > 20 ? (Math.random() - 0.5) * V.v * 0.15 : 0;
  const fov = 50 + Math.min(14, V.v * 0.25);
  if (Math.abs(RACE.cam.fov - fov) > 0.2) { RACE.cam.fov = fov; RACE.cam.updateProjectionMatrix(); }
  RACE.cam.position.set(px - 380 + shake, 300 + shake, pz - 1150 - V.v * 4);
  RACE.cam.lookAt(px + 160, 20, pz + 900);
  R3.renderer.render(RACE.scene, RACE.cam);
}
