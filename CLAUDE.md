# Tempo

Tempo refreshes a chosen Chrome tab or exactly one window on a user-selected interval. It is a public MIT-licensed extension with plain JavaScript, Manifest V3, and no runtime dependencies. Keep the single-purpose workflow and explicit window isolation intact.

## Stack and layout

- `extension/engine.js` owns alarms, session state, window membership, menus, and badges; `extension/worker.js` serializes Chrome events.
- `extension/popup.js` and its HTML/CSS own the interface; `extension/fonts/OFL.txt` covers the bundled fonts.
- `tests/` verifies behavior; `scripts/` packages and generates artifacts; `store/` and `docs/` contain graphics and human guides.

## Commands

| Task | Command |
| --- | --- |
| Install development dependencies | `npm ci --ignore-scripts` |
| Engine tests | `npm test` |
| Installed-extension browser checks | `npm run test:browser` |
| Documentation and agent-file checks | `npm run check:docs` |
| Package archives | `npm run package` |
| Rebuild the portable agent guide | `python3 scripts/build_agents_md.py` |

## Precedence

The working code takes precedence over plans; plans take precedence over this guide. Report a conflict before changing the intended behavior.

<important if="editing timers or window membership">
Use Chrome alarms with a production minimum of 30 seconds. Active timer state belongs in session storage; tab IDs must not carry across browser sessions. Preserve the event queue in `extension/worker.js` and live window membership in `extension/engine.js`. Run engine and browser checks for behavioral changes; read `docs/ARCHITECTURE.md` for the lifecycle contracts.
</important>

<important if="editing the popup or graphics">
Use the existing bundled font and theme tokens in `extension/popup.css`, including dark text on goldenrod. Review the actual popup at 380 × 600 in light and dark themes, including idle, paused, running, and error states. Keep graphics reproducible through `scripts/readme-assets.mjs` and `scripts/store-assets.mjs`.
</important>

<important if="changing permissions or data handling">
The existing manifest uses four permissions and no host access or content scripts. Explain a proposed permission expansion and keep privacy disclosures accurate. Read `docs/PRIVACY.md`; selected tab titles and URLs stay in memory, never persisted or transmitted.
</important>

<important if="editing agent instructions">
This file is the canonical instruction source. Generate the plain-Markdown AGENTS.md with `scripts/build_agents_md.py`; check parity with `npm run check:docs`. Keep these instructions short and link long runbooks by ordinary paths.
</important>

<important if="building archives or publishing releases">
Read `docs/PUBLISH.md` before releasing. Exclude local logs, credentials, model-session records, and development dependencies from public artifacts. Extension behavior or manifest changes require a new version and a separate Store update; GitHub publication alone does not update installed copies.
</important>

## Read when needed

- `docs/DEVELOPMENT.md` — setup, verification, and asset regeneration.
- `docs/PROMPT-GUIDE.md` — building a similar extension from natural language.
- `docs/COMPARISON.md` — evidence for competitor comparisons.

Human release review covers README graphics, claims, privacy wording, and Chrome Web Store metadata. Automated checks cover behavior, accessibility, archive integrity, agent parity, and local document links.
