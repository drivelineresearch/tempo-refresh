# Build, test, and change Tempo

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/tempo-%E2%80%94-tab-window-refres/icbbmkelghjebpomabomndmlnjpdlcjd) if you only want to use it. No Node or Python installation is required to load the existing `extension/` folder unpacked.

## Development setup

Use Node.js 20 or newer and Python 3. GitHub CI uses Node 24. JavaScript dependencies are development tools only; none ship in the extension.

```sh
git clone https://github.com/drivelineresearch/tempo-refresh.git
cd tempo-refresh
npm ci --ignore-scripts
npx playwright install chromium
npm test
npm run check:docs
npm run test:browser
```

On a Linux machine missing browser system libraries, use `npx playwright install --with-deps chromium`. That command may ask for elevated package-install permissions. The default test browser is Playwright's full Chromium, including support for unpacked extensions in headless mode. `TEMPO_CHROME` optionally selects a Chrome for Testing executable:

```sh
TEMPO_CHROME=/path/to/chrome npm run test:browser
```

The browser suite uses an isolated disposable profile and a local test server. It opens two real windows, waits for a real 30-second refresh with the popup closed, verifies membership/isolation, and scans all six light/dark idle/paused/running combinations with axe. The suite's final JSON and raw screenshots are written to ignored `test-results/`. See [testing](TESTING.md) for the distinction between real-time checks and shorter unpacked-only test alarms.

## Load your working copy

Open `chrome://extensions`, enable Developer mode, choose Load unpacked, and select `extension/`. Pin Tempo. After editing runtime files, press Reload on the extension card and reopen its popup. Reloading stops active timers. Use ordinary test websites; refreshing can discard edits or repeat a form submission.

## Regenerate graphics

The runtime ships ready-made original icons and locally bundled OFL fonts. To regenerate the icon PNGs, install Pillow in a disposable environment:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements-assets.txt
.venv/bin/python scripts/assets.py
```

After a successful browser suite, rebuild the actual-popup store graphics, then the README and social images:

```sh
npm run assets:store
npm run assets:readme
```

The store script reads the actual browser screenshots; the README script reads those captured popup images and renders its original HTML design. Both run locally with bundled fonts. The social card is 1200 × 630; store screenshots are 1280 × 800; the promotional tile is 440 × 280. See [the graphics index](assets/README.md) for all exports.

## Agent documentation

[CLAUDE.md](../CLAUDE.md) is the short canonical guide. Its conditional sections are converted into plain Markdown headings in [AGENTS.md](../AGENTS.md). Run `python3 scripts/build_agents_md.py` after changing the source. `npm run check:docs` catches drift, oversized guides, broken local Markdown links, and missing image assets.

The structure follows `claude-md-guide`: commands and real constraints in the short root files; long setup, architecture, privacy, and release procedures in ordinary linked documents. No guide imports every runbook into every agent session.

## Package and release

`npm run package` creates the Store upload ZIP, source ZIP, publisher kit, and hashes in ignored `dist/`. `manifest.json` is at the upload ZIP root. Python's standard library handles packaging. The package script verifies archive integrity and manifest references; any available browser report must have passed.

Read [publishing](PUBLISH.md) before creating a release or updating the Store listing. The live extension remains version 1.0.0 until a separately submitted Store update is approved.
