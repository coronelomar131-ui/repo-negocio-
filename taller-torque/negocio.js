'use strict';
/* =====================================================================
   TALLER TORQUE · negocio
   Garaje, mercado, deshuesadero, cambio de motor y caja, ECU,
   empleados, días y guardado.
   ===================================================================== */

function setCar(c) {
  G.car = c; SLOTS = c ? c.defs : {};
  G.sel = null; G.key = 0; G.meter = null; G.comp = null; G.dyno = false;
  if (typeof PARTS_FX !== 'undefined') PARTS_FX.length = 0;
  if (typeof R3 !== 'undefined') R3.bodyKey = '';
}
function carName(c) { return MODELOS[c.model].name + (c.engId ? ' ' + MOTORES[c.engId].short : ' (sin motor)'); }
function capacity() { return 2 + (G.upg.has('bahia2') ? 1 : 0) + (G.upg.has('bahia3') ? 1 : 0); }
function carMass(c) { const M = MODELOS[c.model]; return M.kg + (c.engId ? MOTORES[c.engId].kg - 125 : -110) + (c.caja ? CAJAS[c.caja.id].kg - 36 : -36) + 80; }

/* ---------- valor de un auto ---------- */
function failingJobs(c) { if (!c.engId) return []; return jobsFor(c).filter(j => { try { return j.check(c).length > 0; } catch (e) { return false; } }); }
function carValue(c) {
  const M = MODELOS[c.model];
  let v = M.value * 0.55;
  if (c.engId) v += MOTORES[c.engId].price * 0.55 * (1 - c.dmg.bear * 0.8 - c.dmg.hg * 0.5 - c.dmg.knock * 0.4) * (c.seized ? 0.15 : 1);
  if (c.caja) v += CAJAS[c.caja.id].price * 0.5 * Math.max(0.1, c.caja.health);
  for (const j of failingJobs(c)) v -= j.labor + 900;
  v -= Math.min(15000, c.km / 1000 * 40);
  if (c.mods.bayMod) v -= 3000;
  return Math.max(3000, Math.round(v / 100) * 100);
}

/* ---------- mercado ---------- */
const VENDEDORES = ['Lo vendo por falta de tiempo.', 'Era de mi papá, ya no lo uso.', 'Se vende como está.', 'Urge, acepto ofertas.', 'Proyecto que no terminé.', 'Lo traía de diario hasta la semana pasada.'];
function marketCar() {
  const ids = Object.keys(MODELOS);
  const model = ids[RNG.int(ids.length)];
  const M = MODELOS[model];
  let eng = M.motor, caja = M.caja;
  if (Math.random() < 0.18) { const fits = Object.keys(MOTORES).filter(k => MOTORES[k].size <= M.bay); eng = fits[RNG.int(fits.length)]; }
  const c = newCar(model, eng, caja);
  c.km = Math.round(40000 + Math.random() * 200000);
  c.oil.quality = 0.3 + Math.random() * 0.6;
  c.owner = 'venta';
  const n = Math.random() < 0.2 ? 0 : 1 + RNG.int(3);
  const pool = jobsFor(c).slice();
  c.faults = [];
  for (let i = 0; i < n && pool.length; i++) { const j = pool.splice(RNG.int(pool.length), 1)[0]; try { j.setup(c, RNG); c.faults.push(j.id); } catch (e) { } }
  if (Math.random() < 0.12) { c.dmg.hg = 0.4 + Math.random() * 0.4; c.faults.push('empaque'); }
  if (Math.random() < 0.15) c.caja.health = 0.15 + Math.random() * 0.4;
  const val = carValue(c);
  const price = Math.round(val * (c.faults.length ? 0.6 + Math.random() * 0.25 : 0.95 + Math.random() * 0.15) / 100) * 100;
  const said = c.faults.length ? JOBS.find(j => j.id === c.faults[0]) : null;
  return { kind: 'auto', car: c, price, text: (said ? '“' + said.quejas[0] + '” ' : '') + VENDEDORES[RNG.int(VENDEDORES.length)] };
}
function genMarket() {
  G.market = { cars: [], engines: [], cajas: [] };
  for (let i = 0; i < 4; i++) G.market.cars.push(marketCar());
  const eids = Object.keys(MOTORES);
  for (let i = 0; i < 4; i++) {
    const id = eids[RNG.int(eids.length)], used = Math.random() < 0.75;
    const eng = makeEngine(id, used ? 0.3 + Math.random() * 0.5 : 0);
    if (used) eng.oil.level = 0;
    const cond = used ? 0.35 + Math.random() * 0.35 : 1.1;
    G.market.engines.push({ kind: 'motor', eng, price: Math.round(MOTORES[id].price * cond / 100) * 100, used });
  }
  const cids = Object.keys(CAJAS);
  for (let i = 0; i < 3; i++) {
    const id = cids[RNG.int(cids.length)], used = Math.random() < 0.7;
    const cj = makeCaja(id, used ? 0.5 : 0);
    G.market.cajas.push({ kind: 'caja', caja: cj, price: Math.round(CAJAS[id].price * (used ? 0.45 + Math.random() * 0.25 : 1.05) / 100) * 100, used });
  }
}
function buyListing(kind, idx) {
  const L = kind === 'auto' ? G.market.cars : kind === 'motor' ? G.market.engines : G.market.cajas;
  const it = L[idx]; if (!it) return;
  const price = G.mode === 'lab' ? 0 : it.price;
  if (G.money < price) { toast('No te alcanza.', 'warn'); return; }
  if (kind === 'auto' && G.cars.length >= capacity()) { toast('No hay lugar en el garaje. Vende un auto o compra otro elevador.', 'warn'); return; }
  G.money -= price;
  L.splice(idx, 1);
  if (kind === 'auto') { it.car.owner = 'mio'; it.car.paid = price; G.cars.push(it.car); toast(`Compraste un ${carName(it.car)}. Está en tu garaje.`, 'info'); }
  if (kind === 'motor') { G.engines.push(it.eng); toast(`Motor ${MOTORES[it.eng.engId].name} al almacén.`, 'info'); }
  if (kind === 'caja') { G.cajas.push(it.caja); toast(`Caja ${CAJAS[it.caja.id].name} al almacén.`, 'info'); }
  refreshAll(); save();
}
function sellCar(uid) {
  const c = G.cars.find(x => x.uid === uid);
  if (!c || c.owner !== 'mio') return;
  if (c === G.car && c.sim.om > 1) { toast('Apaga el motor primero.', 'warn'); return; }
  const offer = Math.round(carValue(c) * (G.mode === 'lab' ? 1 : 0.9) / 100) * 100;
  if (!confirmIn('sell' + uid, `Te ofrecen ${fmt$(offer)} por el ${carName(c)}. Toca otra vez para vender.`)) return;
  G.money += offer;
  G.cars = G.cars.filter(x => x !== c);
  if (G.car === c) setCar(G.cars[0] || null);
  toast(`Vendiste el ${carName(c)} en ${fmt$(offer)}.`, 'info');
  refreshAll(); save();
}
function sellPart(kind, uid) {
  const L = kind === 'motor' ? G.engines : G.cajas;
  const i = L.findIndex(x => x.uid === uid); if (i < 0) return;
  const x = L[i];
  const val = kind === 'motor' ? MOTORES[x.engId].price * 0.4 * (x.seized ? 0.1 : 1 - x.dmg.bear * 0.7) : CAJAS[x.id].price * 0.35 * Math.max(0.1, x.health);
  L.splice(i, 1);
  G.money += Math.round(val / 100) * 100;
  toast(`Vendido en ${fmt$(Math.round(val / 100) * 100)}.`, 'info'); refreshAll(); save();
}
const CONFIRM = {};
function confirmIn(key, msg) {
  if (CONFIRM[key] && Date.now() - CONFIRM[key] < 6000) { delete CONFIRM[key]; return true; }
  CONFIRM[key] = Date.now(); toast(msg, 'warn'); return false;
}

/* ---------- cambio de motor y de caja ---------- */
const PROCS = {
  sacarMotor: c => [
    { id: 'bat', label: 'Desconectar la terminal negativa de la batería', auto: () => !c.slots.batNeg.on },
    { id: 'drenar', label: 'Drenar aceite y refrigerante (con charola abajo)', tool: 'charola', dur: 2.5, lift: true, act: () => { const v = c.oil.level; if (c.pan) c.oil.pan += v; else { c.oil.floor += v; incident('Drenaste sin charola: aceite en el piso.', 150, 0.2); } c.oil.level = 0; c.cool.level = 0; } },
    { id: 'arnes', label: 'Desconectar arnés y computadora', tool: 'mano', dur: 2 },
    { id: 'mangueras', label: 'Quitar mangueras, cable del acelerador y línea de gasolina', tool: 'desarmador', dur: 2.5, act: () => { if (c.sim.fp > 0.6) { incident(`Saltó gasolina a ${c.sim.fp.toFixed(1)} bar. Quita antes el fusible de la bomba.`, 300, 0.3); c.sim.fp = 0; } } },
    { id: 'escape', label: 'Separar el escape del múltiple (por abajo)', tool: 'llave13', dur: 2.5, lift: true },
    { id: 'campana', label: 'Quitar tornillos de la campana motor↔caja', tool: 'llave17', dur: 2.5, lift: true, cond: () => !!c.caja },
    { id: 'pluma', label: 'Bajar el auto y enganchar la pluma', tool: 'mano', dur: 1.5, lift: false, upg: 'pluma' },
    { id: 'soportes', label: 'Quitar soportes del motor', tool: 'llave17', dur: 2.5, lift: false },
    { id: 'sacar', label: 'Sacar el motor con la pluma', tool: 'mano', dur: 3, lift: false, upg: 'pluma', final: () => { const e = unmountEngine(c); G.engines.push(e); c.proc = null; SLOTS = c.defs; toast(`Motor ${MOTORES[e.engId].name} afuera, en el almacén.`, 'info'); } },
  ],
  meterMotor: c => [
    { id: 'bajar', label: 'Bajar el motor con la pluma y alinearlo', tool: 'mano', dur: 3, lift: false, upg: 'pluma' },
    { id: 'soportes', label: 'Apretar soportes del motor (60 N·m)', tool: 'llave17', lift: false, torque: { spec: 60, bolts: 2, pattern: 'par' } },
    { id: 'campana', label: 'Apretar tornillos de la campana (45 N·m)', tool: 'llave17', lift: true, cond: () => !!c.caja, torque: { spec: 45, bolts: 4, pattern: 'cuadro' } },
    { id: 'escape', label: 'Unir el escape', tool: 'llave13', dur: 2.5, lift: true },
    { id: 'mangueras', label: 'Conectar mangueras, acelerador y gasolina', tool: 'desarmador', dur: 2.5 },
    { id: 'arnes', label: 'Conectar arnés y computadora', tool: 'mano', dur: 2 },
  ],
  sacarCaja: c => [
    { id: 'bat', label: 'Desconectar la terminal negativa', auto: () => !c.slots.batNeg.on },
    { id: 'marcha', label: 'Quitar el motor de arranque (va atornillado a la campana)', auto: () => !c.engId || !has(c, 'marcha') },
    { id: 'flechas', label: 'Quitar flechas / cardán', tool: 'dado19', dur: 3, lift: true },
    { id: 'varillaje', label: 'Desconectar varillaje y cables de la caja', tool: 'mano', dur: 2, lift: true },
    { id: 'campana', label: 'Quitar tornillos de la campana', tool: 'llave17', dur: 2.5, lift: true, cond: () => !!c.engId },
    { id: 'soporte', label: 'Quitar el soporte de la caja', tool: 'llave17', dur: 2, lift: true },
    { id: 'bajar', label: 'Bajar la caja con el gato de transmisión', tool: 'mano', dur: 3, lift: true, upg: 'pluma', final: () => { G.cajas.push(c.caja); toast(`Caja ${CAJAS[c.caja.id].name} afuera, en el almacén.`, 'info'); c.caja = null; c.proc = null; } },
  ],
  meterCaja: c => [
    { id: 'subir', label: 'Subir la caja con el gato y alinear la flecha', tool: 'mano', dur: 3, lift: true, upg: 'pluma' },
    { id: 'campana', label: 'Apretar tornillos de la campana (45 N·m)', tool: 'llave17', lift: true, cond: () => !!c.engId, torque: { spec: 45, bolts: 4, pattern: 'cuadro' } },
    { id: 'soporte', label: 'Apretar el soporte de la caja (50 N·m)', tool: 'llave17', lift: true, torque: { spec: 50, bolts: 2, pattern: 'par' } },
    { id: 'varillaje', label: 'Conectar varillaje y cables', tool: 'mano', dur: 2, lift: true },
    { id: 'flechas', label: 'Meter flechas / cardán (110 N·m)', tool: 'dado19', lift: true, torque: { spec: 110, bolts: 2, pattern: 'par' } },
  ],
};
function procSteps(c) {
  if (!c.proc) return [];
  return PROCS[c.proc.type](c).filter(s => !s.cond || s.cond());
}
function startProc(type, extra) {
  const c = G.car;
  if (c.sim.om > 1) { toast('Apaga el motor primero.', 'warn'); return; }
  c.proc = Object.assign({ type, done: {} }, extra || {});
  if (type === 'meterMotor') { mountEngine(c, extra.eng); SLOTS = c.defs; c.oil.level = extra.eng.oil.level; }
  if (type === 'meterCaja') { c.caja = extra.caja; }
  updatePending(c);
  refreshAll();
}
function updatePending(c) {
  if (!c.proc) return;
  const steps = procSteps(c);
  const next = steps.find(s => !(s.auto ? s.auto() : c.proc.done[s.id]));
  if (c.proc.type === 'meterMotor' || c.proc.type === 'meterCaja') {
    c.proc.pending = next ? next.label.toLowerCase() : '';
    if (!next) { const t = c.proc.type; c.proc = null; toast(t === 'meterMotor' ? 'Motor instalado. Rellena aceite y refrigerante, conecta la batería y revisa la ECU.' : 'Caja instalada.', 'info'); }
  }
}
function doStep(stepId) {
  const c = G.car; if (!c.proc) return;
  const st = procSteps(c).find(s => s.id === stepId); if (!st) return;
  if (G.busy || G.tqm) { toast('Termina lo que estás haciendo.', 'warn'); return; }
  if (st.upg && !G.upg.has(st.upg)) { toast('Necesitas la pluma para motor (pestaña Negocio → Mejoras).', 'warn'); return; }
  if (st.lift === true && !c.lift) { toast('Sube el elevador para este paso.', 'warn'); return; }
  if (st.lift === false && c.lift) { toast('Baja el elevador para este paso.', 'warn'); return; }
  if (st.tool && G.tool !== st.tool) { toast(`Este paso lleva ${TOOLS[st.tool].name.toLowerCase()}. Selecciónala.`, 'warn'); return; }
  if (st.tool === 'charola' && !c.pan && !confirmIn('dren', 'No hay charola abajo. Toca otra vez si quieres drenar así.')) return;
  const done = () => { c.proc && (c.proc.done[st.id] = true); if (st.act) st.act(); if (st.final) st.final(); else updatePending(c); AUDIO.blip('clic'); refreshAll(); save(); };
  if (st.torque) {
    openTorque(null, null, tq => { if (tq.lo < 0.7) c.mods.looseMount = true; done(); }, { name: st.label, torque: st.torque.spec, bolts: st.torque.bolts, pattern: st.torque.pattern });
  } else startBusy(st.tool === 'charola' ? 'motor' : (c.proc.type.includes('Caja') ? 'caja' : 'motor'), st.dur || 2, done);
}
function installCheckEngine(c, eng) {
  const e = MOTORES[eng.engId], M = MODELOS[c.model];
  const notes = [];
  if (e.size > M.bay && !(c.mods.bayMod >= e.size)) notes.push({ need: 'bay', text: `No cabe en el cofre del ${M.name}: hay que modificar bancada y soportes (${fmt$(15000)}).` });
  if (c.caja && CAJAS[c.caja.id].family !== e.family && !c.mods.adapter) notes.push({ need: 'adapt', text: `La caja ${CAJAS[c.caja.id].short} es de otra familia: necesitas placa adaptadora (${fmt$(PARTS.placaAdapt.price)}).` });
  return notes;
}
function installCheckCaja(c, cj) {
  const notes = [];
  if (c.engId && CAJAS[cj.id].family !== MOTORES[c.engId].family && !c.mods.adapter) notes.push({ need: 'adapt', text: `La caja es de otra familia que el motor: necesitas placa adaptadora (${fmt$(PARTS.placaAdapt.price)}).` });
  return notes;
}
function payMod(kind, size) {
  const c = G.car;
  if (kind === 'bay') { if (G.money < 15000 && G.mode !== 'lab') { toast('No te alcanza.', 'warn'); return; } if (G.mode !== 'lab') G.money -= 15000; c.mods.bayMod = size; toast('Bancada y soportes modificados. Ahora cabe un motor más grande.', 'info'); }
  if (kind === 'adapt') {
    const i = G.bench.findIndex(b => b.type === 'placaAdapt');
    if (i >= 0) G.bench.splice(i, 1);
    else { const p = G.mode === 'lab' ? 0 : PARTS.placaAdapt.price; if (G.money < p) { toast('No te alcanza.', 'warn'); return; } G.money -= p; }
    c.mods.adapter = true; toast('Placa adaptadora lista.', 'info');
  }
  refreshAll(); save();
}
function renderMacro(id) {
  const c = G.car;
  let h = '';
  if (c.proc) {
    const steps = procSteps(c);
    const next = steps.find(s => !(s.auto ? s.auto() : c.proc.done[s.id]));
    h += `<h3>${{ sacarMotor: 'Sacar el motor', meterMotor: 'Instalar el motor', sacarCaja: 'Sacar la caja', meterCaja: 'Instalar la caja' }[c.proc.type]}</h3><ol class="proc">`;
    for (const s of steps) {
      const ok = s.auto ? s.auto() : c.proc.done[s.id];
      h += `<li class="${ok ? 'ok' : s === next ? 'cur' : ''}"><span>${esc(s.label)}</span>${s.tool && !ok ? `<em>${esc(TOOLS[s.tool].short)}${s.lift === true ? ' · arriba' : s.lift === false ? ' · abajo' : ''}</em>` : ''}</li>`;
    }
    h += '</ol>';
    if (next) h += next.auto ? `<p class="note">${esc(next.label)}: hazlo en la pieza correspondiente.</p>` : `<div class="acts"><button class="btn primary" data-act="step" data-step="${next.id}">Hacer: ${esc(next.label)}</button></div>`;
    if (c.proc.type.startsWith('sacar')) h += `<div class="acts"><button class="btn ghost" data-act="cancelproc">Cancelar</button></div>`;
    return h;
  }
  if (id === 'motor') {
    if (c.engId) {
      const e = MOTORES[c.engId];
      h += `<dl class="spec"><div><dt>Motor</dt><dd>${esc(e.name)} · ${e.cyl} cil. ${e.turbo ? 'turbo' : 'atmosférico'}</dd></div><div><dt>Familia</dt><dd>${e.family} · ${e.kg} kg</dd></div><div><dt>Revoluciones</dt><dd>Corte ${e.redline} · daño arriba de ${e.safe}</dd></div><div><dt>Aceite</dt><dd>${e.oil} L</dd></div></dl>`;
      h += `<div class="acts"><button class="btn primary" data-act="proc" data-proc="sacarMotor">Sacar el motor</button></div>`;
    } else {
      h += `<p>No hay motor. Instala uno del almacén (cómpralos en Autos → Deshuesadero).</p>`;
      if (!G.engines.length) h += '<p class="muted">Tu almacén de motores está vacío.</p>';
      h += '<ul class="items">';
      for (const eng of G.engines) {
        const notes = installCheckEngine(c, eng);
        h += `<li class="item col"><div class="it-txt"><b>${esc(MOTORES[eng.engId].name)}</b><span>${eng.seized ? 'Desvielado' : 'Aceite ' + eng.oil.level.toFixed(1) + ' L'}${notes.length ? ' · ' + notes.map(n => esc(n.text)).join(' ') : ' · compatible'}</span></div>
          <div class="acts">${notes.map(n => `<button class="btn sm" data-act="mod" data-mod="${n.need}" data-size="${MOTORES[eng.engId].size}">${n.need === 'bay' ? 'Modificar bancada' : 'Placa adaptadora'}</button>`).join('')}
          ${notes.length ? '' : `<button class="btn primary sm" data-act="mount" data-uid="${eng.uid}">Instalar</button>`}</div></li>`;
      }
      h += '</ul>';
    }
  } else {
    if (c.caja) {
      const K = CAJAS[c.caja.id];
      h += `<dl class="spec"><div><dt>Caja</dt><dd>${esc(K.name)}</dd></div><div><dt>Relaciones</dt><dd>${K.ratios.join(' · ')} · final ${K.final}</dd></div><div><dt>Aguanta</dt><dd>${K.tqMax} N·m</dd></div><div><dt>Estado</dt><dd>${c.caja.health <= 0 ? 'ROTA' : Math.round(c.caja.health * 100) + '%'}</dd></div></dl>`;
      h += `<div class="acts"><button class="btn primary" data-act="proc" data-proc="sacarCaja">Sacar la caja</button></div>`;
    } else {
      h += '<p>No hay caja. Instala una del almacén.</p><ul class="items">';
      for (const cj of G.cajas) {
        const notes = installCheckCaja(c, cj);
        h += `<li class="item col"><div class="it-txt"><b>${esc(CAJAS[cj.id].name)}</b><span>${cj.health <= 0 ? 'Rota' : Math.round(cj.health * 100) + '%'} · aguanta ${CAJAS[cj.id].tqMax} N·m${notes.length ? ' · ' + notes.map(n => esc(n.text)).join(' ') : ''}</span></div>
          <div class="acts">${notes.length ? `<button class="btn sm" data-act="mod" data-mod="adapt">Placa adaptadora</button>` : `<button class="btn primary sm" data-act="mountcaja" data-uid="${cj.uid}">Instalar</button>`}</div></li>`;
      }
      h += '</ul>';
    }
  }
  return h;
}

/* ---------- ECU ---------- */
const TUNE_FIELDS = [
  { k: 'boost', name: 'Boost objetivo', unit: 'bar', min: 0.4, max: 2.0, step: 0.05, turbo: true, help: 'Más boost = más aire y más fuerza. Pide más gasolina, aprieta la caja y sube el riesgo de cascabeleo.' },
  { k: 'afrWot', name: 'Mezcla a fondo', unit: ':1', min: 10.5, max: 14.7, step: 0.1, help: 'Gasolina a plena carga. 11.5–12.5 es seguro. Más pobre (número alto) calienta y cascabelea.' },
  { k: 'adv', name: 'Avance de chispa', unit: '°', min: -6, max: 8, step: 1, help: 'Adelantar la chispa da fuerza hasta cierto punto; de más, cascabelea y rompe pistones.' },
  { k: 'limiter', name: 'Corte de revoluciones', unit: 'rpm', min: 4000, max: 9000, step: 100, help: 'Arriba del límite seguro del motor se dañan válvulas y bielas.' },
  { k: 'idle', name: 'Ralentí', unit: 'rpm', min: 600, max: 1400, step: 25 },
  { k: 'inj', name: 'Escala de inyectores', unit: '×', min: 0.8, max: 2.0, step: 0.05, help: 'Debe coincidir con los inyectores instalados (1.00 de fábrica, 1.50 los de alto flujo).' },
  { k: 'launch', name: 'Launch control', unit: 'rpm', min: 0, max: 6500, step: 100, help: '0 = apagado. Mantiene esas rpm parado y a fondo para arrancar mejor.' },
  { k: 'fan', name: 'Ventilador enciende a', unit: '°C', min: 85, max: 105, step: 1 },
];
const TUNE_TOGGLES = [
  { k: 'dfco', name: 'Cortar gasolina al soltar' }, { k: 'pops', name: 'Petardeo (pops & bangs)' },
  { k: 'o2', name: 'Sensor O2 (lazo cerrado)' }, { k: 'mil', name: 'Foco de check engine' },
];
function renderECU() {
  const el = $('#p-ecu'), c = G.car;
  if (!c) { el.innerHTML = ''; return; }
  if (!c.engId) { el.innerHTML = '<h2 class="p-title">Computadora</h2><p>No hay motor instalado.</p>'; return; }
  const e = MOTORES[c.engId], T = c.ecu.tune;
  const prog = c.ecu.prog === c.engId;
  const tool = G.tools.has('programador');
  let h = `<h2 class="p-title">Computadora (ECU)</h2>
    <p>${prog ? `Programada para <b>${esc(MOTORES[c.ecu.prog].name)}</b>.` : `<b class="bad">Programada para ${c.ecu.prog ? esc(MOTORES[c.ecu.prog].name) : 'nada'}</b>, pero el motor es ${esc(e.name)}. El motor no arrancará hasta reprogramarla.`}</p>`;
  if (!tool) h += `<p class="note">Para escribir mapas necesitas la laptop con cable de programación (${fmt$(G.mode === 'lab' ? 0 : TOOLS.programador.price)}) o pagar ${fmt$(2500)} a un programador cada vez.</p>`;
  h += `<div class="acts">${tool ? '' : `<button class="btn" data-act="buytool" data-tool="programador">Comprar laptop</button>`}
    <button class="btn ${prog ? 'ghost' : 'primary'}" data-act="reflash">${prog ? 'Restaurar mapa de fábrica' : 'Reprogramar para este motor'}${tool ? '' : ' (' + fmt$(2500) + ')'}</button></div>`;
  if (prog) {
    h += `<h3>Mapa</h3><form id="tuneForm" class="tune">`;
    for (const f of TUNE_FIELDS) {
      if (f.turbo && !e.turbo) continue;
      const v = T[f.k];
      h += `<label class="tf"><span class="tf-n">${esc(f.name)} <output id="o-${f.k}">${fmtTune(f, v)}</output></span>
        <input type="range" id="t-${f.k}" name="${f.k}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" ${tool ? '' : 'disabled'}>
        ${f.help ? `<small>${esc(f.help)}</small>` : ''}</label>`;
    }
    for (const t of TUNE_TOGGLES) h += `<label class="check"><input type="checkbox" id="t-${t.k}" name="${t.k}" ${T[t.k] ? 'checked' : ''} ${tool ? '' : 'disabled'}> ${esc(t.name)}</label>`;
    h += `</form>`;
    if (tool) h += `<div class="acts"><button class="btn primary" data-act="flash">Grabar en la ECU</button></div><p class="muted small">Para grabar, la llave debe estar en contacto. Prueba los cambios en el dinamómetro o en la pista.</p>`;
  }
  el.innerHTML = h;
  const form = $('#tuneForm');
  if (form) form.oninput = ev => { const f = TUNE_FIELDS.find(x => x.k === ev.target.name); if (f) $('#o-' + f.k).textContent = fmtTune(f, +ev.target.value); };
}
function fmtTune(f, v) { return (f.k === 'launch' && v === 0) ? 'apagado' : (f.step < 1 ? (+v).toFixed(f.step < 0.1 ? 2 : 1) : Math.round(v)) + ' ' + f.unit; }
function flashECU() {
  const c = G.car;
  if (!G.tools.has('programador')) { toast('Necesitas la laptop de programación.', 'warn'); return; }
  if (!c.sim.ecuOn) { toast('Pon la llave en contacto para grabar.', 'warn'); return; }
  if (c.sim.running) { toast('Apaga el motor para grabar (llave en contacto, motor apagado).', 'warn'); return; }
  const T = c.ecu.tune;
  for (const f of TUNE_FIELDS) { const i = $('#t-' + f.k); if (i) T[f.k] = +i.value; }
  for (const t of TUNE_TOGGLES) { const i = $('#t-' + t.k); if (i) T[t.k] = i.checked; }
  const e = MOTORES[c.engId];
  const warn = [];
  if (T.limiter > e.safe) warn.push(`el corte (${T.limiter}) pasa el límite seguro de ${e.safe} rpm`);
  if (T.afrWot > 13) warn.push('la mezcla a fondo está pobre');
  if (T.adv > 4) warn.push('mucho avance');
  const inj = []; for (let i = 1; i <= e.cyl; i++) { const it = c.slots['iny' + i] && c.slots['iny' + i].item; if (it) inj.push(it.flow || 1); }
  const avg = inj.reduce((a, b) => a + b, 0) / Math.max(1, inj.length);
  if (Math.abs(avg - T.inj) > 0.08) warn.push(`la escala de inyectores (${T.inj.toFixed(2)}) no coincide con los instalados (${avg.toFixed(2)})`);
  AUDIO.blip('clic');
  toast('Mapa grabado.' + (warn.length ? ' Ojo: ' + warn.join('; ') + '.' : ''), warn.length ? 'warn' : 'info');
  save();
}
function reflash() {
  const c = G.car;
  if (!c.engId) return;
  if (!G.tools.has('programador')) { const p = G.mode === 'lab' ? 0 : 2500; if (G.money < p) { toast('No te alcanza.', 'warn'); return; } G.money -= p; }
  c.ecu.prog = c.engId; c.ecu.tune = defaultTune(c.engId); c.ecu.codes = {}; c.ecu.timers = {};
  toast(`ECU programada para ${MOTORES[c.engId].name} con mapa de fábrica.`, 'info');
  refreshAll(); save();
}

/* ---------- empleados y días ---------- */
function genCands() {
  G.cands = [];
  for (let i = 0; i < 3; i++) {
    const p = PUESTOS[Math.min(2, RNG.int(3 + (G.day > 5 ? 1 : 0)))];
    const sk = p.skill[0] + Math.random() * (p.skill[1] - p.skill[0]);
    G.cands.push({ uid: ++UID, name: NOMBRES[RNG.int(NOMBRES.length)], puesto: p.id, skill: sk, pay: Math.round((p.pay[0] + Math.random() * (p.pay[1] - p.pay[0])) / 10) * 10, task: 'clientes' });
  }
}
function hire(uid) {
  const i = G.cands.findIndex(x => x.uid === uid); if (i < 0) return;
  if (G.emps.length >= 2 + capacity()) { toast('No caben más empleados en el taller.', 'warn'); return; }
  G.emps.push(G.cands.splice(i, 1)[0]);
  toast('Contratado. Su sueldo se paga al cerrar cada día.', 'info'); refreshAll(); save();
}
function fireEmp(uid) { G.emps = G.emps.filter(e => e.uid !== uid); refreshAll(); save(); }
function closeDay() {
  if (G.car && G.car.sim.om > 1) { toast('Apaga el motor antes de cerrar.', 'warn'); return; }
  const lines = [];
  let net = 0;
  const bonus = G.upg.has('letrero') ? 1.2 : 1;
  for (const e of G.emps) {
    if (e.task === 'clientes') {
      let earn = 0, bad = 0;
      for (let k = 0; k < 2; k++) {
        if (Math.random() < (1 - e.skill) * 0.4) { bad++; earn -= 200; G.rep = Math.max(0, G.rep - 0.05); }
        else earn += Math.round((350 + 550 * e.skill) * bonus);
      }
      net += earn; lines.push(`${e.name} atendió 2 clientes: ${fmt$(earn)}${bad ? ` (${bad} regresó molesto)` : ''}.`);
    } else {
      const c = G.cars.find(x => x.uid === e.task);
      if (!c) { e.task = 'clientes'; continue; }
      const fl = failingJobs(c);
      if (!fl.length) { lines.push(`${e.name}: el ${carName(c)} ya no tiene fallas que reparar.`); continue; }
      const j = fl[0];
      const cost = j.fix(c);
      net -= cost;
      if (Math.random() < (1 - e.skill) * 0.35) { const ids = Object.keys(c.defs).filter(k => c.defs[k].torque > 0 && c.slots[k] && c.slots[k].item); const k = ids[RNG.int(ids.length)]; if (k) c.slots[k].tq = { lo: 0.6, hi: 0.6, ok: true }; lines.push(`${e.name} reparó "${j.id}" en el ${carName(c)} (${fmt$(cost)} en piezas), pero dejó algo flojo.`); }
      else lines.push(`${e.name} reparó "${j.id}" en el ${carName(c)} (${fmt$(cost)} en piezas).`);
    }
    net -= e.pay;
  }
  const rent = 500 + 250 * (capacity() - 2);
  net -= rent;
  lines.push(`Sueldos: ${fmt$(G.emps.reduce((a, e) => a + e.pay, 0))} · Renta y luz: ${fmt$(rent)}.`);
  if (G.mode !== 'lab') G.money += net;
  G.day++;
  genMarket(); genCands();
  for (const c of G.cars) { fastCool(c, 3600); c.sim.time += 1; }
  if (!G.job && G.cars.length < capacity()) newJob();
  showDay(lines, net);
  save();
}
function showDay(lines, net) {
  const m = $('#result');
  m.innerHTML = `<div class="modal-card"><h2 class="m-title">Día ${G.day - 1} cerrado</h2>
    <ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="bill"><div class="total"><span>Resultado del día</span><b>${fmt$(net)}</b></div><div><span>Caja</span><b>${fmt$(G.money)}</b></div></div>
    <p class="muted">Hay autos nuevos en el mercado y candidatos nuevos.</p>
    <div class="m-actions"><button class="btn primary" id="btnDayOk">Abrir el día ${G.day}</button></div></div>`;
  m.hidden = false;
  $('#btnDayOk').onclick = () => { m.hidden = true; refreshAll(); };
}
function buyUpg(k) {
  const p = G.mode === 'lab' ? 0 : MEJORAS[k].price;
  if (G.money < p) { toast('No te alcanza.', 'warn'); return; }
  if (k === 'bahia3' && !G.upg.has('bahia2')) { toast('Primero el segundo elevador.', 'warn'); return; }
  G.money -= p; G.upg.add(k); toast(`Listo: ${MEJORAS[k].name}.`, 'info'); refreshAll(); save();
}

/* ---------- paneles: Autos y Negocio ---------- */
function carRow(c, btns) {
  const fl = c.owner === 'mio' ? failingJobs(c).length : null;
  return `<li class="item car"><span class="sw-car" style="background:${MODELOS[c.model].color}"></span><div class="it-txt"><b>${esc(carName(c))}</b>
    <span>${esc(MODELOS[c.model].tipo)} · ${c.caja ? CAJAS[c.caja.id].short + (c.caja.health <= 0 ? ' ROTA' : '') : 'sin caja'} · ${c.km.toLocaleString('es-MX')} km${c.owner === 'cliente' ? ' · <b>cliente</b>' : ''}${fl !== null && G.revealed && G.revealed[c.uid] ? ' · ' + fl + ' fallas' : ''}</span></div><div class="acts">${btns}</div></li>`;
}
function renderAutos() {
  const el = $('#p-autos');
  let h = `<h2 class="p-title">Garaje (${G.cars.length}/${capacity()})</h2><ul class="items">`;
  for (const c of G.cars) {
    const active = c === G.car;
    h += carRow(c, `${active ? '<span class="pill ok">En el elevador</span>' : `<button class="btn sm" data-act="work" data-uid="${c.uid}">Trabajar</button>`}
      ${c.owner === 'mio' ? `<button class="btn sm ghost" data-act="sell" data-uid="${c.uid}">Vender ~${fmt$(carValue(c) * 0.9)}</button>` : ''}`);
  }
  h += `</ul>`;
  h += `<h3>Almacén de motores</h3>${G.engines.length ? '<ul class="items">' + G.engines.map(e => `<li class="item"><div class="it-txt"><b>${esc(MOTORES[e.engId].name)}</b><span>${e.seized ? 'Desvielado' : MOTORES[e.engId].cyl + ' cil. · ' + (MOTORES[e.engId].turbo ? 'turbo' : 'atmosférico') + ' · aceite ' + e.oil.level.toFixed(1) + ' L'}</span></div><button class="btn sm ghost" data-act="sellmotor" data-uid="${e.uid}">Vender</button></li>`).join('') + '</ul>' : '<p class="muted">Vacío.</p>'}`;
  h += `<h3>Almacén de cajas</h3>${G.cajas.length ? '<ul class="items">' + G.cajas.map(k => `<li class="item"><div class="it-txt"><b>${esc(CAJAS[k.id].name)}</b><span>${k.health <= 0 ? 'Rota' : Math.round(k.health * 100) + '%'} · aguanta ${CAJAS[k.id].tqMax} N·m</span></div><button class="btn sm ghost" data-act="sellcaja" data-uid="${k.uid}">Vender</button></li>`).join('') + '</ul>' : '<p class="muted">Vacío.</p>'}`;
  h += `<h2 class="p-title">Mercado de autos</h2><p class="muted">Lo que dice el vendedor no siempre es todo. Revísalo bien después de comprarlo.</p><ul class="items">`;
  G.market.cars.forEach((L, i) => {
    const c = L.car;
    h += `<li class="item col"><div class="row"><span class="sw-car" style="background:${MODELOS[c.model].color}"></span><div class="it-txt"><b>${esc(carName(c))} · ${fmt$(G.mode === 'lab' ? 0 : L.price)}</b><span>${esc(MODELOS[c.model].tipo)} · ${CAJAS[c.caja.id].short} · ${c.km.toLocaleString('es-MX')} km</span></div></div><p class="muted small">${esc(L.text)}</p><div class="acts"><button class="btn sm primary" data-act="buyauto" data-i="${i}">Comprar</button></div></li>`;
  });
  h += `</ul><h2 class="p-title">Deshuesadero</h2><ul class="items">`;
  G.market.engines.forEach((L, i) => {
    const e = MOTORES[L.eng.engId];
    h += `<li class="item"><div class="it-txt"><b>Motor ${esc(e.name)} ${L.used ? 'usado' : 'nuevo'}</b><span>${e.cyl} cil. · ${e.turbo ? 'turbo' : 'atmosférico'} · familia ${e.family} · ${fmt$(G.mode === 'lab' ? 0 : L.price)}</span></div><button class="btn sm" data-act="buymotor" data-i="${i}">Comprar</button></li>`;
  });
  G.market.cajas.forEach((L, i) => {
    const k = CAJAS[L.caja.id];
    h += `<li class="item"><div class="it-txt"><b>Caja ${esc(k.name)} ${L.used ? 'usada' : 'nueva'}</b><span>aguanta ${k.tqMax} N·m · familia ${k.family} · ${fmt$(G.mode === 'lab' ? 0 : L.price)}</span></div><button class="btn sm" data-act="buycaja" data-i="${i}">Comprar</button></li>`;
  });
  h += `</ul>`;
  el.innerHTML = h;
}
function renderNegocio() {
  const el = $('#p-negocio');
  let h = `<h2 class="p-title">Día ${G.day}</h2><p>Al cerrar el día se pagan sueldos y renta, tus empleados trabajan y llegan autos nuevos al mercado.</p>
    <div class="acts"><button class="btn primary" data-act="closeday">Cerrar el día</button></div>
    <h3>Empleados (${G.emps.length})</h3>`;
  if (!G.emps.length) h += '<p class="muted">Nadie todavía.</p>';
  h += '<ul class="items">';
  for (const e of G.emps) {
    const opts = [`<option value="clientes" ${e.task === 'clientes' ? 'selected' : ''}>Atender clientes</option>`].concat(G.cars.filter(c => c.owner === 'mio').map(c => `<option value="${c.uid}" ${e.task === c.uid ? 'selected' : ''}>Reparar ${esc(carName(c))}</option>`));
    h += `<li class="item col"><div class="it-txt"><b>${esc(e.name)} · ${esc(PUESTOS.find(p => p.id === e.puesto).name)}</b><span>Habilidad ${Math.round(e.skill * 100)}% · ${fmt$(e.pay)}/día</span></div>
      <div class="acts"><label class="sr" for="task-${e.uid}">Tarea de ${esc(e.name)}</label><select id="task-${e.uid}" data-task="${e.uid}">${opts.join('')}</select><button class="btn sm ghost" data-act="fire" data-uid="${e.uid}">Despedir</button></div></li>`;
  }
  h += '</ul><h3>Candidatos</h3><ul class="items">';
  for (const e of G.cands) h += `<li class="item"><div class="it-txt"><b>${esc(e.name)} · ${esc(PUESTOS.find(p => p.id === e.puesto).name)}</b><span>Habilidad ${Math.round(e.skill * 100)}% · ${fmt$(e.pay)}/día</span></div><button class="btn sm" data-act="hire" data-uid="${e.uid}">Contratar</button></li>`;
  h += '</ul><h3>Mejoras del taller</h3><ul class="items">';
  for (const k in MEJORAS) h += `<li class="item"><div class="it-txt"><b>${esc(MEJORAS[k].name)}</b><span>${esc(MEJORAS[k].desc)}</span></div>${G.upg.has(k) ? '<span class="pill ok">Listo</span>' : `<button class="btn sm" data-act="upg" data-k="${k}">${fmt$(G.mode === 'lab' ? 0 : MEJORAS[k].price)}</button>`}</li>`;
  h += '</ul>';
  el.innerHTML = h;
  $$('[data-task]').forEach(s => s.onchange = () => { const e = G.emps.find(x => x.uid === +s.dataset.task); if (e) { e.task = s.value === 'clientes' ? 'clientes' : +s.value; save(); } });
}

/* ---------- guardado completo ---------- */
function serCar(c) { const o = Object.assign({}, c); delete o.sim; delete o.defs; delete o.cfg; delete o.dmg0race; return o; }
function deserCar(o) { o.defs = buildSlots(o.engId); o.sim = newSim(o.engId ? MOTORES[o.engId].cyl : 4); for (const id in o.defs) if (!o.slots[id]) o.slots[id] = freshSlot(o.defs[id]); o.mods = o.mods || {}; return o; }
function save() {
  if (G.mode !== 'taller') return;
  try {
    localStorage.setItem('tallerTorque.v2', JSON.stringify({
      v: 2, money: G.money, rep: G.rep, jobN: G.jobN, day: G.day, uid: UID, tools: [...G.tools], upg: [...G.upg],
      bench: G.bench, cars: G.cars.map(serCar), engines: G.engines, cajas: G.cajas, emps: G.emps, cands: G.cands,
      active: G.car ? G.car.uid : null, job: G.job ? { id: G.job.id, def: G.job.def.id, client: G.job.client, queja: G.job.queja, labor: G.job.labor, carUid: G.job.carUid, dmg0: G.job.dmg0 } : null,
    }));
  } catch (e) { }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('tallerTorque.v2') || 'null');
    return d && d.v === 2 ? d : null;
  } catch (e) { return null; }
}
function restore(d) {
  G.money = d.money; G.rep = d.rep; G.jobN = d.jobN; G.day = d.day || 1; UID = Math.max(UID, d.uid || 0);
  G.tools = new Set(d.tools); G.upg = new Set(d.upg || []); G.bench = d.bench || [];
  G.cars = (d.cars || []).map(deserCar); G.engines = d.engines || []; G.cajas = d.cajas || []; G.emps = d.emps || []; G.cands = d.cands || [];
  G.job = null;
  if (d.job) { const c = G.cars.find(x => x.uid === d.job.carUid); if (c) G.job = Object.assign({}, d.job, { def: JOBS.find(j => j.id === d.job.def) }); }
  setCar(G.cars.find(c => c.uid === d.active) || G.cars[0] || null);
  genMarket(); if (!G.cands.length) genCands();
}
