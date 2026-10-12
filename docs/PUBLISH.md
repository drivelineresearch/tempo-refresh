# Releases and Chrome Web Store updates

Tempo 1.0.0 is [published publicly in the Chrome Web Store](https://chromewebstore.google.com/detail/tempo-%E2%80%94-tab-window-refres/icbbmkelghjebpomabomndmlnjpdlcjd), verified October 12, 2026. Its Store item ID is `icbbmkelghjebpomabomndmlnjpdlcjd`. The listing and the [public source repository](https://github.com/drivelineresearch/tempo-refresh) are separate delivery paths.

## Publish a GitHub source release

1. Review runtime changes and version references. If extension behavior or the manifest changes, choose the next version and update both `extension/manifest.json` and `package.json`; regenerate the lockfile as needed.
2. Run `npm test`, `npm run check:docs`, and `npm run test:browser`. Review the actual popup screenshots and current privacy/permission claims.
3. If graphics changed, run `npm run assets:store` and `npm run assets:readme` after browser checks. Keep the screenshots aligned with the release behavior.
4. Run `npm run package`. Verify that the upload ZIP has `manifest.json` at its root and that all archives pass integrity checks. Compare the SHA-256 hashes with `dist/SHA256SUMS.txt`.
5. Commit the reviewed source and guides. Create a version tag and GitHub release with the extension ZIP, source ZIP, publisher kit, checksum file, and social image. State whether that version is also available in the Store.

The MIT code, docs, and original graphics remain public. The OFL font notice must ship with the fonts. Local profiles, model-session records, credentials, logs, and development dependencies stay out of public archives.

## Update the existing Store item

Use the Google account that owns this published developer listing. A new GitHub release does not update installed Store copies.

1. Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) and select the existing Tempo item. Keep the item ID; creating another item would create a different install path.
2. Upload the new `tempo-refresh-VERSION.zip` from `dist/`. Chrome requires a higher manifest version for an extension update.
3. Refresh the description, screenshots, and privacy declarations if the update changes them. Keep distribution Public to preserve the searchable listing.
4. Supply reviewer instructions and submit the update for review. Choose automatic or deferred publication according to the release plan. Follow the dashboard's deadlines for deferred releases.
5. Verify the public listing's version and available update after approval. Record Store state separately from GitHub CI/release state.

## Files in the publisher kit

- The runtime upload ZIP, with no `node_modules` or test tools.
- `store/icon-128.png`, the 128 × 128 icon.
- `store/promo-440x280.png`, the small promotional image.
- Light/dark 1280 × 800 screenshots captured from the running extension.
- `store/LISTING.md`, reusable detailed copy.
- `store/PRIVACY-DECLARATIONS.md`, permission justifications and reviewer instructions.
- `store/privacy.html`, a standalone policy page that can be served at a stable public HTTPS URL.

Use the publisher contact and privacy URL configured in the live developer profile. The repository does not claim to know or replace those account settings. The [public privacy explanation](PRIVACY.md) describes the source's data handling.

## Publishing a fork

Change the name, description, artwork as desired, repository links, publisher contact, policy URL, and version before publishing a fork as a new Store item. Keep applicable license notices and do not imply it is an official Tempo release. Its new item receives a separate Google review and install URL.

Official references: [publishing workflow](https://developer.chrome.com/docs/webstore/publish), [updating an item](https://developer.chrome.com/docs/webstore/update), [required images](https://developer.chrome.com/docs/webstore/images), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
