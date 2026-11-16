'use strict';
/* =====================================================================
   TALLER TORQUE · datos
   Herramientas, refacciones, ubicaciones (slots) y fallas.
   Precios en pesos mexicanos, aproximados a mostrador 2026.
   Aprietes (N·m) típicos de un motor 1.6 L turbo de 4 cilindros.
   ===================================================================== */

const TOOLS = {
  mano:        { name: 'Manos', short: 'Manos', price: 0, start: true,
                 desc: 'Clips, tapones, conectores y la tapa del motor.' },
  llave10:     { name: 'Llave 10 mm', short: '10 mm', price: 0, start: true,
                 desc: 'La más usada en un auto: terminales, bobinas, riel, protectores.' },
  llave13:     { name: 'Llave 13 mm', short: '13 mm', price: 0, start: true,
                 desc: 'Sujetador de batería, alternador, marcha y tuercas del turbo.' },
  llave14:     { name: 'Llave 14 mm', short: '14 mm', price: 0, start: true,
                 desc: 'Tornillo banjo de la línea de aceite del turbo y tornillos del caliper.' },
  llave15:     { name: 'Llave 15 mm', short: '15 mm', price: 0, start: true,
                 desc: 'Palanca del tensor de la banda de accesorios.' },
  llave17:     { name: 'Llave 17 mm', short: '17 mm', price: 0, start: true,
                 desc: 'Tapón del cárter (drenado de aceite).' },
  dado16:      { name: 'Dado de bujía 16 mm', short: 'Bujía', price: 0, start: true,
                 desc: 'Trae un hule por dentro para no romper la porcelana de la bujía.' },
  dado19:      { name: 'Dado 19 mm + cruceta', short: '19 mm', price: 0, start: true,
                 desc: 'Birlos de las ruedas.' },
  desarmador:  { name: 'Desarmador plano', short: 'Desarm.', price: 0, start: true,
                 desc: 'Abrazaderas de mangueras y del tubo de admisión.' },
  pinzas:      { name: 'Pinzas de punta', short: 'Pinzas', price: 0, start: true,
                 desc: 'Sacar y poner fusibles sin lastimar la caja.' },
  lampara:     { name: 'Lámpara de taller', short: 'Lámpara', price: 0, start: true, measure: true,
                 desc: 'Inspección visual: grietas, fugas, humo, suciedad.' },
  multimetro:  { name: 'Multímetro', short: 'Multím.', price: 0, start: true, measure: true,
                 desc: 'Voltaje de batería y de carga. Sana en reposo: 12.6 V. Cargando: 13.8–14.4 V.' },
  charola:     { name: 'Charola de aceite', short: 'Charola', price: 0, start: true,
                 desc: 'Va debajo del tapón del cárter antes de drenar. Sin ella el aceite termina en el piso.' },
  escaner:     { name: 'Escáner OBD-II', short: 'Escáner', price: 1290, measure: true,
                 desc: 'Lee los códigos de falla (P0xxx) y los datos en vivo de la computadora.' },
  torquimetro: { name: 'Torquímetro de clic 5–150 N·m', short: 'Torquím.', price: 1490,
                 desc: 'Lo ajustas al apriete del manual y hace ¡clic! cuando llegas. Sin él, aprietas al tanteo.' },
  llaveFiltro: { name: 'Llave para filtro de aceite', short: 'Filtro', price: 160,
                 desc: 'Para aflojar el filtro de aceite. Se aprieta a mano + ¾ de vuelta (≈20 N·m).' },
  llave22:     { name: 'Dado para sensor O2 22 mm', short: 'O2', price: 260,
                 desc: 'Dado ranurado para que pase el cable del sensor de oxígeno.' },
  compresimetro:{ name: 'Compresímetro', short: 'Compres.', price: 890, measure: true,
                 desc: 'Se enrosca en el hueco de la bujía y se da marcha. Sano: 12–14 bar. Menos de 9 bar: anillos o empaque.' },
  manoGas:     { name: 'Manómetro de gasolina', short: 'Man.gas', price: 720, measure: true,
                 desc: 'Se conecta a la válvula del riel. Este motor pide 3.0–3.5 bar.' },
  calibrador:  { name: 'Calibrador de lainas', short: 'Lainas', price: 130, measure: true,
                 desc: 'Mide la separación del electrodo de la bujía. Este motor: 0.8 mm.' },
  vernier:     { name: 'Vernier', short: 'Vernier', price: 360, measure: true,
                 desc: 'Mide el grosor de las balatas. Nuevas: 11 mm. Mínimo: 3 mm.' },
  embudo:      { name: 'Embudo', short: 'Embudo', price: 60,
                 desc: 'Sin embudo, parte del aceite o refrigerante cae fuera.' },
};
const TOOL_ORDER = ['mano','llave10','llave13','llave14','llave15','llave17','dado16','dado19','desarmador','pinzas',
  'llaveFiltro','llave22','torquimetro','lampara','multimetro','escaner','compresimetro','manoGas','calibrador','vernier','charola','embudo'];

/* Refacciones. price = lo que te cuesta en la refaccionaria. */
const PARTS = {
  bateria:     { name: 'Batería 12 V 45 Ah', price: 2150,
                 desc: 'Da la corriente para la marcha (unos 160 A) y alimenta el auto apagado.' },
  fusible:     { name: 'Fusible 15 A', price: 12,
                 desc: 'Protege el circuito. Si se quita el de la bomba, la gasolina deja de llegar.' },
  filtroAire:  { name: 'Filtro de aire', price: 240,
                 desc: 'Detiene polvo y arena. Tapado, el turbo no puede tragar aire y el motor pierde fuerza.' },
  tuboAdmision:{ name: 'Tubo de admisión', price: 520, noSell: false,
                 desc: 'Lleva aire limpio del filtro a la entrada del compresor del turbo.' },
  mangueraIC:  { name: 'Manguera de intercooler', price: 460,
                 desc: 'Lleva aire a presión (boost). Con una grieta, el aire se escapa: silbido y poca fuerza.' },
  bov:         { name: 'Válvula de alivio (BOV)', price: 1350,
                 desc: 'Al soltar el acelerador saca el aire a presión atrapado para que no rebote contra el compresor: el ¡psshh!' },
  protector:   { name: 'Protector térmico', price: 380,
                 desc: 'Tapa la turbina, que trabaja a 700–900 °C, para no cocinar cables y mangueras.' },
  lineaTurbo:  { name: 'Línea de aceite del turbo', price: 690,
                 desc: 'Manda aceite a presión al eje del turbo. El eje gira a más de 150,000 rpm sobre una película de aceite.' },
  turbo:       { name: 'Turbo reconstruido', price: 7800,
                 desc: 'Los gases de escape empujan la turbina; la turbina gira el compresor por el mismo eje y el compresor mete aire a presión.' },
  tapaMotor:   { name: 'Tapa del motor', price: 900,
                 desc: 'Cubierta de plástico. Solo estética y algo de ruido.' },
  bobina:      { name: 'Bobina de encendido', price: 760,
                 desc: 'Convierte 12 V en unos 30,000 V para que salte la chispa en la bujía.' },
  bujia:       { name: 'Bujía de iridio', price: 165,
                 desc: 'Hace la chispa que enciende la mezcla. Separación: 0.8 mm. Se cambia cada 40–60 mil km.' },
  riel:        { name: 'Riel de inyectores', price: 1400,
                 desc: 'Tubo que reparte gasolina a 3 bar a los 4 inyectores. Antes de abrirlo hay que quitarle la presión.' },
  inyector:    { name: 'Inyector de gasolina', price: 980,
                 desc: 'Válvula que rocía la gasolina. Tapado, ese cilindro queda pobre (mucho aire, poca gasolina) y falla.' },
  banda:       { name: 'Banda de accesorios', price: 390,
                 desc: 'Del cigüeñal mueve el alternador y la bomba de agua. Agrietada, rechina y patina.' },
  alternador:  { name: 'Alternador reconstruido', price: 2900,
                 desc: 'Genera corriente con el motor encendido y recarga la batería. Debe dar 13.8–14.4 V.' },
  termostato:  { name: 'Termostato 88 °C', price: 340,
                 desc: 'Válvula de cera: abre a 88 °C y deja pasar el refrigerante al radiador.' },
  tapaRad:     { name: 'Tapón de radiador 1.1 bar', price: 150,
                 desc: 'Mantiene el sistema a presión para que el refrigerante hierva hasta ~125 °C. Nunca se abre en caliente.' },
  tapaAceite:  { name: 'Tapón de llenado de aceite', price: 120,
                 desc: 'Por aquí se rellena el aceite.' },
  tapon:       { name: 'Tapón de cárter', price: 60,
                 desc: 'Por aquí se drena el aceite. Lleva arandela de cobre o aluminio: se cambia en cada servicio.' },
  arandela:    { name: 'Arandela de tapón (nueva)', price: 15, consumable: true,
                 desc: 'Sella el tapón del cárter. Si reusas la vieja, el tapón gotea.' },
  filtroAceite:{ name: 'Filtro de aceite', price: 125,
                 desc: 'Limpia el aceite. Antes de ponerlo se le unta aceite al empaque.' },
  aceite:      { name: 'Aceite 5W-30 sintético 1 L', price: 185, consumable: true,
                 desc: 'Este motor lleva 4.0 L con filtro. En la bayoneta: MIN 3.0 L, MAX 4.0 L.' },
  refrigerante:{ name: 'Refrigerante 50/50 1 L', price: 125, consumable: true,
                 desc: 'Agua + anticongelante. Enfría, evita óxido y sube el punto de ebullición.' },
  marcha:      { name: 'Motor de arranque', price: 2850,
                 desc: 'Motor eléctrico que gira el volante del motor a ~250 rpm para arrancar.' },
  sensorO2:    { name: 'Sensor de oxígeno', price: 1250,
                 desc: 'Mide el oxígeno en el escape. Con eso la computadora corrige la gasolina (ajustes de combustible).' },
  llanta:      { name: 'Rueda completa', price: 2600,
                 desc: 'Rin + llanta. Birlos a 110 N·m en estrella.' },
  balata:      { name: 'Balatas (una rueda)', price: 340,
                 desc: 'Material de fricción que aprieta el disco. Nuevas: 11 mm. Abajo de 3 mm, cambio obligatorio.' },
};


/* Refacciones de desempeño */
Object.assign(PARTS, {
  turboGrande: { name: 'Turbo grande (híbrido)', price: 14500,
                 desc: 'Compresor y turbina más grandes: más aire arriba, pero tarda más en "llenar". Pide inyectores grandes y reprogramar la ECU.' },
  inyectorAlto:{ name: 'Inyector de alto flujo (+50%)', price: 1900,
                 desc: 'Echa 50% más gasolina. Sin ajustar la escala de inyectores en la ECU, el motor queda muy rico.' },
  filtroAlto:  { name: 'Filtro de aire de alto flujo', price: 1100,
                 desc: 'Restringe menos el aire. Lavable.' },
  placaAdapt:  { name: 'Placa adaptadora motor↔caja', price: 3500,
                 desc: 'Permite unir un motor y una caja de familias distintas (patrón de campana diferente).' },
});
Object.assign(TOOLS, {
  programador: { name: 'Laptop + cable de programación', short: 'Laptop', price: 2500,
                 desc: 'Para escribir mapas en la computadora (ECU). El escáner solo lee; esto programa.' },
});
TOOL_ORDER.push('programador');

/* ---------- Motores ----------
   family: patrón de la campana. A = 4 cilindros, B = V6/V8.
   size: 1 cuatro cilindros, 2 V6, 3 V8 (lo que cabe en el cofre).
   order: orden de encendido (índices de cilindro). */
const MOTORES = {
  i4_14t: { name: '1.4 L turbo', short: '1.4T', cyl: 4, layout: 'I', Vd: 1.4e-3, turbo: { size: 0.82, spring: 0.6 }, redline: 6500, safe: 7000, idle: 850,
            I: 0.14, veRpm: 4000, veW: 2600, ve: 0.21, eta: 0.42, kg: 115, price: 16000, family: 'A', size: 1, oil: 3.6, order: [0, 2, 3, 1] },
  i4_16t: { name: '1.6 L turbo', short: '1.6T', cyl: 4, layout: 'I', Vd: 1.6e-3, turbo: { size: 1, spring: 0.7 }, redline: 6800, safe: 7200, idle: 850,
            I: 0.16, veRpm: 4300, veW: 2700, ve: 0.21, eta: 0.42, kg: 125, price: 22000, family: 'A', size: 1, oil: 4.0, order: [0, 2, 3, 1] },
  i4_20:  { name: '2.0 L atmosférico', short: '2.0', cyl: 4, layout: 'I', Vd: 2.0e-3, turbo: null, redline: 6900, safe: 7400, idle: 800,
            I: 0.18, veRpm: 5200, veW: 3200, ve: 0.27, eta: 0.43, kg: 128, price: 15000, family: 'A', size: 1, oil: 4.2, order: [0, 2, 3, 1] },
  i4_20t: { name: '2.0 L turbo de alto desempeño', short: '2.0T', cyl: 4, layout: 'I', Vd: 2.0e-3, turbo: { size: 1.3, spring: 1.0 }, redline: 7200, safe: 7700, idle: 900,
            I: 0.17, veRpm: 4800, veW: 3000, ve: 0.23, eta: 0.43, kg: 140, price: 48000, family: 'A', size: 1, oil: 4.6, order: [0, 2, 3, 1] },
  v6_35:  { name: '3.5 L V6', short: '3.5 V6', cyl: 6, layout: 'V', Vd: 3.5e-3, turbo: null, redline: 6600, safe: 7000, idle: 700,
            I: 0.26, veRpm: 4800, veW: 3000, ve: 0.25, eta: 0.42, kg: 175, price: 32000, family: 'B', size: 2, oil: 5.7, order: [0, 1, 2, 3, 4, 5] },
  v8_50:  { name: '5.0 L V8', short: '5.0 V8', cyl: 8, layout: 'V', Vd: 5.0e-3, turbo: null, redline: 7000, safe: 7500, idle: 650,
            I: 0.34, veRpm: 5000, veW: 3200, ve: 0.27, eta: 0.42, kg: 205, price: 68000, family: 'B', size: 3, oil: 7.6, order: [0, 4, 3, 7, 5, 2, 6, 1] },
};

/* ---------- Cajas de velocidades ---------- */
const CAJAS = {
  m5:   { name: 'Manual 5 velocidades', short: 'M5', type: 'manual', ratios: [3.45, 1.94, 1.29, 0.97, 0.78], final: 4.06, tqMax: 300, shift: 0.32, family: 'A', price: 9000, kg: 36 },
  m6c:  { name: 'Manual 6 cercana', short: 'M6', type: 'manual', ratios: [3.3, 2.13, 1.57, 1.22, 1.0, 0.84], final: 4.1, tqMax: 430, shift: 0.26, family: 'A', price: 24000, kg: 40 },
  a4:   { name: 'Automática 4 velocidades', short: 'A4', type: 'auto', ratios: [2.84, 1.55, 1.0, 0.7], final: 3.55, tqMax: 540, shift: 0.45, family: 'B', price: 12000, kg: 70 },
  m6f:  { name: 'Manual 6 reforzada', short: 'M6R', type: 'manual', ratios: [2.97, 2.07, 1.43, 1.0, 0.84, 0.56], final: 3.73, tqMax: 680, shift: 0.3, family: 'B', price: 36000, kg: 52 },
  seq6: { name: 'Secuencial 6 de carreras', short: 'SEQ', type: 'seq', ratios: [2.92, 2.05, 1.58, 1.28, 1.08, 0.94], final: 4.3, tqMax: 720, shift: 0.07, family: 'A', price: 95000, kg: 34 },
};

/* ---------- Modelos (chasís). Nombres inventados ---------- */
const MODELOS = {
  brio:    { name: 'Brío', tipo: 'Hatchback compacto', kg: 900, cdA: 0.60, drive: 'FWD', bay: 1, r: 0.29, grip: 1.0, motor: 'i4_14t', caja: 'm5', value: 38000, color: '#d8443a', shape: 'hatch' },
  torque:  { name: 'Sedán Torque', tipo: 'Sedán', kg: 1180, cdA: 0.64, drive: 'FWD', bay: 2, r: 0.31, grip: 1.0, motor: 'i4_16t', caja: 'm5', value: 52000, color: '#3d7ccf', shape: 'sedan' },
  halcon:  { name: 'Halcón', tipo: 'Coupé tracción trasera', kg: 1290, cdA: 0.60, drive: 'RWD', bay: 3, r: 0.32, grip: 1.05, motor: 'i4_20', caja: 'm6c', value: 74000, color: '#f0b429', shape: 'coupe' },
  mula:    { name: 'Mula', tipo: 'Pickup', kg: 1620, cdA: 0.95, drive: 'RWD', bay: 3, r: 0.36, grip: 0.95, motor: 'v6_35', caja: 'a4', value: 69000, color: '#5aa65b', shape: 'pickup' },
  clasico: { name: 'Clásico 78', tipo: 'Muscle de los 70', kg: 1460, cdA: 0.82, drive: 'RWD', bay: 3, r: 0.34, grip: 0.9, motor: 'v8_50', caja: 'a4', value: 115000, color: '#7a3fb0', shape: 'muscle' },
};

/* ---------- Ubicaciones en el auto (se arman según el motor) ----------
   view: 'cofre' | 'abajo'
   r: rectángulo para tocarlo en el lienzo (x, y, w, h) en pixeles del mundo (320×240)
   tool, torque (N·m; 0 = a mano), bolts (# de tornillos), pattern
   cover: piezas que la tapan físicamente (la ocultan)
   pre: lo que debe estar afuera antes de quitarla (procedimiento)
   needs: lo que debe estar puesto antes de instalarla
   run: no se puede quitar con el motor encendido
   lift: requiere el elevador arriba
   conn: es un conector (se conecta / desconecta, no se saca al banco)
   own: 'motor' viaja con el motor al desmontarlo; 'chasis' se queda en el auto */
let SLOTS = {};
function cylPos(e) {
  if (e.layout === 'V') {
    const xs = e.cyl === 6 ? [140, 172, 204] : [132, 160, 188, 216];
    const out = [];
    for (let i = 0; i < e.cyl; i++) out.push({ x: xs[Math.floor(i / 2)], y: i % 2 ? 87 : 64, h: 19 });
    return out;
  }
  return [132, 160, 188, 216].map(x => ({ x, y: 66, h: 30 }));
}
function injX(n, i) { return Math.round(120 + (i + 0.5) * 120 / n); }
function buildSlots(engId) {
  const e = engId ? MOTORES[engId] : null;
  const S = {};
  const C = (id, d) => { d.own = 'chasis'; S[id] = d; };
  const M = (id, d) => { d.own = 'motor'; S[id] = d; };
  C('batNeg', { name: 'Terminal negativa (−)', view: 'cofre', r: [11, 15, 12, 9], tool: 'llave10', torque: 6, conn: true,
    info: 'Siempre se desconecta primero y se conecta al final. Así, si la llave toca la carrocería, no hay corto.' });
  C('batPos', { name: 'Terminal positiva (+)', view: 'cofre', r: [39, 15, 12, 9], tool: 'llave10', torque: 6, conn: true,
    info: 'Va directo al motor de arranque y al alternador. Lleva capuchón rojo.' });
  C('bateria', { name: 'Batería', view: 'cofre', type: 'bateria', r: [8, 22, 46, 36], tool: 'llave13', torque: 8, pre: ['batNeg', 'batPos'] });
  C('fusGas', { name: 'Fusible de bomba de gasolina', view: 'cofre', type: 'fusible', r: [10, 70, 9, 12], tool: 'pinzas', torque: 0,
    info: 'Truco real: quítalo y deja que el motor se apague solo. Así sale la presión del riel antes de abrirlo.' });
  C('fusVent', { name: 'Fusible del ventilador', view: 'cofre', type: 'fusible', r: [22, 70, 9, 12], tool: 'pinzas', torque: 0 });
  C('tapaRad', { name: 'Tapón del radiador', view: 'cofre', type: 'tapaRad', r: [300, 192, 13, 12], tool: 'mano', torque: 0,
    info: 'En caliente el sistema está a 1.1 bar y 90+ °C. Abrirlo así es una quemadura segura.' });
  C('ruedaI', { name: 'Rueda delantera izquierda', view: 'abajo', type: 'llanta', r: [6, 138, 36, 66], tool: 'dado19', torque: 110, bolts: 4, pattern: 'rueda', lift: true, run: true });
  C('ruedaD', { name: 'Rueda delantera derecha', view: 'abajo', type: 'llanta', r: [278, 138, 36, 66], tool: 'dado19', torque: 110, bolts: 4, pattern: 'rueda', lift: true, run: true });
  C('balataI', { name: 'Balatas izquierdas', view: 'abajo', type: 'balata', r: [14, 154, 22, 34], tool: 'llave14', torque: 35, bolts: 2, pattern: 'par', lift: true, cover: ['ruedaI'], run: true });
  C('balataD', { name: 'Balatas derechas', view: 'abajo', type: 'balata', r: [284, 154, 22, 34], tool: 'llave14', torque: 35, bolts: 2, pattern: 'par', lift: true, cover: ['ruedaD'], run: true });
  C('motor', { name: e ? 'Motor ' + e.name : 'Hueco del motor (vacío)', view: 'cofre', r: [100, 44, 152, 106], macro: 'motor', tool: 'mano',
    info: 'Aquí se saca o se mete el motor completo con la pluma.' });
  C('caja', { name: 'Caja de velocidades', view: 'abajo', r: [14, 26, 92, 86], macro: 'caja', tool: 'mano',
    info: 'Se baja por debajo del auto con el gato de transmisión.' });
  if (!e) return S;

  M('filtroAire', { name: 'Filtro de aire', view: 'cofre', type: 'filtroAire', accepts: ['filtroAire', 'filtroAlto'], r: [266, 20, 44, 38], tool: 'mano', torque: 0 });
  M('tuboAdm', { name: 'Tubo de admisión', view: 'cofre', type: 'tuboAdmision', r: e.turbo ? [294, 62, 13, 92] : [112, 13, 150, 10], tool: 'desarmador', torque: 0, run: true, needs: e.turbo ? ['turbo'] : [] });
  if (e.turbo) {
    M('mangIcCal', { name: 'Manguera caliente (turbo → intercooler)', view: 'cofre', type: 'mangueraIC', r: [276, 186, 13, 20], tool: 'desarmador', torque: 0, needs: ['turbo'] });
    M('mangIcFria', { name: 'Manguera fría (intercooler → mariposa)', view: 'cofre', type: 'mangueraIC', r: [42, 98, 13, 108], tool: 'desarmador', torque: 0 });
    M('bov', { name: 'Válvula de alivio (BOV)', view: 'cofre', type: 'bov', r: [28, 146, 14, 14], tool: 'llave10', torque: 8, needs: ['mangIcFria'] });
    M('protector', { name: 'Protector térmico del turbo', view: 'cofre', type: 'protector', r: [232, 150, 28, 24], tool: 'llave10', torque: 10, needs: ['turbo'] });
    M('lineaTurbo', { name: 'Línea de aceite del turbo', view: 'cofre', type: 'lineaTurbo', r: [236, 138, 30, 12], tool: 'llave14', torque: 20, run: true, pre: ['protector'], needs: ['turbo'],
      info: 'Tornillo banjo con dos arandelas. Al quitarla escurre un poco de aceite.' });
    M('turbo', { name: 'Turbo', view: 'cofre', type: 'turbo', accepts: ['turbo', 'turboGrande'], r: [230, 152, 68, 36], tool: 'llave13', torque: 27, bolts: 4, pattern: 'cuadro', run: true,
      pre: ['tuboAdm', 'protector', 'lineaTurbo', 'mangIcCal'] });
  }
  M('tapaMotor', { name: 'Tapa del motor', view: 'cofre', type: 'tapaMotor', r: [118, 62, 120, 46], tool: 'mano', torque: 0 });
  const P = cylPos(e);
  for (let i = 0; i < e.cyl; i++) {
    const p = P[i], n = i + 1;
    M('bob' + n, { name: 'Bobina cilindro ' + n, view: 'cofre', type: 'bobina', r: [p.x - 5, p.y, 10, p.h], tool: 'llave10', torque: 10, cover: ['tapaMotor'], needs: ['buj' + n], cyl: i });
    M('buj' + n, { name: 'Bujía cilindro ' + n, view: 'cofre', type: 'bujia', r: [p.x - 5, p.y, 10, p.h], tool: 'dado16', torque: 25, cover: ['tapaMotor', 'bob' + n], run: true, cyl: i });
    M('iny' + n, { name: 'Inyector ' + n, view: 'cofre', type: 'inyector', accepts: ['inyector', 'inyectorAlto'], r: [injX(e.cyl, i) - 4, 44, 8, 16], tool: 'mano', torque: 0, cover: ['riel'], cyl: i });
  }
  M('riel', { name: 'Riel de inyectores', view: 'cofre', type: 'riel', r: [116, 47, 130, 12], tool: 'llave10', torque: 10, bolts: 2, pattern: 'par', run: true,
    info: 'Si lo abres con presión, la gasolina sale rociada. Primero quita el fusible de la bomba y deja que el motor se apague.' });
  M('banda', { name: 'Banda de accesorios', view: 'cofre', type: 'banda', r: [60, 76, 42, 76], tool: 'llave15', torque: 0, run: true, needs: ['alternador'],
    info: 'Con la llave 15 mueves el tensor, liberas la banda y la sacas. Nunca con el motor encendido.' });
  M('alternador', { name: 'Alternador', view: 'cofre', type: 'alternador', r: [58, 70, 32, 26], tool: 'llave13', torque: 45, bolts: 2, pattern: 'par', run: true, pre: ['banda', 'batNeg'],
    info: 'El cable grueso B+ tiene 12 V siempre. Desconecta la batería antes de tocarlo.' });
  M('termostato', { name: 'Termostato', view: 'cofre', type: 'termostato', r: [250, 94, 13, 16], tool: 'llave10', torque: 10, bolts: 2, pattern: 'par', run: true });
  M('tapaAceite', { name: 'Tapón de llenado de aceite', view: 'cofre', type: 'tapaAceite', r: [240, 68, 12, 12], tool: 'mano', torque: 0 });
  M('bayoneta', { name: 'Bayoneta (nivel de aceite)', view: 'cofre', r: [103, 116, 10, 24], check: true, tool: 'mano',
    info: `Con el motor apagado y nivelado. Este motor lleva ${e.oil.toFixed(1)} L: MIN ${(e.oil - 1).toFixed(1)} L, MAX ${e.oil.toFixed(1)} L.` });
  M('tapon', { name: 'Tapón del cárter', view: 'abajo', type: 'tapon', r: [153, 126, 14, 12], tool: 'llave17', torque: 30, lift: true });
  M('filtroAceite', { name: 'Filtro de aceite', view: 'abajo', type: 'filtroAceite', r: [213, 74, 24, 30], tool: 'llaveFiltro', torque: 20, lift: true,
    info: 'Se pone a mano y, cuando el empaque toca, ¾ de vuelta más. Equivale a unos 20 N·m.' });
  M('marcha', { name: 'Motor de arranque', view: 'abajo', type: 'marcha', r: [62, 84, 40, 22], tool: 'llave13', torque: 40, bolts: 2, pattern: 'par', lift: true, run: true, pre: ['batNeg'] });
  M('sensorO2', { name: 'Sensor de oxígeno', view: 'abajo', type: 'sensorO2', r: [256, 144, 16, 12], tool: 'llave22', torque: 45, lift: true, run: true });
  return S;
}
function slotAccepts(d, type) { return (d.accepts || [d.type]).includes(type); }
function nCyl(c) { return c.engId ? MOTORES[c.engId].cyl : 0; }
function hasTurbo(c) { return !!(c.engId && MOTORES[c.engId].turbo); }
function oilCap(c) { return c.engId ? MOTORES[c.engId].oil : 4; }
function defaultTune(engId) {
  const e = MOTORES[engId];
  return { boost: e.turbo ? e.turbo.spring : 0, afrWot: e.turbo ? 11.8 : 12.8, adv: 0, limiter: e.redline, idle: e.idle,
    dfco: true, pops: false, launch: 0, o2: true, mil: true, inj: 1.0, fan: 98 };
}

/* Códigos OBD-II reales (SAE J2012) que puede guardar la computadora. */
const DTC = {
  P0101: 'Flujo de aire fuera de rango (lectura de carga no coincide)',
  P0128: 'Temperatura de refrigerante debajo de la del termostato',
  P0133: 'Sensor de oxígeno (banco 1, sensor 1): respuesta lenta',
  P0134: 'Sensor de oxígeno (banco 1, sensor 1): sin actividad',
  P0171: 'Sistema demasiado pobre (banco 1)',
  P0172: 'Sistema demasiado rico (banco 1)',
  P0217: 'Sobrecalentamiento del motor',
  P0299: 'Turbo: presión de sobrealimentación baja',
  P0300: 'Falla de encendido aleatoria / múltiples cilindros',
  P0301: 'Falla de encendido detectada: cilindro 1',
  P0302: 'Falla de encendido detectada: cilindro 2',
  P0303: 'Falla de encendido detectada: cilindro 3',
  P0304: 'Falla de encendido detectada: cilindro 4',
  P0351: 'Bobina de encendido A: circuito primario/secundario',
  P0352: 'Bobina de encendido B: circuito primario/secundario',
  P0353: 'Bobina de encendido C: circuito primario/secundario',
  P0354: 'Bobina de encendido D: circuito primario/secundario',
  P0562: 'Voltaje del sistema bajo',
  P0087: 'Presión del riel de combustible demasiado baja',
};

const CLIENTES = ['Doña Lupita','Don Ernesto','Karla Méndez','El Güero','Maestra Rosa','Toño Herrera','Paty Salgado','Don Chuy','Ingeniero Ruiz','Mariana','Beto el del taxi','Señora Carmen'];

/* Trabajos y fallas. setup() mete la falla, check() dice qué falta, fix() la repara (lo usan los empleados).
   turbo: true = solo aplica a motores turbo. fix() regresa lo que costaron las refacciones. */
const swapNew = (c, id, type, extra) => { if (!c.slots[id]) return 0; c.slots[id].item = newItem(type || c.defs[id].type, extra); c.slots[id].tq = { lo: 1, hi: 1, ok: true }; return PARTS[type || c.defs[id].type].price; };
const JOBS = [
  { id:'bujias', labor: 450,
    quejas: ['Jalonea cuando le piso y se prendió el foquito del motor.', 'Siento que le falta fuerza y vibra en las subidas.'],
    setup(c, R) { const n = nCyl(c), k = R.int(n); for (let i=0;i<n;i++) { const it = c.slots['buj'+(i+1)].item; it.health = i===k ? 0.05 : 0.42 + R.f()*0.1; it.gap = i===k ? 1.4 : 1.1; } },
    check(c) { const out=[]; for (let i=1;i<=nCyl(c);i++){ const it=c.slots['buj'+i] && c.slots['buj'+i].item; if(!it||it.health<0.8) out.push('Bujía '+i+' sigue gastada'); else if (it.gap>1.0||it.gap<0.7) out.push('Bujía '+i+' con separación de '+it.gap.toFixed(2)+' mm (debe ser 0.8)'); } return out; },
    fix(c) { let k=0; for (let i=1;i<=nCyl(c);i++) k+=swapNew(c,'buj'+i,'bujia'); return k; },
    pista: 'Lee códigos con el escáner. Las bujías se cambian todas, no solo la que falla.' },
  { id:'bobina', labor: 350,
    quejas: ['Desde ayer tiembla feo, como si le faltara un cilindro.', 'En el alto se siente como tractor y huele a gasolina.'],
    setup(c, R) { const k = R.int(nCyl(c)); c.slots['bob'+(k+1)].item.health = 0.05; },
    check(c) { const out=[]; for (let i=1;i<=nCyl(c);i++){ const it=c.slots['bob'+i] && c.slots['bob'+i].item; if(!it||it.health<0.5) out.push('Bobina del cilindro '+i+' sigue mala'); } return out; },
    fix(c) { let k=0; for (let i=1;i<=nCyl(c);i++){ const it=c.slots['bob'+i].item; if(!it||it.health<0.5) k+=swapNew(c,'bob'+i,'bobina'); } return k; },
    pista: 'Truco de taller: cambia la bobina sospechosa a otro cilindro. Si el código se mueve de cilindro, es la bobina.' },
  { id:'filtroAire', labor: 200,
    quejas: ['Ya no tiene fuerza en las subidas y gasta más gasolina.', 'Se siente ahogado arriba.'],
    setup(c) { c.slots.filtroAire.item.health = 0.12; },
    check(c) { const it=c.slots.filtroAire && c.slots.filtroAire.item; return (!it||it.health<0.8) ? ['El filtro de aire sigue tapado'] : []; },
    fix(c) { return swapNew(c,'filtroAire','filtroAire'); },
    pista: 'Revisa la presión en la entrada del motor a fondo: si cae mucho, algo le impide respirar.' },
  { id:'bateria', labor: 250,
    quejas: ['No arranca. Le doy marcha y solo hace clic-clic.', 'En las mañanas le cuesta muchísimo arrancar y hoy ya no quiso.'],
    setup(c) { const b=c.slots.bateria.item; b.health=0.22; b.soc=0.32; },
    check(c) { const b=c.slots.bateria.item; return (!b||b.health<0.7) ? ['La batería sigue mala'] : []; },
    fix(c) { return swapNew(c,'bateria','bateria',{soc:1}); },
    pista: 'Multímetro en la batería: sana en reposo marca 12.6 V. Si al dar marcha baja de 9.6 V, ya no sirve.' },
  { id:'alternador', labor: 700,
    quejas: ['Se prende el foquito de la batería y ayer se me apagó en un semáforo.', 'Le cambié la batería hace un mes y ya se volvió a descargar.'],
    setup(c) { c.slots.alternador.item.health = 0.18; c.slots.bateria.item.soc = 0.55; },
    check(c) { const a=c.slots.alternador && c.slots.alternador.item; return (!a||a.health<0.7) ? ['El alternador sigue sin cargar'] : []; },
    fix(c) { const k = swapNew(c,'alternador','alternador'); c.slots.bateria.item && (c.slots.bateria.item.soc = 1); return k; },
    pista: 'Multímetro con el motor encendido. Si marca menos de 13.5 V, el alternador no está cargando.' },
  { id:'banda', labor: 300,
    quejas: ['Rechina horrible al arrancar, sobre todo en las mañanas.', 'Suena como pajarito cuando acelero.'],
    setup(c) { c.slots.banda.item.health = 0.14; },
    check(c) { const it=c.slots.banda && c.slots.banda.item; return (!it||it.health<0.7) ? ['La banda sigue agrietada'] : []; },
    fix(c) { return swapNew(c,'banda','banda'); },
    pista: 'Lámpara sobre la banda: busca grietas en las costillas.' },
  { id:'termoAbierto', labor: 500,
    quejas: ['La calefacción echa puro aire frío y la aguja de temperatura casi no sube.', 'Gasta mucha gasolina y el motor nunca se calienta.'],
    setup(c) { c.slots.termostato.item.stuck = 'abierto'; },
    check(c) { const it=c.slots.termostato && c.slots.termostato.item; return (!it||it.stuck) ? ['El termostato sigue pegado'] : []; },
    fix(c) { c.cool.level = 1; return swapNew(c,'termostato','termostato'); },
    pista: 'Déjalo en ralentí y mira la temperatura. Normal: llega a 88–95 °C y ahí se queda.' },
  { id:'termoCerrado', labor: 550,
    quejas: ['Se calienta y sale vapor del cofre.', 'La aguja se va hasta arriba en el tráfico.'],
    setup(c) { c.slots.termostato.item.stuck = 'cerrado'; c.cool.level = 0.8; },
    check(c) { const out=[]; const it=c.slots.termostato && c.slots.termostato.item; if(!it||it.stuck) out.push('El termostato sigue pegado'); if (c.cool.level < 0.9) out.push('Falta refrigerante ('+Math.round(c.cool.level*100)+'%)'); return out; },
    fix(c) { c.cool.level = 1; return swapNew(c,'termostato','termostato') + 2 * PARTS.refrigerante.price; },
    pista: 'Cuidado: no abras el radiador en caliente. Espera a que baje de 50 °C.' },
  { id:'turbo', labor: 1800, turbo: true,
    quejas: ['Echa humo azul y el turbo silba como sirena.', 'Huele a aceite quemado y se está comiendo el aceite.'],
    setup(c) { c.slots.turbo.item.health = 0.1; c.oil.quality = 0.12; c.oil.level = oilCap(c) - 0.8; c.slots.filtroAceite.item.health = 0.25; },
    check(c) { const out=[]; const t=c.slots.turbo && c.slots.turbo.item; if(!t||t.health<0.7) out.push('El turbo sigue dañado'); if (c.oil.quality<0.8) out.push('No cambiaste el aceite: el aceite sucio va a acabar con el turbo nuevo'); const f=c.slots.filtroAceite && c.slots.filtroAceite.item; if(!f||f.health<0.8) out.push('No cambiaste el filtro de aceite'); return out; },
    fix(c) { c.oil.quality = 1; c.oil.level = oilCap(c); return swapNew(c,'turbo','turbo') + swapNew(c,'filtroAceite','filtroAceite') + Math.ceil(oilCap(c)) * PARTS.aceite.price; },
    pista: 'Quita el tubo de admisión y mueve el eje con la mano: un turbo sano casi no tiene juego. Y piensa por qué falló.' },
  { id:'mangueraIC', labor: 350, turbo: true,
    quejas: ['Cuando acelero se oye como fuga de aire, psssss, y no jala.', 'Se prendió el foco del motor y anda sin fuerza.'],
    setup(c, R) { const s = R.f()<0.5 ? 'mangIcCal' : 'mangIcFria'; c.slots[s].item.health = 0.15; },
    check(c) { const out=[]; for (const s of ['mangIcCal','mangIcFria']) { const it=c.slots[s] && c.slots[s].item; if(!it||it.health<0.7) out.push((c.defs[s] ? c.defs[s].name : s)+' sigue rota'); } return out; },
    fix(c) { let k=0; for (const s of ['mangIcCal','mangIcFria']) { const it=c.slots[s].item; if(!it||it.health<0.7) k+=swapNew(c,s,'mangueraIC'); } return k; },
    pista: 'Con la lámpara revisa las mangueras del intercooler. El código P0299 es presión de turbo baja.' },
  { id:'servicio', labor: 400,
    quejas: ['Ya le toca servicio de aceite, lleva 10 mil kilómetros.', 'Quiero su cambio de aceite y filtro, por favor.'],
    setup(c) { c.oil.quality = 0.22; c.oil.level = oilCap(c) - 0.7; c.slots.filtroAceite.item.health = 0.3; },
    check(c) { const out=[]; if (c.oil.quality<0.8) out.push('El aceite sigue sucio'); const f=c.slots.filtroAceite && c.slots.filtroAceite.item; if(!f||f.health<0.8) out.push('No cambiaste el filtro de aceite'); const t=c.slots.tapon && c.slots.tapon.item; if (t && t.washer!=='nueva') out.push('Reusaste la arandela del tapón: va a gotear'); return out; },
    fix(c) { c.oil.quality = 1; c.oil.level = oilCap(c); return swapNew(c,'filtroAceite','filtroAceite') + Math.ceil(oilCap(c)) * PARTS.aceite.price + PARTS.arandela.price; },
    pista: 'Charola abajo, quita el tapón, quita el filtro, pon todo nuevo y rellena por el tapón de arriba hasta la marca MAX.' },
  { id:'balatas', labor: 600,
    quejas: ['Al frenar se oye metal contra metal.', 'Rechinan los frenos y el pedal se siente raro.'],
    setup(c) { c.slots.balataI.item.thick = 2.1; c.slots.balataD.item.thick = 2.6; },
    check(c) { const out=[]; for (const s of ['balataI','balataD']) { const it=c.slots[s].item; if(!it||it.thick<6) out.push(c.defs[s].name+' siguen gastadas'); } return out; },
    fix(c) { return swapNew(c,'balataI','balata') + swapNew(c,'balataD','balata'); },
    pista: 'Sube el auto, quita las ruedas y mide las balatas con el vernier. Los birlos van en estrella a 110 N·m.' },
  { id:'inyector', labor: 900,
    quejas: ['A veces tiembla en alto y se le va la fuerza.', 'Se prendió el foco del motor y huele raro el escape.'],
    setup(c, R) { const k=R.int(nCyl(c)); c.slots['iny'+(k+1)].item.health = 0.45; },
    check(c) { const out=[]; for (let i=1;i<=nCyl(c);i++){ const it=c.slots['iny'+i] && c.slots['iny'+i].item; if(!it||it.health<0.8) out.push('Inyector '+i+' sigue tapado'); } return out; },
    fix(c) { let k=0; for (let i=1;i<=nCyl(c);i++){ const it=c.slots['iny'+i].item; if(!it||it.health<0.8) k+=swapNew(c,'iny'+i,'inyector'); } return k; },
    pista: 'P0171 + falla en un solo cilindro suele ser inyector. Antes de abrir el riel, quita la presión de gasolina.' },
  { id:'marcha', labor: 650,
    quejas: ['No arranca, pero la batería es nueva y las luces prenden bien.', 'Le doy marcha y no hace nada, solo un clic.'],
    setup(c) { c.slots.marcha.item.health = 0.08; },
    check(c) { const it=c.slots.marcha && c.slots.marcha.item; return (!it||it.health<0.7) ? ['La marcha sigue mala'] : []; },
    fix(c) { return swapNew(c,'marcha','marcha'); },
    pista: 'Si la batería tiene 12.6 V y al dar marcha no baja el voltaje ni gira, la corriente no está llegando al motor de arranque.' },
  { id:'sensorO2', labor: 500,
    quejas: ['Gasta mucha gasolina y el escape huele a gasolina.', 'Se prendió el foco del motor y rinde poquito.'],
    setup(c) { c.slots.sensorO2.item.health = 0.2; },
    check(c) { const it=c.slots.sensorO2 && c.slots.sensorO2.item; return (!it||it.health<0.7) ? ['El sensor de oxígeno sigue malo'] : []; },
    fix(c) { return swapNew(c,'sensorO2','sensorO2'); },
    pista: 'En datos en vivo, mira el voltaje del O2: uno sano oscila rápido entre 0.1 y 0.9 V.' },
];
function jobsFor(c) { return JOBS.filter(j => !j.turbo || hasTurbo(c)); }

/* ---------- Negocio ---------- */
const NOMBRES = ['Chuy','Lalo','Memo','Paco','Toño','Rafa','Nacho','Yesi','Fer','Caro','Moni','Beto','Quique','Gaby','Lupe','Neto','Tere','Rulo'];
const PUESTOS = [
  { id: 'aprendiz', name: 'Aprendiz', skill: [0.4, 0.6], pay: [280, 380] },
  { id: 'mecanico', name: 'Mecánico', skill: [0.65, 0.82], pay: [550, 750] },
  { id: 'maestro', name: 'Maestro mecánico', skill: [0.86, 0.97], pay: [1000, 1400] },
];
const MEJORAS = {
  pluma:    { name: 'Pluma para motor y gato de transmisión', price: 8500, desc: 'Sin pluma no puedes sacar ni meter motores o cajas.' },
  bahia2:   { name: 'Segundo elevador', price: 22000, desc: 'Un lugar más en el garaje para autos.' },
  bahia3:   { name: 'Tercer elevador', price: 35000, desc: 'Otro lugar más.' },
  dinamo:   { name: 'Dinamómetro de rodillos', price: 30000, desc: 'Mide torque y potencia reales.' },
  letrero:  { name: 'Letrero luminoso y anuncios', price: 12000, desc: 'Llegan clientes que pagan mejor (+20% mano de obra).' },
};
const RIVALES = [
  { name: 'El Chino', auto: 'Brío 1.4T', et: 17.4, bet: 500 },
  { name: 'Yesenia', auto: 'Sedán Torque 1.6T', et: 16.1, bet: 1000 },
  { name: 'El Pelón', auto: 'Halcón 2.0', et: 15.2, bet: 2000 },
  { name: 'Los Primos', auto: 'Mula V6', et: 14.4, bet: 4000 },
  { name: 'Doña Toñita', auto: 'Clásico 78 V8', et: 13.4, bet: 8000 },
  { name: 'El Ingeniero', auto: 'Halcón 2.0T', et: 12.4, bet: 15000 },
  { name: 'La Leyenda', auto: 'Halcón con swap V8', et: 11.3, bet: 30000 },
];
