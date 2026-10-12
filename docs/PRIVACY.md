# Privacy and permissions

Tempo has no telemetry, advertisements, accounts, payments, remote code, or backend. It does not collect or transmit personal information to the publisher. The source and original artwork are MIT licensed, so you can inspect, change, and rebuild your copy.

| Permission | Purpose |
| --- | --- |
| `alarms` | Continue interval scheduling after the popup closes or the background worker suspends. |
| `storage` | Save interval/cache preferences locally and active jobs for the current browser session. |
| `contextMenus` | Offer right-click presets, custom intervals, pause/resume, and stop. |
| `activeTab` | Temporarily label the tab selected by the user and recognize protected URLs when Chrome exposes them. |

Tempo does not request host permissions, history access, the broad `tabs` permission, content scripts, or script injection. It does not inspect page text, keystrokes, form data, or unsaved edits.

Active jobs store target IDs, settings, timestamps, and refresh counts in session storage. The last chosen interval and cache preference stay in local storage. Selected tab titles and URLs are used only in memory and are never written to storage or sent elsewhere. No Chrome sync storage is used.

Reloading instructs Chrome to make normal requests to the selected websites. Their own privacy policies still apply. Cache bypass cannot prevent a site's service worker or server from caching content.

The full shipped policy is in [the bundled Help page](../extension/help.html); [the standalone policy page](../store/privacy.html) contains its public-facing privacy section. Use the [repository issue tracker](https://github.com/drivelineresearch/tempo-refresh/issues) for source questions, and the publisher contact on the [Chrome Web Store listing](https://chromewebstore.google.com/detail/tempo-%E2%80%94-tab-window-refres/icbbmkelghjebpomabomndmlnjpdlcjd) for Store support or privacy inquiries.

Geist font files are licensed separately under [SIL OFL 1.1](../extension/fonts/OFL.txt). MIT covers the extension code, scripts, documentation, and original Tempo graphics.
