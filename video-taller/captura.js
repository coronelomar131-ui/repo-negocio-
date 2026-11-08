const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2], repo = process.argv[3];
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const muestra = [
    { id: 1, nombre: "Taquería El Güero", colonia: "Doctores", tel: "55 1234 5678", estado: "interesa", seguir: "2026-11-10", r1: "En libreta y de memoria", r2: "En la hora pico se pierden pedidos", r3: "Media hora diaria cuadrando la cuenta", notas: "" },
    { id: 2, nombre: "Fonda Doña Lupe", colonia: "Obrera", tel: "55 2345 6789", estado: "visitado", seguir: "2026-11-12", r1: "Por WhatsApp, a mano", r2: "Contestar el mismo mensaje 40 veces", r3: "", notas: "" },
    { id: 3, nombre: "Refacciones Hermanos Ruiz", colonia: "Buenos Aires", tel: "55 3456 7890", estado: "porvisitar", seguir: "", r1: "", r2: "", r3: "", notas: "" },
    { id: 4, nombre: "Café La Esquina", colonia: "Narvarte", tel: "55 4567 8901", estado: "no", seguir: "", r1: "Ya tienen sistema", r2: "", r3: "", notas: "" }
  ];
  await ctx.addInitScript((m) => localStorage.setItem('taller-prospectos-v1', JSON.stringify(m)), muestra);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(repo, 'index.html'));
  await p.waitForTimeout(1800);
  await p.screenshot({ path: out + '/catalogo.png', fullPage: true });
  await p.click('#p-pro');
  await p.waitForTimeout(900);
  const box = await p.locator('#dock').boundingBox();
  console.log('dock', JSON.stringify(box));
  const oculta = await p.addStyleTag({ content: '.vista{visibility:hidden!important}' });
  await p.screenshot({ path: out + '/dock.png', clip: box });
  await oculta.evaluate((n) => n.remove());
  await p.addStyleTag({ content: '#dock{display:none!important}' });
  await p.screenshot({ path: out + '/prospectos.png', fullPage: true });
  console.log('errores:', errs);
  await b.close();
})();
