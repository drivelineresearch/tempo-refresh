# Ready-to-paste privacy declarations

## Single purpose

Allow a user to refresh a chosen tab or the tabs in one chosen Chrome window at a user-selected interval, with pause/resume and right-click controls.

## Permission justifications

**alarms:** Schedule the selected recurring refresh interval using Chrome's alarm API so a timer continues when the popup closes and the service worker goes idle. Intervals are 30 seconds or longer.

**storage:** Save the most recent interval and cache preference in chrome.storage.local. Keep active timers, tab/window IDs, timestamps, and counts in chrome.storage.session for this browser session only. No URLs or titles are persisted. No sync storage is used.

**contextMenus:** Add preset intervals, custom interval, pause/resume, and stop controls to webpage and extension action right-click menus.

**activeTab:** Temporarily access the tab selected by the user to display its title and recognize protected pages. The title/URL are used only in memory, never stored or transmitted. Reloads use Chrome tab IDs; the extension does not inspect or inject code into page content.

## Data usage

The current implementation does not collect or transmit user data to the publisher or third parties. It has no backend, telemetry, analytics, advertising, remote code, or network connections. Local settings and session timer state stay on the user's device. Normal page reloads make ordinary requests to the selected websites.

Do not claim that the extension never accesses tab metadata: activeTab can expose the selected title/URL temporarily. The bundled and public policy disclose this explicitly. Check the dashboard's current definitions when completing the data-usage fields, and keep them consistent with that policy.

**Remote code:** No. Every script, stylesheet, font, and icon is included in the ZIP. Extension pages prohibit external scripts and network connections via CSP.

**Privacy policy URL:** Keep the stable public HTTPS policy URL configured in the publisher's live developer profile. `store/privacy.html` is the standalone source policy page; this repository does not claim to know or replace the account's configured URL. The public source policy explanation is also available at https://github.com/drivelineresearch/tempo-refresh/blob/main/docs/PRIVACY.md.

## Reviewer test instructions

No login, service account, API key, or special credentials are needed.

1. Open two Chrome windows, each with ordinary websites in tabs.
2. Click Tempo on a tab in the first window and start a 30-second This tab timer. Close the popup. After about 30 seconds, only that tab refreshes.
3. Reopen Tempo, pause, resume, and stop. Check ON / II badges.
4. Start a This window timer at 30 seconds. Its tabs refresh; the second window does not. Open a new tab in the first window and verify it joins. Move a tab out and verify it leaves.
5. Right-click a webpage or the toolbar icon and exercise the Tempo preset/stop controls. The native browser tab-strip menu is outside the extension's context menu API.
6. Check custom intervals, cache bypass, and system light/dark themes. Chrome may delay alarms; a loading tab is skipped for that cycle.
