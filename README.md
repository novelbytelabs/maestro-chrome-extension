# Arqon Maestro Chrome Extension

Chrome-first public beta source for the Arqon Maestro browser control layer.

This extension is the browser-side control surface for the local Arqon Maestro stack. It connects to Arqon Bus, exposes popup and side panel diagnostics, and executes the supported Chrome command surface for overlays, tabs, and navigation.

## Public Beta Scope

The first public beta supports:

- `show links`
- `show inputs`
- `show code`
- `use <n>`
- `cancel`
- `next tab`
- `previous tab`
- `switch tab <n>`
- `close tab`
- `duplicate tab`
- `reload`
- `back`
- `forward`
- `go to <site>`
- `open <site>`

The public beta does not promise:

- arbitrary click automation
- broad editor mutation reliability
- full browser parity outside Chrome
- teaching, semantic memory, or advanced policy authoring

For the release contract, see [docs/SUPPORTED_COMMANDS.md](docs/SUPPORTED_COMMANDS.md).

## Install

The Arqon Maestro extension is now available on the Chrome Web Store.

1. Visit the [Arqon Maestro Chrome Web Store Page](https://chromewebstore.google.com/detail/arqon-maestro/bmmbdafijegjhckimaoinnediipgoakp?authuser=0&hl=en).
2. Click **Add to Chrome**.
3. **Pin the extension**: Click the puzzle icon (Extensions) in your Chrome toolbar and click the pin icon next to **Arqon Maestro**.

After loading the extension, reload any tabs that were already open.

### Manual / Developer Install

If you prefer to load the extension from source:

1. Run `npm install`
2. Run `npm run build`
3. In Chrome, open `chrome://extensions`
4. Enable Developer Mode
5. Click `Load unpacked`
6. Select this repository root, which contains `manifest.json`, `build/`, and `img/`

After loading the extension, reload any tabs that were already open.

For local startup after a reboot, see [docs/LOCAL_RUNBOOK.md](docs/LOCAL_RUNBOOK.md).

## Architecture

The extension is Manifest V3 and uses a service worker plus content-script model.

- `src/extension.ts`
  Entry point for the service worker and runtime lifecycle hooks.
- `src/ipc.ts`
  Core routing layer for Arqon Bus connection management, command dispatch, operator snapshot state, and policy enforcement.
- `src/extension-command-handler.ts`
  Handles browser-level commands that need Chrome APIs, such as tab management.
- `src/content-script.ts`
  Handles direct page interaction, overlay rendering, page analysis, and messaging to the service worker.
- `src/injected.ts`
  Injected page bridge for legacy/experimental page-world interactions.
- `src/injected-command-handler.ts`
  Handles injected-page commands that still rely on page-world access.
- `src/operator-snapshot.ts`
  Defines the shared operator snapshot model used by the popup and side panel.
- `src/popup.ts`
  Popup operator surface.
- `src/sidepanel.ts`
  Side panel operator surface.
- `src/editors.ts`
  Editor integrations for native inputs plus Ace, CodeMirror, and Monaco.

## Development

Common commands:

- `npm run build`
  Build the extension in development mode.
- `npm run watch`
  Rebuild automatically while iterating.
- `npm run dist`
  Create the production build and package `build.zip`.
- `npm run test`
  Serve the local editor test page at `http://localhost:8001/src/test/`

When iterating:

1. Rebuild with `npm run build` or run `npm run watch`
2. Reload the extension in `chrome://extensions`
3. Refresh the target tab

## Release and Support Docs

- [docs/PRODUCTION_READINESS_CHECKLIST.md](docs/PRODUCTION_READINESS_CHECKLIST.md)
- [docs/COMMAND_QA_MATRIX.md](docs/COMMAND_QA_MATRIX.md)
- [docs/SITE_COMPATIBILITY_SWEEP.md](docs/SITE_COMPATIBILITY_SWEEP.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- [docs/CHROME_WEB_STORE_LISTING.md](docs/CHROME_WEB_STORE_LISTING.md)
- [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)

## Deployment

1. Update the version in `manifest.json`
2. Run `npm run build`
3. Run `npm run dist`
4. Validate `build.zip`
5. Upload the package to the Chrome Web Store
