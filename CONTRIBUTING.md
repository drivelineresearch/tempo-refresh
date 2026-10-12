# Contributing

Start with [development setup](docs/DEVELOPMENT.md) and [architecture](docs/ARCHITECTURE.md). [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) describe the same concise project contract for coding assistants.

For a behavioral change, include a concrete before/after example and relevant engine/browser evidence. For visual changes, include actual light and dark screenshots with the affected controls visible. For a permission or data-handling change, explain the need and update the privacy disclosures.

Run `npm test` and `npm run check:docs`. Runtime changes also need `npm run test:browser`. Documentation-only edits do not require another real-time browser run unless they change test instructions or linked assets.

Use the [issue tracker](https://github.com/drivelineresearch/tempo-refresh/issues) for bugs and feature requests. Include Chrome version, platform, tab/window scope, interval, and reproduction steps; omit private URLs and page contents.

Contributions to code, docs, and original artwork are accepted under the repository's MIT license. Preserve the separate SIL OFL notice for bundled fonts. A GitHub merge does not publish a Chrome Web Store update; follow [the release guide](docs/PUBLISH.md) for that step.
