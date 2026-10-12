import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserOptions} from './browser-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = path.join(root, 'store');
const browser = await chromium.launch({...browserOptions(), headless: true, args: ['--no-sandbox']});
const page = await browser.newPage({viewport: {width: 1280, height: 800}, deviceScaleFactor: 1});
const font = (await fs.readFile(path.join(root, 'extension/fonts/geist-latin.woff2'))).toString('base64');
const fontCSS = `@font-face{font-family:Geist;src:url(data:font/woff2;base64,${font});font-weight:100 900}`;
const base = `${fontCSS}*{box-sizing:border-box}body{margin:0;font-family:Geist,system-ui,sans-serif;font-weight:400}h1,p{margin:0}h1{font-weight:600;letter-spacing:-.04em} .eyebrow{font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}`;
try {
  for (const theme of ['light', 'dark']) {
    const raw = await fs.readFile(path.join(root, `test-results/${theme}-running.png`));
    await fs.copyFile(path.join(root, `test-results/${theme}-running.png`), path.join(store, `popup-${theme}.png`));
    const shot = `data:image/png;base64,${raw.toString('base64')}`;
    const dark = theme === 'dark';
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${base}
      body{width:1280px;height:800px;background:${dark ? '#161616' : '#FFFFFF'};color:${dark ? '#EDEDED' : '#1A1A1A'};display:flex;align-items:center;padding:72px 88px;gap:80px}
      .copy{width:550px} .eyebrow{color:${dark ? '#FFC966' : '#8A5300'};margin-bottom:30px} h1{font-size:64px;line-height:1.08;margin-bottom:24px}p{font-size:22px;line-height:1.5;color:${dark ? '#A3A3A3' : '#5F5F5F'};max-width:440px}.features{margin-top:40px;border-top:1px solid ${dark ? '#3A3A3A' : '#D4D4D8'};padding-top:24px;display:flex;gap:24px;font-size:16px;font-weight:500}.features span:before{content:'•';color:#FFA300;margin-right:8px}.shot{width:382px;border:1px solid ${dark ? '#444' : '#D4D4D8'};border-radius:10px;overflow:hidden;flex:none}.shot img{width:380px;display:block}</style></head><body><div class="copy"><div class="eyebrow">Tempo · ${theme} mode</div><h1>Your tabs.<br>Your tempo.</h1><p>Refresh a tab or just one window.<br>Set the interval. Keep moving.</p><div class="features"><span>Right-click controls</span><span>No tracking</span></div></div><div class="shot"><img alt="Actual running Tempo extension" src="${shot}"></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path: path.join(store, `screenshot-${theme}-1280x800.png`)});
  }
  const icon = `data:image/png;base64,${(await fs.readFile(path.join(root, 'extension/icons/icon-128.png'))).toString('base64')}`;
  await page.setViewportSize({width: 440, height: 280});
  await page.setContent(`<!doctype html><html lang="en"><head><style>${base}body{width:440px;height:280px;background:#FFA300;color:#1A1A1A;display:flex;align-items:center;justify-content:center;gap:16px}.mark{width:116px;height:116px;background:#1A1A1A;border-radius:26px;display:grid;place-items:center}.mark img{width:108px;height:108px}h1{font-size:42px;line-height:1.1}p{font-size:15px;margin-top:10px;line-height:1.45}.text{width:185px}</style></head><body><div class="mark"><img src="${icon}" alt=""></div><div class="text"><h1>Tempo</h1><p>Refresh on<br>your schedule.</p></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: path.join(store, 'promo-440x280.png')});
  await fs.copyFile(path.join(root, 'extension/icons/icon-128.png'), path.join(store, 'icon-128.png'));
  // Keep the publisher policy self-contained, with no network resources.
  const help = await fs.readFile(path.join(root, 'extension/help.html'), 'utf8');
  const policy = help.slice(help.indexOf('    <h2>Privacy policy</h2>'), help.indexOf('    <p class="helper">'));
  await fs.writeFile(path.join(store, 'privacy.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tempo — Privacy policy</title><style>body{font:16px/1.65 system-ui,sans-serif;max-width:740px;margin:40px auto;padding:0 24px;color:#1a1a1a;background:#fff}h1{font-size:32px;border-top:4px solid #ffa300;padding-top:20px}h2{font-size:22px;margin-top:30px}li{margin:10px 0}</style></head><body><h1>Tempo</h1>${policy}</body></html>`);
  console.log('Prepared two actual-UI store screenshots, promotional image, icon, and self-contained privacy page.');
} finally { await browser.close(); }
