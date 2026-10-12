export const PREFIX = 'tempo:';
export const DEFAULTS = Object.freeze({seconds: 60, bypassCache: false});
export const PRESETS = [30, 60, 300, 900];

export function validateSeconds(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 30 || value > 86400) {
    throw new Error('Choose a whole-number interval from 30 seconds to 24 hours.');
  }
  return value;
}

export function formatInterval(seconds) {
  if (seconds % 3600 === 0) return `${seconds / 3600} hr`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

const keyFor = (kind, id) => `${kind}:${id}`;
const validId = id => Number.isInteger(id) && id >= 0;
// Without broad tab/host permissions, Chrome may omit URLs. Reload uses tab IDs.
const reloadable = tab => !tab.url || /^(https?|file):/i.test(tab.url);

/** All callers are serialized by worker.js; session state survives worker suspension. */
export function createEngine(api, now = Date.now) {
  const jobs = new Map();
  let preferences = {...DEFAULTS};

  async function save() {
    await api.storage.session.set({jobs: Object.fromEntries(jobs)});
  }

  async function getTab(id) {
    if (!validId(id)) throw new Error('Open a regular browser tab to use Tempo.');
    try { return await api.tabs.get(id); }
    catch { throw new Error('That tab has closed. Open Tempo on another tab.'); }
  }

  function effectiveJob(tab) {
    return jobs.get(keyFor('window', tab.windowId)) ?? jobs.get(keyFor('tab', tab.id));
  }

  async function badges() {
    const tabs = await api.tabs.query({});
    await Promise.allSettled(tabs.map(async tab => {
      const job = effectiveJob(tab);
      await api.action.setBadgeText({tabId: tab.id, text: !job ? '' : job.paused ? 'II' : job.kind === 'window' ? 'WIN' : 'ON'});
      await api.action.setBadgeBackgroundColor({tabId: tab.id, color: job?.paused ? '#52525B' : '#FFA300'});
      await api.action.setBadgeTextColor({tabId: tab.id, color: job?.paused ? '#FFFFFF' : '#1A1A1A'});
      await api.action.setTitle({tabId: tab.id, title: !job ? 'Tempo — refresh on your schedule' : `Tempo — ${job.paused ? 'paused' : `every ${formatInterval(job.seconds)}`} (${job.kind === 'window' ? 'this window' : 'this tab'})`});
    }));
  }

  async function schedule(job) {
    job.nextAt = now() + job.seconds * 1000;
    await api.alarms.create(PREFIX + job.key, {when: job.nextAt, periodInMinutes: job.seconds / 60});
  }

  async function remove(key) {
    await api.alarms.clear(PREFIX + key);
    jobs.delete(key);
  }

  async function initialize() {
    const [session, local, alarms] = await Promise.all([
      api.storage.session.get('jobs'), api.storage.local.get('preferences'), api.alarms.getAll(),
    ]);
    const stored = local.preferences;
    if (stored && Number.isInteger(stored.seconds) && stored.seconds >= 30 && stored.seconds <= 86400) {
      preferences = {seconds: stored.seconds, bypassCache: stored.bypassCache === true};
    }
    for (const [key, job] of Object.entries(session.jobs ?? {})) {
      if (!job || !['tab', 'window'].includes(job.kind) || !validId(job.id) || key !== keyFor(job.kind, job.id)) continue;
      try {
        validateSeconds(job.seconds);
        if (job.kind === 'tab') await getTab(job.id);
        else if ((await api.windows.get(job.id)).type !== 'normal') continue;
        job.key = key;
        jobs.set(key, job);
      } catch { /* Closed or invalid targets never get a replacement timer. */ }
    }
    for (const alarm of alarms) {
      if (!alarm.name.startsWith(PREFIX)) continue;
      const job = jobs.get(alarm.name.slice(PREFIX.length));
      if (!job || job.paused) await api.alarms.clear(alarm.name);
    }
    for (const job of jobs.values()) {
      if (job.paused) continue;
      const alarm = await api.alarms.get(PREFIX + job.key);
      if (alarm) job.nextAt = alarm.scheduledTime;
      else await schedule(job);
    }
    await save();
    await badges();
  }

  async function context(tabId) {
    const tab = await getTab(tabId);
    const tabs = await api.tabs.query({windowId: tab.windowId});
    const normalWindow = (await api.windows.get(tab.windowId)).type === 'normal';
    return {
      tabId: tab.id, windowId: tab.windowId, tabCount: tabs.length,
      title: tab.title || 'Current tab', available: normalWindow && reloadable(tab),
      tabJob: jobs.get(keyFor('tab', tab.id)) ?? null,
      windowJob: jobs.get(keyFor('window', tab.windowId)) ?? null,
      windowTimers: [...jobs.values()].filter(job => job.kind === 'window' ? job.id === tab.windowId : tabs.some(t => t.id === job.id)).length,
      preferences,
    };
  }

  async function start(tabId, kind, seconds, bypassCache = false) {
    validateSeconds(seconds);
    if (!['tab', 'window'].includes(kind)) throw new Error('Choose this tab or this window.');
    const tab = await getTab(tabId);
    if ((await api.windows.get(tab.windowId)).type !== 'normal') throw new Error('Open Tempo in a regular Chrome window.');
    if (kind === 'tab' && !reloadable(tab)) throw new Error('Chrome does not allow Tempo on this page. Open a website first.');
    if (kind === 'tab' && jobs.has(keyFor('window', tab.windowId))) {
      throw new Error('A window timer covers this tab. Stop that window timer before starting a separate tab timer.');
    }
    const id = kind === 'tab' ? tab.id : tab.windowId;
    const key = keyFor(kind, id);
    const job = {key, kind, id, seconds, bypassCache: bypassCache === true, paused: false, nextAt: null, lastAt: null, count: 0, skipped: 0, refreshed: 0, failed: 0};
    // Create first: a failed alarm allocation must not cancel existing timers.
    await schedule(job);
    if (kind === 'window') {
      const tabs = await api.tabs.query({windowId: tab.windowId});
      for (const t of tabs) if (jobs.has(keyFor('tab', t.id))) await remove(keyFor('tab', t.id));
    }
    jobs.set(key, job);
    preferences = {seconds, bypassCache: job.bypassCache};
    await api.storage.local.set({preferences});
    await save();
    await badges();
    return context(tabId);
  }

  async function control(tabId, kind, operation) {
    const tab = await getTab(tabId);
    const key = keyFor(kind, kind === 'window' ? tab.windowId : tab.id);
    const job = jobs.get(key);
    if (!job) return context(tabId);
    if (operation === 'stop') await remove(key);
    else if (operation === 'toggle') {
      if (job.paused) {
        await schedule(job);
        job.paused = false;
      } else {
        await api.alarms.clear(PREFIX + key);
        job.paused = true;
        job.nextAt = null;
      }
    } else throw new Error('Unknown timer action.');
    await save();
    await badges();
    return context(tabId);
  }

  async function stopWindow(windowId) {
    const tabs = await api.tabs.query({windowId});
    for (const job of [...jobs.values()]) {
      if (job.kind === 'window' ? job.id === windowId : tabs.some(t => t.id === job.id)) await remove(job.key);
    }
    await save();
    await badges();
  }

  async function onAlarm(alarm) {
    if (!alarm.name.startsWith(PREFIX)) return;
    const key = alarm.name.slice(PREFIX.length);
    const job = jobs.get(key);
    if (!job || job.paused) {
      await api.alarms.clear(alarm.name);
      return;
    }
    let tabs;
    try {
      if (job.kind === 'tab') tabs = [await getTab(job.id)];
      else {
        await api.windows.get(job.id);
        tabs = await api.tabs.query({windowId: job.id});
      }
    } catch {
      await remove(key);
      await save();
      await badges();
      return;
    }
    const candidates = tabs.filter(tab => reloadable(tab) && tab.status !== 'loading' && (job.kind === 'window' || !jobs.has(keyFor('window', tab.windowId))));
    const outcomes = await Promise.allSettled(candidates.map(tab => api.tabs.reload(tab.id, {bypassCache: job.bypassCache})));
    job.refreshed = outcomes.filter(result => result.status === 'fulfilled').length;
    job.failed = outcomes.length - job.refreshed;
    job.skipped = tabs.length - candidates.length;
    if (job.refreshed) {
      job.count += 1;
      job.lastAt = now();
    }
    const nextAlarm = await api.alarms.get(alarm.name);
    if (!nextAlarm) await schedule(job);
    else job.nextAt = nextAlarm.scheduledTime > now() ? nextAlarm.scheduledTime : now() + job.seconds * 1000;
    await save();
  }

  async function onTabRemoved(tabId) {
    await remove(keyFor('tab', tabId));
    await save();
  }

  async function onWindowRemoved(windowId) {
    await remove(keyFor('window', windowId));
    await save();
  }

  async function onTabAttached(tabId, info) {
    // A moved tab adopts its destination's window timer, without two schedules.
    if (jobs.has(keyFor('window', info.newWindowId))) await remove(keyFor('tab', tabId));
    await save();
    await badges();
  }

  async function onTabReplaced(addedId, removedId) {
    const job = jobs.get(keyFor('tab', removedId));
    if (job) {
      const tab = await getTab(addedId);
      await remove(job.key);
      if (!jobs.has(keyFor('window', tab.windowId))) {
        job.id = addedId;
        job.key = keyFor('tab', addedId);
        if (!job.paused) await schedule(job);
        jobs.set(job.key, job);
      }
    }
    await save();
    await badges();
  }

  async function handleMessage(message) {
    if (!message || !['context', 'start', 'toggle', 'stop', 'stopWindow'].includes(message.type)) throw new Error('Unknown request.');
    if (message.type === 'context') return context(message.tabId);
    if (message.type === 'start') return start(message.tabId, message.kind, message.seconds, message.bypassCache);
    if (!['tab', 'window'].includes(message.kind) && message.type !== 'stopWindow') throw new Error('Invalid timer scope.');
    if (message.type === 'stopWindow') {
      const tab = await getTab(message.tabId);
      await stopWindow(tab.windowId);
      return context(tab.id);
    }
    return control(message.tabId, message.kind, message.type === 'toggle' ? 'toggle' : 'stop');
  }

  async function createMenus() {
    await api.contextMenus.removeAll();
    const contexts = ['page', 'action'];
    api.contextMenus.create({id: 'tempo', title: 'Tempo', contexts});
    for (const kind of ['tab', 'window']) {
      api.contextMenus.create({id: `scope:${kind}`, parentId: 'tempo', title: kind === 'tab' ? 'Refresh this tab' : 'Refresh this window only', contexts});
      for (const seconds of PRESETS) api.contextMenus.create({id: `start:${kind}:${seconds}`, parentId: `scope:${kind}`, title: `Every ${formatInterval(seconds)}`, contexts});
    }
    api.contextMenus.create({id: 'custom', parentId: 'tempo', title: 'Custom interval…', contexts});
    api.contextMenus.create({id: 'separator', parentId: 'tempo', type: 'separator', contexts});
    api.contextMenus.create({id: 'toggle', parentId: 'tempo', title: 'Pause / resume active timer', contexts});
    api.contextMenus.create({id: 'stop', parentId: 'tempo', title: 'Stop active timer', contexts});
    api.contextMenus.create({id: 'stopWindow', parentId: 'tempo', title: 'Stop all timers in this window', contexts});
  }

  async function onMenu(info, tab) {
    if (!tab || !validId(tab.id)) return;
    const parts = String(info.menuItemId).split(':');
    if (parts[0] === 'start') return start(tab.id, parts[1], Number(parts[2]), preferences.bypassCache);
    if (info.menuItemId === 'custom') {
      // This remains available on Chrome 120, before unrestricted action.openPopup.
      const url = api.runtime.getURL(`popup.html?tabId=${tab.id}`);
      return api.windows.create({url, type: 'popup', width: 420, height: 650});
    }
    if (info.menuItemId === 'stopWindow') return stopWindow(tab.windowId);
    const job = effectiveJob(await getTab(tab.id));
    if (job && ['toggle', 'stop'].includes(info.menuItemId)) return control(tab.id, job.kind, info.menuItemId);
  }

  return {initialize, handleMessage, onAlarm, onTabRemoved, onWindowRemoved, onTabAttached, onTabReplaced, createMenus, onMenu, badges};
}
