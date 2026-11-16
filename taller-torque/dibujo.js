'use strict';
/* =====================================================================
   TALLER TORQUE · dibujo en pixel art
   Mundo de 320×240 pixeles, escalado entero sin suavizado.
   ===================================================================== */

const W = 320, H = 240;
const P = {
  ink: '#121318', bay: '#1c1f25', bay2: '#23272e', body: '#9b2f27', bodyHi: '#c2463a', bodyLo: '#6b1e19',
  steel: '#3b414c', steelHi: '#5b6473', steelLo: '#272b33',
  alu: '#a3abb6', aluHi: '#d3d8de', aluLo: '#6a727e',
  blk: '#1a1b1f', blkHi: '#34363d', blkLo: '#0d0e11',
  rust: '#7b3a24', rustHi: '#a4532f', hot: '#e2702b', glow: '#ffb04a',
  yel: '#f0b429', yelLo: '#9e7413', red: '#d8443a', redLo: '#8a2420', grn: '#5aa65b', blue: '#5aa9e6', blueLo: '#2e6aa0',
  oil: '#d4a21f', oilDk: '#4c3b12', cool: '#3fb8a6', coolLo: '#1f6d63', copper: '#c47a3d', white: '#e6e9ed', grey: '#8b929c',
  floor: '#2a2d33', floor2: '#30343b', bg: '#16181d',
};

let wc, wx, dc, dx, SC = 3;
let OX = 0, OY = 0;

function initDraw(canvas) {
  dc = canvas; dx = dc.getContext('2d');
  wc = document.createElement('canvas'); wc.width = W; wc.height = H;
  wx = wc.getContext('2d');
  wx.imageSmoothingEnabled = false;
}
function resizeDraw() {
  const r = dc.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  SC = Math.max(1, Math.round(r.width * dpr / W));
  if (dc.width !== W * SC) { dc.width = W * SC; dc.height = H * SC; }
}

/* ---------- primitivas ---------- */
function R(x, y, w, h, c) { if (w <= 0 || h <= 0) return; wx.fillStyle = c; wx.fillRect(Math.round(x + OX), Math.round(y + OY), Math.round(w), Math.round(h)); }
function px(x, y, c) { R(x, y, 1, 1, c); }
function box(x, y, w, h, base, hi, lo, ol) {
  R(x, y, w, h, ol || P.ink); R(x + 1, y + 1, w - 2, h - 2, base);
  if (hi) { R(x + 1, y + 1, w - 2, 1, hi); R(x + 1, y + 1, 1, h - 2, hi); }
  if (lo) { R(x + 1, y + h - 2, w - 2, 1, lo); R(x + w - 2, y + 2, 1, h - 3, lo); }
}
function disc(cx, cy, r, c) {
  for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y) + 0.5); R(cx - w, cy + y, 2 * w + 1, 1, c); }
}
function ring(cx, cy, r, c) {
  let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    px(cx + x, cy + y, c); px(cx + y, cy + x, c); px(cx - y, cy + x, c); px(cx - x, cy + y, c);
    px(cx - x, cy - y, c); px(cx - y, cy - x, c); px(cx + y, cy - x, c); px(cx + x, cy - y, c);
    y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}
function line(x0, y0, x1, y1, c) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dxl = Math.abs(x1 - x0), dyl = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dxl + dyl;
  for (let i = 0; i < 2000; i++) {
    px(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dyl) { err += dyl; x0 += sx; }
    if (e2 <= dxl) { err += dxl; y0 += sy; }
  }
}
function seg(x0, y0, x1, y1, w, c) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const h = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) { const t = i / n; R(x0 + (x1 - x0) * t - h, y0 + (y1 - y0) * t - h, w, w, c); }
}
function pipe(pts, w, base, hi, ol) {
  for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w + 2, ol || P.ink);
  for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, base);
  if (hi) for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const vertical = Math.abs(bx - ax) < Math.abs(by - ay);
    const o = -Math.floor(w / 2) + 1;
    if (vertical) seg(ax + o, ay, bx + o, by, 1, hi); else seg(ax, ay + o, bx, by + o, 1, hi);
  }
}
function bolt(x, y, c) { R(x - 1, y - 1, 3, 3, P.ink); px(x, y, c || P.aluHi); }
function lerpC(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
function heatCol(TK, base) {
  const t = (TK - 650) / 450;
  if (t <= 0) return base;
  return t < 0.5 ? lerpC(base, '#9b2a1a', t * 2) : lerpC('#9b2a1a', P.glow, (t - 0.5) * 2);
}

/* ---------- etiquetas en alta resolución ---------- */
const LABELS = [];
function label(x, y, text, color, size, align, bg) { LABELS.push({ x, y, text, color, size: size || 6, align: align || 'left', bg }); }
function flushLabels() {
  for (const L of LABELS) {
    dx.font = `${Math.round(L.size * SC)}px Silkscreen, "Courier New", monospace`;
    dx.textAlign = L.align; dx.textBaseline = 'top';
    const x = L.x * SC, y = L.y * SC;
    if (L.bg) {
      const w = dx.measureText(L.text).width;
      const bx = L.align === 'center' ? x - w / 2 : L.align === 'right' ? x - w : x;
      dx.fillStyle = L.bg; dx.fillRect(bx - SC * 1.5, y - SC, w + SC * 3, L.size * SC + SC * 2);
    }
    dx.fillStyle = '#000'; dx.fillText(L.text, x + SC * 0.6, y + SC * 0.6);
    dx.fillStyle = L.color || P.white; dx.fillText(L.text, x, y);
  }
  LABELS.length = 0;
}

/* ---------- utilidades de estado ---------- */
function has(c, id) { const d = c.defs[id], s = c.slots[id]; if (!d || !s) return false; return d.conn ? !!s.on : !!s.item; }
function itemOf(c, id) { return c.slots[id] && c.slots[id].item; }
function slotVisible(c, id) {
  const d = c.defs[id];
  if (!d) return false;
  if (d.cover) for (const k of d.cover) if (has(c, k)) return false;
  return true;
}

/* =====================================================================
   VISTA: COFRE (desde arriba, frente del auto abajo)
   ===================================================================== */
function drawCofre(g) {
  const c = g.car, s = c.sim, t = g.t;
  R(0, 0, W, H, P.bay);
  for (let y = 14; y < H; y += 8) for (let x = 10 + (y % 16 ? 4 : 0); x < W - 8; x += 8) px(x, y, P.bay2);
  box(0, -2, 7, H + 4, P.body, P.bodyHi, P.bodyLo);
  box(W - 7, -2, 7, H + 4, P.body, P.bodyHi, P.bodyLo);
  box(6, 0, W - 12, 11, P.blk, P.blkHi, P.blkLo);
  for (let x = 12; x < W - 12; x += 5) R(x, 3, 3, 5, P.blkLo);
  box(6, 233, W - 12, 8, P.body, P.bodyHi, P.bodyLo);

  // radiador e intercooler (al frente)
  box(16, 196, 298, 12, P.blk, P.blkHi, P.blkLo);
  for (let x = 20; x < 296; x += 4) R(x, 199, 2, 6, P.blkHi);
  box(28, 208, 268, 25, P.alu, P.aluHi, P.aluLo);
  for (let x = 31; x < 293; x += 3) R(x, 211, 1, 19, P.aluLo);
  label(162, 224, 'INTERCOOLER', '#2a2f37', 4.5, 'center');

  // manguera del termostato al radiador (decorativa)
  pipe([[262, 102], [314, 102], [314, 196]], 5, P.blk, P.blkHi);

  // batería
  drawBattery(g);
  // caja de fusibles
  box(6, 66, 32, 20, P.blk, P.blkHi, P.blkLo);
  R(8, 68, 28, 16, P.blkLo);
  drawFuse(c, 'fusGas'); drawFuse(c, 'fusVent');
  R(34, 70, 2, 12, P.blkHi);

  // caja del filtro de aire
  box(262, 16, 52, 46, P.blk, P.blkHi, P.blkLo);
  if (has(c, 'filtroAire')) {
    box(264, 18, 48, 42, P.blkHi, '#45474f', P.blk);
    for (let y = 22; y < 58; y += 6) R(268, y, 40, 1, P.blk);
    R(266, 24, 3, 4, P.grey); R(306, 24, 3, 4, P.grey); R(266, 48, 3, 4, P.grey); R(306, 48, 3, 4, P.grey);
    label(288, 34, 'AIRE', '#6b6f78', 5, 'center');
  } else {
    R(266, 20, 44, 38, P.blkLo);
    for (let y = 24; y < 56; y += 4) R(270, y, 36, 1, '#26282d');
  }

  // ===== grupo motor (vibra con el motor encendido) =====
  const rpm = s.om * 9.5493;
  let jx = 0, jy = 0;
  if (s.running) {
    const rough = s.cylMis.some(m => m) ? 1 : 0;
    const amp = rpm < 1200 ? 0.6 + rough : 0.25 + rough * 0.6;
    jx = Math.random() < amp * 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    jy = Math.random() < amp * 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  } else if (s.cranking) jx = (Math.floor(t * 16) % 2) ? 1 : 0;
  OX = jx; OY = jy;

  // bloque y cabeza
  box(100, 44, 152, 106, P.steel, P.steelHi, P.steelLo);
  // múltiple de admisión
  box(108, 28, 140, 18, P.blk, P.blkHi, P.blkLo);
  const E2 = c.engId ? MOTORES[c.engId] : null;
  if (!E2) { OX = 0; OY = 0; R(100, 44, 152, 106, P.bay2); label(176, 92, 'SIN MOTOR', P.yel, 7, 'center'); drawCofreRest(g); return; }
  for (let i = 0; i < E2.cyl; i++) R(injX(E2.cyl, i) - 4, 44, 8, 6, P.blkHi);
  // cuerpo de aceleración
  box(96, 32, 16, 16, P.alu, P.aluHi, P.aluLo);
  disc(104, 40, 5, P.blkLo);
  const thrA = g.thrNow;
  line(104 - Math.round(4 * Math.cos(thrA * 1.4)), 40 - Math.round(4 * Math.sin(thrA * 1.4)), 104 + Math.round(4 * Math.cos(thrA * 1.4)), 40 + Math.round(4 * Math.sin(thrA * 1.4)), P.aluHi);
  // tapa de punterías (debajo de la tapa del motor)
  box(118, 62, 120, 46, P.alu, P.aluHi, P.aluLo);
  for (let i = 0; i < E2.cyl; i++) drawCoilWell(g, i);
  // tapón de aceite
  if (has(c, 'tapaAceite')) { disc(246, 74, 5, P.ink); disc(246, 74, 4, P.yel); R(243, 73, 7, 2, P.yelLo); }
  else { disc(246, 74, 4, P.ink); disc(246, 74, 3, '#3a2c0c'); px(245, 73, P.oil); }
  // tapa del motor
  if (has(c, 'tapaMotor')) {
    box(118, 62, 120, 46, P.blk, P.blkHi, P.blkLo);
    for (let x = 124; x < 232; x += 6) R(x, 66, 3, 38, '#222429');
    box(158, 78, 40, 13, P.blkHi, '#4a4c54', P.blk);
    label(178, 81, E2.short, '#9aa0a8', 5, 'center');
  }
  // riel de inyectores e inyectores
  for (let i = 0; i < E2.cyl; i++) {
    const id = 'iny' + (i + 1), x = injX(E2.cyl, i);
    if (!has(c, 'riel')) {
      if (has(c, id)) { box(x - 3, 45, 7, 14, P.blk, P.blkHi, P.blkLo); R(x - 3, 47, 7, 2, P.grn); px(x, 58, P.aluHi); }
      else { disc(x, 52, 2, P.ink); }
    }
  }
  if (has(c, 'riel')) {
    box(114, 48, 134, 9, P.aluLo, P.alu, P.steel);
    for (let i = 0; i < E2.cyl; i++) { const x = injX(E2.cyl, i); R(x - 3, 56, 7, 3, P.blk); R(x - 3, 57, 7, 1, P.grn); }
    bolt(146, 52); bolt(202, 52);
    R(244, 50, 6, 5, P.blk); px(246, 49, P.yel);
    pipe([[106, 52], [114, 52]], 2, P.blkHi);
  }
  // múltiple de escape → turbina
  for (const x of [140, 166, 192, 218]) pipe([[x, 140], [x + 10, 150], [236, 160]], 4, s.running ? heatCol(s.Tt, P.rust) : P.rust, P.rustHi);
  // bayoneta
  R(106, 112, 3, 30, P.steelLo);
  if (true) { box(102, 114, 11, 9, P.yel, '#ffd35a', P.yelLo); R(105, 117, 5, 3, P.ink); }
  // termostato
  if (has(c, 'termostato')) { box(250, 94, 13, 16, P.alu, P.aluHi, P.aluLo); bolt(253, 98); bolt(259, 106); pipe([[262, 102], [266, 102]], 5, P.blk); }
  else { disc(256, 102, 5, P.ink); disc(256, 102, 3, c.cool.level > 0.6 ? P.coolLo : P.blkLo); }

  // turbo
  if (E2.turbo) drawTurboTop(g);
  // línea de aceite del turbo
  if (has(c, 'lineaTurbo')) { pipe([[238, 142], [252, 146], [264, 158]], 2, P.aluLo, P.aluHi); bolt(238, 142, P.yel); bolt(264, 158, P.yel); }
  else { bolt(238, 142); if (has(c, 'turbo')) { disc(264, 158, 2, P.oilDk); } }
  // protector térmico
  if (has(c, 'protector')) {
    box(232, 150, 28, 24, P.aluHi, '#eef1f4', P.alu);
    for (let y = 154; y < 172; y += 4) for (let x = 235 + (y % 8 ? 2 : 0); x < 258; x += 4) px(x, y, P.aluLo);
    bolt(236, 153); bolt(256, 170);
  }
  if (E2.turbo) {
    drawHose(g, 'mangIcCal', [[282, 186], [282, 210]]);
    if (has(c, 'tuboAdm')) pipe([[300, 62], [300, 150], [296, 160]], 9, P.blk, P.blkHi);
    else { R(296, 60, 9, 4, P.blkLo); }
  } else if (has(c, 'tuboAdm')) pipe([[264, 18], [112, 18], [104, 32]], 9, P.blk, P.blkHi);

  // banda, poleas y alternador
  drawBelt(g);
  drawAlternator(g);
  OX = 0; OY = 0;
  drawCofreRest(g);
}
function drawCofreRest(g) {
  const c = g.car, s = c.sim;
  if (!hasTurbo(c)) { /* atmosférico: sin intercooler ni BOV */ }
  else {

  // manguera fría y BOV (están sujetas a la carrocería y al motor)
  drawHose(g, 'mangIcFria', [[48, 208], [48, 66], [98, 66], [104, 50]]);
  if (has(c, 'bov')) { box(28, 146, 14, 14, P.alu, P.aluHi, P.aluLo); disc(35, 153, 3, P.aluLo); R(34, 152, 3, 3, P.aluHi); pipe([[35, 146], [35, 140], [42, 140]], 1, P.blk); if (s.time - s.bovT < 0.3) for (let i = 0; i < 5; i++) px(26 - Math.random() * 8, 150 + Math.random() * 8, '#d7dbe0'); }
  else if (has(c, 'mangIcFria')) { disc(42, 153, 2, P.ink); }
  }
  // tapón del radiador
  if (has(c, 'tapaRad')) { disc(306, 198, 6, P.ink); disc(306, 198, 5, P.steelHi); disc(306, 198, 3, P.alu); R(303, 197, 7, 2, P.yel); }
  else { disc(306, 198, 5, P.ink); disc(306, 198, 4, c.cool.level > 0.7 ? P.cool : P.coolLo); }

  // humo y vapor
  if (s.running && !has(c, 'tapaRad') && s.ECT > 95) steamPuff(g, 306, 190);
  if (s.ECT > 120) steamPuff(g, 300, 196);
  if (s.running && !has(c, 'tapaAceite')) if (Math.random() < 0.3) px(246 + (Math.random() * 6 - 3), 66 - Math.random() * 8, '#c9c3b0');
  if (c.oil.floor > 0.05) { /* charco: se ve en la vista de abajo */ }
}

function steamPuff(g, x, y) {
  for (let i = 0; i < 6; i++) {
    const a = (g.t * 3 + i * 0.37) % 1;
    disc(x + Math.sin(i * 7 + g.t * 2) * 6 * a, y - a * 30, Math.round(1 + a * 4), a < 0.6 ? '#d7dbe0' : '#9da3ab');
  }
}

function drawBattery(g) {
  const c = g.car;
  if (has(c, 'bateria')) {
    const b = itemOf(c, 'bateria');
    box(8, 22, 46, 36, P.blk, P.blkHi, P.blkLo);
    box(10, 24, 42, 8, P.blkHi, '#4a4c54', P.blk);
    R(12, 40, 38, 6, P.blue); label(31, 41, '12V 45AH', '#0d2a44', 4, 'center');
    R(20, 50, 22, 2, P.steelLo);
    if (b.seen && b.health < 0.5) { R(14, 20, 4, 2, '#cfe8c8'); R(42, 20, 3, 2, '#cfe8c8'); }
    // postes
    R(15, 18, 5, 4, P.grey); R(42, 18, 5, 4, P.grey);
  } else {
    box(8, 26, 46, 32, P.steelLo, P.steel, P.ink);
    R(12, 30, 38, 24, P.bay);
  }
  // terminales
  const negOn = c.slots.batNeg.on, posOn = c.slots.batPos.on;
  if (negOn && has(c, 'bateria')) { box(12, 15, 11, 8, P.blkHi, P.grey, P.blk); bolt(17, 19); }
  else { box(12, 6, 10, 7, P.blkHi, P.grey, P.blk); }
  pipe([[17, negOn ? 15 : 7], [17, 2]], 3, P.blk);
  if (posOn && has(c, 'bateria')) { box(39, 15, 12, 8, P.red, '#ef6a5e', P.redLo); bolt(45, 19); }
  else { box(54, 8, 11, 7, P.red, '#ef6a5e', P.redLo); }
  pipe([[posOn ? 45 : 59, posOn ? 15 : 8], [62, 4]], 3, P.redLo);
}

function drawFuse(c, id) {
  const [x, y] = c.defs[id].r;
  if (has(c, id)) { R(x, y, 9, 12, P.ink); R(x + 1, y + 1, 7, 10, '#3d7ccf'); R(x + 2, y + 2, 5, 3, '#9cc7f2'); label(x + 4.5, y + 6, '15', '#0e2440', 3.5, 'center'); }
  else { R(x, y, 9, 12, P.ink); R(x + 2, y + 3, 1, 6, P.aluLo); R(x + 6, y + 3, 1, 6, P.aluLo); }
}

function drawCoilWell(g, i) {
  const c = g.car, Pp = cylPos(MOTORES[c.engId])[i], x = Pp.x, y0 = Pp.y, hh = Pp.h, cyw = y0 + Math.round(hh / 2) + 1;
  const bob = 'bob' + (i + 1), buj = 'buj' + (i + 1);
  // pozo de bujía
  disc(x, cyw, 5, P.aluLo); disc(x, cyw, 4, P.blkLo);
  if (has(c, buj)) {
    if (!has(c, bob)) { disc(x, cyw, 3, P.white); disc(x, cyw, 1, P.grey); }
  } else { disc(x, cyw, 3, P.ink); px(x - 1, cyw - 1, '#3a2c0c'); }
  if (has(c, bob)) {
    box(x - 5, y0, 10, hh, P.blk, P.blkHi, P.blkLo);
    box(x - 4, y0, 8, Math.min(8, hh - 4), P.grey, P.aluHi, P.aluLo);
    bolt(x, y0 + hh - 4);
  }
}

function drawHose(g, id, pts) {
  const c = g.car;
  if (has(c, id)) {
    const it = itemOf(c, id);
    pipe(pts, 9, P.blk, P.blkHi);
    if (it.seen && it.health < 0.6) {
      const [ax, ay] = pts[0], [bx, by] = pts[1];
      const mx = Math.round((ax + bx) / 2), my = Math.round((ay + by) / 2);
      line(mx - 3, my - 2, mx + 2, my + 1, P.hot); line(mx - 1, my + 2, mx + 3, my - 1, P.hot);
    }
    for (const p of [pts[0], pts[pts.length - 1]]) { R(p[0] - 5, p[1] - 2, 11, 3, P.aluLo); px(p[0] + 4, p[1] - 1, P.aluHi); }
  } else {
    for (const p of [pts[0], pts[pts.length - 1]]) { disc(p[0], p[1], 4, P.ink); disc(p[0], p[1], 3, P.alu); disc(p[0], p[1], 2, P.blkLo); }
  }
}

function drawTurboTop(g) {
  const c = g.car, s = c.sim;
  if (!has(c, 'turbo')) {
    disc(246, 170, 8, P.ink); disc(246, 170, 6, P.rust); disc(246, 170, 3, P.blkLo);
    bolt(240, 164); bolt(252, 164); bolt(240, 176); bolt(252, 176);
    return;
  }
  const hot = heatCol(s.Tt, P.rust);
  disc(246, 170, 15, P.ink); disc(246, 170, 14, hot); disc(244, 168, 9, lerpC(hot, P.rustHi, 0.4)); disc(246, 170, 5, P.blkLo);
  box(258, 161, 12, 18, P.steel, P.steelHi, P.steelLo);
  disc(282, 170, 15, P.ink); disc(282, 170, 14, P.alu); disc(280, 168, 10, P.aluHi); disc(282, 170, 7, P.aluLo);
  // rueda del compresor visible si quitaron el tubo de admisión
  if (!has(c, 'tuboAdm')) {
    disc(282, 170, 6, P.blkLo);
    const a = g.turboAng;
    for (let k = 0; k < 6; k++) { const an = a + k * Math.PI / 3; line(282, 170, 282 + Math.cos(an) * 5, 170 + Math.sin(an) * 5, P.aluHi); }
    disc(282, 170, 1, P.alu);
  } else disc(282, 170, 5, P.blk);
  pipe([[282, 184], [282, 188]], 7, P.alu, P.aluHi);
}

function drawBelt(g) {
  const c = g.car, s = c.sim;
  const pul = [[76, 138, 10], [70, 108, 6], [88, 84, 5], [96, 118, 4]];
  for (const [x, y, r] of pul) { disc(x, y, r + 1, P.ink); disc(x, y, r, P.steelHi); disc(x, y, Math.max(1, r - 3), P.steelLo); }
  if (has(c, 'banda')) {
    const pts = [[66, 140], [64, 108], [70, 101], [84, 79], [93, 84], [100, 118], [86, 141], [76, 149], [66, 140]];
    for (let i = 0; i < pts.length - 1; i++) seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3, P.blk);
    const it = itemOf(c, 'banda');
    const off = (g.beltPos || 0);
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay);
      for (let d = (6 - ((off + acc) % 6) + 6) % 6; d < L; d += 6) px(ax + (bx - ax) * d / L, ay + (by - ay) * d / L, it.seen && it.health < 0.5 ? P.grey : P.blkHi);
      acc += L;
    }
  }
  // tensor
  R(94, 118, 10, 3, P.steel); bolt(102, 119);
}

function drawAlternator(g) {
  const c = g.car;
  if (has(c, 'alternador')) {
    box(58, 70, 32, 26, P.alu, P.aluHi, P.aluLo);
    for (let y = 74; y < 92; y += 3) R(62, y, 18, 1, P.aluLo);
    disc(88, 84, 5, P.steelHi); disc(88, 84, 2, P.steelLo);
    box(60, 72, 6, 5, P.red, '#ef6a5e', P.redLo);
    bolt(62, 92); bolt(84, 74);
  } else {
    R(58, 72, 32, 22, P.bay2); bolt(62, 92); bolt(84, 74);
  }
}

/* =====================================================================
   VISTA: ABAJO (debajo del auto en el elevador)
   ===================================================================== */
function drawAbajo(g) {
  const c = g.car, s = c.sim;
  R(0, 0, W, H, '#191b20');
  for (let y = 0; y < H; y += 10) R(0, y, W, 1, '#1f2227');
  // largueros
  box(46, 0, 10, H, P.steelLo, P.steel, P.ink); box(264, 0, 10, H, P.steelLo, P.steel, P.ink);
  box(46, 120, 228, 10, P.steelLo, P.steel, P.ink);
  // transmisión
  if (c.caja) { box(14, 26, 92, 86, P.alu, P.aluHi, P.aluLo); for (let y = 34; y < 104; y += 8) R(20, y, 80, 1, P.aluLo); label(60, 30, CAJAS[c.caja.id].short, '#4b525c', 4.5, 'center'); }
  else label(60, 60, 'SIN CAJA', P.yel, 5, 'center');
  if (!c.engId) { R(108, 58, 104, 84, '#191b20'); label(160, 96, 'SIN MOTOR', P.yel, 6, 'center'); }
  // cárter
  box(108, 58, 104, 84, P.steel, P.steelHi, P.steelLo);
  for (let x = 116; x < 206; x += 10) R(x, 64, 2, 70, P.steelLo);
  label(160, 62, 'CÁRTER', '#7c8592', 4.5, 'center');
  // tapón
  if (has(c, 'tapon')) { box(154, 127, 12, 10, P.aluLo, P.aluHi, P.steelLo); R(158, 130, 4, 4, P.alu); }
  else { disc(160, 132, 4, P.ink); disc(160, 132, 2, '#2a210a'); }
  // goteo de aceite
  const dripping = c.cfg && (c.cfg.taponLeak > 0) && c.oil.level > 0.05;
  if (dripping) {
    const fast = c.cfg.taponLeak >= 1;
    const n = fast ? 8 : 1;
    for (let i = 0; i < n; i++) {
      const a = (g.t * (fast ? 2.5 : 0.7) + i / n) % 1;
      if (fast) R(158, 138 + a * 80, 4, 4, P.oil); else if (a < 0.5) R(159, 138 + a * 40, 2, 2, P.oil);
    }
  }
  // filtro de aceite
  if (has(c, 'filtroAceite')) { box(213, 74, 24, 30, '#2e5f9e', '#4f86c9', '#1d3e69'); R(215, 80, 20, 2, '#1d3e69'); R(215, 96, 20, 2, '#1d3e69'); label(225, 86, 'OIL', '#9ec3ee', 4, 'center'); }
  else { disc(225, 89, 9, P.steelLo); disc(225, 89, 5, P.ink); disc(225, 89, 2, P.alu); }
  // marcha
  if (has(c, 'marcha')) { box(62, 84, 40, 22, P.blk, P.blkHi, P.blkLo); box(64, 86, 14, 8, P.aluLo, P.alu, P.steel); disc(98, 95, 6, P.steel); bolt(70, 102); bolt(94, 86); }
  else { R(62, 86, 40, 18, '#22252b'); bolt(70, 102); bolt(94, 86); }
  // escape
  pipe([[250, 240], [250, 150], [250, 110]], 10, P.rust, P.rustHi);
  box(238, 58, 26, 54, P.steelLo, P.steel, P.ink);
  label(251, 80, 'CAT', '#7c8592', 4, 'center');
  pipe([[250, 58], [250, 0]], 10, P.steel, P.steelHi);
  if (has(c, 'sensorO2')) { box(256, 144, 16, 12, P.steelHi, P.aluHi, P.steel); R(258, 148, 6, 4, P.yel); pipe([[270, 150], [280, 140], [276, 120]], 1, P.blk); }
  else { disc(258, 150, 2, P.ink); }
  // ruedas
  drawWheel(g, 'ruedaI', 'balataI', 6);
  drawWheel(g, 'ruedaD', 'balataD', 278);
  // charola
  if (c.pan) {
    box(128, 150, 64, 18, P.blk, P.blkHi, P.blkLo);
    const lv = Math.min(1, c.oil.pan / 5);
    if (lv > 0) R(131, 166 - Math.round(lv * 13), 58, Math.round(lv * 13), c.oil.quality < 0.5 ? '#3a2e10' : P.oil);
    label(160, 158, c.oil.pan > 0.05 ? c.oil.pan.toFixed(1) + ' L' : 'CHAROLA', '#c8ccd2', 4, 'center');
  }
  if (c.oil.floor > 0.05) {
    const r = Math.min(26, 4 + c.oil.floor * 6);
    wx.globalAlpha = 0.6; disc(160, 214, Math.round(r), '#2a210a'); disc(160, 214, Math.round(r * 0.6), '#3c2f0f'); wx.globalAlpha = 1;
    label(160, 226, 'ACEITE EN EL PISO', P.oil, 4, 'center');
  }
  // radiador inferior
  box(20, 218, 280, 12, P.blk, P.blkHi, P.blkLo);
  if (!g.car.lift) {
    wx.globalAlpha = 0.82; R(0, 0, W, H, '#0b0c0f'); wx.globalAlpha = 1;
    label(160, 104, 'EL AUTO ESTÁ ABAJO', P.yel, 8, 'center');
    label(160, 120, 'SUBE EL ELEVADOR PARA TRABAJAR AQUÍ', P.white, 5, 'center');
  }
}

function drawWheel(g, rid, bid, x) {
  const c = g.car;
  const y = 138;
  if (has(c, rid)) {
    box(x, y, 36, 66, P.blk, P.blkHi, P.blkLo);
    for (let yy = y + 4; yy < y + 62; yy += 5) R(x + 2, yy, 32, 2, '#26272c');
    box(x + 8, y + 18, 20, 30, P.alu, P.aluHi, P.aluLo);
    for (const [bx, by] of [[x + 13, y + 26], [x + 23, y + 26], [x + 13, y + 40], [x + 23, y + 40]]) bolt(bx, by, P.aluHi);
  } else {
    disc(x + 18, y + 33, 16, P.steelLo); disc(x + 18, y + 33, 14, '#5d646f'); disc(x + 18, y + 33, 5, P.steel);
    for (const [bx, by] of [[x + 13, y + 28], [x + 23, y + 28], [x + 13, y + 38], [x + 23, y + 38]]) R(bx - 1, by - 1, 2, 4, P.aluHi);
    const it = itemOf(c, bid);
    if (it) {
      const bx = x === 6 ? 14 : 284;
      box(bx, 154, 22, 34, P.red, '#ef6a5e', P.redLo);
      const th = Math.max(1, Math.round(it.thick / 11 * 5));
      R(bx + 3, 158, th, 26, '#6b5a43'); R(bx + 19 - th, 158, th, 26, '#6b5a43');
      bolt(bx + 11, 158); bolt(bx + 11, 184);
    }
  }
}

/* =====================================================================
   VISTA: MOTOR EN CORTE (rayos X, como en un diagrama)
   ===================================================================== */
const CUT = { cx: 140, crankY: 172, r: 14, l: 68 };
const PATHS = {};
function mkPath(pts) {
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1] };
}
function swirl(cx, cy, r, a0, a1, n) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function buildPaths() {
  const comp = swirl(282, 72, 9, 0, -Math.PI * 1.5, 10);
  PATHS.intake = mkPath([[306, 32], [306, 72], [292, 72], ...comp, [272, 84], [282, 92], [282, 220], [20, 220], [20, 202], [20, 118], [20, 56], [58, 56], [72, 56], [96, 60], [118, 70], [128, 78]]);
  PATHS.intake.marks = { comp: 3, ic: 17, ic2: 19 };
  PATHS.intakeNA = mkPath([[306, 32], [306, 220], [20, 220], [20, 56], [58, 56], [72, 56], [96, 60], [118, 70], [128, 78]]);
  PATHS.intakeNA.marks = { comp: 99, ic: 99, ic2: 99 };
  PATHS.exhaustNA = mkPath([[152, 78], [158, 72], [176, 64], [204, 64], [222, 72], [230, 88], [230, 172]]);
  const turb = swirl(230, 72, 9, Math.PI, Math.PI * 2.4, 10);
  PATHS.exhaust = mkPath([[152, 78], [158, 72], [176, 64], [204, 64], [214, 70], ...turb, [230, 88], [230, 172]]);
  PATHS.wg = mkPath([[152, 78], [158, 72], [176, 64], [204, 64], [208, 74], [208, 108], [226, 110], [230, 120], [230, 172]]);
  PATHS.bov = mkPath([[20, 86], [2, 86]]);
  PATHS.oil = mkPath([[150, 200], [178, 200], [256, 200], [256, 82]]);
  PATHS.leakC = mkPath([[20, 150], [2, 146]]);
  PATHS.leakH = mkPath([[282, 150], [304, 146]]);
}
function pathPos(p, d) {
  const L = p.L;
  if (d <= 0) return p.pts[0];
  if (d >= p.len) return p.pts[p.pts.length - 1];
  let i = 1; while (L[i] < d) i++;
  const t = (d - L[i - 1]) / (L[i] - L[i - 1]);
  const a = p.pts[i - 1], b = p.pts[i];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, i];
}
const PARTS_FX = [];
function spawn(path, speed, kind) { if (PARTS_FX.length < 420) PARTS_FX.push({ path, d: 0, v: speed, kind }); }

function stepFx(g, dt) {
  const c = g.car, s = c.sim;
  const slow = g.slow;
  const mt = Math.max(0, s.mThr), me = Math.max(0, s.mEng);
  const vi = 30 + mt * 2600, ve = 40 + me * 2600;
  g.acc = g.acc || { i: 0, e: 0, w: 0, b: 0, o: 0, l: 0 };
  const A = g.acc;
  if (s.om > 5 || mt > 0.0005) A.i += dt * (4 + mt * 700);
  if (s.running) { A.e += dt * (4 + me * 700) * (1 - s.wg * 0.8); A.w += dt * me * 700 * s.wg; }
  if (s.bovOpen || s.time - s.bovT < 0.25) A.b += dt * 60;
  if (s.oilP > 0.1 && hasTurbo(c)) A.o += dt * (2 + s.oilP * 4);
  if (s.mLeak > 0.002 && s.Pc > PH.Pa + 3000) A.l += dt * s.mLeak * 2000;
  const na = !hasTurbo(c);
  if (!c.engId) { A.i = A.e = 0; }
  while (A.i >= 1) { A.i--; spawn(na ? 'intakeNA' : 'intake', vi, 'air'); }
  while (A.e >= 1) { A.e--; spawn(na ? 'exhaustNA' : 'exhaust', ve, 'ex'); }
  while (A.w >= 1) { A.w--; spawn('wg', ve, 'ex'); }
  while (A.b >= 1) { A.b--; spawn('bov', 120, 'bov'); }
  while (A.o >= 1) { A.o--; spawn('oil', 30 + s.oilP * 20, 'oil'); }
  while (A.l >= 1) { A.l--; const cold = c.cfg && itemOf(c, 'mangIcCal') && itemOf(c, 'mangIcCal').health >= 0.6; spawn(cold ? 'leakC' : 'leakH', 90, 'leak'); }
  for (let i = PARTS_FX.length - 1; i >= 0; i--) {
    const p = PARTS_FX[i];
    const v = p.kind === 'air' ? vi : (p.kind === 'ex' ? ve : p.v);
    p.d += v * dt;
    if (p.d >= PATHS[p.path].len) PARTS_FX.splice(i, 1);
  }
}

function drawCorte(g) {
  const c = g.car, s = c.sim, cfg = c.cfg || {};
  R(0, 0, W, H, '#14171c');
  for (let x = 0; x < W; x += 16) R(x, 0, 1, H, '#181b21');
  for (let y = 0; y < H; y += 16) R(0, y, W, 1, '#181b21');
  if (!c.engId) { label(160, 110, 'NO HAY MOTOR EN ESTE AUTO', P.yel, 7, 'center'); return; }
  const E = engP(c), na = !E.e.turbo;
  const Tc = s.Tm, boost = s.Pc - PH.Pa;
  const coldCol = P.blue, hotAir = lerpC(P.blue, P.hot, Math.min(1, Math.max(0, (Tc - 300) / 90)));
  // caja de aire y filtro
  box(272, 4, 44, 28, P.blk, P.blkHi, P.blkLo);
  const fH = has(c, 'filtroAire') ? itemOf(c, 'filtroAire').health : 1;
  for (let x = 276; x < 312; x += 3) R(x, 9, 2, 18, g.mode === 'lab' ? lerpC('#6b5a3a', '#e8dcae', fH) : '#d9cfa6');
  if (!has(c, 'filtroAire')) R(275, 8, 38, 20, P.blkLo);
  // tubo filtro → compresor
  if (na) pipe([[306, 32], [306, 220], [20, 220], [20, 56], [58, 56]], 8, has(c, 'tuboAdm') ? '#3a3d45' : P.blkLo, '#50545e');
  else {
  pipe([[306, 32], [306, 72], [296, 72]], 8, P.blk, P.blkHi);
  // tubería de presión: compresor → intercooler → mariposa
  const hot = has(c, 'mangIcCal'), cold = has(c, 'mangIcFria');
  pipe([[278, 86], [282, 92], [282, 220], [20, 220], [20, 204]], 8, hot ? '#3a3d45' : P.blkLo, '#50545e');
  box(6, 116, 28, 90, P.alu, P.aluHi, P.aluLo);
  for (let y = 120; y < 202; y += 3) R(9, y, 22, 1, P.aluLo);
  pipe([[20, 116], [20, 56], [58, 56]], 8, cold ? '#3a3d45' : P.blkLo, '#50545e');
  }
  // BOV
  if (has(c, 'bov')) { box(24, 80, 12, 12, P.alu, P.aluHi, P.aluLo); R(26 + (s.bovOpen ? 2 : 0), 83, 3, 6, P.aluHi); }
  // mariposa
  box(56, 46, 18, 20, P.alu, P.aluHi, P.aluLo);
  const ta = (1 - g.thrNow) * 1.2 + 0.25;
  line(65 - Math.cos(ta) * 6, 56 - Math.sin(ta) * 6, 65 + Math.cos(ta) * 6, 56 + Math.sin(ta) * 6, P.ink);
  // múltiple / puerto de admisión
  pipe([[72, 56], [96, 60], [118, 70], [126, 76]], 9, P.steel, P.steelHi);
  // cabeza
  box(106, 40, 68, 40, P.steel, P.steelHi, P.steelLo);
  // pistón: elegir cilindro
  const ci = Math.min(g.cyl, E.n - 1);
  let phi = (g.thv - E.offs[ci]) % FOURPI; if (phi < 0) phi += FOURPI;
  const th = phi % (2 * Math.PI);
  const pinY = CUT.crankY - (CUT.r * Math.cos(th) + Math.sqrt(CUT.l * CUT.l - Math.pow(CUT.r * Math.sin(th), 2)));
  const pistTop = Math.round(pinY - 8);
  // camisa con refrigerante
  const ectC = lerpC(P.blue, P.red, (s.ECT - 30) / 90);
  R(112, 78, 6, 58, c.cool.level > 0.4 ? ectC : P.blkLo); R(162, 78, 6, 58, c.cool.level > 0.4 ? ectC : P.blkLo);
  R(118, 78, 44, 58, P.steelLo);
  // carga dentro del cilindro
  const deg = phi * 180 / Math.PI;
  let gas = '#1e2a38';
  const fired = !s.cylMis[ci] && s.running;
  if (deg < 60 && s.running) gas = fired ? lerpC(P.glow, P.hot, deg / 60) : '#3c4450';
  else if (deg < 180) gas = s.running && fired ? lerpC(P.hot, '#5a3a2a', (deg - 60) / 120) : '#2b323c';
  else if (deg < 360) gas = '#4a3a33';
  else if (deg < 540) gas = lerpC('#1e2a38', '#24476b', (deg - 360) / 180);
  else gas = lerpC('#24476b', '#2f5f90', (deg - 540) / 180);
  R(120, 78, 40, Math.max(0, pistTop - 78), gas);
  // chispa
  if (deg > 700 || deg < 6) { if (s.ecuOn && cfg.coil && cfg.coil[ci] > 0.35 && cfg.plug[ci] > 0) { R(139, 76, 3, 3, '#fff6c2'); px(137, 77, P.yel); px(143, 77, P.yel); } }
  // bujía y bobina
  R(138, 30, 5, 10, P.blk); R(139, 40, 3, 12, P.white); R(139, 52, 3, 24, P.aluLo);
  // árboles de levas y válvulas
  const camA = g.thv / 2;
  const lift = (open, close) => { let d = deg; if (close < open) { if (d < open && d > close) return 0; const span = 720 - open + close; const x = (d >= open ? d - open : d + 720 - open) / span; return Math.sin(x * Math.PI); } if (d < open || d > close) return 0; return Math.sin((d - open) / (close - open) * Math.PI); };
  const li = lift(350, 590), le = lift(140, 380);
  drawCam(128, 50, camA - 2.6, P.steelHi); drawCam(152, 50, camA - 0.6, P.steelHi);
  R(127, 56 + li * 5, 2, 18, P.aluHi); R(122, 74 + li * 5, 12, 2, P.aluHi);
  R(151, 56 + le * 5, 2, 18, P.aluHi); R(146, 74 + le * 5, 12, 2, P.aluHi);
  // puerto de escape
  pipe([[154, 76], [160, 70], [176, 64], [204, 64], [212, 70]], 9, heatCol(s.T3, P.rust), P.rustHi);
  // wastegate
  if (!na) {
  pipe([[206, 66], [208, 108], [226, 110]], 5, heatCol(s.T3, P.rust));
  const wgA = s.wg;
  R(204, 84, 9, 3, P.aluHi); R(204 + Math.round(wgA * 3), 87, 3, 6 - Math.round(wgA * 3), P.yel);
  box(188, 82, 14, 14, P.alu, P.aluHi, P.aluLo); line(201, 89, 206, 86, P.aluHi);
  } else pipe([[212, 70], [230, 88], [230, 172]], 8, s.running ? heatCol(s.T3 - 120, P.rust) : P.rust, P.rustHi);
  // pistón, biela, cigüeñal
  box(121, pistTop, 38, 14, P.alu, P.aluHi, P.aluLo);
  R(121, pistTop + 3, 38, 1, P.steelLo); R(121, pistTop + 6, 38, 1, P.steelLo);
  const cpx = CUT.cx + CUT.r * Math.sin(th), cpy = CUT.crankY - CUT.r * Math.cos(th);
  R(108, 136, 64, 58, '#1b1e24'); box(106, 136, 68, 58, '#1b1e24', null, null, P.steelLo);
  disc(CUT.cx, CUT.crankY, 17, P.steelLo);
  const cwx = CUT.cx - (CUT.r + 2) * Math.sin(th), cwy = CUT.crankY + (CUT.r + 2) * Math.cos(th);
  disc(Math.round(cwx), Math.round(cwy), 9, P.steel);
  seg(CUT.cx, pistTop + 8, cpx, cpy, 5, P.ink); seg(CUT.cx, pistTop + 8, cpx, cpy, 3, P.aluLo);
  disc(Math.round(cpx), Math.round(cpy), 4, P.steelHi); disc(CUT.cx, CUT.crankY, 3, P.aluHi);
  disc(CUT.cx, pistTop + 8, 2, P.aluHi);
  // cárter con aceite
  box(104, 192, 72, 18, P.steel, P.steelHi, P.steelLo);
  const ol = Math.max(0, Math.min(1, c.oil.level / (E.e.oil * 1.12)));
  R(106, 208 - Math.round(ol * 14), 68, Math.round(ol * 14), c.oil.quality < 0.4 ? '#4a3a12' : P.oil);
  box(144, 194, 12, 10, P.aluLo, P.alu, P.steel);
  if (!na) pipe([[156, 200], [256, 200], [256, 82]], 2, P.oilDk);
  // turbo: compresor y turbina
  const tH = has(c, 'turbo');
  if (na) { label(256, 66, 'ATMOSFÉRICO', P.grey, 5, 'center'); }
  else if (tH) {
    disc(230, 72, 17, P.ink); disc(230, 72, 16, heatCol(s.Tt, P.rust)); disc(230, 72, 11, '#2a1a14');
    drawWheelBlades(230, 72, 10, g.turboAng, heatCol(s.Tt, P.rustHi), cfg.turboH);
    box(244, 64, 24, 16, P.steel, P.steelHi, P.steelLo);
    R(246, 71, 20, 2, P.aluHi);
    disc(282, 72, 17, P.ink); disc(282, 72, 16, P.alu); disc(282, 72, 11, P.aluLo);
    drawWheelBlades(282, 72, 10, -g.turboAng, P.aluHi, cfg.turboH);
    pipe([[230, 88], [230, 172]], 8, s.running ? heatCol(s.T3 - 120, P.rust) : P.rust, P.rustHi);
  } else {
    label(256, 66, 'SIN TURBO', P.red, 5, 'center');
  }
  // partículas
  for (const p of PARTS_FX) {
    const path = PATHS[p.path];
    let d = p.d;
    const pos = pathPos(path, d);
    let col = P.blue;
    if (p.kind === 'air') {
      const k = pos[2] || 0, m = path.marks;
      if (k <= m.comp) col = coldCol;
      else if (k <= m.ic2) col = lerpC(P.blue, P.hot, Math.min(1, Math.max(0, (s.Pc / PH.Pa - 1) * 1.3)));
      else col = hotAir;
    } else if (p.kind === 'ex') col = lerpC(P.glow, '#8a8f99', d / path.len);
    else if (p.kind === 'bov') col = '#cfd8e2';
    else if (p.kind === 'oil') col = c.oil.quality < 0.4 ? '#7a5c18' : P.oil;
    else if (p.kind === 'leak') col = '#cfd8e2';
    R(pos[0] - 1, pos[1] - 1, p.kind === 'oil' ? 2 : 3, p.kind === 'oil' ? 2 : 3, col);
  }
  // humo del escape
  const sm = s.smoke;
  if (s.running) {
    for (let i = 0; i < 10; i++) {
      const a = (g.t * 1.2 + i / 10) % 1;
      let col = '#8a8f99', alpha = 0.18 + 0.5 * Math.max(sm.b, sm.k, sm.w);
      if (sm.b > 0.15) col = '#7f9fd6'; else if (sm.k > 0.2) col = '#1d1d22'; else if (sm.w > 0.15) col = '#eef2f5';
      wx.globalAlpha = alpha * (1 - a);
      disc(Math.round(230 + a * 24 + Math.sin(i * 3 + g.t) * 3), Math.round(176 + a * 34), Math.round(2 + a * 6), col);
    }
    wx.globalAlpha = 1;
  }
  // tira de cilindros (orden de encendido)
  const names = ['ADM', 'COMP', 'EXP', 'ESC'];
  const cw = E.n <= 4 ? 22 : E.n <= 6 ? 15 : 11;
  for (let i = 0; i < E.n; i++) {
    const x = 4 + i * cw, y = 4;
    let ph = (g.thv - E.offs[i]) % FOURPI; if (ph < 0) ph += FOURPI;
    const st = ph < Math.PI ? 2 : ph < 2 * Math.PI ? 3 : ph < 3 * Math.PI ? 0 : 1;
    const flash = s.running && st === 2 && ph < 1.0;
    box(x, y, cw - 2, 26, i === ci ? P.yel : P.steel, null, null, i === ci ? P.yelLo : P.ink);
    R(x + 2, y + 2, cw - 6, 14, flash ? (s.cylMis[i] ? '#3c4450' : P.hot) : '#1e2a38');
    const py = y + 4 + Math.round((1 - Math.cos(ph % (2 * Math.PI))) * 4);
    R(x + 3, py, cw - 8, 4, P.aluHi);
    label(x + (cw - 2) / 2, y + 18, String(i + 1), i === ci ? P.ink : P.white, 5, 'center');
    if (s.running && E.n <= 4) label(x + 10, y + 28, names[st], P.grey, 3.5, 'center');
  }
  label(4, 38, 'ORDEN ' + E.e.order.map(k => k + 1).join('-'), P.grey, 3.5);
  if (g.slow > 1.5 && s.om > 5) label(316, 226, 'VISTA LENTA ×' + Math.round(g.slow), P.grey, 4, 'right');

  if (g.labels) {
    label(294, 34, 'FILTRO', P.white, 4, 'center', 'rgba(0,0,0,.55)');
    if (!na) {
    label(282, 94, 'COMPRESOR', '#9fd0f5', 4.5, 'center', 'rgba(0,0,0,.55)');
    label(222, 94, 'TURBINA', '#ffb37a', 4.5, 'center', 'rgba(0,0,0,.55)');
    label(256, 52, 'EJE', P.white, 4, 'center', 'rgba(0,0,0,.55)');
    label(192, 100, 'WASTEGATE', P.yel, 4, 'center', 'rgba(0,0,0,.55)');
    label(20, 208, 'INTER', '#9fd0f5', 4, 'center', 'rgba(0,0,0,.55)');
    label(30, 72, 'BOV', P.white, 4, 'left', 'rgba(0,0,0,.55)');
    label(200, 190, 'ACEITE AL TURBO', P.oil, 4, 'center', 'rgba(0,0,0,.55)');
    }
    label(65, 38, 'MARIPOSA', P.white, 4, 'center', 'rgba(0,0,0,.55)');
    label(232, 176, 'ESCAPE', '#c8ccd2', 4, 'left', 'rgba(0,0,0,.55)');
    label(140, 214, 'CÁRTER', P.oil, 4, 'center', 'rgba(0,0,0,.55)');
    label(140, 24, 'BUJÍA', P.white, 4, 'center', 'rgba(0,0,0,.55)');
  }
}
function drawCam(x, y, a, col) {
  disc(x, y, 5, P.ink); disc(x, y, 4, col);
  const lx = x + Math.cos(a) * 5, ly = y + Math.sin(a) * 5;
  disc(Math.round(lx), Math.round(ly), 2, col);
}
function drawWheelBlades(cx, cy, r, a, col, health) {
  const wob = health !== undefined && health < 0.35 ? (Math.random() - 0.5) * 2 : 0;
  for (let k = 0; k < 8; k++) {
    const an = a + k * Math.PI / 4;
    line(cx + wob, cy, cx + wob + Math.cos(an) * r, cy + Math.sin(an) * r, col);
    line(cx + wob, cy, cx + wob + Math.cos(an + 0.25) * r * 0.7, cy + Math.sin(an + 0.25) * r * 0.7, col);
  }
  disc(cx + Math.round(wob), cy, 2, P.aluHi);
}

/* =====================================================================
   Marco: selección, ocupado, y composición final
   ===================================================================== */
function drawSelection(g) {
  const id = g.sel;
  if (!id || g.view === 'corte') return;
  const d = g.car.defs[id];
  if (!d || d.view !== g.view) return;
  const [x, y, w, h] = d.r;
  const on = Math.floor(g.t * 4) % 2;
  const col = on ? P.yel : P.white;
  for (let i = 0; i < w; i += 2) { px(x + i, y - 1, col); px(x + i, y + h, col); }
  for (let i = 0; i < h; i += 2) { px(x - 1, y + i, col); px(x + w, y + i, col); }
}

function render(g) {
  wx.imageSmoothingEnabled = false;
  if (g.view === 'cofre') drawCofre(g);
  else if (g.view === 'abajo') drawAbajo(g);
  else drawCorte(g);
  drawSelection(g);
  if (g.busy) {
    const b = g.busy;
    const [x, y, w] = (g.car.defs[b.slot] || { r: [140, 100, 40] }).r;
    box(x + w / 2 - 16, y - 8, 32, 6, P.ink);
    R(x + w / 2 - 15, y - 7, Math.round(30 * Math.min(1, b.t / b.dur)), 4, P.yel);
  }
  dx.imageSmoothingEnabled = false;
  dx.drawImage(wc, 0, 0, W * SC, H * SC);
  flushLabels();
}

/* hit test: la pieza visible más pequeña bajo el dedo */
function hitTest(g, wxp, wyp) {
  let best = null, bestA = 1e9, bestD = 1e9;
  for (const id in g.car.defs) {
    const d = g.car.defs[id];
    if (d.view !== g.view) continue;
    if (!slotVisible(g.car, id)) continue;
    const [x, y, w, h] = d.r;
    const pad = 4;
    const inside = wxp >= x - pad && wxp <= x + w + pad && wyp >= y - pad && wyp <= y + h + pad;
    if (!inside) continue;
    const exact = wxp >= x && wxp <= x + w && wyp >= y && wyp <= y + h;
    const a = w * h + (exact ? 0 : 5000);
    const dd = Math.hypot(wxp - (x + w / 2), wyp - (y + h / 2));
    if (a < bestA || (a === bestA && dd < bestD)) { best = id; bestA = a; bestD = dd; }
  }
  return best;
}
function hitCorte(wxp, wyp) {
  if (wyp < 32 && wxp < 92) { const n = nCyl(G.car) || 4, cw = n <= 4 ? 22 : n <= 6 ? 15 : 11; return { cyl: Math.max(0, Math.min(n - 1, Math.floor((wxp - 4) / cw))) }; }
  const zones = [
    ['filtroAire', 270, 2, 48, 32], ['turbo', 212, 54, 88, 36], ['mangIcFria', 6, 48, 30, 160], ['bov', 22, 78, 16, 16],
    ['mangIcCal', 270, 88, 20, 136], ['buj' , 132, 24, 16, 56], ['tapon', 102, 190, 76, 22], ['lineaTurbo', 250, 82, 12, 120],
    ['sensorO2', 222, 120, 16, 52],
  ];
  for (const [id, x, y, w, h] of zones) if (wxp >= x && wxp <= x + w && wyp >= y && wyp <= y + h) return { slot: id };
  return null;
}

/* ---------- íconos pixel para herramientas y piezas ---------- */
const ICON_CACHE = {};
function makeIcon(key, fn) {
  if (ICON_CACHE[key]) return ICON_CACHE[key];
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
  const x = cv.getContext('2d');
  const r = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  fn(r);
  return (ICON_CACHE[key] = cv.toDataURL());
}
function toolIcon(id) {
  return makeIcon('t:' + id, r => {
    const k = P;
    switch (id) {
      case 'mano': r(4, 6, 8, 8, '#e0a77a'); r(4, 2, 2, 5, '#e0a77a'); r(7, 1, 2, 6, '#e0a77a'); r(10, 2, 2, 5, '#e0a77a'); r(12, 7, 2, 4, '#e0a77a'); r(5, 12, 6, 2, '#b07b54'); break;
      case 'llave10': case 'llave13': case 'llave14': case 'llave15': case 'llave17': {
        r(2, 2, 5, 5, k.alu); r(3, 3, 3, 3, k.bg); r(6, 6, 2, 2, k.alu); r(7, 7, 2, 2, k.alu); r(8, 8, 2, 2, k.alu); r(9, 9, 2, 2, k.aluHi); r(10, 10, 4, 4, k.alu); r(11, 11, 2, 2, k.bg); break; }
      case 'dado16': case 'dado19': case 'llave22': r(5, 2, 6, 9, k.alu); r(6, 3, 4, 3, k.bg); r(4, 11, 8, 2, k.steelHi); r(7, 13, 2, 3, k.aluLo); if (id === 'dado16') r(7, 4, 2, 1, k.red); break;
      case 'desarmador': r(3, 9, 5, 5, k.yel); r(7, 7, 2, 2, k.yelLo); r(8, 6, 2, 2, k.alu); r(10, 4, 2, 2, k.alu); r(12, 2, 2, 2, k.aluHi); break;
      case 'pinzas': r(3, 9, 3, 5, k.red); r(8, 9, 3, 5, k.red); r(5, 6, 3, 3, k.alu); r(6, 3, 2, 3, k.alu); r(7, 1, 1, 2, k.aluHi); break;
      case 'lampara': r(3, 6, 6, 4, k.yel); r(9, 5, 3, 6, k.alu); r(12, 4, 3, 8, '#fff6c2'); r(1, 7, 2, 2, k.blk); break;
      case 'multimetro': r(3, 1, 10, 14, k.yel); r(5, 3, 6, 4, '#a7c79a'); r(6, 4, 4, 1, k.ink); r(7, 9, 2, 2, k.ink); r(5, 12, 2, 2, k.red); r(9, 12, 2, 2, k.ink); break;
      case 'escaner': r(2, 2, 12, 12, k.blue); r(4, 4, 8, 5, '#0d2a44'); r(5, 5, 4, 1, k.grn); r(5, 7, 6, 1, k.grn); r(5, 11, 2, 2, k.white); r(9, 11, 2, 2, k.white); break;
      case 'torquimetro': r(1, 13, 3, 2, k.alu); r(3, 11, 3, 3, k.alu); r(5, 9, 3, 3, k.aluHi); r(7, 6, 4, 4, k.blk); r(10, 3, 3, 4, k.red); r(12, 1, 3, 3, k.aluHi); break;
      case 'llaveFiltro': r(3, 3, 9, 9, '#2e5f9e'); r(5, 5, 5, 5, k.bg); r(11, 9, 4, 5, k.alu); break;
      case 'compresimetro': disc16(r, 8, 6, 5, k.alu); r(5, 4, 6, 4, k.white); r(7, 5, 2, 2, k.red); r(7, 11, 2, 5, k.blk); break;
      case 'manoGas': disc16(r, 8, 6, 5, k.yel); r(5, 4, 6, 4, k.white); r(8, 5, 2, 1, k.ink); r(7, 11, 2, 5, k.red); break;
      case 'calibrador': for (let i = 0; i < 4; i++) r(3 + i, 3 + i * 2, 10 - i, 2, i % 2 ? k.alu : k.aluHi); break;
      case 'vernier': r(1, 6, 14, 3, k.aluHi); r(3, 2, 2, 5, k.aluHi); r(9, 2, 3, 8, k.alu); for (let i = 2; i < 14; i += 2) r(i, 8, 1, 1, k.ink); break;
      case 'charola': r(1, 8, 14, 5, k.blk); r(2, 8, 12, 2, k.oil); r(1, 13, 14, 1, k.blkHi); break;
      case 'embudo': r(3, 3, 10, 2, k.red); r(4, 5, 8, 2, k.red); r(6, 7, 4, 2, k.red); r(7, 9, 2, 5, k.redLo); break;
      default: r(4, 4, 8, 8, k.grey);
    }
  });
}
function disc16(r, cx, cy, rad, c) { for (let y = -rad; y <= rad; y++) { const w = Math.floor(Math.sqrt(rad * rad - y * y)); r(cx - w, cy + y, 2 * w + 1, 1, c); } }
function partIcon(type, health) {
  return makeIcon('p:' + type + ':' + (health < 0.5 ? 'b' : 'g'), r => {
    const k = P, bad = health < 0.5;
    switch (type) {
      case 'bateria': r(1, 4, 14, 10, k.blk); r(3, 2, 3, 2, k.grey); r(10, 2, 3, 2, k.grey); r(2, 9, 12, 2, k.blue); break;
      case 'bujia': r(7, 1, 2, 3, k.alu); r(6, 4, 4, 5, k.white); r(5, 9, 6, 2, k.aluLo); r(6, 11, 4, 3, k.alu); r(7, 14, 2, 2, bad ? '#3a2e1a' : k.aluHi); break;
      case 'bobina': r(5, 1, 6, 4, k.grey); r(6, 5, 4, 10, k.blk); r(6, 14, 4, 2, k.blkHi); break;
      case 'filtroAire': r(1, 3, 14, 10, bad ? '#6b5a3a' : '#e8dcae'); for (let y = 4; y < 13; y += 2) r(1, y, 14, 1, bad ? '#4a3d25' : '#bfb185'); break;
      case 'filtroAceite': r(3, 2, 10, 12, '#2e5f9e'); r(3, 4, 10, 1, '#1d3e69'); r(3, 11, 10, 1, '#1d3e69'); break;
      case 'turbo': disc16(r, 5, 8, 4, k.rust); r(8, 6, 3, 4, k.steel); disc16(r, 12, 8, 3, k.alu); break;
      case 'mangueraIC': r(1, 6, 14, 5, k.blk); r(1, 6, 2, 5, k.alu); r(13, 6, 2, 5, k.alu); if (bad) r(7, 7, 2, 2, k.hot); break;
      case 'banda': for (let i = 0; i < 14; i += 2) r(1 + i, 7, 1, 3, k.blk); r(1, 6, 14, 1, k.blk); r(1, 10, 14, 1, k.blk); if (bad) r(6, 7, 1, 3, k.grey); break;
      case 'alternador': disc16(r, 8, 8, 6, k.alu); r(5, 6, 6, 1, k.aluLo); r(5, 9, 6, 1, k.aluLo); r(2, 3, 3, 3, k.red); break;
      case 'termostato': disc16(r, 8, 8, 5, k.copper); r(6, 3, 4, 10, k.alu); break;
      case 'inyector': r(6, 1, 4, 3, k.blk); r(6, 4, 4, 7, k.blk); r(6, 6, 4, 1, k.grn); r(7, 11, 2, 4, k.alu); break;
      case 'marcha': r(1, 5, 10, 7, k.blk); r(11, 6, 4, 5, k.steel); r(2, 3, 5, 3, k.alu); break;
      case 'sensorO2': r(7, 1, 2, 5, k.blk); r(5, 6, 6, 3, k.steelHi); r(6, 9, 4, 5, k.alu); break;
      case 'balata': r(2, 3, 12, 4, k.steel); r(2, 7, 12, bad ? 1 : 4, '#6b5a43'); break;
      case 'llanta': disc16(r, 8, 8, 7, k.blk); disc16(r, 8, 8, 4, k.alu); break;
      case 'aceite': r(4, 3, 8, 12, k.yel); r(6, 1, 4, 2, k.ink); r(5, 7, 6, 3, k.ink); break;
      case 'refrigerante': r(4, 3, 8, 12, k.cool); r(6, 1, 4, 2, k.ink); break;
      case 'fusible': r(5, 3, 6, 10, '#3d7ccf'); r(6, 4, 4, 3, '#9cc7f2'); break;
      case 'tapon': r(4, 4, 8, 4, k.alu); r(6, 8, 4, 6, k.aluLo); break;
      case 'arandela': disc16(r, 8, 8, 5, k.copper); disc16(r, 8, 8, 2, k.bg); break;
      default: r(3, 3, 10, 10, k.steelHi); r(5, 5, 6, 6, k.steel);
    }
  });
}
