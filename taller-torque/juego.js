'use strict';
/* =====================================================================
   TALLER TORQUE · juego e interfaz
   ===================================================================== */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt$ = n => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('es-MX');
const RNG = { f: () => Math.random(), int: n => Math.floor(Math.random() * n) };
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const G = {
  mode: 'taller', money: 6000, rep: 3, jobN: 0, tools: new Set(), bench: [], car: null, job: null,
  view: 'cofre', sel: null, tool: 'mano', key: 0, starter: false, thr: 0, full: false, dyno: false,
  labels: true, useTq: true, cyl: 0, t: 0, thv: 0, thrNow: 0, turboAng: 0, beltPos: 0, slow: 1,
  busy: null, tqm: null, meter: null, tab: 'pieza', incidents: [], used: { aceite: 0, refrigerante: 0, arandela: 0 },
  seenCap: {}, capT: 0, dynoPts: [], lastPanel: '', comp: null,
  cars: [], engines: [], cajas: [], emps: [], cands: [], day: 1, upg: new Set(), market: { cars: [], engines: [], cajas: [] }, revealed: {},
};

/* ---------- utilidades ---------- */
function toast(msg, kind) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'toast show ' + (kind || '');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.className = 'toast'; }, Math.min(9000, 2600 + msg.length * 45));
}
function caption(key, text, once = true) {
  if (once && G.seenCap[key]) return;
  G.seenCap[key] = true;
  const el = $('#caption');
  el.textContent = text; el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(caption.t);
  caption.t = setTimeout(() => { el.hidden = true; }, 4200);
}
function incident(text, cost, rep) {
  G.incidents.push({ text, cost: cost || 0 });
  if (G.mode === 'taller') { G.money -= cost || 0; G.rep = Math.max(0, G.rep - (rep || 0)); }
  toast(text + (cost && G.mode === 'taller' ? ' (−' + fmt$(cost) + ')' : ''), 'bad');
  vibrate(120);
}
function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }
function partName(type) { return (PARTS[type] && PARTS[type].name) || type; }
function condWord(h) { return h >= 0.85 ? 'Nueva / como nueva' : h >= 0.6 ? 'Usada, en buen estado' : h >= 0.35 ? 'Gastada' : 'Dañada'; }

/* ---------- trabajos ---------- */
function newJob(forceId, model) {
  if (G.cars.length >= capacity()) { G.job = null; return false; }
  G.jobN++;
  const ids = Object.keys(MODELOS);
  model = model || (G.jobN <= 2 ? 'torque' : ids[RNG.int(ids.length)]);
  const c = newCar(model);
  c.owner = 'cliente';
  c.km = Math.round(55000 + Math.random() * 110000);
  c.oil.quality = 0.6 + Math.random() * 0.25;
  c.oil.level = oilCap(c) - 0.4 + Math.random() * 0.3;
  c.slots.bateria.item.health = 0.8 + Math.random() * 0.2;
  for (let i = 1; i <= nCyl(c); i++) c.slots['buj' + i].item.health = 0.75 + Math.random() * 0.2;
  c.slots.balataI.item.thick = 6.5 + Math.random() * 3; c.slots.balataD.item.thick = c.slots.balataI.item.thick - Math.random();
  c.slots.filtroAire.item.health = 0.6 + Math.random() * 0.3;
  c.slots.banda.item.health = 0.6 + Math.random() * 0.35;
  let def;
  const avail = jobsFor(c);
  if (forceId) def = JOBS.find(j => j.id === forceId);
  else {
    const easy = ['filtroAire', 'servicio', 'bateria', 'banda', 'bobina'];
    const pool = G.jobN <= 3 ? avail.filter(j => easy.includes(j.id)) : avail;
    do { def = pool[RNG.int(pool.length)]; } while (G.job && def.id === G.job.def.id && pool.length > 1);
  }
  def.setup(c, RNG);
  // El cliente llega manejando: el motor viene caliente y con sus códigos guardados
  preDrive(c, def);
  G.cars.push(c);
  G.job = {
    def, id: G.jobN, client: CLIENTES[RNG.int(CLIENTES.length)], auto: MODELOS[c.model].name + ' ' + MOTORES[c.engId].short,
    queja: def.quejas[RNG.int(def.quejas.length)], labor: Math.round(def.labor * (G.upg.has('letrero') ? 1.2 : 1)),
    dmg0: { ...c.dmg }, start: Date.now(), carUid: c.uid,
  };
  setCar(c);
  G.thr = 0; G.incidents = []; G.used = { aceite: 0, refrigerante: 0, arandela: 0 };
  G.seenCap = {}; G.dynoPts = [];
  $('#thr').value = 0;
  refreshAll();
  return true;
}
function preDrive(c, def) {
  const inp = { key: 1, starter: true, thr: 0, dyno: false };
  const step = (sec, f) => { for (let i = 0; i < Math.round(sec * 30); i++) { f && f(); simFrame(c, inp, 1 / 30); } };
  step(1.5); inp.starter = false;
  if (c.sim.running) {
    c.sim.ECT = 70; c.sim.Toil = 65;
    step(25); inp.dyno = true; inp.thr = 0.8; step(4); inp.thr = 0; step(3); inp.dyno = false; step(30);
  }
  inp.key = 0; step(1);
  c.sim.events.length = 0;
  c.sim.misWin = c.sim.misWin.map(() => []);
  if (def.id === 'termoCerrado') { c.sim.ECT = 108; c.sim.Toil = 100; }
  if (def.id === 'bateria' || def.id === 'marcha') { c.sim.ECT = 22; c.sim.Toil = 22; c.sim.Tt = PH.Ta; c.sim.Tb = PH.Ta; }
  c.cool.level = def.id === 'termoCerrado' ? 0.8 : 1;
  c.dmg = { bear: 0, knock: 0, hg: 0, elec: 0 };
  if (c.slots.turbo && c.slots.turbo.item && def.id !== 'turbo') c.slots.turbo.item.health = 1;
}

/* ---------- reglas: quitar / instalar ---------- */
function removeCheck(id) {
  const d = SLOTS[id], c = G.car, s = c.sim;
  if (G.busy || G.tqm) return 'Termina lo que estás haciendo.';
  if (d.lift && !c.lift) return 'Sube el elevador para llegar ahí.';
  if (d.run && s.om > 5) return id === 'banda' ? 'Apaga el motor: la banda gira y te puede agarrar los dedos.' : 'Apaga el motor antes de quitar eso.';
  if (G.tool !== d.tool) return `Con ${TOOLS[G.tool].name.toLowerCase()} no se puede. Esta pieza lleva ${TOOLS[d.tool].name.toLowerCase()}.`;
  if (d.pre) for (const k of d.pre) if (has(c, k)) return SLOTS[k].conn ? `Primero desconecta: ${SLOTS[k].name}.` : `Primero quita: ${SLOTS[k].name}.`;
  return '';
}
function installCheck(id) {
  const d = SLOTS[id], c = G.car, s = c.sim;
  if (G.busy || G.tqm) return 'Termina lo que estás haciendo.';
  if (d.lift && !c.lift) return 'Sube el elevador para llegar ahí.';
  if (d.run && s.om > 5) return 'Apaga el motor antes de instalar eso.';
  if (G.tool !== d.tool) return `Para instalarla necesitas ${TOOLS[d.tool].name.toLowerCase()}. Selecciónala en la caja de herramientas.`;
  if (d.needs) for (const k of d.needs) if (!has(c, k)) return `Primero instala: ${SLOTS[k].name}.`;
  if (d.conn && !has(c, 'bateria')) return 'No hay batería para conectar.';
  return '';
}

function startBusy(id, dur, done) {
  G.busy = { slot: id, dur, t: 0, done, tick: 0 };
}

function doRemove(id) {
  const err = removeCheck(id);
  if (err) { toast(err, 'warn'); return; }
  const d = SLOTS[id], c = G.car, s = c.sim;
  const bolts = d.bolts || 1;
  const dur = d.tool === 'mano' || d.tool === 'pinzas' ? 0.5 : 0.6 + bolts * 0.45;
  startBusy(id, dur, () => {
    // riesgos reales
    if (id === 'batPos' && c.slots.batNeg.on) incident('¡Chispazo! La llave tocó la carrocería con el negativo conectado. Siempre se quita primero el negativo.', 0, 0.3);
    if ((id === 'tapaRad' || id === 'termostato') && s.ECT > 50) {
      incident(`¡Te quemaste! El refrigerante estaba a ${Math.round(s.ECT)} °C y a presión. Se abre con el motor frío (menos de 50 °C).`, 250, 0.4);
      c.cool.level = Math.max(0, c.cool.level - 0.12);
    }
    if (id === 'riel' && s.fp > 0.6) { incident(`Saltó gasolina a ${s.fp.toFixed(1)} bar sobre el motor. Primero quita el fusible de la bomba y deja que el motor se apague solo.`, 400, 0.6); s.fp = 0; }
    if (id === 'termostato') c.cool.level = Math.max(0, c.cool.level - 0.15);
    if (id === 'lineaTurbo') { c.oil.level = Math.max(0, c.oil.level - 0.12); c.oil.floor += 0.12; }
    if (id === 'filtroAceite') { const v = Math.min(c.oil.level, 0.3); c.oil.level -= v; if (c.pan) c.oil.pan += v; else { c.oil.floor += v; } }
    if ((id === 'tapon' || id === 'filtroAceite') && !c.pan && c.oil.level > 0.3) incident('No pusiste la charola: el aceite se fue al piso. Toca limpiar.', 150, 0.2);
    if ((id === 'batNeg' || id === 'batPos') && s.running) toast('Desconectaste la batería con el motor encendido: el alternador queda sin carga y puede dar picos de voltaje.', 'warn');
    if (id.startsWith('bob') && s.running) toast('Truco de taller: si al desconectar una bobina el motor no cambia, ese cilindro ya estaba muerto.', 'info');
    if (d.conn) { c.slots[id].on = false; }
    else {
      const it = c.slots[id].item;
      c.slots[id].item = null;
      if (it.type === 'tapon') it.washer = 'usada';
      it.fromJob = G.job ? G.job.id : 0;
      G.bench.push(it);
    }
    AUDIO.blip('clic');
    if (G.meter && G.meter.slot === id) G.meter = null;
    refreshAll();
  });
}

function doInstall(id, uid) {
  const err = installCheck(id);
  if (err) { toast(err, 'warn'); return; }
  const d = SLOTS[id], c = G.car;
  let it = null;
  if (!d.conn) {
    const idx = G.bench.findIndex(b => b.uid === uid);
    if (idx < 0) return;
    it = G.bench[idx];
    if (!slotAccepts(d, it.type)) { toast('Esa pieza no va ahí.', 'warn'); return; }
    G.bench.splice(idx, 1);
  }
  const finish = tq => {
    if (d.conn) {
      if (id === 'batNeg' && !c.slots.batPos.on) toast('Ojo: se conecta primero el positivo y al final el negativo.', 'warn');
      if (id === 'batPos' && c.slots.batNeg.on) incident('¡Chispazo! Conectaste el positivo con el negativo ya puesto. El orden es: positivo primero, negativo al final.', 0, 0.3);
      c.slots[id].on = true;
    } else {
      if (it.type === 'tapon') {
        const w = G.bench.findIndex(b => b.type === 'arandela');
        if (w >= 0) { G.bench.splice(w, 1); it.washer = 'nueva'; G.used.arandela++; }
        else toast('Pusiste el tapón con la arandela vieja. Va a gotear.', 'warn');
      }
      c.slots[id].item = it;
    }
    c.slots[id].tq = tq;
    AUDIO.blip('clic');
    refreshAll();
  };
  if (d.torque > 0) openTorque(id, it, finish, d);
  else startBusy(id, 0.5, () => finish({ lo: 1, hi: 1, ok: true }));
}

/* ---------- torquímetro ---------- */
function boltLayout(pattern, n) {
  if (pattern === 'rueda') return [[80, 40], [120, 80], [80, 120], [40, 80]];
  if (pattern === 'cuadro') return [[50, 50], [110, 50], [110, 110], [50, 110]];
  if (n === 2) return [[50, 80], [110, 80]];
  return [[80, 80]];
}
function openTorque(id, it, finish, d) {
  d = d || SLOTS[id];
  const n = d.bolts || 1;
  G.tqm = {
    id, def: d, it, finish, spec: d.torque, n, bolts: Array.from({ length: n }, () => ({ v: 0, clicked: false })),
    cur: 0, holding: false, order: [], useTq: G.tools.has('torquimetro') && G.useTq, broke: false, pos: boltLayout(d.pattern, n),
  };
  const m = $('#torque');
  m.hidden = false;
  $('#tqTitle').textContent = (d.conn ? 'Conectar: ' : 'Apretar: ') + d.name;
  $('#tqSpec').textContent = G.tqm.useTq
    ? `Torquímetro ajustado a ${d.torque} N·m. Mantén APRETAR hasta oír el ¡clic! y suelta.`
    : `Sin torquímetro aprietas al tanteo. El manual pide ${d.torque} N·m.`;
  $('#tqHint').textContent = d.pattern === 'rueda' ? 'Los birlos se aprietan en estrella: uno, el de enfrente, y luego los otros dos. Toca el birlo que sigue.'
    : d.pattern === 'cuadro' ? 'Tuercas en cruz: aprieta en diagonal para que la brida asiente pareja.' : (d.info || '');
  $('#tqDone').disabled = true;
  drawTorque();
}
function closeTorque(cancel) {
  const T = G.tqm;
  if (!T) return;
  $('#torque').hidden = true;
  G.tqm = null;
  if (cancel) { if (T.it) G.bench.push(T.it); refreshAll(); return; }
  const r = T.bolts.map(b => b.v / T.spec);
  let ok = true;
  const d = T.def;
  if ((d.pattern === 'rueda' || d.pattern === 'cuadro') && T.order.length >= 4) {
    const o = T.order;
    ok = o[1] === (o[0] + 2) % 4 && o[3] === (o[2] + 2) % 4;
  }
  T.finish({ lo: Math.min(...r), hi: T.broke ? 1.8 : Math.max(...r), ok });
}
function torqueTick(dt) {
  const T = G.tqm;
  if (!T || !T.holding) return;
  const b = T.bolts[T.cur];
  if (b.broke) { T.holding = false; return; }
  const prev = b.v;
  b.v += T.spec * 0.7 * (1 + 0.5 * Math.min(1.5, b.v / T.spec)) * dt;
  if (T.useTq && prev < T.spec && b.v >= T.spec && !b.clicked) { b.clicked = true; AUDIO.blip('clic'); vibrate(35); flashTq(); }
  if (!G.tq_r || G.t - G.tq_r > 0.09) { G.tq_r = G.t; AUDIO.blip('ratchet'); }
  if (b.v > T.spec * 1.8) {
    T.broke = true; b.broke = true; b.v = T.spec * 1.8; T.holding = false;
    incident('¡Crac! Se barrió la cuerda por apretar de más. Hay que poner un inserto.', 600, 0.4);
  }
  drawTorque();
}
function flashTq() { const el = $('#tqClick'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
function drawTorque() {
  const T = G.tqm; if (!T) return;
  const cv = $('#tqCv'), x = cv.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.fillStyle = '#1c1f25'; x.fillRect(0, 0, 160, 160);
  x.strokeStyle = '#3b414c'; x.lineWidth = 2;
  x.beginPath(); x.arc(80, 80, 66, 0, Math.PI * 2); x.stroke();
  T.pos.forEach((p, i) => {
    const b = T.bolts[i], r = b.v / T.spec;
    x.fillStyle = i === T.cur ? '#f0b429' : '#121318';
    x.fillRect(p[0] - 14, p[1] - 14, 28, 28);
    x.fillStyle = r <= 0 ? '#5b6473' : r < 0.7 ? '#a3abb6' : r <= 1.25 ? '#5aa65b' : '#d8443a';
    if (!T.useTq && r > 0) x.fillStyle = '#a3abb6';
    x.fillRect(p[0] - 11, p[1] - 11, 22, 22);
    x.fillStyle = '#121318'; x.fillRect(p[0] - 5, p[1] - 5, 10, 10);
    const ord = T.order.indexOf(i);
    if (ord >= 0) { x.fillStyle = '#e6e9ed'; x.font = '10px Silkscreen, monospace'; x.fillText(String(ord + 1), p[0] + 10, p[1] - 10); }
  });
  const b = T.bolts[T.cur], r = b.v / T.spec;
  const read = $('#tqRead');
  if (T.useTq) read.textContent = `${b.v.toFixed(0)} / ${T.spec} N·m`;
  else read.textContent = r <= 0 ? 'Sin apretar' : r < 0.5 ? 'Flojo' : r < 0.9 ? 'Firme' : r < 1.3 ? 'Apretado' : 'Muy duro';
  const bar = $('#tqBar');
  bar.style.transform = `scaleX(${Math.min(1, T.useTq ? r / 1.8 : Math.sqrt(r / 1.8))})`;
  bar.dataset.zone = T.useTq ? (r < 0.9 ? 'lo' : r <= 1.15 ? 'ok' : 'hi') : 'na';
  $('#tqDone').disabled = T.bolts.some(bb => bb.v < T.spec * 0.3) || T.holding;
}
function tqSelectBolt(i) {
  const T = G.tqm; if (!T || T.holding) return;
  T.cur = i; drawTorque();
}
function tqPress(on) {
  const T = G.tqm; if (!T) return;
  if (on && T.bolts[T.cur].broke) { toast('Ese tornillo ya se barrió. Aprieta los demás.', 'warn'); return; }
  if (on) {
    T.holding = true;
    if (T.order[T.order.length - 1] !== T.cur && T.bolts[T.cur].v === 0) T.order.push(T.cur);
  } else if (T.holding) {
    T.holding = false;
    const d = T.def;
    if (d.pattern !== 'rueda') {
      const next = nextBolt(T);
      if (next >= 0 && T.bolts[T.cur].v >= T.spec * 0.3) T.cur = next;
    }
    drawTorque();
  }
}
function nextBolt(T) {
  const seq = T.def.pattern === 'cuadro' ? [0, 2, 1, 3] : T.bolts.map((_, i) => i);
  for (const i of seq) if (T.bolts[i].v < T.spec * 0.3) return i;
  return -1;
}

/* ---------- mediciones ---------- */
function doMeasure(id) {
  const c = G.car, s = c.sim, d = SLOTS[id], tool = G.tool, it = c.slots[id].item;
  const note = (txt) => { if (it) { it.seen = true; it.notes = it.notes || []; if (!it.notes.includes(txt)) it.notes.push(txt); } toast(txt, 'info'); refreshPanel(true); };
  if (tool === 'escaner') { setTab('escaner'); return; }
  if (tool === 'multimetro') {
    if (['bateria', 'batPos', 'batNeg', 'alternador'].includes(id)) { G.meter = { tool, slot: id }; refreshPanel(true); toast('Puntas del multímetro en la batería. Mira la lectura en vivo.', 'info'); }
    else toast('El multímetro se usa en la batería o en el alternador.', 'warn');
    return;
  }
  if (tool === 'manoGas') {
    if (id === 'riel') { G.meter = { tool, slot: id }; refreshPanel(true); toast('Manómetro conectado a la válvula del riel.', 'info'); }
    else toast('El manómetro de gasolina va en la válvula del riel de inyectores.', 'warn');
    return;
  }
  if (tool === 'compresimetro') {
    if (id.startsWith('buj') && !c.slots[id].item) { G.comp = { cyl: SLOTS[id].cyl, peak: 0 }; G.meter = { tool, slot: id }; refreshPanel(true); toast('Compresímetro enroscado. Mantén MARCHA 3 segundos. Tip: quita el fusible de la bomba para no echar gasolina.', 'info'); }
    else toast('El compresímetro se enrosca en el hueco de la bujía: primero quita la bobina y la bujía.', 'warn');
    return;
  }
  if (tool === 'vernier') {
    if (id.startsWith('balata') && it && !has(c, id === 'balataI' ? 'ruedaI' : 'ruedaD')) note(`Balatas: ${it.thick.toFixed(1)} mm. Nuevas miden 11 mm; abajo de 3 mm se cambian.`);
    else toast('Para medir balatas, quita la rueda primero.', 'warn');
    return;
  }
  if (tool === 'lampara') {
    if (!it && !d.check) { toast('No hay pieza ahí: se ve la base vacía.', 'info'); return; }
    if (id === 'bayoneta') { readDipstick(); return; }
    note(visualReport(id, it));
    return;
  }
  if (tool === 'mano') {
    if (id === 'bayoneta') { readDipstick(); return; }
    if (id === 'turbo') {
      if (has(c, 'tuboAdm')) { toast('Para sentir el juego del eje, quita el tubo de admisión y mueve la rueda del compresor con la mano.', 'warn'); return; }
      if (s.om > 1) { toast('¡No metas la mano con el motor encendido! El compresor gira a miles de rpm.', 'bad'); return; }
      note(it.health < 0.4 ? 'Eje del turbo: juego radial excesivo, las aspas rozan la carcasa y hay aceite en la entrada.' : it.health < 0.7 ? 'Eje del turbo: algo de juego, sin roce.' : 'Eje del turbo: casi sin juego. Sano.');
      return;
    }
  }
  if (tool === 'calibrador') { toast('El calibrador se usa en una bujía que ya sacaste: búscala en el banco.', 'warn'); return; }
  toast(`${TOOLS[tool].name} no sirve para revisar esto.`, 'warn');
}
function visualReport(id, it) {
  const c = G.car, s = c.sim, h = it ? it.health : 1;
  switch (it && it.type) {
    case 'banda': return h < 0.45 ? 'Banda: grietas en casi todas las costillas y orillas brillosas de patinar.' : 'Banda: costillas completas, sin grietas.';
    case 'mangueraIC': return h < 0.6 ? 'Manguera: grieta de lado a lado con residuo de aceite alrededor. Por ahí se fuga el boost.' : 'Manguera: firme, sin grietas.';
    case 'filtroAire': return h < 0.4 ? 'Filtro de aire: casi negro de polvo, los pliegues tapados.' : h < 0.7 ? 'Filtro de aire: algo de polvo, todavía aguanta.' : 'Filtro de aire: limpio.';
    case 'bateria': return h < 0.5 ? 'Batería: sulfato verde-blanco en las terminales y la caja un poco inflada.' : 'Batería: terminales limpias, caja sin inflar.';
    case 'turbo': return h < 0.4 ? 'Turbo: escurrimiento de aceite en la entrada del compresor y en el escape. Mala señal.' : 'Turbo: seco por fuera, sin fugas.';
    case 'tapon': return c.cfg && c.cfg.taponLeak > 0 && c.cfg.taponLeak < 1 ? 'Tapón del cárter: gotea despacio.' : 'Tapón del cárter: seco.';
    case 'filtroAceite': return it.health < 0.5 ? 'Filtro de aceite: viejo, la etiqueta se ve quemada de calor.' : 'Filtro de aceite: limpio y seco.';
    case 'balata': return it.thick < 3.5 ? 'Balatas: se ve muy poco material; el disco tiene rayas.' : 'Balatas: se ve material suficiente. Mídelas con vernier para saber cuánto.';
    case 'bobina': return 'Bobina: por fuera se ve igual que las demás. Las bobinas se prueban cambiándolas de cilindro.';
    case 'bujia': return 'Desde arriba solo se ve la porcelana. Sácala para ver el electrodo.';
    case 'termostato': return 'Termostato: no se puede saber sin sacarlo.';
    case 'sensorO2': return 'Sensor O2: por fuera se ve normal. Revisa su voltaje en el escáner.';
    case 'inyector': return it.health < 0.7 ? 'Inyector: punta con carbón y barniz.' : 'Inyector: punta limpia.';
    case 'marcha': return 'Motor de arranque: cables bien apretados. Para saber si sirve, hay que probarlo.';
    case 'alternador': return 'Alternador: por fuera se ve normal. Mídelo con el multímetro con el motor encendido.';
    default: return 'Se ve en orden.';
  }
}
function readDipstick() {
  const c = G.car, s = c.sim;
  if (s.om > 1) { toast('Con el motor encendido la bayoneta no da una lectura real. Apágalo y espera.', 'warn'); return; }
  const L = c.oil.level;
  const pos = L < 3.0 ? 'por DEBAJO del MIN' : L > 4.2 ? 'por ENCIMA del MAX (demasiado)' : L > 3.85 ? 'en el MAX' : L > 3.4 ? 'entre MIN y MAX' : 'apenas en el MIN';
  const col = c.oil.quality < 0.35 ? 'negro y espeso' : c.oil.quality < 0.7 ? 'café oscuro' : 'ámbar claro';
  const milky = c.dmg.hg > 0.3 ? ' Tiene un tono lechoso: hay refrigerante en el aceite (empaque de cabeza).' : '';
  toast(`Bayoneta: nivel ${pos} (${L.toFixed(1)} L). Color ${col}.${milky}`, 'info');
}

/* ---------- líquidos ---------- */
function addFluid(kind) {
  const c = G.car;
  const idx = G.bench.findIndex(b => b.type === kind);
  if (idx < 0) { toast(`No tienes ${partName(kind).toLowerCase()} en el banco. Cómpralo en la tienda.`, 'warn'); return; }
  if (kind === 'aceite' && has(c, 'tapaAceite')) { toast('Quita primero el tapón de llenado de aceite.', 'warn'); return; }
  if (kind === 'refrigerante' && has(c, 'tapaRad')) { toast('Quita primero el tapón del radiador (en frío).', 'warn'); return; }
  G.bench.splice(idx, 1);
  G.used[kind]++;
  const eff = G.tools.has('embudo') ? 1 : 0.85;
  if (eff < 1) toast('Sin embudo, parte se derramó.', 'warn');
  if (kind === 'aceite') {
    const add = eff;
    const q = (c.oil.level * c.oil.quality + add * 1) / Math.max(0.01, c.oil.level + add);
    c.oil.level += add; c.oil.quality = q;
    if (!has(c, 'tapon')) toast('¡El tapón del cárter no está puesto! El aceite está saliendo por abajo.', 'bad');
  } else {
    c.cool.level = Math.min(1.05, c.cool.level + 0.15 * eff);
  }
  refreshAll();
}

/* ---------- entrega ---------- */
function deliver() {
  const c = G.car, s = c.sim, j = G.job;
  if (!j || c.uid !== j.carUid) { toast('Este no es el auto del cliente. Ve a Autos y súbelo al elevador.', 'warn'); return; }
  if (s.om > 1) { toast('Apaga el motor antes de entregar.', 'warn'); return; }
  if (c.lift) { toast('Baja el elevador antes de entregar.', 'warn'); return; }
  const jobIssues = j.def.check(c);
  const issues = [], warns = [];
  let pen = 0, critical = false;
  if (!c.engId) { issues.push('¡Le falta el motor!'); critical = true; }
  if (!c.caja || c.caja.health <= 0) { issues.push(c.caja ? 'La caja quedó rota.' : '¡Le falta la caja!'); critical = true; }
  if (c.ecu.prog !== c.engId) { issues.push('La computadora no está programada para el motor.'); critical = true; }
  for (const id in SLOTS) {
    const d = SLOTS[id];
    if (d.check || d.macro) continue;
    if (!has(c, id)) { issues.push((d.conn ? 'Quedó desconectada: ' : 'Falta: ') + d.name); critical = true; continue; }
    const tq = c.slots[id].tq;
    if (tq && d.torque > 0) {
      if (tq.hi > 1.45) { issues.push('Cuerda barrida: ' + d.name); }
      else if (tq.lo < 0.7) { issues.push('Quedó flojo: ' + d.name + ' (pedía ' + d.torque + ' N·m)'); if (d.pattern === 'rueda') critical = true; }
      else if (tq.hi > 1.25) warns.push('Apretado de más: ' + d.name);
      if (!tq.ok && d.pattern === 'rueda') { warns.push(d.name + ': birlos sin patrón en estrella, el disco se puede alabear.'); pen += 150; }
      if (!tq.ok && d.pattern === 'cuadro') { warns.push('Turbo: tuercas sin apretar en cruz, puede haber fuga de escape.'); pen += 100; }
    }
  }
  const cap = oilCap(c);
  if (c.oil.level < cap - 1) { issues.push(`Aceite bajo: ${c.oil.level.toFixed(1)} L (mínimo ${(cap - 1).toFixed(1)})`); }
  if (c.oil.level > cap + 0.4) { warns.push(`Aceite de más: ${c.oil.level.toFixed(1)} L (máximo ${cap.toFixed(1)}). Puede espumar.`); pen += 100; }
  if (c.cool.level < 0.85) issues.push(`Refrigerante bajo (${Math.round(c.cool.level * 100)}%)`);
  if (c.seized) { issues.push('El motor se desvieló en el taller.'); critical = true; pen += 35000; }
  const dHg = c.dmg.hg - j.dmg0.hg, dB = c.dmg.bear - j.dmg0.bear, dK = c.dmg.knock - j.dmg0.knock;
  if (dHg > 0.15) { issues.push('Se dañó el empaque de cabeza por sobrecalentamiento.'); pen += 9000; }
  if (dB > 0.15 && !c.seized) { issues.push('Se dañaron los metales del cigüeñal por falta de aceite.'); pen += 12000; }
  if (dK > 0.1) { warns.push('El motor cascabeleó mucho en el taller.'); pen += 800; }
  if (c.oil.floor > 0.3) { warns.push(`Quedaron ${c.oil.floor.toFixed(1)} L de aceite en el piso.`); pen += 150; }
  const codes = Object.keys(c.ecu.codes);
  const mil = codes.length > 0;
  if (mil && jobIssues.length === 0 && G.tools.has('escaner')) warns.push('El foco de check engine sigue prendido: faltó borrar los códigos.');
  // piezas cobradas
  let parts = 0;
  const billed = [];
  for (const id in c.slots) { const it = c.slots[id].item; if (it && it.shop) { parts += it.cost || 0; billed.push(partName(it.type)); it.shop = false; } }
  for (const k of ['aceite', 'refrigerante', 'arandela']) parts += G.used[k] * PARTS[k].price;
  const wasted = G.bench.filter(b => b.fromJob === j.id && b.health >= 0.85 && (PARTS[b.type] || {}).price > 300 && !b.shop && b.type !== 'llanta' && !['tapaMotor','protector','tuboAdmision','riel','tapon','tapaAceite','tapaRad'].includes(b.type));
  const fixed = jobIssues.length === 0;
  let pay = 0, repD = 0, verdict;
  if (critical) { pay = Math.round(parts * 1.0) - pen; repD = -1; verdict = 'El cliente se fue furioso.'; }
  else if (!fixed) { pay = Math.round(parts * 1.0) - pen; repD = -0.6; verdict = 'La falla sigue. El cliente pagó las piezas pero no la mano de obra.'; }
  else {
    pay = j.labor + Math.round(parts * 1.25) - pen;
    repD = issues.length ? -0.2 : warns.length ? 0.15 : 0.4;
    if (wasted.length) repD -= 0.1;
    verdict = issues.length ? 'Arreglaste la falla, pero el auto salió con detalles.' : warns.length ? 'Cliente contento, con algunos detalles.' : '¡Trabajo limpio! El cliente te va a recomendar.';
  }
  if (G.mode === 'taller') { G.money += pay; G.rep = Math.max(0, Math.min(5, G.rep + repD)); }
  showResult({ j, fixed, jobIssues, issues, warns, pay, parts, billed, verdict, repD, wasted, codes });
  G.cars = G.cars.filter(x => x !== c);
  G.job = null;
  setCar(G.cars.find(x => x.owner === 'mio') || null);
  save();
}
function showResult(r) {
  const m = $('#result');
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  m.innerHTML = `<div class="modal-card">
    <h2 class="m-title">${r.fixed && !r.issues.length ? 'Entregado' : 'Entregado con pendientes'}</h2>
    <p class="m-lead">${esc(r.j.client)} · ${esc(r.j.auto)}</p>
    <p>${esc(r.verdict)}</p>
    ${r.jobIssues.length ? `<h3>La falla</h3><ul class="bad">${li(r.jobIssues)}</ul><p class="muted">Pista: ${esc(r.j.def.pista)}</p>` : `<h3>La falla</h3><ul class="good"><li>Resuelta</li></ul>`}
    ${r.issues.length ? `<h3>Problemas</h3><ul class="bad">${li(r.issues)}</ul>` : ''}
    ${r.warns.length ? `<h3>Detalles</h3><ul class="warn">${li(r.warns)}</ul>` : ''}
    ${r.wasted.length ? `<h3>Piezas cambiadas sin necesidad</h3><ul class="warn">${li(r.wasted.map(w => partName(w.type)))}</ul>` : ''}
    ${G.mode === 'taller' ? `<div class="bill">
      <div><span>Mano de obra</span><b>${r.fixed ? fmt$(r.j.labor) : '$0'}</b></div>
      <div><span>Refacciones${r.fixed ? ' (+25%)' : ''}</span><b>${fmt$(r.fixed ? r.parts * 1.25 : r.parts)}</b></div>
      <div class="total"><span>Te pagaron</span><b>${fmt$(r.pay)}</b></div>
      <div><span>Reputación</span><b>${r.repD >= 0 ? '+' : ''}${r.repD.toFixed(1)} ★</b></div>
    </div>` : ''}
    <div class="m-actions"><button class="btn primary" id="btnNext">Siguiente cliente</button></div>
  </div>`;
  m.hidden = false;
  $('#btnNext').onclick = () => { m.hidden = true; if (!newJob()) { toast('El garaje está lleno: no aceptaste más clientes por hoy.', 'warn'); if (!G.car && G.cars.length) setCar(G.cars[0]); refreshAll(); } };
}

/* ---------- interfaz: barras y paneles ---------- */
function refreshAll() { refreshStats(); renderBelt(); refreshPanel(true); renderSelbar(); syncButtons(); }
function refreshStats() {
  $('#sMoney').textContent = G.mode === 'lab' ? 'Libre' : fmt$(G.money);
  $('#sMoney').classList.toggle('neg', G.money < 0 && G.mode !== 'lab');
  const r = Math.round(G.rep * 2) / 2;
  $('#sRep').textContent = '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(r));
  $('#sRep').setAttribute('aria-label', `Reputación ${r} de 5`);
  $('#sJob').textContent = G.mode === 'lab' ? 'Laboratorio' : '#' + G.jobN;
}
function renderBelt() {
  const el = $('#belt');
  const ids = TOOL_ORDER.filter(t => G.tools.has(t));
  const html = ids.map(t => `<button class="tool${G.tool === t ? ' on' : ''}" data-tool="${t}" aria-pressed="${G.tool === t}" title="${esc(TOOLS[t].name)}"><img src="${toolIcon(t)}" alt="" width="32" height="32"><span>${esc(TOOLS[t].short)}</span></button>`).join('');
  if (el.dataset.k !== html) { el.innerHTML = html; el.dataset.k = html; }
}
function selectTool(t) {
  if (!G.tools.has(t)) return;
  if (t === 'charola') { togglePan(); return; }
  G.tool = t; G.meter = null; G.comp = null;
  renderBelt(); renderSelbar(); refreshPanel(true);
  if (t === 'escaner') setTab('escaner');
}
function togglePan() {
  const c = G.car;
  if (!c.lift) { toast('Sube el elevador para poner la charola debajo.', 'warn'); return; }
  c.pan = !c.pan;
  if (!c.pan && c.oil.pan > 0) { toast(`Retiraste la charola con ${c.oil.pan.toFixed(1)} L de aceite usado (al tambo de reciclaje).`, 'info'); c.oil.pan = 0; }
  else toast(c.pan ? 'Charola debajo del tapón del cárter.' : 'Charola retirada.', 'info');
  G.view = 'abajo'; syncViews(); refreshAll();
}
function openSheet(t) {
  if (t) setTab(t);
  $('#sheet').hidden = false;
  $$('.dbtn').forEach(b => b.classList.toggle('on', b.dataset.sheet === G.tab));
}
function closeSheet() { $('#sheet').hidden = true; $$('.dbtn').forEach(b => b.classList.remove('on')); }
function setTab(t) {
  G.tab = t;
  $$('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $$('.panel').forEach(p => { p.hidden = p.id !== 'p-' + t; });
  refreshPanel(true);
}
function selectSlot(id) {
  G.sel = id;
  if (typeof setSelected3D === 'function' && R3.ok) setSelected3D(id);
  if (G.meter && G.meter.slot !== id) { G.meter = null; G.comp = null; }
  renderSelbar();
  if (G.tab !== 'pieza' && G.tab !== 'escaner') setTab('pieza'); else refreshPanel(true);
}

function slotState(id) {
  const c = G.car, d = SLOTS[id];
  if (d.check) return '';
  if (d.conn) return c.slots[id].on ? 'Conectada' : 'Desconectada';
  return c.slots[id].item ? 'Instalada' : 'Vacía';
}
function renderSelbar() {
  const el = $('#selbar');
  const id = G.sel;
  if (!id) { el.innerHTML = `<span class="sel-hint">Toca una pieza del motor. Herramienta en mano: <b>${esc(TOOLS[G.tool].name)}</b></span>`; return; }
  const d = SLOTS[id], c = G.car;
  const present = has(c, id);
  let actions = '';
  if (d.check) actions = `<button class="btn primary" data-act="measure">Revisar</button>`;
  else if (present) {
    actions = `<button class="btn primary" data-act="remove">${d.conn ? 'Desconectar' : 'Quitar'}</button>`;
    if (TOOLS[G.tool].measure || G.tool === 'mano') actions += `<button class="btn" data-act="measure">Revisar</button>`;
  } else {
    if (d.conn) actions = `<button class="btn primary" data-act="connect">Conectar</button>`;
    else actions = `<button class="btn primary" data-act="details">Instalar…</button>`;
    if (G.tool === 'compresimetro' && id.startsWith('buj')) actions += `<button class="btn" data-act="measure">Compresión</button>`;
  }
  el.innerHTML = `<div class="sel-name"><b>${esc(d.name)}</b><span class="pill ${present ? 'ok' : 'off'}">${esc(slotState(id) || 'Revisión')}</span></div>
    <div class="sel-tool">Lleva: ${esc(TOOLS[d.tool].name)}${d.torque ? ` · ${d.torque} N·m` : ''}</div>
    <div class="sel-actions">${actions}<button class="btn ghost" data-act="details">Detalles</button></div>`;
}

function refreshPanel(force) {
  if (!G.car && !['autos', 'negocio', 'tienda'].includes(G.tab)) { const el = $('#p-' + G.tab); if (el) el.innerHTML = '<p class="muted">No hay auto en el elevador. Ve a Autos.</p>'; return; }
  if (G.tab === 'ecu') renderECU();
  else if (G.tab === 'autos') renderAutos();
  else if (G.tab === 'negocio') renderNegocio();
  else if (G.tab === 'pieza') renderPieza();
  else if (G.tab === 'orden') renderOrden();
  else if (G.tab === 'banco') renderBanco();
  else if (G.tab === 'tienda') renderTienda();
  else if (G.tab === 'escaner') renderEscaner(force);
}

function renderPieza() {
  const el = $('#p-pieza');
  const id = G.sel, c = G.car;
  if (!id) {
    el.innerHTML = `<h2 class="p-title">Ninguna pieza seleccionada</h2>
      <p>Toca algo en el cofre o, con el elevador arriba, en la vista de abajo. Aquí verás para qué sirve, qué herramienta lleva y su apriete.</p>
      <p class="muted">Consejo: antes de quitar nada, enciende el motor y observa. Escucha, mira el tablero y la vista en corte.</p>`;
    return;
  }
  const d = SLOTS[id];
  if (!d) { G.sel = null; renderPieza(); return; }
  if (d.macro) { el.innerHTML = `<h2 class="p-title">${esc(d.name)}</h2>${d.info ? `<p class="note">${esc(d.info)}</p>` : ''}` + renderMacro(id); return; }
  const it = c.slots[id].item;
  const pd = d.type ? PARTS[d.type] : null;
  let body = `<h2 class="p-title">${esc(d.name)}</h2>`;
  if (pd) body += `<p>${esc(pd.desc)}</p>`;
  if (d.info) body += `<p class="note">${esc(d.info)}</p>`;
  body += `<dl class="spec">
    <div><dt>Herramienta</dt><dd>${esc(TOOLS[d.tool].name)}${G.tools.has(d.tool) ? '' : ' <span class="pill off">no la tienes</span>'}</dd></div>
    ${d.torque ? `<div><dt>Apriete</dt><dd>${d.torque} N·m${d.bolts > 1 ? ` · ${d.bolts} tornillos` : ''}</dd></div>` : ''}
    ${d.lift ? `<div><dt>Acceso</dt><dd>Por abajo, con elevador</dd></div>` : ''}
    ${d.pre ? `<div><dt>Antes quitar</dt><dd>${d.pre.map(k => esc(SLOTS[k].name)).join(', ')}</dd></div>` : ''}
  </dl>`;
  if (it && it.notes && it.notes.length) body += `<div class="notes"><h3>Lo que encontraste</h3><ul>${it.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
  body += `<div id="liveRead" class="live" ${G.meter ? '' : 'hidden'}></div>`;
  // acciones
  let acts = '';
  if (d.check) acts += `<button class="btn primary" data-act="measure">Sacar y leer la bayoneta</button>`;
  else if (has(c, id)) {
    acts += `<button class="btn primary" data-act="remove">${d.conn ? 'Desconectar' : 'Quitar'} con ${esc(TOOLS[G.tool].name.toLowerCase())}</button>`;
    acts += `<button class="btn" data-act="measure">Revisar con ${esc(TOOLS[G.tool].name.toLowerCase())}</button>`;
  } else if (d.conn) acts += `<button class="btn primary" data-act="connect">Conectar</button>`;
  if (id === 'tapaAceite' && !has(c, id)) acts += `<button class="btn" data-act="fill-aceite">Echar 1 L de aceite (${G.bench.filter(b => b.type === 'aceite').length} en banco)</button>`;
  if (id === 'tapaRad' && !has(c, id)) acts += `<button class="btn" data-act="fill-refrigerante">Echar 1 L de refrigerante (${G.bench.filter(b => b.type === 'refrigerante').length} en banco)</button>`;
  if (G.tool === 'compresimetro' && id.startsWith('buj') && !has(c, id)) acts += `<button class="btn" data-act="measure">Enroscar compresímetro</button>`;
  body += `<div class="acts">${acts}</div>`;
  if (!d.conn && !d.check && !has(c, id)) {
    const fits = G.bench.filter(b => slotAccepts(d, b.type));
    body += `<h3>Instalar aquí</h3>`;
    if (!fits.length) body += `<p class="muted">No tienes ${esc(partName(d.type).toLowerCase())} en el banco. <button class="link" data-act="shop" data-type="${d.type}">Comprar una (${fmt$(G.mode === 'lab' ? 0 : PARTS[d.type].price)})</button></p>`;
    else body += `<ul class="items">${fits.map(b => itemRow(b, `<button class="btn primary sm" data-act="install" data-uid="${b.uid}">Instalar</button>`)).join('')}</ul>`;
  }
  el.innerHTML = body;
}
function itemRow(b, btn) {
  const known = b.shop ? 'Nueva' : (b.notes && b.notes.length) || b.seen ? condWord(b.health) : (b.fromJob ? 'Usada (sin revisar)' : 'Usada');
  let extra = '';
  if (b.type === 'bujia' && b.gapSeen) extra = ` · ${b.gap.toFixed(2)} mm`;
  if (b.type === 'balata' && b.thickSeen) extra = ` · ${b.thick.toFixed(1)} mm`;
  return `<li class="item"><img src="${partIcon(b.type, b.shop ? 1 : (b.seen ? b.health : 1))}" alt="" width="32" height="32"><div class="it-txt"><b>${esc(partName(b.type))}</b><span>${esc(known + extra)}</span></div>${btn || ''}</li>`;
}

function renderOrden() {
  const el = $('#p-orden'), j = G.job, c = G.car;
  if (!j) { el.innerHTML = ''; return; }
  el.innerHTML = `<h2 class="p-title">Orden de trabajo #${j.id}</h2>
    <div class="ticket">
      <div class="t-row"><span>Cliente</span><b>${esc(j.client)}</b></div>
      <div class="t-row"><span>Auto</span><b>${esc(j.auto)}</b></div>
      <div class="t-row"><span>Kilometraje</span><b>${c.km.toLocaleString('es-MX')} km</b></div>
      <blockquote class="queja">“${esc(j.queja)}”</blockquote>
      ${G.mode === 'taller' ? `<div class="t-row"><span>Mano de obra acordada</span><b>${fmt$(j.labor)}</b></div>` : ''}
    </div>
    <h3>Cómo se trabaja en un taller</h3>
    <ol class="steps">
      <li>Escucha al cliente y reproduce la falla: arranca, acelera, mira el tablero.</li>
      <li>Diagnostica con herramientas: escáner, multímetro, lámpara.</li>
      <li>Repara siguiendo el orden del manual y aprieta a especificación.</li>
      <li>Prueba otra vez, borra códigos y entrega con todo puesto.</li>
    </ol>
    <div class="acts">
      <button class="btn primary" data-act="deliver">Entregar el auto</button>
      ${G.mode === 'taller' ? `<button class="btn ghost" data-act="hint">Pedir pista al maestro (−$100)</button>` : ''}
    </div>`;
}
function renderBanco() {
  const el = $('#p-banco');
  const groups = {};
  for (const b of G.bench) (groups[b.type] = groups[b.type] || []).push(b);
  const keys = Object.keys(groups);
  let body = `<h2 class="p-title">Banco de trabajo</h2>`;
  if (!keys.length) body += `<p class="muted">Vacío. Aquí caen las piezas que quitas y las que compras.</p>`;
  else {
    body += `<ul class="items">`;
    for (const b of G.bench) {
      let btn = '';
      if (b.type === 'bujia') btn = `<button class="btn sm" data-act="gap" data-uid="${b.uid}">Revisar</button>`;
      else if (b.type === 'balata' && G.tools.has('vernier')) btn = `<button class="btn sm" data-act="pad" data-uid="${b.uid}">Medir</button>`;
      else if (!PARTS[b.type].consumable) btn = `<button class="btn sm" data-act="inspect" data-uid="${b.uid}">Revisar</button>`;
      body += itemRow(b, btn);
    }
    body += `</ul>`;
    body += `<div class="acts"><button class="btn ghost" data-act="scrap">Tirar piezas viejas a la chatarra</button></div>`;
  }
  el.innerHTML = body;
}
function renderTienda() {
  const el = $('#p-tienda');
  const lab = G.mode === 'lab';
  let body = `<h2 class="p-title">Refaccionaria</h2><p class="muted">Precios de mostrador en pesos. Al cliente se le cobra la refacción +25%.</p><ul class="items shop">`;
  for (const t in PARTS) {
    if (['tapaMotor', 'protector', 'tuboAdmision', 'riel', 'llanta', 'tapaAceite'].includes(t)) continue;
    const n = G.bench.filter(b => b.type === t).length;
    body += `<li class="item"><img src="${partIcon(t, 1)}" alt="" width="32" height="32"><div class="it-txt"><b>${esc(PARTS[t].name)}</b><span>${lab ? 'Gratis' : fmt$(PARTS[t].price)}${n ? ` · tienes ${n}` : ''}</span></div><button class="btn sm" data-act="buy" data-type="${t}">Comprar</button></li>`;
  }
  body += `</ul><h2 class="p-title">Herramientas</h2><ul class="items shop">`;
  for (const t of TOOL_ORDER) {
    const own = G.tools.has(t);
    body += `<li class="item"><img src="${toolIcon(t)}" alt="" width="32" height="32"><div class="it-txt"><b>${esc(TOOLS[t].name)}</b><span>${esc(TOOLS[t].desc)}</span></div>${own ? '<span class="pill ok">Tuya</span>' : `<button class="btn sm" data-act="buytool" data-tool="${t}">${fmt$(lab ? 0 : TOOLS[t].price)}</button>`}</li>`;
  }
  body += `</ul>`;
  if (G.tools.has('torquimetro')) body += `<label class="check"><input type="checkbox" id="useTq" ${G.useTq ? 'checked' : ''}> Usar el torquímetro al apretar</label>`;
  el.innerHTML = body;
  const u = $('#useTq'); if (u) u.onchange = () => { G.useTq = u.checked; };
}
function buy(type) {
  const price = G.mode === 'lab' ? 0 : PARTS[type].price;
  if (G.money < price) { toast('No te alcanza.', 'warn'); return; }
  G.money -= price;
  const it = newItem(type, { shop: true, cost: price });
  if (type === 'bateria') it.soc = 1;
  G.bench.push(it);
  toast(`Compraste: ${PARTS[type].name}`, 'info');
  refreshAll(); save();
}
function buyTool(t) {
  const price = G.mode === 'lab' ? 0 : TOOLS[t].price;
  if (G.money < price) { toast('No te alcanza.', 'warn'); return; }
  G.money -= price; G.tools.add(t);
  toast(`Nueva herramienta: ${TOOLS[t].name}`, 'info');
  refreshAll(); save();
}

function renderEscaner(force) {
  const el = $('#p-escaner'), c = G.car, s = c.sim;
  if (!G.tools.has('escaner')) {
    el.innerHTML = `<h2 class="p-title">Escáner OBD-II</h2><p>No tienes escáner. Sin él no puedes leer los códigos de falla ni los datos de la computadora.</p><div class="acts"><button class="btn primary" data-act="buytool" data-tool="escaner">Comprar escáner (${fmt$(G.mode === 'lab' ? 0 : TOOLS.escaner.price)})</button></div>`;
    return;
  }
  if (!s.ecuOn) {
    el.innerHTML = `<h2 class="p-title">Escáner OBD-II</h2><p>Conectado al puerto debajo del volante. <b>Pon la llave en contacto</b> para que la computadora responda.</p>`;
    return;
  }
  const codes = Object.keys(c.ecu.codes);
  const key = codes.join(',') + '|' + (force ? Math.random() : '');
  if (!el.querySelector('#live') || el.dataset.k !== codes.join(',') || force) {
    el.dataset.k = codes.join(',');
    el.innerHTML = `<h2 class="p-title">Escáner OBD-II</h2>
      <h3>Códigos guardados (${codes.length})</h3>
      ${codes.length ? `<ul class="dtc">${codes.map(k => `<li><b>${k}</b><span>${esc(DTC[k] || '')}</span></li>`).join('')}</ul>` : '<p class="muted">Sin códigos. El foco de check engine está apagado.</p>'}
      <div class="acts"><button class="btn" data-act="clear">Borrar códigos</button></div>
      <h3>Datos en vivo</h3>
      <table class="live-tbl" id="live"><tbody></tbody></table>`;
  }
  updateLive();
}
function updateLive() {
  const tb = document.querySelector('#live tbody'); if (!tb) return;
  const c = G.car, s = c.sim, rpm = s.om * 9.5493;
  const rows = [
    ['RPM', rpm.toFixed(0), ''], ['Presión del múltiple (MAP)', (s.Pm / 1000).toFixed(0), 'kPa'],
    ['Presión antes de mariposa', (s.Pc / 1000).toFixed(0), 'kPa'], ['Presión entrada turbo', ((s.Pin || PH.Pa) / 1000).toFixed(0), 'kPa'],
    ['Temp. aire admisión', (s.Tm - 273).toFixed(0), '°C'], ['Temp. refrigerante', s.ECT.toFixed(0), '°C'],
    ['Ajuste corto (STFT)', (s.stft * 100).toFixed(1), '%'], ['Ajuste largo (LTFT)', (s.ltft * 100).toFixed(1), '%'],
    ['Sensor O2', c.cfg && c.cfg.o2 > 0 ? (s.o2V + (s.running ? (Math.random() - 0.5) * (c.cfg.o2 < 0.5 ? 0.02 : 0.25) : 0)).toFixed(2) : '—', 'V'],
    ['Retardo por cascabeleo', s.retard.toFixed(1), '°'], ['Voltaje del sistema', s.V.toFixed(1), 'V'],
    ['Wastegate', (s.wg * 100).toFixed(0), '%'],
    ['Fallas cil. 1·2·3·4', s.misCount.map(x => Math.round(x * 100)).join(' · '), '%'],
  ];
  tb.innerHTML = rows.map(r => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
}

/* ---------- tablero ---------- */
const DASH = [
  ['rpm', 'RPM'], ['boost', 'Boost'], ['tq', 'Torque'], ['hp', 'Potencia'], ['ect', 'Motor'],
  ['oil', 'Aceite'], ['volt', 'Batería'], ['afr', 'Mezcla'], ['turbo', 'Turbo'], ['egt', 'Escape'],
];
function buildDash() {
  $('#dash').innerHTML = DASH.map(([k, n]) => `<div class="g" id="g-${k}"><span class="g-k">${n}</span><span class="g-v">—</span><span class="g-u"></span><i class="g-bar"><b></b></i></div>`).join('');
  $('#lights').innerHTML = [['mil', 'Check engine'], ['bat', 'Batería'], ['oilL', 'Aceite'], ['tmp', 'Temperatura']].map(([k, n]) => `<span class="lamp" id="l-${k}">${n}</span>`).join('');
}
function setG(k, v, u, frac, state) {
  const el = document.getElementById('g-' + k);
  el.querySelector('.g-v').textContent = v;
  el.querySelector('.g-u').textContent = u;
  el.querySelector('.g-bar b').style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
  el.dataset.s = state || '';
}
function updateDash() {
  const c = G.car; if (!c) return;
  const s = c.sim, rpm = s.om * 9.5493;
  const red = c.engId ? MOTORES[c.engId].redline : 7000;
  const boost = (s.Pc - PH.Pa) / 1e5;
  setG('rpm', rpm.toFixed(0), 'rpm', rpm / (red + 500), rpm > red - 300 ? 'hot' : '');
  setG('boost', (boost >= 0 ? '+' : '') + boost.toFixed(2), 'bar', (boost + 0.8) / 2.8, boost > ((s.boostTarget || 7e4) / 1e5) + 0.2 ? 'hot' : '');
  setG('tq', s.running ? Math.max(0, s.tqAvg).toFixed(0) : '0', 'N·m', s.tqAvg / 480);
  setG('hp', s.running ? s.hp.toFixed(0) : '0', 'hp', s.hp / 400);
  setG('ect', s.ECT.toFixed(0), '°C', (s.ECT - 20) / 110, s.ECT > 110 ? 'hot' : s.ECT < 70 ? 'cold' : '');
  setG('oil', s.oilP.toFixed(1), 'bar', s.oilP / 5, s.running && s.oilP < 0.5 ? 'hot' : '');
  setG('volt', s.V.toFixed(1), 'V', (s.V - 8) / 7, s.running && s.V < 13.2 ? 'hot' : '');
  const afr = s.running ? (s.lamAvg * 14.7) : 0;
  setG('afr', s.running ? afr.toFixed(1) : '—', ':1', (afr - 9) / 9, s.running && (afr > 16 || afr < 11) ? 'hot' : '');
  setG('turbo', (s.wt * 9.5493 / 1000).toFixed(0), 'mil rpm', s.wt * 9.5493 / 220000, s.surge > 0.2 ? 'hot' : '');
  setG('egt', (s.T3 - 273).toFixed(0), '°C', (s.T3 - 300) / 800, s.T3 > 1200 ? 'hot' : '');
  const L = (k, on, blink) => { const el = document.getElementById('l-' + k); el.classList.toggle('on', !!on); el.classList.toggle('blink', !!blink); };
  const misNow = s.running && s.misCount.some(x => x > 0.12);
  L('mil', s.ecuOn && (!c.ecu.tune || c.ecu.tune.mil) && (Object.keys(c.ecu.codes).length > 0 || (!s.running && s.om < 1)), misNow);
  L('bat', s.ecuOn && (!s.running || s.V < 13.0));
  L('oilL', s.ecuOn && s.oilP < 0.4);
  L('tmp', s.ecuOn && s.ECT > 112, s.ECT > 118);
  updateMeter();
}
function updateMeter() {
  const el = document.getElementById('liveRead');
  if (!el) return;
  const c = G.car, s = c.sim;
  if (!G.meter) { el.hidden = true; return; }
  el.hidden = false;
  if (G.meter.tool === 'multimetro') {
    const v = c.cfg && c.cfg.power ? s.V : (c.slots.bateria.item ? 11.9 + 0.8 * c.slots.bateria.item.soc : 0);
    const k = s.running ? (v >= 13.8 ? 'Cargando bien (13.8–14.4 V)' : 'NO está cargando: el alternador debería dar 13.8–14.4 V') : s.starterOn || s.cranking || G.starter ? (v < 9.6 ? 'Al dar marcha cae debajo de 9.6 V: la batería ya no tiene fuerza' : 'Voltaje de marcha normal (más de 9.6 V)') : (v >= 12.5 ? 'Batería cargada (12.6 V es 100%)' : v >= 12.2 ? 'Batería a media carga' : 'Batería descargada');
    el.innerHTML = `<span class="lv">${v.toFixed(2)} V</span><span class="lk">${esc(k)}</span>`;
  } else if (G.meter.tool === 'manoGas') {
    el.innerHTML = `<span class="lv">${s.fp.toFixed(2)} bar</span><span class="lk">${s.fp > 2.9 ? 'Presión correcta (3.0–3.5 bar)' : s.fp > 0.5 ? 'Presión residual / baja' : 'Sin presión: ya se puede abrir el riel'}</span>`;
  } else if (G.meter.tool === 'compresimetro' && G.comp) {
    el.innerHTML = `<span class="lv">${G.comp.peak.toFixed(1)} bar</span><span class="lk">${G.comp.peak < 1 ? 'Mantén MARCHA unos segundos' : G.comp.peak >= 11.5 ? 'Compresión sana (12–14 bar)' : G.comp.peak >= 9 ? 'Compresión baja' : 'Compresión muy baja: anillos, válvulas o empaque'}</span>`;
  }
}

/* ---------- controles y botones ---------- */
function syncButtons() {
  const c = G.car || { lift: false };
  const pista = G.view === 'pista', mundo = G.view === 'mundo';
  $('#ctlBox').hidden = pista || mundo; $('#raceBox').hidden = !pista; $('#selbar').hidden = pista || mundo; $('.belt-wrap').hidden = pista || mundo;
  $('#mundoBox').hidden = true; $('#mundoUI').hidden = !mundo;
  $('#hudDash').hidden = mundo || pista;
  $('.screen').classList.toggle('tall', mundo);
  const td = G.view === 'cofre' || G.view === 'abajo' || G.view === 'banco';
  $('#bDoors').classList.toggle('on', !!(G.car && G.car.open && G.car.open.doors)); $('#bTrunk').classList.toggle('on', !!(G.car && G.car.open && G.car.open.trunk));
  $('#camHint').textContent = G.view === 'banco' ? 'Toca una pieza del motor • arrastra para girar • pellizca para acercar' : 'Arrastra para girar • pellizca para acercar • toca una pieza';
  $('#cv').hidden = (td && R3.ok) || pista || mundo; $('#cv3').hidden = !((td && R3.ok) || pista || mundo);
  $('#camHint').hidden = !(td && R3.ok);
  $('#kOff').classList.toggle('on', G.key === 0);
  $('#kOn').classList.toggle('on', G.key >= 1);
  $('#bLift').querySelector('span').textContent = c.lift ? 'Bajar' : 'Subir';
  $('#bLift').classList.toggle('on', c.lift);
  $('#bDyno').classList.toggle('on', G.dyno);
  $('#bLabels').classList.toggle('on', G.labels);
  $('#bLabels').hidden = G.view !== 'corte';
  $('#labBox').hidden = G.mode !== 'lab';
}
function syncViews() {
  $$('.vtab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === G.view)));
  document.body.dataset.view = G.view;
  if (G.view === 'cofre' || G.view === 'abajo' || G.view === 'banco') setView3D(G.view);
  if (G.view !== 'mundo' && typeof MUNDO !== 'undefined' && MUNDO.mode === 'auto') exitCar();
  if (G.view === 'mundo') { G.thr = 0; G.full = false; startMundo(); }
  if (['cofre', 'abajo', 'corte', 'banco'].includes(G.view) && G.car) putOnLift(G.car);
  if (G.view === 'pista') { if (RACE.state !== 'run' && RACE.state !== 'stage') { RACE.state = 'menu'; RACE.V = null; } renderRaceBox(); }
  else if (RACE.V && RACE.state !== 'menu') { RACE.state = 'menu'; RACE.V = null; G.full = false; }
  syncButtons();
}

function onAction(act, el) {
  const id = G.sel;
  const uid = el && el.dataset.uid ? Number(el.dataset.uid) : 0;
  switch (act) {
    case 'step': doStep(el.dataset.step); return;
    case 'proc': startProc(el.dataset.proc); return;
    case 'cancelproc': G.car.proc = null; refreshAll(); return;
    case 'mount': { const i = G.engines.findIndex(e => e.uid === uid); if (i < 0) return; const nt = installCheckEngine(G.car, G.engines[i]); if (nt.length) { toast(nt[0].text, 'warn'); return; } if (!G.upg.has('pluma')) { toast('Necesitas la pluma para motor (Negocio → Mejoras).', 'warn'); return; } const eng = G.engines.splice(i, 1)[0]; startProc('meterMotor', { eng }); return; }
    case 'mountcaja': { const i = G.cajas.findIndex(e => e.uid === uid); if (i < 0) return; const nt = installCheckCaja(G.car, G.cajas[i]); if (nt.length) { toast(nt[0].text, 'warn'); return; } if (!G.upg.has('pluma')) { toast('Necesitas el gato de transmisión (Negocio → Mejoras → pluma).', 'warn'); return; } const caja = G.cajas.splice(i, 1)[0]; startProc('meterCaja', { caja }); return; }
    case 'mod': payMod(el.dataset.mod, +el.dataset.size); return;
    case 'flash': flashECU(); return;
    case 'reflash': reflash(); return;
    case 'work': { const c = G.cars.find(x => x.uid === uid); if (!c) return; if (G.car && G.car.sim.om > 1) { toast('Apaga el motor del auto actual.', 'warn'); return; } setCar(c); putOnLift(c); G.view = 'cofre'; syncViews(); refreshAll(); return; }
    case 'sell': sellCar(uid); return;
    case 'paint': paintCar(uid, el.dataset.col); return;
    case 'sellmotor': sellPart('motor', uid); return;
    case 'sellcaja': sellPart('caja', uid); return;
    case 'buyauto': buyListing('auto', +el.dataset.i); return;
    case 'buymotor': buyListing('motor', +el.dataset.i); return;
    case 'buycaja': buyListing('caja', +el.dataset.i); return;
    case 'closeday': closeDay(); return;
    case 'hire': hire(uid); return;
    case 'fire': fireEmp(uid); return;
    case 'upg': buyUpg(el.dataset.k); return;
    case 'racego': raceStart(); return;
    case 'racemenu': RACE.state = 'menu'; RACE.V = null; renderRaceBox(); return;
    case 'raceexit': RACE.state = 'menu'; RACE.V = null; G.full = false; G.view = 'cofre'; syncViews(); return;
    case 'shiftup': raceShift(1); return;
    case 'shiftdn': raceShift(-1); return;
    case 'remove': doRemove(id); break;
    case 'connect': doInstall(id, null); break;
    case 'measure': doMeasure(id); break;
    case 'details': openSheet('pieza'); break;
    case 'install': doInstall(id, Number(el.dataset.uid)); break;
    case 'fill-aceite': addFluid('aceite'); break;
    case 'fill-refrigerante': addFluid('refrigerante'); break;
    case 'shop': buy(el.dataset.type); break;
    case 'buy': buy(el.dataset.type); break;
    case 'buytool': buyTool(el.dataset.tool); break;
    case 'deliver': deliver(); break;
    case 'hint': if (G.mode === 'taller') { G.money -= 100; refreshStats(); } toast('El maestro dice: ' + G.job.def.pista, 'info'); break;
    case 'clear': if (G.car.sim.ecuOn) { G.car.ecu.codes = {}; G.car.ecu.timers = {}; G.car.sim.misWin = G.car.sim.misWin.map(() => []); G.car.sim.misCount = G.car.sim.misCount.map(() => 0); toast('Códigos borrados. Si la falla sigue, van a volver.', 'info'); refreshPanel(true); } break;
    case 'scrap': {
      const old = G.bench.filter(b => !b.shop && !PARTS[b.type].consumable);
      const val = Math.round(old.reduce((a, b) => a + (PARTS[b.type].price || 0) * 0.05, 0));
      G.bench = G.bench.filter(b => b.shop || PARTS[b.type].consumable);
      if (G.mode === 'taller') G.money += val;
      toast(`Chatarra vendida: ${fmt$(val)}`, 'info'); refreshAll(); break;
    }
    case 'gap': {
      const b = G.bench.find(x => x.uid === Number(el.dataset.uid)); if (!b) break;
      b.seen = true;
      let txt = b.health < 0.3 ? 'Electrodo redondeado y con carbón negro. Ya no sirve.' : b.health < 0.6 ? 'Electrodo gastado, color café oscuro.' : 'Electrodo con buen filo, color café claro: combustión sana.';
      if (G.tools.has('calibrador')) { b.gapSeen = true; txt += ` Calibración: ${b.gap.toFixed(2)} mm (debe ser 0.8).`; }
      else txt += ' Para medir la separación necesitas calibrador de lainas.';
      b.notes = [txt]; toast(txt, 'info'); refreshPanel(true); break;
    }
    case 'pad': { const b = G.bench.find(x => x.uid === Number(el.dataset.uid)); if (!b) break; b.thickSeen = true; b.seen = true; toast(`Balatas: ${b.thick.toFixed(1)} mm.`, 'info'); refreshPanel(true); break; }
    case 'inspect': {
      const b = G.bench.find(x => x.uid === Number(el.dataset.uid)); if (!b) break;
      b.seen = true;
      let txt;
      if (b.type === 'termostato') txt = b.stuck ? `En agua caliente no se mueve: pegado ${b.stuck}.` : 'En agua caliente abre a 88 °C. Sirve.';
      else if (b.type === 'bobina') txt = 'En la mesa no se puede probar. Pruébala cambiándola de cilindro.';
      else if (b.type === 'marcha') txt = b.health < 0.4 ? 'Carbones gastados y el solenoide quemado.' : 'Carbones y bendix en buen estado.';
      else if (b.type === 'alternador') txt = b.health < 0.5 ? 'El regulador está quemado y los diodos huelen a quemado.' : 'Gira suave, sin ruido de baleros.';
      else if (b.type === 'turbo') txt = b.health < 0.4 ? 'Juego radial excesivo, aspas raspadas y aceite en ambos lados.' : 'Gira libre, sin juego.';
      else if (b.type === 'sensorO2') txt = b.health < 0.5 ? 'Punta cubierta de hollín blanco: respuesta lenta.' : 'Punta limpia.';
      else txt = visualReport(null, b);
      b.notes = [txt]; toast(txt, 'info'); refreshPanel(true); break;
    }
  }
}

/* ---------- bucle principal ---------- */
let lastT = 0, dashT = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
  lastT = ts;
  G.t += dt;
  const c = G.car;
  if (!c) {
    if (G.view === 'mundo' && R3.ok) { mundoTick(dt); frameMundo(dt); }
    else if (R3.ok && (G.view === 'cofre' || G.view === 'abajo')) { R3.renderer.clear(); }
    requestAnimationFrame(loop); return;
  }
  SLOTS = c.defs;
  const s = c.sim;
  // acelerador
  const target = G.full ? 1 : G.thr;
  G.thrNow += (target - G.thrNow) * Math.min(1, dt * 12);
  if (G.key === 0) G.starter = false;
  const racing = G.view === 'pista' && RACE.V && RACE.state !== 'menu';
  if (racing) raceTick(dt);
  const mundoV = G.view === 'mundo' && R3.ok ? mundoTick(dt) : null;
  const inp = { key: G.key, starter: G.starter && G.key >= 1, thr: G.thrNow, dyno: G.dyno && G.upg.has('dinamo') || (G.dyno && G.mode === 'lab'), veh: racing ? RACE.V : (mundoV && MUNDO.car === c ? mundoV : null) };
  if (inp.starter && c.cfg && c.cfg.block && !s.running) { toast(c.cfg.block, 'warn'); G.starter = false; inp.starter = false; }
  simFrame(c, inp, dt);
  if (racing && RACE.state === 'stage' && RACE.V) { RACE.V.v = 0; RACE.V.x = 0; RACE.V.locked = false; }
  if (mundoV) mundoAfterSim(dt);
  // eventos del motor
  for (const e of s.events) handleEvent(e);
  s.events.length = 0;
  // ocupado (quitando/instalando)
  if (G.busy) {
    G.busy.t += dt; G.busy.tick += dt;
    if (G.busy.tick > 0.14) { G.busy.tick = 0; AUDIO.blip('ratchet'); }
    if (G.busy.t >= G.busy.dur) { const b = G.busy; G.busy = null; b.done(); }
  }
  torqueTick(dt);
  if (c.engId && !c.proc && !has(c, 'tapon') && c.oil.level <= 0.11 && !G.drainMsg) { G.drainMsg = true; toast('Ya terminó de escurrir el aceite. Pon el tapón con arandela nueva.', 'info'); }
  if (has(c, 'tapon')) G.drainMsg = false;
  // compresímetro
  if (G.comp && s.cranking) {
    const i = G.comp.cyl;
    const crankF = Math.min(1, s.om * 9.5493 / 230);
    G.comp.peak = Math.max(G.comp.peak, 13.4 * (c.cfg.comp[i] > 0 ? 1 : 0) * crankF * (1 - Math.min(0.6, c.dmg.hg * 0.8) * (i === 1 || i === 2 ? 1 : 0)) * (1 - c.dmg.knock * 0.5));
  }
  // visual
  const realStep = s.om * dt;
  const maxStep = 0.55;
  G.slow = realStep > maxStep ? realStep / maxStep : 1;
  G.thv += Math.min(realStep, maxStep);
  G.turboAng += Math.min(s.wt * dt * 0.02, 0.9);
  G.beltPos += s.om * dt * 1.2;
  if (G.view === 'corte' || !R3.ok && G.view !== 'pista') { stepFx(G, dt); resizeDraw(); render(G); }
  else if (G.view === 'pista') { frameRace(dt); updateRaceHud(); }
  else if (G.view === 'mundo') { frameMundo(dt); }
  else { R3.view = G.view; frame3D(G, dt); }
  // audio
  if (AUDIO.on) {
    const cfg = c.cfg || {};
    AUDIO.send({
      rpm: s.om * 9.5493, amps: s.running ? s.cylAmp.map((a, i) => s.cylMis[i] ? 0 : Math.max(0.15, a)) : s.cylAmp.map(() => 0),
      fires: cfg.E ? cfg.E.offs.map(o => o / FOURPI) : undefined, big: cfg.E ? Math.min(1.6, Math.pow(cfg.E.k, 0.35)) : 1, low: cfg.E ? (cfg.E.n >= 8 ? 0.8 : cfg.E.n >= 6 ? 0.9 : 1) : 1,
      popN: s.popT,
      thr: G.thrNow, turbo: s.wt * 9.5493 / 1000, boost: (s.Pc - PH.Pa) / 1e5, starter: s.starterOn ? 1 : 0,
      squeal: s.om > 5 ? (cfg.squeal || 0) * (s.starterOn || Math.abs(s.tqAvg) > 60 || s.runTime < 3 ? 1 : 0.35) : 0,
      hiss: s.mLeak > 0.003 && s.Pc > PH.Pa + 5000 ? Math.min(1, s.mLeak * 25) : 0,
      flutter: cfg.bov === 2 ? s.surge : 0, rodKnock: c.dmg.bear > 0.25 && s.running ? c.dmg.bear : 0,
      run: s.running ? 1 : 0, broken: cfg.turbo && cfg.turboH < 0.35 ? 1 : 0,
      bovN: Math.floor(s.bovT * 4), knockN: s.knockT, clickN: s.clickT,
    });
  }
  dashT += dt;
  if (dashT > 0.1) {
    dashT = 0; updateDash();
    if (G.tab === 'escaner') { if (s.ecuOn !== G.lastEcu || Object.keys(c.ecu.codes).join() !== ($('#p-escaner').dataset.k || '')) { G.lastEcu = s.ecuOn; renderEscaner(true); } else updateLive(); }
    if (inp.dyno && G.thrNow > 0.95 && s.running) recordDyno();
    warnings();
    if (G.view === 'abajo' || G.tab === 'pieza') { const sig = c.oil.level.toFixed(1) + c.cool.level.toFixed(2); if (sig !== G.fsig) { G.fsig = sig; } }
  }
  requestAnimationFrame(loop);
}
function handleEvent(e) {
  if (e.type === 'dtc') { caption('dtc' + e.data, `Se prendió el check engine: ${e.data}`, true); if (G.tab === 'escaner') renderEscaner(true); }
  if (e.type === 'coking') caption('coking', `Apagaste con el turbo a ${Math.round(e.data.peak)} °C: el aceite se quemó en el eje. Déjalo 1 minuto en ralentí antes de apagar.`, false);
  if (e.type === 'seize') { caption('seize', '¡El motor se desvieló! Se quedó sin aceite.', false); vibrate(400); }
}
function warnings() {
  const s = G.car.sim, c = G.car;
  if (s.running && s.oilP < 0.4 && s.om > 60) caption('oilp' + Math.floor(G.t / 6), '¡Sin presión de aceite! Apágalo ya.', true);
  if (s.ECT > 112) caption('hot' + Math.floor(G.t / 8), `¡Se está calentando: ${Math.round(s.ECT)} °C! Apágalo.`, true);
  if (G.view === 'pista' || G.view === 'mundo') return;
  if (s.running && (s.Pc - PH.Pa) > 30e3) caption('boost', 'Los gases de escape empujan la turbina; la turbina gira el compresor y mete aire a presión.');
  if (s.running && s.wg > 0.2) caption('wg', 'La wastegate abrió: desvía escape para que el turbo no se pase de presión.');
  if (s.time - s.bovT < 0.1 && s.bovT > 0) caption('bov', '¡Psshh! La válvula de alivio sacó el aire a presión al soltar el acelerador.');
  if (s.time - s.knockT < 0.1) caption('knock', '¡Cascabeleo! La computadora atrasó la chispa para proteger los pistones.');
  if (c.cfg && c.cfg.squeal > 0.4 && s.running) caption('squeal', 'Ese rechinido es la banda patinando en las poleas.');
  if (s.running && s.smoke.b > 0.3) caption('blue', 'Humo azul: el motor está quemando aceite.');
  if (s.running && s.smoke.w > 0.4) caption('white', 'Humo blanco espeso y dulce: está quemando refrigerante.');
}
function recordDyno() {
  const s = G.car.sim, rpm = s.om * 9.5493;
  const last = G.dynoPts[G.dynoPts.length - 1];
  if (!last || rpm - last.rpm > 120) {
    if (last && rpm < last.rpm) G.dynoPts = [];
    G.dynoPts.push({ rpm, tq: Math.max(0, s.tqAvg), hp: s.hp });
    drawDyno();
  }
}
function drawDyno() {
  const box = $('#dynoBox'); box.hidden = G.dynoPts.length < 3;
  const cv = $('#dynoCv'); const x = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  x.fillStyle = '#16181d'; x.fillRect(0, 0, w, h);
  x.strokeStyle = '#2a2f37'; x.lineWidth = 1;
  for (let r = 1000; r <= 7000; r += 1000) { const px = (r / 7000) * w; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
  for (let v = 50; v <= 250; v += 50) { const py = h - v / 260 * h; x.beginPath(); x.moveTo(0, py); x.lineTo(w, py); x.stroke(); }
  const plot = (k, col) => { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); G.dynoPts.forEach((p, i) => { const px = p.rpm / 7000 * w, py = h - p[k] / 260 * h; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); };
  plot('tq', '#f0b429'); plot('hp', '#5aa9e6');
  const mt = G.dynoPts.reduce((a, p) => p.tq > a.tq ? p : a, { tq: 0, rpm: 0 });
  const mh = G.dynoPts.reduce((a, p) => p.hp > a.hp ? p : a, { hp: 0, rpm: 0 });
  $('#dynoPeak').textContent = `Torque máx ${mt.tq.toFixed(0)} N·m @ ${mt.rpm.toFixed(0)} rpm · Potencia máx ${mh.hp.toFixed(0)} hp @ ${mh.rpm.toFixed(0)} rpm`;
}

/* ---------- arranque ---------- */
function startGame(mode) {
  G.mode = mode === 'lab' ? 'lab' : 'taller';
  G.tools = new Set(Object.keys(TOOLS).filter(t => TOOLS[t].start));
  G.bench = []; G.cars = []; G.engines = []; G.cajas = []; G.emps = []; G.cands = []; G.upg = new Set(); G.day = 1; G.job = null;
  if (mode === 'lab') {
    G.tools = new Set(Object.keys(TOOLS)); G.money = 0; G.rep = 5; G.jobN = 0;
    G.upg = new Set(Object.keys(MEJORAS));
    for (const m of ['torque', 'halcon', 'clasico']) { const c = newCar(m); c.owner = 'mio'; c.oil.quality = 0.95; G.cars.push(c); }
    G.engines.push(makeEngine('i4_20t'), makeEngine('v8_50'));
    G.cajas.push(makeCaja('m6f'), makeCaja('seq6'));
    for (const t of ['turboGrande', 'inyectorAlto', 'inyectorAlto', 'inyectorAlto', 'inyectorAlto', 'filtroAlto']) G.bench.push(newItem(t, { shop: true, cost: 0 }));
    setCar(G.cars[0]);
    genMarket(); genCands();
    G.view = 'cofre';
  } else {
    const d = load();
    if (d && mode === 'continuar') restore(d);
    else {
      G.money = 9000; G.rep = 3; G.jobN = 0;
      G.bench.push(newItem('aceite', { shop: true, cost: PARTS.aceite.price }));
      genMarket(); genCands();
      newJob();
    }
    G.view = 'cofre';
  }
  $('#start').hidden = true;
  G.view = 'mundo'; MUNDO.carKey = ''; MUNDO.p = { x: 0, z: 18 * MW, h: Math.PI };
  syncViews(); refreshAll(); setTab(mode === 'lab' ? 'autos' : 'orden'); closeSheet();
  save();
}

function bind() {
  // vistas
  $$('.vtab').forEach(b => b.onclick = () => { G.view = b.dataset.view; syncViews(); });
  $$('.tab').forEach(b => b.onclick = () => { setTab(b.dataset.tab); $$('.dbtn').forEach(x => x.classList.toggle('on', x.dataset.sheet === G.tab)); });
  $$('.dbtn').forEach(b => b.onclick = () => { if (!$('#sheet').hidden && G.tab === b.dataset.sheet) closeSheet(); else openSheet(b.dataset.sheet); });
  $('#sheetClose').onclick = closeSheet;
  $('#hudDash').onclick = e => { if (e.target.closest('canvas')) return; $('#hudDash').classList.toggle('full'); };
  // lienzo
  const cv = $('#cv');
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (G.view === 'corte') {
      const h = hitCorte(x, y);
      if (!h) return;
      if (h.cyl !== undefined) { G.cyl = h.cyl; return; }
      selectSlot(h.slot === 'buj' ? 'buj' + (G.cyl + 1) : h.slot);
      return;
    }
    const id = hitTest(G, x, y);
    if (id) { selectSlot(id); AUDIO.blip('ratchet'); }
  });
  // acciones delegadas
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (b) { onAction(b.dataset.act, b); return; }
    const t = e.target.closest('[data-tool]'); if (t && t.classList.contains('tool')) selectTool(t.dataset.tool);
  });
  // llave
  $('#kOff').onclick = () => { G.key = 0; syncButtons(); };
  $('#kOn').onclick = () => { G.key = 1; syncButtons(); };
  R3.onTap = (nx, ny) => {
    if (G.view === 'pista') return;
    const id = pick3D(nx, ny, G.view);
    if (id) { selectSlot(id); setSelected3D(id); AUDIO.blip('ratchet'); }
  };
  const hold = holdBtn;
  const _unused = (el, on, off) => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { } on(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, off));
    el.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); on(); } });
    el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') off(); });
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  hold($('#kStart'), () => { if (G.key === 0) G.key = 1; G.starter = true; syncButtons(); $('#kStart').classList.add('on'); }, () => { G.starter = false; $('#kStart').classList.remove('on'); });
  hold($('#kFull'), () => { G.full = true; $('#kFull').classList.add('on'); }, () => { G.full = false; $('#kFull').classList.remove('on'); });
  $('#thr').oninput = e => { G.thr = e.target.value / 100; $('#thrV').textContent = e.target.value + '%'; };
  $('#bLift').onclick = () => {
    const c = G.car;
    if (G.dyno) { toast('Primero quita el auto del dinamómetro.', 'warn'); return; }
    if (c.lift && (!has(c, 'ruedaI') || !has(c, 'ruedaD'))) { toast('No bajes el auto sin ruedas.', 'bad'); return; }
    c.lift = !c.lift; if (!c.lift && c.pan) { c.pan = false; if (c.oil.pan > 0) toast(`Retiraste la charola con ${c.oil.pan.toFixed(1)} L de aceite usado.`, 'info'); c.oil.pan = 0; }
    G.view = c.lift ? 'abajo' : G.view === 'abajo' ? 'cofre' : G.view; syncViews(); refreshAll();
  };
  $('#bDyno').onclick = () => {
    if (G.car.lift) { toast('Baja el elevador para subir el auto al dinamómetro.', 'warn'); return; }
    G.dyno = !G.dyno; G.dynoPts = []; $('#dynoBox').hidden = true;
    toast(G.dyno ? 'Auto en el dinamómetro (en 4ta velocidad). Acelera a fondo para medir torque y potencia.' : 'Auto fuera del dinamómetro.', 'info');
    syncButtons();
  };
  $('#bLabels').onclick = () => { G.labels = !G.labels; syncButtons(); };
  const toggleOpen = k => { const c = G.car; if (!c) return; c.open = c.open || {}; c.open[k] = !c.open[k]; if (G.view !== 'cofre' && G.view !== 'abajo') { G.view = 'cofre'; syncViews(); } R3.orbit.yaw = k === 'doors' ? 1.15 : 2.5; R3.orbit.pitch = k === 'doors' ? 0.35 : 0.55; R3.orbit.dist = k === 'doors' ? 820 : 760; R3.focusZ = k === 'doors' ? -220 : -560; syncButtons(); };
  $('#bDoors').onclick = () => toggleOpen('doors');
  $('#bTrunk').onclick = () => toggleOpen('trunk');
  $('#bWait').onclick = () => {
    const s = G.car.sim;
    if (s.om > 1) { toast('Apaga el motor para esperar a que enfríe.', 'warn'); return; }
    fastCool(G.car, 300); toast(`Pasaron 5 minutos. Motor a ${Math.round(s.ECT)} °C.`, 'info');
  };
  $('#btnSound').onclick = async () => {
    if (AUDIO.on) { AUDIO.stop(); $('#btnSound').setAttribute('aria-pressed', 'false'); $('#btnSound').setAttribute('aria-label', 'Sonido apagado'); toast('Sonido apagado', 'info'); }
    else { const ok = await AUDIO.start(); $('#btnSound').setAttribute('aria-pressed', String(ok)); $('#btnSound').setAttribute('aria-label', ok ? 'Sonido encendido' : 'Sin sonido'); toast(ok ? 'Sonido encendido' : 'Este navegador no permite sonido', 'info'); }
  };
  $('#btnMenu').onclick = () => { $('#start').hidden = false; renderStart(); };
  // torquímetro
  const tqBtn = $('#tqPress');
  hold(tqBtn, () => tqPress(true), () => tqPress(false));
  $('#tqCv').addEventListener('pointerdown', e => {
    const T = G.tqm; if (!T) return;
    const r = e.target.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 160, y = (e.clientY - r.top) / r.height * 160;
    let best = -1, bd = 1e9;
    T.pos.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = i; } });
    if (bd < 30) tqSelectBolt(best);
  });
  $('#tqDone').onclick = () => closeTorque(false);
  $('#tqCancel').onclick = () => closeTorque(true);
  // laboratorio
  $('#wgSpring').oninput = e => { if (G.car && G.car.ecu.tune) G.car.ecu.tune.boost = e.target.value / 100; $('#wgV').textContent = (e.target.value / 100).toFixed(2) + ' bar'; };
  // teclado
  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (G.view === 'mundo') return;
    if (e.key === 'w' || e.key === 'ArrowUp') { G.full = true; }
    if (G.view === 'pista' && (e.key === 'e' || e.key === 'ArrowRight') && !e.repeat) raceShift(1);
    if (G.view === 'pista' && (e.key === 'q' || e.key === 'ArrowLeft') && !e.repeat) raceShift(-1);
    if (e.key === 's' && !e.repeat) { if (G.key === 0) G.key = 1; G.starter = true; syncButtons(); }
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'w' || e.key === 'ArrowUp') G.full = false;
    if (e.key === 's') G.starter = false;
  });
}
function renderStart() {
  const d = load();
  $('#startActions').innerHTML = `
    ${d ? `<button class="btn primary big" data-start="continuar">Continuar (${fmt$(d.money)})</button>` : ''}
    <button class="btn ${d ? '' : 'primary'} big" data-start="taller">Abrir el taller${d ? ' (nuevo)' : ''}</button>
    <button class="btn big" data-start="lab">Laboratorio del turbo</button>`;
  $$('[data-start]').forEach(b => b.onclick = () => startGame(b.dataset.start));
}

function holdBtn(el, on, off) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (er) { } on(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, off));
  el.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); on(); } });
  el.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') off(); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}
window.addEventListener('DOMContentLoaded', () => {
  initDraw($('#cv'));
  init3D($('#cv3'));
  bindMundo();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|artifact/.test(location.hostname)) { try { navigator.serviceWorker.register('sw.js'); } catch (e) { } }
  buildPaths();
  buildDash();
  bind();
  G.tools = new Set(Object.keys(TOOLS).filter(t => TOOLS[t].start));
  setCar(newCar('torque'));
  G.cars = [G.car];
  renderStart();
  refreshAll();
  requestAnimationFrame(loop);
});
