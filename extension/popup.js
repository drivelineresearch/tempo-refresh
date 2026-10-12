import {formatInterval, validateSeconds} from './engine.js';

const $ = id => document.getElementById(id);
let tabId;
let state;
let busy = false;
let targetClosed = false;
let pollBusy = false;
let dirty = false;

const scope = () => document.querySelector('input[name="scope"]:checked').value;
const currentJob = () => scope() === 'window' ? state?.windowJob : state?.tabJob;
const seconds = () => Number($('interval').value) * Number($('unit').value);

async function request(type, extra = {}) {
  const result = await chrome.runtime.sendMessage({type, tabId, kind: scope(), ...extra});
  if (!result?.ok) throw new Error(result?.error || 'Tempo could not connect. Reopen the extension.');
  return result.data;
}

function showError(message = '') {
  $('error').textContent = message;
  $('error').hidden = !message;
}

function setIntervalFields(value) {
  $('unit').value = value % 60 === 0 ? '60' : '1';
  $('interval').value = value / Number($('unit').value);
  markPreset();
}

function markPreset() {
  for (const button of document.querySelectorAll('.preset')) button.setAttribute('aria-pressed', String(Number(button.dataset.seconds) === seconds()));
}

function syncFields() {
  const settings = currentJob() ?? state.preferences;
  setIntervalFields(settings.seconds);
  $('bypass-cache').checked = settings.bypassCache;
  dirty = false;
}

function tick() {
  const job = currentJob();
  if (!job || job.paused) {
    $('countdown').textContent = '—:—';
    $('countdown').setAttribute('aria-label', job?.paused ? 'Timer paused' : 'No timer running');
    $('progress').style.width = '0%';
    return;
  }
  const remaining = Math.max(0, Math.ceil((job.nextAt - Date.now()) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const sec = remaining % 60;
  $('countdown').textContent = hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(minutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  $('countdown').setAttribute('aria-label', remaining ? `${remaining} seconds until next refresh` : 'Waiting for Chrome to refresh');
  $('progress').style.width = `${Math.max(0, Math.min(100, (1 - remaining / job.seconds) * 100))}%`;
}

function render() {
  if (!state) return;
  const kind = scope();
  const job = currentJob();
  const covered = kind === 'tab' && state.windowJob;
  const unavailable = kind === 'tab' && !state.available;
  $('target').textContent = kind === 'tab' ? state.title : `${state.tabCount} ${state.tabCount === 1 ? 'tab' : 'tabs'} in this window`;
  $('target').title = $('target').textContent;
  $('scope-help').textContent = covered ? 'A window timer covers this tab. Manage it under This window.' : kind === 'tab' ? 'Only this tab will refresh.' : 'Includes new tabs. Other windows stay untouched.';
  $('status').textContent = job ? job.paused ? 'Paused' : 'Running' : 'Ready';
  $('status').dataset.state = job ? job.paused ? 'paused' : 'running' : 'idle';
  $('timer-label').textContent = job?.paused ? 'Timer paused' : 'Next refresh';
  $('timer-detail').textContent = !job ? 'Choose an interval to get started' : job.paused ? 'Resume starts a fresh interval' : job.failed ? `${job.failed} ${job.failed === 1 ? 'tab could' : 'tabs could'} not refresh` : `Every ${formatInterval(job.seconds)} · ${job.count} ${job.count === 1 ? 'cycle' : 'cycles'}${job.skipped ? ` · ${job.skipped} skipped` : ''}`;
  $('primary').textContent = job ? 'Update timer' : 'Start refreshing';
  $('primary').disabled = busy || targetClosed || !!covered || unavailable;
  $('running-actions').hidden = !job;
  $('pause').textContent = job?.paused ? 'Resume' : 'Pause';
  $('pause').disabled = busy || targetClosed;
  $('stop').disabled = busy || targetClosed;
  // Freeze configuration during an asynchronous mutation so controls cannot
  // accidentally point at a different target when the response arrives.
  for (const el of document.querySelectorAll('input,select,.preset')) el.disabled = busy || targetClosed;
  if (unavailable && !covered && !job && !targetClosed) showError('Open a website in a regular Chrome window to refresh this tab.');
  tick();
}

async function act(type, extra = {}) {
  if (busy) return;
  busy = true;
  showError();
  render();
  try {
    state = await request(type, extra);
    syncFields();
  } catch (error) { showError(error.message); }
  finally { busy = false; render(); }
}

document.querySelectorAll('input[name="scope"]').forEach(input => input.addEventListener('change', () => {
  showError();
  if (!dirty || currentJob()) syncFields();
  render();
}));
document.querySelectorAll('.preset').forEach(button => button.addEventListener('click', () => {
  setIntervalFields(Number(button.dataset.seconds));
  dirty = true;
  showError();
}));
for (const id of ['interval', 'unit', 'bypass-cache']) $(id).addEventListener('input', () => { dirty = true; markPreset(); showError(); });
$('timer-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const interval = validateSeconds(seconds());
    void act('start', {seconds: interval, bypassCache: $('bypass-cache').checked});
  } catch (error) { showError(error.message); $('interval').focus(); }
});
$('pause').addEventListener('click', () => { void act('toggle'); });
$('stop').addEventListener('click', () => { void act('stop'); });

async function init() {
  try {
    const anchor = new URLSearchParams(location.search).get('tabId');
    if (anchor !== null) tabId = Number(anchor);
    else [tabId] = (await chrome.tabs.query({active: true, currentWindow: true})).map(tab => tab.id);
    state = await request('context');
    if (state.windowJob) document.querySelector('input[value="window"]').checked = true;
    syncFields();
    render();
  } catch (error) { showError(error.message); }
}
await init();
setInterval(tick, 250);
setInterval(async () => {
  if (!state || busy || pollBusy || targetClosed) return;
  pollBusy = true;
  try {
    state = await request('context');
    if (!busy) {
      if (!dirty) syncFields();
      render();
    }
  } catch (error) {
    targetClosed = true;
    showError(error.message);
    render();
  } finally { pollBusy = false; }
}, 1000);
