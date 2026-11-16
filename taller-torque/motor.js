'use strict';
/* =====================================================================
   TALLER TORQUE · simulador del motor
   Modelo 0-D de un 4 cilindros 1.6 L turbo, orden de encendido 1-3-4-2.
   - Aire: flujo compresible por orificio (mariposa, fugas, BOV),
     llenado del múltiple y de la tubería de presión (boost).
   - Turbo: balance de potencia turbina/compresor sobre el eje.
   - Combustión: evento por cilindro con su aire, su gasolina y su chispa.
   - Cigüeñal: inercia, fricción (FMEP), bombeo, marcha y alternador.
   - Aceite, refrigerante, batería y computadora (ajustes y códigos OBD-II).
   Calor ×10 y carga de batería ×15 más rápidos que en la vida real.
   ===================================================================== */

const PH = {
  Vd: 1.6e-3, R: 287, cp: 1005, cpx: 1150, Pa: 101325, Ta: 298,
  I: 0.16, LHV: 44e6, Vman: 2.6e-3, Vchg: 4.5e-3, It: 3.2e-5,
  Nref: 15700, Ath: 1.9e-3, HEAT_X: 10, BAT_X: 15, DT: 1 / 3000,
};
const FOURPI = 4 * Math.PI;
const OFFS = [0, 3 * Math.PI, Math.PI, 2 * Math.PI]; // cil 1,2,3,4 → 1-3-4-2

let UID = 0;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function orifice(Pu, Pd, A, Tu) {
  if (A <= 0) return 0;
  let s = 1;
  if (Pd > Pu) { const t = Pu; Pu = Pd; Pd = t; s = -1; }
  const pr = Pd / Pu;
  let psi;
  if (pr <= 0.528) psi = 0.6847;
  else if (pr >= 0.95) psi = 0.3075 * (1 - pr) / 0.05;
  else psi = Math.sqrt(7 * (Math.pow(pr, 1.4286) - Math.pow(pr, 1.7143)));
  return s * 0.8 * A * Pu / Math.sqrt(PH.R * Tu) * psi;
}

function VE(rpm) {
  const k = (rpm - 4300) / 2700;
  return 0.70 + 0.21 * Math.exp(-k * k);
}

function newItem(type, extra) {
  const it = { uid: ++UID, type, health: 1 };
  if (type === 'bateria') it.soc = 0.95;
  if (type === 'bujia') it.gap = 0.8;
  if (type === 'balata') it.thick = 11;
  if (type === 'tapon') it.washer = 'nueva';
  if (type === 'termostato') it.stuck = null;
  return Object.assign(it, extra || {});
}

function newSim() {
  return {
    om: 0, th: 0, Pm: PH.Pa, Pc: PH.Pa, Tm: PH.Ta, mc: 0, wt: 0, T3: PH.Ta, T3t: PH.Ta,
    Tt: PH.Ta, Tb: PH.Ta, ECT: 22, Toil: 22, fp: 2.4, iacI: 0, stft: 0, ltft: 0,
    lamAvg: 1, lamS: 1, retard: 0, V: 12.6, Ibat: 0, altI: 0, altP: 0,
    cylTq: [0, 0, 0, 0], cylAmp: [0, 0, 0, 0], cylMis: [false, false, false, false],
    lastFire: [0, 0, 0, 0], prevPhi: [0, 0, 0, 0], misWin: [[], [], [], []],
    running: false, cranking: false, ecuOn: false, pumpPrime: 0, cut: false, dfco: false,
    wg: 0, bovOpen: false, surge: 0, oilP: 0, mfAcc: 0, fuelRate: 0, frAcc: 0,
    tq: 0, tqAvg: 0, hp: 0, knockT: -9, clickT: -9, bovT: -9, runTime: 0, time: 0,
    smoke: { b: 0, w: 0, k: 0 }, fanOn: false, mThr: 0, mEng: 0, mBov: 0, mLeak: 0,
    starterTq0: 0, starterOn: false, iac: 2e-5, revAcc: 0, misCount: [0, 0, 0, 0],
    events: [], warn: '',
  };
}

function newCar() {
  const c = { slots: {}, oil: { level: 3.85, quality: 0.75, pan: 0, floor: 0 }, cool: { level: 1 },
    pan: false, lift: false, dmg: { bear: 0, knock: 0, hg: 0, elec: 0 }, seized: false,
    ecu: { codes: {}, timers: {} }, wgSpring: 70e3, sim: newSim(), km: 0, log: [] };
  for (const id in SLOTS) {
    const d = SLOTS[id];
    if (d.conn) c.slots[id] = { on: true, tq: { lo: 1, hi: 1, ok: true } };
    else if (d.check) c.slots[id] = {};
    else c.slots[id] = { item: newItem(d.type), tq: { lo: 1, hi: 1, ok: true } };
  }
  return c;
}

/* Lo que el motor "ve" de las piezas instaladas, una vez por cuadro */
function config(c) {
  const S = c.slots;
  const it = id => S[id].item;
  const loose = id => S[id].tq && S[id].tq.lo < 0.7;
  const stripped = id => S[id].tq && S[id].tq.hi > 1.45;
  const cfg = { block: '' };
  const bat = it('bateria');
  cfg.bat = bat;
  cfg.power = !!(S.batNeg.on && S.batPos.on && bat);
  cfg.fuelFuse = !!it('fusGas');
  cfg.fanFuse = !!it('fusVent');
  const fa = it('filtroAire');
  cfg.filterR = fa ? 1 + 14 * Math.pow(1 - fa.health, 2) : 0.5;
  cfg.noFilter = !fa || !it('tuboAdm');
  let leak = 0;
  for (const h of ['mangIcCal', 'mangIcFria']) {
    const m = it(h);
    if (!m) leak += 2.6e-3;
    else { if (m.health < 0.6) leak += (0.6 - m.health) * 1.8e-3; if (loose(h)) leak += 3e-4; }
  }
  if (!it('tuboAdm')) leak += 0;
  cfg.leakA = leak;
  const bov = it('bov');
  cfg.bov = bov ? (bov.health > 0.4 ? 1 : 2) : 0;
  if (!bov) cfg.leakA += 1.4e-3;
  const tb = it('turbo');
  cfg.turbo = !!tb;
  cfg.turboH = tb ? tb.health : 0;
  cfg.turboEff = tb ? (0.5 + 0.5 * Math.min(1, tb.health / 0.55)) * (loose('turbo') ? 0.8 : 1) : 0;
  cfg.turboFric = tb ? 1 + 6 * (1 - tb.health) : 1;
  cfg.turboOil = !!it('lineaTurbo');
  cfg.icEff = 0.75;
  cfg.coil = []; cfg.plug = []; cfg.gapErr = []; cfg.comp = []; cfg.inj = [];
  const rail = it('riel');
  for (let i = 0; i < 4; i++) {
    const co = it('bob' + (i + 1)), pl = it('buj' + (i + 1)), inj = it('iny' + (i + 1));
    cfg.coil[i] = co ? co.health * (loose('bob' + (i + 1)) ? 0.85 : 1) : 0;
    cfg.plug[i] = pl ? pl.health : 0;
    cfg.gapErr[i] = pl ? Math.abs(pl.gap - 0.8) : 0;
    let comp = pl ? 1 : 0;
    if (pl && loose('buj' + (i + 1))) comp *= 0.72;
    if (pl && stripped('buj' + (i + 1))) comp *= 0.8;
    if (i === 1 || i === 2) comp *= 1 - Math.min(0.6, c.dmg.hg * 0.8);
    comp *= 1 - Math.min(0.5, c.dmg.knock * 0.5);
    cfg.comp[i] = comp;
    cfg.inj[i] = rail && inj ? inj.health : 0;
  }
  cfg.rail = !!rail;
  const belt = it('banda');
  cfg.belt = belt ? (belt.health < 0.2 ? 0.7 : belt.health < 0.4 ? 0.85 : 1) : 0;
  cfg.squeal = belt ? clamp((0.5 - belt.health) * 2.2, 0, 1) : 0;
  const alt = it('alternador');
  cfg.altH = alt ? alt.health * (loose('alternador') ? 0.8 : 1) : -1;
  const th = it('termostato');
  cfg.thermo = th ? (th.stuck || 'ok') : 'none';
  cfg.radCap = !!it('tapaRad');
  cfg.oilCap = !!it('tapaAceite');
  cfg.tapon = it('tapon');
  cfg.taponLeak = !cfg.tapon ? 1 : (loose('tapon') || cfg.tapon.washer !== 'nueva') ? 0.01 : 0;
  cfg.filtro = it('filtroAceite');
  cfg.filtroLeak = !cfg.filtro ? 1 : loose('filtroAceite') ? 0.02 : 0;
  const mr = it('marcha');
  cfg.marcha = mr ? mr.health : -1;
  const o2 = it('sensorO2');
  cfg.o2 = o2 ? o2.health : -1;
  cfg.o2Leak = !o2 || loose('sensorO2');
  if (c.seized) cfg.block = 'El motor está desvielado: los metales se soldaron por falta de aceite.';
  else if (!tb) cfg.block = 'Sin turbo el escape queda abierto. Instálalo antes de dar marcha.';
  else if (!cfg.turboOil) cfg.block = 'La línea de aceite del turbo está desconectada: tirarías el aceite a presión.';
  else if (!rail) cfg.block = 'El riel de inyectores no está: habría fuga de gasolina.';
  else if (!it('iny1') || !it('iny2') || !it('iny3') || !it('iny4')) cfg.block = 'Falta un inyector: la gasolina saldría por el hueco.';
  return cfg;
}

/* ---------- Combustión de un cilindro ---------- */
function fire(c, s, cfg, i) {
  const rpm = s.om * 9.5493;
  const rho = s.Pm / (PH.R * s.Tm);
  const ve = VE(rpm);
  const ma = ve * cfg.comp[i] * rho * PH.Vd / 4;
  let mf = 0;
  const wantFuel = s.ecuOn && !s.cut && !s.dfco && !(s.limp && (i === 1 || i === 2));
  if (wantFuel && cfg.inj[i] > 0 && s.fp > 0.3) {
    const maEst = ve * rho * PH.Vd / 4;
    mf = maEst / s.afrT * (1 + s.stft + s.ltft) * cfg.inj[i] * Math.sqrt(s.fp / 3.0);
  }
  const spark = s.ecuOn && cfg.coil[i] > 0 && cfg.plug[i] > 0 && s.V > 7.5;
  let pm = 0;
  const load = Math.min(1.7, s.Pm / 115e3);
  if (spark) {
    if (cfg.coil[i] < 0.35) pm += 0.8;
    pm += Math.pow(Math.max(0, (0.45 - cfg.plug[i]) / 0.45), 1.5) * (0.15 + 0.6 * load);
    pm += Math.max(0, cfg.gapErr[i] - 0.25) * 0.5 * load;
    if (s.V < 9.5) pm += 0.3;
  }
  const lam = mf > 0 ? ma / (mf * 14.7) : 99;
  if (lam > 1.32) pm += (lam - 1.32) * 2.5;
  if (lam < 0.6) pm += 0.6;
  let E = 0, mis = false;
  if (mf > 0) {
    if (!spark || Math.random() < pm) mis = true;
    else {
      const burnt = lam < 1 ? ma / 14.7 : mf;
      const x = 1 - lam;
      const f = lam < 1 ? 1 + 0.5 * x - 2.5 * x * x : 1 + 0.08 * (lam - 1);
      const eta = 0.42 * (0.7 + 0.3 * Math.min(1, s.Pm / 100e3)) * (1 - s.retard * 0.012);
      E = burnt * PH.LHV * eta * Math.max(0, f);
      // detonación (cascabeleo)
      let risk = Math.max(0, (s.Pm - 178e3) / 60e3) * Math.max(0, (s.Tm - 312) / 25);
      if (lam > 0.98 && s.Pm > 115e3) risk += (lam - 0.95) * (s.Pm / 100e3) * 0.9;
      if (Math.random() < risk * 0.06) {
        s.knockT = s.time; s.retard = Math.min(10, s.retard + 2.5);
        if (s.retard >= 10) c.dmg.knock = Math.min(1, c.dmg.knock + 0.0015);
      }
    }
  } else if (wantFuel && cfg.inj[i] <= 0) mis = true;
  s.cylTq[i] = E / Math.PI;
  s.cylAmp[i] = clamp(E / 650, 0, 2.2);
  s.cylMis[i] = mis;
  if (E > 0 || mis) s.lastFire[i] = s.time;
  s.mfAcc += mf;
  if (mf > 0) s.lamAvg += ((mis ? Math.min(lam, 3) : lam) - s.lamAvg) * 0.15;
  // temperatura de escape objetivo
  const loadL = Math.min(1, s.Pm / 150e3);
  if (E > 0) s.T3t = s.Tm + 804 * (0.35 + 0.6 * loadL) * (lam < 1 ? 1 - 0.4 * (1 - lam) : 1) + s.retard * 15;
  else s.T3t = s.Tm + 120;
  // monitor de fallas
  if (s.ecuOn && !s.cut && !s.dfco && s.om > 40) {
    const w = s.misWin[i]; w.push(mis ? 1 : 0); if (w.length > 120) w.shift();
  }
}

/* ---------- Un cuadro de simulación ---------- */
function simFrame(c, inp, fdt) {
  const s = c.sim;
  const cfg = config(c);
  c.cfg = cfg;
  s.time += fdt;
  const rpm0 = s.om * 9.5493;
  s.rpmPrev = s.rpmNow || rpm0; s.rpmNow = rpm0;

  /* --- Eléctrico --- */
  const bat = cfg.bat;
  const keyOn = inp.key >= 1;
  const wantStart = inp.key >= 1 && inp.starter;
  let V = 0, Ibat = 0, Iload = 0, Ist = 0;
  s.starterOn = false; s.starterTq0 = 0;
  const running = s.running;
  const beltOK = cfg.belt > 0;
  let Imax = 0, Vreg = 0;
  if (running && cfg.altH > 0 && beltOK) {
    Imax = 90 * clamp((rpm0 - 300) / 1200, 0, 1) * (cfg.altH > 0.5 ? 1 : 0.35) * cfg.belt;
    Vreg = cfg.altH > 0.5 ? 14.3 : 12.1 + cfg.altH * 1.6;
  }
  if (keyOn) Iload += 8 + (s.pumpPrime > 0 || running || s.cranking ? 6 : 0) + 4 * rpm0 / 3000;
  if (s.fanOn) Iload += 18;
  if (cfg.power) {
    const OCV = 11.9 + 0.8 * clamp(bat.soc, 0, 1);
    const Rint = 0.009 + 0.045 * (1 - bat.health);
    if (wantStart) {
      if (cfg.marcha > 0.3) Ist = 170 * clamp(1 - s.om / 50, 0.3, 1) + 30;
      else if (cfg.marcha >= 0 && s.time - s.clickT > 0.35) { s.clickT = s.time; }
    }
    const It = Iload + Ist;
    let Vt;
    const Rchg = Rint * 8;
    const needAlt = It + Math.min(50 * (1.05 - bat.soc), (Vreg - OCV) / Rchg);
    if (Imax > 0 && Vreg > OCV && Imax >= needAlt) {
      Vt = Vreg; Ibat = -Math.min(50 * (1.05 - bat.soc), (Vreg - OCV) / Rchg); s.altI = It - Ibat;
    } else {
      Ibat = It - Imax; Vt = OCV - Ibat * (Ibat < 0 ? Rchg : Rint); s.altI = Imax;
      if (Vreg > 0 && Vt > Vreg) { Vt = Vreg; }
    }
    V = Math.max(0, Vt);
    // solenoide que castañetea con batería débil
    if (Ist > 0 && V < 7.6 && s.time - s.clickT > 0.18) { s.clickT = s.time; Ist = 0; V = OCV - Iload * Rint; }
    bat.soc = clamp(bat.soc - Ibat * fdt * PH.BAT_X / (45 * 3600 * Math.max(0.15, bat.health)), 0, 1);
    if (Ist > 0 && V > 7.0 && cfg.marcha > 0.3) {
      s.starterOn = true;
      s.starterTq0 = 62 * clamp((V - 7) / 5.4, 0, 1.3) * Math.min(1, cfg.marcha * 1.3);
    }
  } else {
    if (running && Imax > 0) { V = Vreg + 1.2; c.dmg.elec += fdt * 0.05; }
    else V = 0;
  }
  s.V = s.V + (V - s.V) * Math.min(1, fdt * 25);
  s.Ibat = Ibat;
  s.altP = s.altI > 0 ? (V * s.altI) / 0.55 : 0;
  s.ecuOn = keyOn && s.V > 8;

  /* --- Computadora: objetivos --- */
  if (s.ecuOn && !s.wasOn) s.pumpPrime = 2.0;
  s.wasOn = s.ecuOn;
  if (s.pumpPrime > 0) s.pumpPrime -= fdt;
  const pumpOn = s.ecuOn && cfg.fuelFuse && (s.pumpPrime > 0 || s.running || s.cranking);
  if (pumpOn) s.fp += (3.2 - s.fp) * Math.min(1, fdt * 5);
  else s.fp = Math.max(0, s.fp - fdt * (s.om > 40 ? 0.9 : 0.004));
  const thr = s.ecuOn ? clamp(inp.thr, 0, 1) : 0;
  if (rpm0 < 500) s.afrT = 11.5;
  else if (s.Pm > 105e3 || thr > 0.8) s.afrT = 12.0;
  else s.afrT = 14.7;
  if (s.ECT < 50) s.afrT *= 0.92;
  s.limp = s.ECT > 122;
  const lim = s.limp ? 3000 : 6800;
  if (rpm0 > lim) s.cut = true; else if (rpm0 < lim - 200) s.cut = false;
  if (thr < 0.01 && rpm0 > 1700 && s.running && s.ECT > 40) { s.dfco = true; s.dfcoT = s.time; }
  else if (thr > 0.01 || rpm0 < 1300) s.dfco = false;
  // ralentí: válvula de aire controlada por la computadora
  const target = s.ECT < 40 ? 1150 : 850;
  if (s.ecuOn && (s.running || s.cranking)) {
    const err = target - rpm0;
    if (s.running && thr < 0.03 && !s.dfco && Math.abs(err) < 450) s.iacI = clamp(s.iacI + err * 6e-9 * fdt, -1.5e-5, 4e-5);
    s.iac = clamp(2.1e-5 + (s.running ? err * 1.2e-8 - (rpm0 - (s.rpmPrev || rpm0)) / fdt * 1.5e-9 : 1e-5) + s.iacI, 3e-6, 9e-5);
  } else s.iac = 1.2e-5;

  /* --- Paso rápido: aire, turbo, cilindros, cigüeñal --- */
  const nsub = Math.max(1, Math.round(fdt / PH.DT));
  const dt = fdt / nsub;
  const Athr = PH.Ath * Math.pow(thr, 1.8) + (s.ecuOn ? s.iac : 2e-6);
  s.wg = 0;
  let tqSum = 0;
  let fricP = 0;
  for (let k = 0; k < nsub; k++) {
    const rpm = s.om * 9.5493;
    const dpf = 3500 * Math.pow(Math.max(0, s.mc) / 0.12, 2) * cfg.filterR;
    s.Pin = PH.Pa - Math.min(40e3, dpf);
    const Pin = PH.Pa - Math.min(40e3, dpf);
    let mc = 0, Wc = 0, T2 = PH.Ta;
    const x = s.wt / PH.Nref;
    if (cfg.turbo) {
      const PRmax = 1 + 1.35 * x * x * cfg.turboEff;
      const PR = s.Pc / Pin;
      if (PR < 1) mc = orifice(Pin, s.Pc, 1.8e-3, PH.Ta) + 0.17 * x * (Pin / PH.Pa);
      else {
        const q = 1 - (PR - 1) / Math.max(1e-4, PRmax - 1);
        if (q > 0) mc = 0.17 * x * Math.sqrt(q) * (Pin / PH.Pa);
        else { mc = q * 0.04; s.surge = Math.min(1, s.surge + dt * 6); }
      }
      const dTc = PH.Ta * (Math.pow(Math.max(1, PR), 0.2857) - 1) / 0.70;
      T2 = PH.Ta + dTc;
      Wc = Math.max(0, mc) * PH.cp * dTc + 2e-11 * s.wt * s.wt * s.wt;
    }
    s.mc = mc;
    const Tc = T2 - cfg.icEff * (T2 - PH.Ta);
    const mth = orifice(s.Pc, s.Pm, Athr, Tc);
    const mleak = orifice(s.Pc, PH.Pa, cfg.leakA, Tc);
    let mbov = 0;
    s.bovOpen = false;
    if (cfg.bov === 1 && s.Pm < 72e3 && s.Pc > PH.Pa + 12e3) {
      mbov = orifice(s.Pc, PH.Pa, 1.3e-3, Tc); s.bovOpen = true; s.bovT = s.time;
    }
    s.Pc += PH.R * Tc / PH.Vchg * (mc - mth - mleak - mbov) * dt;
    s.Pc = clamp(s.Pc, 25e3, 330e3);
    s.Tm += (Tc + 4 - s.Tm) * dt * 6;
    const meng = s.om > 0 ? VE(rpm) * s.Pm / (PH.R * s.Tm) * PH.Vd * rpm / 120 : 0;
    s.Pm += PH.R * s.Tm / PH.Vman * (mth - meng) * dt;
    s.Pm = clamp(s.Pm, 4e3, 330e3);
    s.mThr = mth; s.mEng = meng; s.mBov = mbov; s.mLeak = mleak;

    // turbina y wastegate
    const mex = meng * 1.07;
    const boost = s.Pc - PH.Pa;
    const wg = clamp((boost - (c.wgSpring - 12e3)) / 24e3, 0, 1);
    s.wg = Math.max(s.wg, wg);
    const mt = mex * (1 - wg);
    const ER = 1 + 45 * Math.pow(mt, 1.4) * Math.sqrt(Math.max(300, s.T3) / 1000);
    let Wt = 0;
    if (cfg.turbo) Wt = mt * PH.cpx * s.T3 * (1 - Math.pow(ER, -0.25)) * 0.65 * cfg.turboEff;
    if (cfg.turbo) {
      let tb = 4e-6 * s.wt * cfg.turboFric;
      if (s.oilP < 0.4) tb *= 6;
      s.wt += ((Wt - Wc) / Math.max(s.wt, 300) - tb) / PH.It * dt;
      s.wt = clamp(s.wt, 0, 23500);
    } else s.wt = 0;
    const P3 = (PH.Pa + 2500) * (1 + (ER - 1) * (1 - wg * 0.6)) + (cfg.o2Leak ? -800 : 0);
    s.P3 = P3;
    s.T3 += (s.T3t - s.T3) * dt * 3;

    // cilindros
    s.th += s.om * dt;
    if (s.th > 1e6) s.th -= FOURPI * Math.floor(s.th / FOURPI);
    let tqc = 0;
    for (let i = 0; i < 4; i++) {
      let phi = (s.th - OFFS[i]) % FOURPI; if (phi < 0) phi += FOURPI;
      if (phi < s.prevPhi[i] && s.om > 3) fire(c, s, cfg, i);
      s.prevPhi[i] = phi;
      if (phi < Math.PI) tqc += s.cylTq[i];
    }
    // cigüeñal
    const kk = rpm / 1000;
    const oilF = 1 + 2 * c.dmg.bear + (s.oilP < 0.3 && s.om > 20 ? 1.5 : 0) + 0.5 * clamp((40 - s.Toil) / 40, 0, 1);
    const tf = (0.97 + 0.15 * kk + 0.05 * kk * kk) * 1e5 * PH.Vd / FOURPI * oilF;
    const sp = clamp(s.om / 20, 0, 1);
    const tpump = (P3 - s.Pm) * PH.Vd / FOURPI * sp;
    const talt = s.om > 10 ? s.altP / s.om : 0;
    let tst = 0;
    if (s.starterOn && s.om < 60) tst = s.starterTq0 * Math.max(0, 1 - s.om / 36);
    const drive = tqc + tst;
    let net = drive - tf * (s.om > 0.5 ? 1 : 0) - tpump - talt;
    if (s.om <= 0.5 && drive < tf) { net = 0; s.om = 0; }
    if (c.seized) { net = 0; s.om = 0; }
    s.om = Math.max(0, s.om + net / (PH.I + (inp.dyno ? 2.6 : 0)) * dt);
    tqSum += tqc - tf - tpump;
    fricP += tf * s.om;
  }
  const rpm = s.om * 9.5493;
  s.tq = tqSum / nsub;
  s.tqAvg += (s.tq - s.tqAvg) * Math.min(1, fdt * 3);
  s.hp = Math.max(0, s.tqAvg) * s.om / 745.7;
  s.fuelRate = s.mfAcc / fdt; s.mfAcc = 0;
  s.frAcc += (s.fuelRate - s.frAcc) * Math.min(1, fdt * 4);
  s.surge = Math.max(0, s.surge - fdt * 2);
  if (!s.running) s.T3t = s.Tm + (s.T3t - s.Tm) * Math.max(0, 1 - fdt * 0.6);
  if (s.surge > 0.2 && cfg.turbo) c.slots.turbo.item.health = Math.max(0, c.slots.turbo.item.health - fdt * 0.0008);

  // ¿está corriendo?
  const recently = s.lastFire.some(t => s.time - t < 0.25);
  const wasRunning = s.running;
  s.running = rpm > (s.running ? 250 : 400) && (recently || (s.ecuOn && s.time - (s.dfcoT || -9) < 0.4));
  s.cranking = s.starterOn && !s.running;
  if (s.running) s.runTime += fdt; else s.runTime = 0;
  if (wasRunning && !s.running) onShutdown(c, s, cfg);
  if (!wasRunning && s.running) { s.misWin = [[], [], [], []]; s.misCount = [0, 0, 0, 0]; c.ecu.timers = {}; }

  /* --- Aceite --- */
  const viscF = 1 + 0.6 * clamp((90 - s.Toil) / 70, 0, 1);
  const levelF = clamp((c.oil.level - 1.0) / 1.6, 0, 1) * (c.oil.level < 3 && rpm > 3500 ? 0.7 : 1);
  s.oilP = s.om > 5 ? Math.min(4.6, 0.00115 * rpm * viscF) * levelF * (1 - 0.5 * c.dmg.bear) * (cfg.filtro ? 1 : 0.05) : 0;
  if (!cfg.turboOil) s.oilP *= 0.25;
  let down = 0, up = 0, burn = 0;
  if (cfg.taponLeak) down += cfg.taponLeak >= 1 ? Math.min(0.16 * fdt, Math.max(0, c.oil.level - 0.1)) : 0.0006 * fdt;
  if (cfg.filtroLeak && s.om > 5) down += (cfg.filtroLeak >= 1 ? 0.25 : 0.003) * fdt;
  if (!cfg.turboOil && s.om > 5) up += 0.2 * fdt;
  if (!cfg.oilCap && s.running) up += 0.003 * fdt;
  if (cfg.turbo && cfg.turboH < 0.4 && s.running) burn = (0.4 - cfg.turboH) * 0.004 * (1 + Math.max(0, (s.Pc - PH.Pa) / 50e3)) * fdt;
  const tot = Math.min(c.oil.level, down + up + burn);
  if (tot > 0) {
    const f = c.oil.level > 0 ? tot / (down + up + burn) : 0;
    c.oil.level -= tot;
    if (c.pan) c.oil.pan += down * f; else c.oil.floor += down * f;
    c.oil.floor += up * f;
  }
  if (s.om > 30 && s.oilP < 0.6) {
    c.dmg.bear = Math.min(1, c.dmg.bear + fdt * 0.012 * (rpm / 1000) * (c.oil.level < 1 ? 5 : 1));
    if (c.dmg.bear >= 1 && !c.seized) { c.seized = true; s.om = 0; emit(s, 'seize'); }
  }
  // desgaste del turbo con aceite sucio o sin presión
  if (cfg.turbo && s.running) {
    const wear = Math.pow(s.wt / PH.Nref, 2) * 2e-5 * (1 + 20 * Math.pow(1 - c.oil.quality, 2)) * (s.oilP < 0.5 ? 60 : 1) * (cfg.noFilter ? 6 : 1);
    c.slots.turbo.item.health = Math.max(0, c.slots.turbo.item.health - wear * fdt);
  }

  /* --- Refrigerante (calor ×10) --- */
  const fuelP = s.frAcc * PH.LHV;
  const Qin = 0.30 * fuelP;
  const pump = beltOK ? clamp(rpm / 2500, 0.25, 1) * (s.om > 5 ? 1 : 0) * cfg.belt : 0;
  let open;
  if (cfg.thermo === 'abierto' || cfg.thermo === 'none') open = 1;
  else if (cfg.thermo === 'cerrado') open = 0.02;
  else open = clamp((s.ECT - 88) / 7, 0, 1);
  const lvlF = clamp((c.cool.level - 0.3) / 0.5, 0, 1);
  if ((s.ECT > 98 || s.limp) && cfg.fanFuse && s.V > 10) s.fanOn = true;
  if (s.ECT < 92 || !cfg.fanFuse || s.V < 10) s.fanOn = false;
  const UA = (600 + (s.fanOn ? 1200 : 0) + (inp.dyno ? 1600 : 0)) * open * pump * lvlF + (s.running ? 10 : 30);
  const C = 60000 / PH.HEAT_X;
  s.ECT += (Qin - UA * (s.ECT - (PH.Ta - 273))) / C * fdt;
  if (s.ECT > 124 && cfg.radCap) c.cool.level = Math.max(0, c.cool.level - 0.002 * fdt);
  if (!cfg.radCap && s.ECT > 100) c.cool.level = Math.max(0, c.cool.level - 0.012 * fdt);
  if (cfg.thermo === 'none' && pump > 0) c.cool.level = Math.max(0, c.cool.level - 0.02 * fdt);
  if (s.ECT > 128) c.dmg.hg = Math.min(1, c.dmg.hg + fdt * 0.0008 * (s.ECT - 128));
  if (c.dmg.hg > 0.3 && s.running) c.cool.level = Math.max(0, c.cool.level - 0.0015 * fdt);
  const loadNow = clamp(s.Pm / 150e3, 0, 1);
  if (s.running) s.Toil += (s.ECT + 6 * loadNow - s.Toil) * fdt * 0.05;
  else s.Toil += (s.ECT - s.Toil) * fdt * 0.02;
  // turbo: carcasa y eje
  if (s.running) {
    s.Tt += (s.T3 - s.Tt) * fdt * 0.08;
    const tbT = (s.Toil + 273) + 0.6 * Math.max(0, s.T3 - s.Toil - 273) * loadNow;
    s.Tb += (tbT - s.Tb) * fdt * 0.1;
  } else {
    s.Tt += (PH.Ta - s.Tt) * fdt * 0.006;
    s.Tb += (PH.Ta - s.Tb) * fdt * 0.006;
  }

  /* --- Computadora: lazo cerrado, ajustes y monitores --- */
  const closed = s.ecuOn && s.running && s.ECT > 45 && thr < 0.8 && s.Pm < 105e3 && cfg.o2 > 0 && !s.dfco;
  const h2 = cfg.o2 > 0 ? cfg.o2 : 0;
  const tau = h2 < 0.5 ? 2.2 : 0.15;
  const bias = h2 < 0.5 ? 0.09 * (1 - h2) : 0;
  s.lamS += (s.lamAvg + bias - s.lamS) * Math.min(1, fdt / tau);
  if (closed) {
    s.stft = clamp(s.stft + clamp((s.lamS - 1) * 3, -1, 1) * 0.3 * fdt, -0.25, 0.25);
    const mv = s.stft * 0.12 * fdt;
    s.ltft = clamp(s.ltft + mv, -0.25, 0.25); s.stft -= mv;
  } else s.stft *= Math.max(0, 1 - fdt * 2);
  s.o2V = cfg.o2 <= 0 ? 0.45 : (s.lamS < 1 ? 0.62 + Math.min(0.28, (1 - s.lamS) * 6) : 0.38 - Math.min(0.28, (s.lamS - 1) * 6));
  s.retard = Math.max(0, s.retard - fdt * 1.2);
  ecuMonitors(c, s, cfg, fdt, thr, rpm);

  /* --- Humo --- */
  const sm = s.smoke;
  const rich = s.running ? clamp((0.86 - s.lamAvg) * 4, 0, 1) + (s.cylMis.some(m => m) ? 0.15 : 0) : 0;
  sm.k += (rich - sm.k) * Math.min(1, fdt * 3);
  const blue = burn > 0 ? clamp(burn / fdt / 0.002, 0, 1) : 0;
  sm.b += (blue - sm.b) * Math.min(1, fdt * 2);
  const white = s.running ? clamp(c.dmg.hg * 1.5 - 0.3, 0, 1) + (s.ECT < 35 ? 0.15 : 0) : 0;
  sm.w += (white - sm.w) * Math.min(1, fdt * 2);
  s.cfg = cfg;
}

function emit(s, type, data) { s.events.push({ type, data, t: s.time }); }

function onShutdown(c, s, cfg) {
  // Calor que se queda en el eje del turbo sin aceite circulando
  const peak = s.Tb + 0.4 * Math.max(0, s.Tt - s.Tb);
  if (cfg.turbo && peak > 560) {
    const dmg = 0.03 * ((peak - 560) / 250 + 0.3);
    c.slots.turbo.item.health = Math.max(0, c.slots.turbo.item.health - dmg);
    emit(s, 'coking', { peak: peak - 273 });
  }
}

function setCode(c, code) {
  if (!c.ecu.codes[code]) { c.ecu.codes[code] = { t: c.sim.time }; emit(c.sim, 'dtc', code); }
}
function timer(c, key, cond, fdt, need) {
  const T = c.ecu.timers;
  T[key] = cond ? (T[key] || 0) + fdt : 0;
  return T[key] >= need;
}
function ecuMonitors(c, s, cfg, fdt, thr, rpm) {
  if (!s.ecuOn) return;
  if (s.running) {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const w = s.misWin[i];
      if (w.length >= 40) {
        const rate = w.reduce((a, b) => a + b, 0) / w.length;
        s.misCount[i] = rate;
        if (rate > 0.08) { setCode(c, 'P030' + (i + 1)); n++; if (cfg.coil[i] < 0.35) setCode(c, 'P035' + (i + 1)); }
      }
    }
    if (n >= 2) setCode(c, 'P0300');
    if (timer(c, 'lean', s.ltft > 0.19, fdt, 4)) setCode(c, 'P0171');
    if (timer(c, 'rich', s.ltft < -0.19, fdt, 4)) setCode(c, 'P0172');
    const boost = s.Pc - PH.Pa;
    if (timer(c, 'ub', thr > 0.8 && rpm > 3000 && boost < c.wgSpring - 30e3, fdt, 1.5)) setCode(c, 'P0299');
    if (timer(c, 'ect', s.runTime > 200 && s.ECT < 70, fdt, 1)) setCode(c, 'P0128');
    if (s.ECT > 118) setCode(c, 'P0217');
    if (timer(c, 'o2s', cfg.o2 > 0 && cfg.o2 < 0.5 && s.ECT > 45, fdt, 15)) setCode(c, 'P0133');
    if (timer(c, 'o2n', cfg.o2 < 0, fdt, 5)) setCode(c, 'P0134');
    if (timer(c, 'vlo', s.V < 12.4 && rpm > 600, fdt, 8)) setCode(c, 'P0562');
    if (timer(c, 'fp', s.fp < 2.2, fdt, 3)) setCode(c, 'P0087');
  }
}

/* Avanzar el reloj con el motor apagado (esperar a que enfríe) */
function fastCool(c, seconds) {
  const s = c.sim;
  const step = 0.5;
  for (let t = 0; t < seconds; t += step) {
    s.ECT += (-30 * (s.ECT - (PH.Ta - 273))) / (60000 / PH.HEAT_X) * step;
    s.Toil += (s.ECT - s.Toil) * step * 0.02;
    s.Tt += (PH.Ta - s.Tt) * step * 0.006;
    s.Tb += (PH.Ta - s.Tb) * step * 0.006;
    s.T3 += (PH.Ta - s.T3) * Math.min(1, step * 0.6);
    s.T3t = s.T3;
  }
}

if (typeof module !== 'undefined') module.exports = { PH, newCar, newItem, simFrame, config, fastCool, VE, orifice };
