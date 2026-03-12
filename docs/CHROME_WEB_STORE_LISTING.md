# Chrome Web Store Listing - Arqon Maestro

## Store Listing Details

### Name
**Arqon Maestro**

### Short Description (up to 132 characters)
Chrome-first browser control for Arqon Maestro public beta. Use voice commands for overlays, tabs, and navigation.

### Detailed Description

```
Arqon Maestro - Chrome Browser Control (Public Beta)

Arqon Maestro brings Chrome-first browser control to the Arqon Maestro desktop app.

Public beta features:
• Overlay commands - "show links", "show inputs", "show code", "use 1"
• Tab control - "next tab", "switch tab two", "close tab", "duplicate tab"
• Navigation - "back", "forward", "reload"
• Site navigation - "go to google.com", "open github.com"
• Popup and side panel visibility into connection, routing, policy, and lifecycle state

How it works:
1. Install the Chrome extension
2. Start Arqon Bus and the Arqon Maestro desktop app in local mode
3. Use supported voice commands in Chrome

Requirements:
• Arqon Maestro desktop application
• Arqon Bus local runtime
• Microphone access

Public beta scope:
• Chrome-first support
• Conservative runtime behavior on sensitive domains
• Explicit compatibility and limitation reporting in the extension UI
• On sensitive domains, explicit inspection commands may be allowed while action execution remains policy-limited

Learn more: https://novelbytelabs.github.io/ArqonMaestro/guides/getting-started/
Support: https://github.com/novelbytelabs/maestro-chrome-extension/issues
Privacy Policy: https://novelbytelabs.github.io/ArqonMaestro/privacy-policy/maestro-chrome-extension/PRIVACY_POLICY/
```

### Category
Developer Tools

### Language
English (en)

---

## Required Assets

### 1. Icon (128x128 PNG)
**Location:** `img/icon_default/128x128.png`
**Status:** ✅ Already exists

### 2. Screenshots (1280x800 or 640x400)
Chrome Web Store requires at least 1 screenshot. Recommended: 5-8 screenshots.

**Captured screenshot set:**

| # | Screenshot Name | Description | Dimensions |
|---|----------------|-------------|------------|
| 1 | `tmp/screenshots/cws-01-popup-operator-deck.png` | Popup showing operator deck, connection ledger, and active page summary | 1280x800 |
| 2 | `tmp/screenshots/cws-02-sidepanel-active-page-intelligence.png` | Side panel showing active page intelligence and diagnostics | 1280x800 |
| 3 | `tmp/screenshots/cws-03-popup-connected-surface.png` | Popup showing connected runtime state and operator controls | 1280x800 |
| 4 | `tmp/screenshots/cws-04-sidepanel-execution-ledger.png` | Side panel showing execution ledger with stable and compatibility-routed commands | 1280x800 |
| 5 | `tmp/screenshots/cws-05-sensitive-page-policy-preview.png` | Sensitive-domain policy preview showing conservative posture | 1280x800 |
| 6 | `tmp/screenshots/cws-06-popup-sensitive-policy-override.png` | Popup showing sensitive-page policy override from requested mode to effective mode | 1280x800 |
| 7 | `tmp/screenshots/cws-07-link-overlays-normal-page.png` | Link overlays on a normal page using `show links` | 1280x800 |

### 3. Promotional Images (Optional)

Promotional images are not required for the current public beta submission. The listing is expected to ship with the icon set and screenshot set above.

---

## Existing Assets Available

### Icons (in project)
- `img/icon_default/128x128.png` - Main icon (connected state)
- `img/icon_disconnected/128x128.png` - Disconnected state icon
- `img/icon_default/16x16.png`, `32x32.png`, `48x48.png` - Required extension icon sizes
- `img/icon_disconnected/16x16.png`, `32x32.png`, `48x48.png` - Alternate state icon sizes

### Logos (in `docs/assets/`)
- `docs/assets/symbol.png` - Current symbol asset
- `docs/assets/favicon.ico` - Favicon / small brand mark

---

## Store Setup Checklist

- [x] Create Chrome Web Store developer account ($5)
- [x] Upload 128x128 icon
- [x] Write short description (≤132 chars)
- [x] Write detailed description
- [x] Create/upload screenshots (1280x800 recommended)
- [ ] Add promotional images (optional, skip for current beta)
- [x] Set category: Developer Tools
- [x] Add privacy policy URL
- [ ] Verify extension works in Chrome
- [ ] Verify listing copy matches `docs/SUPPORTED_COMMANDS.md`
- [x] Submit for review

---

## Upload Steps

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "Add new item"
3. Upload `build.zip` (run `npm run dist` to create)
4. Fill in store listing details
5. Submit for review

---

## Version Notes

Current extension version: `2.0.4` (see `manifest.json`)

When updating:

1. Increment version in `manifest.json`
2. Run `npm run build`
3. Run `npm run dist`
4. Upload the new zip to the developer dashboard
