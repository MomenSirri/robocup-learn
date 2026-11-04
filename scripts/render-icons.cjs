// Render assets/*.svg to PNGs (needs Playwright). Used to make the app icons.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const f of ['icon-only', 'icon-foreground', 'icon-background']) {
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>${fs.readFileSync(`assets/${f}.svg`, 'utf8')}`);
    await p.screenshot({ path: `assets/${f}.png`, omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  }
  await b.close();
})();
