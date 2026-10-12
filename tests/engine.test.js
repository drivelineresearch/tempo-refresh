import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngine, validateSeconds, PREFIX} from '../extension/engine.js';

function fixture() {
  let time = 1_000_000;
  const tabs = new Map([
    [1, {id: 1, windowId: 10, title: 'A', url: 'https://example.test/a', status: 'complete'}],
    [2, {id: 2, windowId: 10, title: 'B', url: 'https://example.test/b', status: 'complete'}],
    [3, {id: 3, windowId: 20, title: 'Other window', url: 'https://example.test/c', status: 'complete'}],
  ]);
  const windows = new Map([[10, {id: 10, type: 'normal'}], [20, {id: 20, type: 'normal'}]]);
  const alarms = new Map();
  const session = {};
  const local = {};
  const reloaded = [];
  const menus = [];
  const badgeText = new Map();
  const area = data => ({get: async key => structuredClone({[key]: data[key]}), set: async value => Object.assign(data, structuredClone(value))});
  const api = {
    storage: {session: area(session), local: area(local)},
    tabs: {
      get: async id => { if (!tabs.has(id)) throw new Error('No tab'); return {...tabs.get(id)}; },
      query: async query => [...tabs.values()].filter(t => query.windowId === undefined || query.windowId === t.windowId).map(t => ({...t})),
      reload: async (id, opts) => { reloaded.push({id, ...opts}); },
    },
    windows: {get: async id => { if (!windows.has(id)) throw new Error('No window'); return windows.get(id); }, create: async info => info},
    alarms: {
      create: async (name, info) => alarms.set(name, {name, scheduledTime: info.when, periodInMinutes: info.periodInMinutes}),
      get: async name => alarms.get(name), getAll: async () => [...alarms.values()],
      clear: async name => alarms.delete(name),
    },
    action: {
      setBadgeText: async ({tabId, text}) => badgeText.set(tabId, text),
      setBadgeBackgroundColor: async () => {}, setBadgeTextColor: async () => {}, setTitle: async () => {},
    },
    contextMenus: {removeAll: async () => { menus.length = 0; }, create: info => { menus.push(info); }},
    runtime: {getURL: path => `chrome-extension://test/${path}`},
  };
  const engine = () => createEngine(api, () => time);
  return {api, engine, tabs, windows, alarms, session, local, reloaded, menus, badgeText, advance: ms => { time += ms; }};
}
const start = (engine, tabId = 1, kind = 'tab', seconds = 60, bypassCache = false) => engine.handleMessage({type: 'start', tabId, kind, seconds, bypassCache});
const action = (engine, type, tabId = 1, kind = 'tab') => engine.handleMessage({type, tabId, kind});
const fire = (engine, kind = 'tab', id = 1) => engine.onAlarm({name: PREFIX + `${kind}:${id}`});

test('intervals enforce the production Chrome floor and reject malformed input', () => {
  for (const seconds of [30, 45, 60, 86400]) assert.equal(validateSeconds(seconds), seconds);
  for (const seconds of [null, '60', 0, 29, 30.5, 86401, Infinity, NaN]) assert.throws(() => validateSeconds(seconds));
});

test('tab timer reloads its original tab even after another tab is active', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize();
  await start(e, 1, 'tab', 45, true);
  await fire(e);
  assert.deepEqual(f.reloaded, [{id: 1, bypassCache: true}]);
  assert.equal(f.alarms.get(PREFIX + 'tab:1').periodInMinutes, .75);
  assert.equal(f.badgeText.get(1), 'ON'); assert.equal(f.badgeText.get(3), '');
});

test('window refresh uses only live members, including newly opened tabs', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e, 1, 'window');
  f.tabs.set(4, {id: 4, windowId: 10, status: 'complete'});
  f.tabs.get(2).windowId = 20;
  await fire(e, 'window', 10);
  assert.deepEqual(f.reloaded.map(t => t.id), [1, 4]);
});

test('window timer replaces overlapping tab timers and prevents hidden duplicates', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize();
  await start(e); await start(e, 2); await start(e, 3); await start(e, 1, 'window');
  assert.deepEqual([...f.alarms.keys()].sort(), [PREFIX + 'tab:3', PREFIX + 'window:10']);
  await assert.rejects(start(e), /window timer covers/);
});

test('pause survives suspension, suppresses queued alarms, and resume schedules a fresh interval', async () => {
  const f = fixture(); let e = f.engine(); await e.initialize(); await start(e);
  await action(e, 'toggle'); await fire(e);
  assert.equal(f.reloaded.length, 0); assert.equal(f.alarms.size, 0); assert.equal(f.badgeText.get(1), 'II');
  e = f.engine(); await e.initialize();
  assert.equal((await action(e, 'context')).tabJob.paused, true);
  f.advance(20_000); await action(e, 'toggle');
  assert.equal(f.alarms.get(PREFIX + 'tab:1').scheduledTime, 1_080_000);
});

test('Stop removes the alarm and a late delivery cannot reload', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e);
  await action(e, 'stop'); await fire(e);
  assert.equal(f.reloaded.length, 0); assert.equal((await action(e, 'context')).tabJob, null);
});

test('worker restart restores existing timers without resetting their schedule', async () => {
  const f = fixture(); let e = f.engine(); await e.initialize(); await start(e);
  f.advance(25_000); e = f.engine(); await e.initialize();
  assert.equal((await action(e, 'context')).tabJob.nextAt, 1_060_000);
  await fire(e); assert.equal(f.reloaded.length, 1);
});

test('worker restart recreates missing alarms', async () => {
  const f = fixture(); let e = f.engine(); await e.initialize(); await start(e);
  f.alarms.clear(); f.advance(25_000); e = f.engine(); await e.initialize();
  assert.equal(f.alarms.get(PREFIX + 'tab:1').scheduledTime, 1_085_000);
});

test('browser restart clears stale target alarms while preserving interval preferences', async () => {
  const f = fixture(); let e = f.engine(); await e.initialize(); await start(e, 1, 'window', 900, true);
  delete f.session.jobs; e = f.engine(); await e.initialize(); await fire(e, 'window', 10);
  assert.equal(f.alarms.size, 0); assert.equal(f.reloaded.length, 0);
  assert.deepEqual((await action(e, 'context')).preferences, {seconds: 900, bypassCache: true});
});

test('loading and known restricted tabs skip a cycle without a reload loop', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e, 1, 'window');
  f.tabs.get(1).status = 'loading'; f.tabs.get(2).url = 'chrome://extensions/';
  await fire(e, 'window', 10);
  assert.equal(f.reloaded.length, 0); assert.equal((await action(e, 'context')).windowJob.skipped, 2);
  await assert.rejects(start(e, 2), /does not allow/);
});

test('one failing tab does not prevent the rest of its window refreshing', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e, 1, 'window');
  f.api.tabs.reload = async id => { if (id === 1) throw new Error('Restricted'); f.reloaded.push({id}); };
  await fire(e, 'window', 10);
  const job = (await action(e, 'context')).windowJob;
  assert.equal(job.refreshed, 1); assert.equal(job.failed, 1); assert.equal(job.count, 1);
});

test('closing the target cleans up its timer', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e);
  f.tabs.delete(1); await e.onTabRemoved(1);
  assert.equal(f.alarms.size, 0); assert.deepEqual(f.session.jobs, {});
});

test('missing targets are cleaned if a close event was missed', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e);
  f.tabs.delete(1); await fire(e); assert.equal(f.alarms.size, 0);
});

test('closing one window leaves another window timer intact', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e, 1, 'window'); await start(e, 3, 'window');
  f.windows.delete(10); await e.onWindowRemoved(10);
  assert.deepEqual([...f.alarms.keys()], [PREFIX + 'window:20']);
});

test('moved standalone tab adopts its destination window timer', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e, 1, 'window'); await start(e, 3);
  f.tabs.get(3).windowId = 10; await e.onTabAttached(3, {newWindowId: 10});
  await fire(e, 'tab', 3); assert.equal(f.reloaded.length, 0);
  assert.equal(f.badgeText.get(3), 'WIN');
});

test('replaced tab keeps a timer on its new identity', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e);
  f.tabs.delete(1); f.tabs.set(4, {id: 4, windowId: 10}); await e.onTabReplaced(4, 1);
  await fire(e, 'tab', 4); assert.deepEqual(f.reloaded.map(t => t.id), [4]);
});

test('stop-window stops all its tab timers and preserves other windows', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e); await start(e, 2); await start(e, 3);
  await action(e, 'stopWindow'); assert.deepEqual([...f.alarms.keys()], [PREFIX + 'tab:3']);
});

test('context menu starts window-specific intervals and uses effective pause/stop', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await e.createMenus();
  assert.equal(f.menus.filter(m => m.id.startsWith('start:')).length, 8);
  assert.ok(f.menus.every(m => m.contexts.includes('page') && m.contexts.includes('action')));
  await e.onMenu({menuItemId: 'start:window:30'}, f.tabs.get(1));
  await e.onMenu({menuItemId: 'toggle'}, f.tabs.get(2)); await fire(e, 'window', 10);
  assert.equal(f.reloaded.length, 0);
  await e.onMenu({menuItemId: 'stop'}, f.tabs.get(2)); assert.equal(f.alarms.size, 0);
});

test('right-click custom interval anchors the original tab across windows', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize();
  const opened = await e.onMenu({menuItemId: 'custom'}, f.tabs.get(3));
  assert.equal(opened.url, 'chrome-extension://test/popup.html?tabId=3');
});

test('failed alarm allocation preserves existing tab timers', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize(); await start(e);
  f.api.alarms.create = async () => { throw new Error('Quota'); };
  await assert.rejects(start(e, 1, 'window'), /Quota/);
  assert.ok((await action(e, 'context')).tabJob);
});

test('unknown messages, bad scopes, and non-normal windows fail without changes', async () => {
  const f = fixture(); const e = f.engine(); await e.initialize();
  await assert.rejects(e.handleMessage({type: 'arbitrary'}), /Unknown request/);
  await assert.rejects(start(e, 1, 'everything'), /Choose this tab/);
  f.windows.get(10).type = 'popup'; await assert.rejects(start(e), /regular Chrome window/);
  assert.deepEqual(f.session.jobs, {});
});
