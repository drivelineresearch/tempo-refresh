import {createEngine} from './engine.js';

const engine = createEngine(chrome);
// Register listeners synchronously. A single queue prevents lost writes and
// guarantees that a completed Stop runs after an in-flight refresh cycle.
let queue = engine.initialize();
function enqueue(task) {
  const result = queue.then(task);
  queue = result.catch(error => console.error('Tempo:', error.message));
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL(''))) return false;
  enqueue(() => engine.handleMessage(message)).then(
    data => respond({ok: true, data}),
    error => respond({ok: false, error: error.message}),
  );
  return true;
});

chrome.runtime.onInstalled.addListener(() => { void enqueue(() => engine.createMenus()); });
chrome.runtime.onStartup.addListener(() => { void enqueue(() => engine.createMenus()); });
chrome.alarms.onAlarm.addListener(alarm => { void enqueue(() => engine.onAlarm(alarm)); });
chrome.contextMenus.onClicked.addListener((info, tab) => { void enqueue(() => engine.onMenu(info, tab)); });
chrome.tabs.onRemoved.addListener(id => { void enqueue(() => engine.onTabRemoved(id)); });
chrome.windows.onRemoved.addListener(id => { void enqueue(() => engine.onWindowRemoved(id)); });
chrome.tabs.onAttached.addListener((id, info) => { void enqueue(() => engine.onTabAttached(id, info)); });
chrome.tabs.onReplaced.addListener((added, removed) => { void enqueue(() => engine.onTabReplaced(added, removed)); });
chrome.tabs.onCreated.addListener(() => { void enqueue(() => engine.badges()); });
