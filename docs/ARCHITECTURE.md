# How Tempo works

The complete runtime lives in [extension/](../extension/). It uses Chrome's APIs directly. There is no build bundle, page injection, backend, or runtime dependency tree.

| File | Responsibility |
| --- | --- |
| [manifest.json](../extension/manifest.json) | Manifest V3, four permissions, bundled assets, and the restrictive extension-page CSP. |
| [engine.js](../extension/engine.js) | Validate intervals, maintain jobs, schedule alarms, resolve window membership, reload tabs, update badges, and handle context-menu actions. |
| [worker.js](../extension/worker.js) | Register listeners synchronously and serialize engine calls through one queue. |
| [popup.js](../extension/popup.js) | Resolve the selected tab, display timer state, validate entries, and send commands to the worker. |
| [popup.html](../extension/popup.html) / [popup.css](../extension/popup.css) | Semantic controls, interval presets, countdown, status, and light/dark design. |
| [help.html](../extension/help.html) | Bundled operating instructions and privacy policy. |

## Target identity

A tab timer is keyed by tab ID. Changing the active tab does not change its target. A window timer is keyed by window ID; every cycle queries that window's live tabs. New tabs join, and moved-out tabs leave. There is no refresh-all-windows operation.

Starting a window timer replaces separate tab timers in that window. A standalone timed tab moved into a covered window adopts its window timer. This avoids hidden overlapping schedules. A window timer also covers its tabs while paused.

## Timer lifetime

Chrome's persistent alarm API supplies recurring wakeups with a minimum supported interval of 30 seconds. A popup-only interval would stop when the popup closes; a worker-only JavaScript timer would be lost when Chrome suspends the worker.

The engine keeps jobs in session storage and the most recent interval/cache preference in local storage. When a worker starts, it restores session jobs, reconciles their alarms, and removes stale alarms. Closing Chrome clears session jobs, preventing an old tab ID from being reused by a timer in a new browser session.

Pause clears the alarm while keeping the job. Resume and Update each start a fresh interval. Stop deletes the job and alarm. Tabs that are still loading are skipped for that cycle; individual reload failures do not block other tabs.

## Event ordering

The worker attaches listeners before its first asynchronous operation. It then serializes initialization, messages, alarms, moves, and closes. Stop completes after any refresh cycle already in flight; a late alarm delivered after Stop cannot recreate a job. The message handler accepts commands only from this extension's own origin.

## Privacy and scope

Reload uses tab IDs and does not require the broad `tabs` permission or host permissions. Chrome may temporarily expose the selected tab title/URL after user activation; those values remain in memory. When Chrome omits another tab's URL, Tempo can still request a reload by ID and handle rejection. It cannot inspect unsaved edits or guarantee every protected page accepts a reload.

The extension-page CSP permits packaged scripts and blocks network connections. Normal reloads still cause websites to receive ordinary page requests. See [privacy](PRIVACY.md) for the full data boundary.
