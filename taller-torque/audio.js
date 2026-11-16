'use strict';
/* =====================================================================
   TALLER TORQUE · sonido sintetizado
   Cada explosión de cada cilindro se genera en el orden 1-3-4-2.
   Si un cilindro no explota, se oye el hueco.
   ===================================================================== */

const SYNTH_SRC = `
class TTSynth {
  constructor(sr) {
    this.sr = sr; this.ph = 0; this.env = 0; this.t0 = 0; this.f1 = 60; this.f2 = 170;
    this.lp = 0; this.lp2 = 0; this.hp = 0; this.hpIn = 0; this.tph = 0; this.sph = 0; this.qph = 0;
    this.bov = 0; this.knk = 0; this.kph = 0; this.click = 0; this.st = 0; this.rk = 0; this.rkph = 0;
    this.n = 0; this.p = { rpm: 0, amps: [0,0,0,0], thr: 0, turbo: 0, boost: 0, starter: 0, squeal: 0,
      hiss: 0, flutter: 0, rodKnock: 0, run: 0, vol: 0.8, broken: 0 };
    this.lastBov = 0; this.lastKnock = 0; this.lastClick = 0; this.ampNow = 0; this.prevFrac = 0;
  }
  set(p) {
    if (p.bovN !== undefined && p.bovN !== this.lastBov) { this.lastBov = p.bovN; this.bov = 1; }
    if (p.knockN !== undefined && p.knockN !== this.lastKnock) { this.lastKnock = p.knockN; this.knk = 1; }
    if (p.clickN !== undefined && p.clickN !== this.lastClick) { this.lastClick = p.clickN; this.click = 1; }
    if (p.popN !== undefined && p.popN !== this.lastPop) { this.lastPop = p.popN; this.pop = 1; }
    Object.assign(this.p, p);
  }
  noise() { this.n = (this.n * 1103515245 + 12345) & 0x7fffffff; return this.n / 0x3fffffff - 1; }
  render(out, len) {
    const p = this.p, sr = this.sr, TAU = 6.283185307;
    const cps = p.rpm / 120;                 // ciclos de 720° por segundo
    const fires = p.fires || [0, 0.75, 0.25, 0.5];
    const cut = 300 + p.thr * 2600 + p.rpm * 0.25;
    const a = 1 - Math.exp(-TAU * cut / sr);
    const decay = Math.exp(-1 / (sr * (0.012 - Math.min(0.007, p.rpm / 900000))));
    const tf = 900 + p.turbo * 26;
    const tAmp = p.run ? 0.012 + 0.05 * Math.max(0, p.boost) + 0.02 * p.broken : 0;
    for (let i = 0; i < len; i++) {
      const prev = this.ph;
      this.ph += cps / sr;
      if (this.ph >= 1) this.ph -= 1;
      for (let c = 0; c < fires.length; c++) {
        const f = fires[c];
        const crossed = prev <= this.ph ? (prev < f && this.ph >= f) || (f === 0 && prev > this.ph) : (prev < f || this.ph >= f);
        if (crossed && cps > 0.5) {
          const amp = p.amps[c] || 0;
          this.env = Math.max(this.env * 0.4, (0.15 + amp * 0.55) * (p.big || 1));
          this.t0 = 0;
          this.f1 = (48 + Math.random() * 6) * (p.low || 1); this.f2 = (150 + Math.random() * 30) * (p.low || 1);
          if (amp < 0.05) this.env = 0.07; // hueco: solo bombeo, sin explosión
        }
      }
      this.t0 += 1 / sr;
      this.env *= decay;
      let s = this.env * (Math.sin(TAU * this.f1 * this.t0) * 0.7 + Math.sin(TAU * this.f2 * this.t0) * 0.35 + this.noise() * 0.55);
      // admisión: ruido proporcional al aire
      s += this.noise() * (0.012 + 0.05 * p.thr) * Math.min(1, p.rpm / 2500) * (p.run ? 1 : 0);
      this.lp += (s - this.lp) * a;
      this.lp2 += (this.lp - this.lp2) * a;
      let y = this.lp2 * 1.6;
      // turbo
      if (tAmp > 0) {
        this.tph += (tf + (p.broken ? Math.sin(this.qph += TAU * 3 / sr) * 400 : 0)) / sr;
        y += Math.sin(TAU * this.tph) * tAmp;
      }
      // fuga de presión (silbido)
      if (p.hiss > 0) { const nn = this.noise(); const h = nn - this.hpIn; this.hpIn = nn; y += h * p.hiss * 0.08; }
      // BOV: psshh
      if (this.bov > 0.001) { const nn = this.noise(); const h = nn - this.hp; this.hp = nn; y += h * this.bov * 0.35; this.bov *= Math.exp(-1 / (sr * 0.13)); }
      // flutter del compresor sin BOV
      if (p.flutter > 0.05) { y += Math.sin(TAU * (this.sph += 14 / sr)) > 0.4 ? this.noise() * 0.12 * p.flutter : 0; }
      // marcha
      if (p.starter > 0) {
        this.st += (90 + p.rpm * 0.25) / sr;
        const chug = 0.55 + 0.45 * Math.sin(TAU * this.ph * 4);
        y += ((this.st % 1) < 0.5 ? 0.09 : -0.09) * chug + this.noise() * 0.03 * chug;
      }
      // banda que rechina
      if (p.squeal > 0.02) { this.sph += (2700 + Math.sin(this.qph += TAU * 7 / sr) * 120) / sr; y += Math.sin(TAU * this.sph) * 0.05 * p.squeal; }
      // cascabeleo (detonación)
      if (this.knk > 0.001) { this.kph += 6400 / sr; y += Math.sin(TAU * this.kph) * this.knk * 0.12; this.knk *= Math.exp(-1 / (sr * 0.012)); }
      // golpeteo de bielas
      if (p.rodKnock > 0.05 && cps > 1) {
        this.rkph += p.rpm / 60 / sr;
        if (this.rkph >= 1) { this.rkph -= 1; this.rk = p.rodKnock; this.rkt = 0; }
        this.rkt = (this.rkt || 0) + 1 / sr;
        y += Math.sin(TAU * 1100 * this.rkt) * this.rk * 0.1; this.rk *= Math.exp(-1 / (sr * 0.01));
      }
      // petardeo del escape
      if (this.pop > 0.001) { y += (this.noise() * 0.7 + Math.sin(this.t0 * 900) * 0.3) * this.pop * 0.6; this.pop *= Math.exp(-1 / (sr * 0.03)); }
      // clic (solenoide, torquímetro)
      if (this.click > 0.001) { y += (this.noise() * 0.6 + 0.4) * this.click * 0.5; this.click *= Math.exp(-1 / (sr * 0.004)); }
      y *= p.vol;
      out[i] = y > 1 ? 1 : y < -1 ? -1 : y;
    }
  }
}`;

const AUDIO = {
  ctx: null, node: null, synth: null, on: false, port: null,
  async start() {
    if (this.ctx) { await this.ctx.resume(); this.on = true; return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    this.master = master;
    try {
      const code = SYNTH_SRC + `
        class TTProc extends AudioWorkletProcessor {
          constructor() { super(); this.s = new TTSynth(sampleRate); this.port.onmessage = e => this.s.set(e.data); }
          process(inputs, outputs) { const o = outputs[0][0]; if (o) this.s.render(o, o.length); return true; }
        }
        registerProcessor('tt-proc', TTProc);`;
      const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      this.node = new AudioWorkletNode(ctx, 'tt-proc', { outputChannelCount: [1] });
      this.port = this.node.port;
    } catch (e) {
      const Synth = new Function(SYNTH_SRC + '; return TTSynth;')();
      const synth = new Synth(ctx.sampleRate);
      const sp = ctx.createScriptProcessor(1024, 0, 1);
      sp.onaudioprocess = ev => synth.render(ev.outputBuffer.getChannelData(0), 1024);
      this.node = sp; this.synth = synth;
    }
    this.node.connect(master);
    await ctx.resume();
    this.on = true;
    return true;
  },
  stop() { if (this.ctx) this.ctx.suspend(); this.on = false; },
  send(p) {
    if (!this.on) return;
    if (this.port) this.port.postMessage(p); else if (this.synth) this.synth.set(p);
  },
  // sonidos cortos de herramientas
  blip(kind) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const len = kind === 'ratchet' ? 0.03 : kind === 'clic' ? 0.05 : 0.12;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const e = Math.exp(-i / (ctx.sampleRate * (kind === 'clic' ? 0.006 : kind === 'ratchet' ? 0.004 : 0.03)));
      d[i] = (Math.random() * 2 - 1) * e * (kind === 'spark' ? 0.9 : 0.6);
      if (kind === 'clic') d[i] += Math.sin(i / ctx.sampleRate * 6.283 * 2400) * e * 0.5;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = kind === 'clic' ? 0.9 : 0.5;
    src.connect(g); g.connect(this.master); src.start(t);
  },
};
