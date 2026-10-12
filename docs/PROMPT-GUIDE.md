# Build your own tab refresher with natural language

You can [install Tempo](https://chromewebstore.google.com/detail/tempo-%E2%80%94-tab-window-refres/icbbmkelghjebpomabomndmlnjpdlcjd), edit this MIT-licensed source, or ask a coding assistant to build your own extension. This guide follows the third route. The assistant writes files in a local folder; you review and test them before loading them in Chrome. No AI service is needed inside the finished extension.

## 1. Start with the behavior

Paste this into an assistant that can edit local files:

```text
Build a Chrome Manifest V3 extension that refreshes either the selected tab
or all tabs in only that tab's Chrome window on a user-selected interval.
Never add a refresh-all-windows command.

Use plain JavaScript, HTML, and CSS with no runtime dependencies, remote
code, backend, analytics, accounts, advertising, or payments. Request only
the Chrome permissions required by the implemented behavior, and explain
each permission. Prefer alarms, storage, contextMenus, and activeTab;
reload by tab ID rather than requesting broad host or browsing access.

Use Chrome alarms, with supported intervals from 30 seconds to 24 hours.
Do not rely on a popup setInterval or a service-worker JavaScript timer
for the refresh schedule. Store active jobs in chrome.storage.session;
save only the last interval and cache preference in local storage.
Never persist tab titles or URLs.

Provide presets for 30 seconds, 1 minute, 5 minutes, and 15 minutes;
a custom seconds/minutes input; bypass cache; pause/resume; update; stop;
a countdown; and per-tab toolbar badges. Right-click a webpage or the
extension toolbar icon to start presets or control the active timer.
Chrome does not expose a native tab-strip context-menu API.

A tab job follows its original tab. A window job queries current members
on every cycle, includes newly opened tabs, and excludes moved-out tabs.
Starting a window job replaces its separate tab jobs. A timed tab moved
into a covered window adopts that window job. Clean up closed targets,
restore jobs after worker suspension, and end jobs when Chrome exits.
Skip tabs still loading. Handle one tab's reload failure without stopping
the remaining window members. Register listeners synchronously and
serialize state changes to avoid Stop/start/refresh races.

Generate the manifest, worker, engine, popup, original icons, MIT license,
README, and a Help/privacy page. Put manifest.json at the upload ZIP root.
Keep scripts/fonts/icons local and block external connections in the CSP.
Tell me how to load the folder at chrome://extensions and how to test it.
Consult current official Chrome documentation for version requirements
and API constraints. Show working files and test evidence, not just a plan.
```

The 30-second floor is deliberate: [Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms) enforce it in production even though unpacked extensions can use shorter intervals for debugging. If you need a different feature, describe it explicitly and ask the assistant to investigate its permission and lifecycle implications.

## 2. Give it a clear visual direction

```text
Style the popup as a focused utility at 380 CSS pixels wide and no more
than 600 pixels tall in ordinary idle/running/paused states. Use white
surfaces, near-black text, quiet borders, gently rounded controls, and one
goldenrod #FFA300 primary action with dark text. Add a system dark theme.
Use bundled openly licensed fonts or readable system fonts. Use an
original refresh icon and an original name for my fork.

Make the countdown the main visual anchor. Keep the target scope clear.
Use semantic labels, visible keyboard focus, readable secondary text,
proper hidden states, and reduced-motion support. Preserve interval edits
when switching between idle tab/window targets. Check label wrapping,
long tab titles, invalid intervals, covered-tab state, closed targets,
and pending requests. Render actual screenshots at normal zoom and fix
any overlap or clipping. Do not claim an unrendered layout was verified.
```

Tempo's [light/dark graphics](assets/README.md) are available under MIT as a reference. Bundled fonts retain their OFL license. Keep privacy and accessibility text readable instead of reducing everything to tiny print to fit the popup.

## 3. Ask for tests that prove the scope

```text
Add behavioral tests for timer validation, pause/resume/stop, worker
rehydration, browser-session clearing, overlapping jobs, closed/moved/
replaced tabs, context-menu commands, and Chrome API failures.

Load the actual unpacked extension in a disposable Chromium profile.
Use two separate normal Chrome windows and a local page-load counter.
Wait for at least one real 30-second alarm with the popup closed.
Verify only the selected tab refreshes. Then verify a window timer
refreshes its current members, includes new tabs, excludes moved-out
tabs, and leaves the other window untouched. Test validation and controls.

Capture light/dark idle/running/paused screenshots at 380 x 600. Check
keyboard focus, loaded fonts, contrast, missing assets, layout overlap,
and accessibility. Check there are no external requests from the popup.
Explain which tests are mocked, which use a real clock, and which native
Chrome UI interactions still require a human check.
```

Open the files and run the tests yourself. A test that reloads every window and merely checks that one page changed does not establish isolation. Automated accessibility scans also do not replace looking at the actual controls.

## 4. Load and inspect your version

Open `chrome://extensions`, enable Developer mode, select Load unpacked, and choose the folder containing `manifest.json`. Pin its icon. Test against disposable pages before running it on pages with unsaved forms. Check the extension's service-worker console for errors.

You can read [Tempo's architecture](ARCHITECTURE.md), [development commands](DEVELOPMENT.md), and [test suite](../tests/browser.mjs) as implementation examples. They show a complete lifecycle rather than a snippet that works only while a popup stays open.

## 5. Package the code and documentation

```text
Prepare a public MIT-licensed repository with the full source, reproducible
graphics, concise CLAUDE.md and AGENTS.md, and linked setup, architecture,
privacy, prompt, and release guides. Keep the root agent instructions
focused on what the project does, commands, and real constraints.
Use one canonical instruction file and generate its portable Markdown
counterpart. Verify every local document link and included image.

Package only the runtime and required licenses in the Store ZIP; place
manifest.json at its root. Exclude credentials, local profiles, logs,
model-session records, node_modules, and test dependencies. Produce a
source ZIP and SHA-256 hashes. Include an original icon, accurate listing
description, privacy declarations, and actual-product store screenshots.
Prepare a natural-language rebuild guide that other people can reuse.

For a fork, update its name, repository links, publisher contact, privacy
policy, and version. Explain the Chrome Web Store upload/review process.
Do not imply it is an official Tempo or Driveline release. Follow the
explicit publication instructions I have given you; otherwise prepare
the result for review before any public upload.
```

## Good follow-up prompts

- “Preserve the interval I just entered when I change the target scope.”
- “Show the extra permission and privacy implications before adding page monitoring.”
- “Keep refresh state session-only so old tab IDs cannot target a new browser session.”
- “Tell me exactly what passed and what still needs a browser or human check.”
- “Put long runbooks in linked docs and keep the agent instructions short.”

This guide is a specification and review aid. Generated code still needs inspection and testing, particularly when an assistant changes permissions or scheduling behavior.
