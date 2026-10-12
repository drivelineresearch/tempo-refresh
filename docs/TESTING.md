# Tempo validation

Validated October 12, 2026 in isolated browser profiles. The public repository repeats these checks in GitHub Actions.

- 21 Node engine tests passed: isolation, live window membership, timer lifecycle, worker rehydration, cleared browser sessions, close/move/replace events, API failures, preset context-menu handlers, and anchored custom intervals.
- 24 installed-extension browser checks passed in Chrome for Testing 149.0.7827.55 and the default Playwright browser, 156.0.8078.4. The real 30-second alarm reloaded the target with its popup closed; neighboring and other-window tabs stayed untouched.
- 6 axe scans passed with zero violations: running, paused, and idle in both light and dark themes. These are automated checks, not a claim of exhaustive accessibility conformance.
- All six states fit the actual 380 × 600 popup bounds. Keyboard focus and local font loading were checked. An interval-hint overlap seen in visual review was fixed by placing the hint in the legend row, and that separation is checked in the browser suite.
- Popup requests were all extension-local. No JavaScript page errors occurred.
- Web Store and source archives have verified ZIP integrity, the manifest at the upload ZIP root, and SHA-256 hashes.
- The original styling pass completed with Claude Opus 5.5. Its design rationale is included; private model-session and billing records are excluded from public artifacts.

Artifacts: `docs/browser-report.json`, popup screenshots and store composites in `store/`, design rationale in `design/`, and SHA-256 hashes in `dist/SHA256SUMS.txt` and GitHub release assets. The short instruction guides pass the claude-md-guide strict linter, and generated AGENTS.md parity and local document references are checked by `npm run check:docs`.

## Practical limits

The browser suite uses an unpacked extension. Its first alarm waits the full supported 30 seconds; later window membership checks schedule near-future test alarms through Chrome's unpacked-only flexibility. The release UI never offers intervals below 30 seconds.

Native OS context-menu rendering is not automated by the headless browser suite. Command behavior and menu definitions are covered by engine tests; the installed service worker registers the Chrome listeners. Tempo 1.0.0 is published in the Chrome Web Store. The source tests exercise an unpacked copy rather than automating installation from that listing.

Store publication was completed by the publisher and the live listing was verified October 12, 2026. GitHub source publication and CI do not constitute a future Store update; the release guide describes that separate workflow.
