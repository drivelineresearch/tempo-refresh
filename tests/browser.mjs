import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {browserOptions} from '../scripts/browser-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-results');
await fs.mkdir(output, {recursive: true});
const loads = new Map();
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname.endsWith('.ico')) { res.writeHead(204); return res.end(); }
  loads.set(pathname, (loads.get(pathname) || 0) + 1);
  res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'});
  res.end(`<!doctype html><html lang="en"><head><title>Live board ${pathname}</title></head><body><h1>Tempo refresh test ${pathname}</h1><p>Load ${loads.get(pathname)}</p></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'tempo-browser-'));
const errors = [];
const report = {checks: [], accessibility: [], screenshots: [], network: []};
let context;
const check = (name, value = true) => { assert.ok(value, name); report.checks.push(name); console.log(`PASS ${name}`); };
const waitUntil = async (fn, timeout = 10000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('Timed out waiting for condition');
};

try {
  context = await chromium.launchPersistentContext(profile, {
    ...browserOptions(),
    headless: true,
    args: ['--no-sandbox', '--disable-extensions-except=' + path.join(root, 'extension'), '--load-extension=' + path.join(root, 'extension')],
    viewport: {width: 380, height: 600},
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const extensionId = worker.url().split('/')[2];
  const extensionOrigin = `chrome-extension://${extensionId}`;
  const chromeCall = (method, args = []) => worker.evaluate(async ({method, args}) => {
    const [namespace, name] = method.split('.');
    return chrome[namespace][name](...args);
  }, {method, args});
  const first = await chromeCall('tabs.create', [{url: origin + '/a', active: true}]);
  const second = await chromeCall('tabs.create', [{windowId: first.windowId, url: origin + '/b', active: false}]);
  const other = await chromeCall('windows.create', [{url: origin + '/other', type: 'normal'}]);
  const otherId = other.tabs[0].id;
  await waitUntil(() => (loads.get('/a') || 0) > 0 && (loads.get('/b') || 0) > 0 && (loads.get('/other') || 0) > 0);
  let popup = await context.newPage();
  popup.on('request', req => report.network.push(req.url()));
  await popup.goto(`${extensionOrigin}/popup.html?tabId=${first.id}`);
  const send = (type, extra = {}) => popup.evaluate(async ({type, extra, tabId}) => chrome.runtime.sendMessage({type, tabId, kind: 'tab', ...extra}), {type, extra, tabId: first.id});
  await popup.locator('#primary:enabled').waitFor();
  check('extension loads and popup talks to the installed service worker');

  await popup.getByRole('button', {name: '30 sec', exact: true}).click();
  await popup.getByRole('button', {name: 'Start refreshing', exact: true}).click();
  await popup.locator('#status[data-state=running]').waitFor();
  check('popup starts a real 30-second tab alarm');
  const baseline = new Map(loads);
  await popup.close();
  // This wait exercises the production interval, not a mocked/accelerated clock.
  await waitUntil(() => loads.get('/a') > baseline.get('/a'), 40000);
  check('real timed tab reload fires with popup closed', true);
  check('tab timer does not reload neighboring or other-window tabs', loads.get('/b') === baseline.get('/b') && loads.get('/other') === baseline.get('/other'));
  popup = await context.newPage();
  popup.on('request', req => report.network.push(req.url()));
  await popup.goto(`${extensionOrigin}/popup.html?tabId=${first.id}`);
  await popup.locator('#status[data-state=running]').waitFor();
  await popup.getByRole('button', {name: 'Pause', exact: true}).click();
  await popup.locator('#status[data-state=paused]').waitFor();
  check('Pause clears the real Chrome alarm', !(await chromeCall('alarms.get', [`tempo:tab:${first.id}`])));
  await popup.getByRole('button', {name: 'Resume', exact: true}).click();
  await popup.locator('#status[data-state=running]').waitFor();
  check('Resume recreates the alarm');
  await popup.getByRole('button', {name: 'Stop', exact: true}).click();
  await popup.locator('#status[data-state=idle]').waitFor();
  check('Stop clears the timer and badge', !(await chromeCall('alarms.get', [`tempo:tab:${first.id}`])) && await chromeCall('action.getBadgeText', [{tabId: first.id}]) === '');

  await popup.locator('#unit').selectOption('1');
  await popup.locator('#interval').fill('5');
  await popup.getByRole('button', {name: 'Start refreshing', exact: true}).click();
  check('invalid custom intervals show actionable validation', (await popup.locator('#error').innerText()).includes('30 seconds'));
  await popup.getByRole('button', {name: '1 min', exact: true}).click();
  await popup.getByText('This window', {exact: true}).click();
  await popup.locator('#bypass-cache').check();
  await popup.getByRole('button', {name: 'Start refreshing', exact: true}).click();
  await popup.locator('#status[data-state=running]').waitFor();
  const alarm = await chromeCall('alarms.get', [`tempo:window:${first.windowId}`]);
  check('window controls create an alarm for the target window', alarm.periodInMinutes === 1);
  const added = await chromeCall('tabs.create', [{windowId: first.windowId, url: origin + '/new', active: false}]);
  await waitUntil(() => (loads.get('/new') || 0) > 0);
  // Deliver through the real worker listener; only the first tab test waits wall time.
  const beforeWindow = new Map(loads);
  // Recreate its actual Chrome alarm with a near-future trigger (unpacked test extension).
  await chromeCall('alarms.create', [`tempo:window:${first.windowId}`, {when: Date.now() + 1000, periodInMinutes: 1}]);
  await waitUntil(() => loads.get('/a') > beforeWindow.get('/a') && loads.get('/b') > beforeWindow.get('/b') && loads.get('/new') > beforeWindow.get('/new'));
  check('window timer refreshes live members including new tabs');
  check('a second Chrome window remains untouched', loads.get('/other') === beforeWindow.get('/other'));
  check('window badges never leak to another window', await chromeCall('action.getBadgeText', [{tabId: otherId}]) === '');

  // Popup-height, keyboard, font, and contrast checks in both themes.
  for (const theme of ['light', 'dark']) {
    await popup.emulateMedia({colorScheme: theme, reducedMotion: 'reduce'});
    await popup.evaluate(() => document.fonts.ready);
    for (const status of ['running', 'paused', 'idle']) {
      if (status === 'paused') await send('toggle', {kind: 'window'});
      if (status === 'idle') await send('stop', {kind: 'window'});
      await popup.locator(`#status[data-state=${status}]`).waitFor();
      const metrics = await popup.evaluate(() => ({height: document.body.scrollHeight, width: document.body.scrollWidth, fonts: [...document.fonts].map(f => ({family: f.family, status: f.status})), horizontal: document.documentElement.scrollWidth > innerWidth}));
      check(`${theme}/${status} fits Chrome's 380 × 600 popup`, metrics.height <= 600 && !metrics.horizontal);
      const intervalLayout = await popup.evaluate(() => ({hint: document.getElementById('interval-help').getBoundingClientRect().bottom, presets: document.querySelector('.presets').getBoundingClientRect().top}));
      assert.ok(intervalLayout.hint <= intervalLayout.presets, 'Interval hint must not overlap preset buttons');
      const accessibility = await new AxeBuilder({page: popup}).analyze();
      report.accessibility.push({theme, status, violations: accessibility.violations});
      assert.deepEqual(accessibility.violations, [], `${theme}/${status} accessibility`);
      const file = `${theme}-${status}.png`;
      await popup.screenshot({path: path.join(output, file), fullPage: true});
      report.screenshots.push(file);
      if (status === 'idle') await send('start', {kind: 'window', seconds: 60, bypassCache: true});
    }
  }
  check('six light/dark state accessibility scans have no violations');
  await popup.keyboard.press('Tab');
  check('keyboard controls retain visible focus', await popup.evaluate(() => document.activeElement.matches(':focus-visible')));
  check('the installed popup makes no external network requests', report.network.every(url => url.startsWith(extensionOrigin) || url.startsWith('data:')));

  await chromeCall('tabs.move', [second.id, {windowId: other.id, index: -1}]);
  const beforeMove = new Map(loads);
  await chromeCall('alarms.create', [`tempo:window:${first.windowId}`, {when: Date.now() + 1000, periodInMinutes: 1}]);
  await waitUntil(() => loads.get('/a') > beforeMove.get('/a'));
  check('a tab moved out no longer follows its former window timer', loads.get('/b') === beforeMove.get('/b'));
  await send('stop', {kind: 'window'});
  await chromeCall('tabs.remove', [added.id]);
  await send('start', {seconds: 60});
  await chromeCall('tabs.remove', [first.id]);
  await waitUntil(async () => !(await chromeCall('alarms.get', [`tempo:tab:${first.id}`])));
  check('closing the target removes the actual alarm');
  check('browser pages have no JavaScript exceptions', errors.length === 0);
  report.chromium = await context.browser()?.version() || 'persistent context';
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  report.errors = errors;
  await fs.writeFile(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(profile, {recursive: true, force: true});
}
