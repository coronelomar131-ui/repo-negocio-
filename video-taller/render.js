const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = process.argv[2], modo = process.argv[3];
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(dir, 'escena.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => document.getElementById('pro-img').complete);
  if (modo === 'prueba') {
    for (const t of [2.5, 7.5, 13, 18, 26, 36, 43, 49]) {
      await p.evaluate((t) => window.render(t), t);
      await p.screenshot({ path: path.join(dir, `prueba-${t}.png`) });
    }
  } else {
    const FPS = 30, total = await p.evaluate(() => window.TOTAL);
    const N = Math.round(total * FPS);
    for (let i = 0; i < N; i++) {
      await p.evaluate((t) => window.render(t), i / FPS);
      await p.screenshot({ path: path.join(dir, 'cuadros', `c${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
      if (i % 150 === 0) console.log('cuadro', i, 'de', N);
    }
  }
  await b.close();
})();
