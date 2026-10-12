/** Original code-native artwork using the extension's actual captured UI. */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {browserOptions} from './browser-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'docs/assets');
await fs.mkdir(assets, {recursive: true});
const dataURL = async (name, mime = 'image/png') => `data:${mime};base64,${(await fs.readFile(path.join(root, name))).toString('base64')}`;
const [font, light, dark, icon] = await Promise.all([
  dataURL('extension/fonts/geist-latin.woff2', 'font/woff2'),
  dataURL('store/popup-light.png'), dataURL('store/popup-dark.png'), dataURL('extension/icons/icon-128.png'),
]);
const browser = await chromium.launch({...browserOptions(), headless: true, args: ['--no-sandbox']});
const page = await browser.newPage({deviceScaleFactor: 1});
const base = `@font-face{font-family:Geist;src:url(${font});font-weight:100 900}*{box-sizing:border-box}body{margin:0;font-family:Geist,system-ui,sans-serif}h1,p{margin:0}h1{font-weight:600;letter-spacing:-.05em}`;
try {
  for (const theme of ['light', 'dark']) {
    const darkTheme = theme === 'dark';
    await page.setViewportSize({width: 1280, height: 680});
    await page.setContent(`<!doctype html><html lang="en"><head><style>${base}
      body{width:1280px;height:680px;background:${darkTheme ? '#161616' : '#FFFFFF'};color:${darkTheme ? '#EDEDED' : '#1A1A1A'};display:flex;align-items:center;padding:48px 60px;gap:48px;border-top:6px solid #FFA300}
      .copy{width:400px;flex:none}.wordmark{display:flex;align-items:center;gap:12px;font-size:20px;font-weight:600;margin-bottom:34px}.wordmark img{width:44px;height:44px}h1{font-size:56px;line-height:1.05;margin-bottom:22px}.sub{font-size:19px;line-height:1.5;color:${darkTheme ? '#A3A3A3' : '#5F5F5F'}}.tags{border-top:1px solid ${darkTheme ? '#444444' : '#D4D4D8'};margin-top:32px;padding-top:20px;font-size:14px;font-weight:500}.tags p{margin-top:8px}.tags p:before{content:'•';color:#A66400;margin-right:10px}.shots{display:flex;align-items:center;gap:16px}.shots img{display:block;width:334px;height:auto;border:1px solid ${darkTheme ? '#555555' : '#D4D4D8'};border-radius:10px}.caption{font-size:12px;color:${darkTheme ? '#A3A3A3' : '#5F5F5F'};margin-top:9px;text-align:center}
      </style></head><body><div class="copy"><div class="wordmark"><img alt="" src="${icon}">Tempo</div><h1>Your tabs.<br>Your tempo.</h1><p class="sub">Refresh one tab or just one window.<br>Set the interval. Keep moving.</p><div class="tags"><p>Free, open source, MIT licensed</p><p>Right-click controls · Light and dark</p><p>Built by Driveline Research</p></div></div><div class="shots"><div><img alt="Actual light popup" src="${light}"><p class="caption">Light mode</p></div><div><img alt="Actual dark popup" src="${dark}"><p class="caption">Dark mode</p></div></div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({path: path.join(assets, `hero-${theme}.png`)});
  }
  await page.setViewportSize({width: 1200, height: 630});
  await page.setContent(`<!doctype html><html lang="en"><head><style>${base}
    body{width:1200px;height:630px;background:#161616;color:#EDEDED;display:flex;align-items:center;gap:60px;padding:44px 72px;border-top:6px solid #FFA300}.copy{width:650px}.brand{display:flex;align-items:center;gap:14px;font-weight:600;font-size:24px;margin-bottom:24px}.brand img{width:52px;height:52px}h1{font-size:68px;line-height:1.05;margin-bottom:22px}.sub{color:#A3A3A3;font-size:24px;line-height:1.4}.chips{margin-top:30px;color:#FFA300;font-size:17px;font-weight:500}.url{margin-top:24px;font-size:16px;color:#A3A3A3}.shot{width:334px;flex:none;border:1px solid #555555;border-radius:10px;overflow:hidden}.shot img{width:332px;display:block}</style></head><body><div class="copy"><div class="brand"><img alt="" src="${icon}">Tempo</div><h1>Refresh on<br>your schedule.</h1><p class="sub">One tab. One window. Your interval.</p><p class="chips">Free · MIT licensed · No tracking</p><p class="url">github.com/drivelineresearch/tempo-refresh</p></div><div class="shot"><img alt="Actual Tempo popup" src="${dark}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({path: path.join(assets, 'tempo-social-1200x630.png')});
  console.log('Generated light/dark README covers and a 1200 × 630 social card.');
} finally { await browser.close(); }
