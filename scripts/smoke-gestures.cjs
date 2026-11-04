const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:4173/');
  await p.click('.tabbar >> text=Discover'); await p.waitForTimeout(1200);
  await p.click('.segmented >> text=PLL'); await p.waitForTimeout(800);
  const box = await (await p.$('.cube-canvas canvas')).boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const swipe = async (x, y, dx, dy) => { await p.mouse.move(x, y); await p.mouse.down(); for (let i=1;i<=6;i++) await p.mouse.move(x+dx*i/6, y+dy*i/6); await p.mouse.up(); await p.waitForTimeout(400); };
  const S = box.height / 9; // rough sticker size
  // front face (left part of view), right column → swipe up
  await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/g0.png' });
  const log = async (label) => console.log(label, await p.$$eval('.movelist .mv', els => els.map(e => e.textContent).join(' ')));
  await swipe(cx - S*0.25, cy + S*0.6, 0, -60); await log('front-right-col up (expect R):');
  await swipe(cx - S*1.6, cy - S*0.2, 60, 0); await log('front top row → right (expect U\'):');
  await swipe(cx + S*1.5, cy + S*0.3, 0, -60); await log('right face, front column, swipe up (expect F'):');
  await swipe(box.x + 20, box.y + 20, 80, 0); await log('background drag (no move):');
  await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/g1.png' });
  console.log(errs);
  await b.close();
})();
