# Chrome Web Store Listing - Arqon Maestro

## Store Listing Details

### Name
**Arqon Maestro**

### Short Description (up to 132 characters)
Chrome-first browser control for Arqon Maestro. Use voice commands for overlays, tabs, navigation, and diagnostics.

### Detailed Description

```
Arqon Maestro - Chrome Browser Control (Public Beta)

Arqon Maestro brings Chrome-first browser control to the Arqon Maestro desktop app.

Public beta features:
• Overlay commands - "show links", "show inputs", "show code", "use 1"
• Tab control - "next tab", "switch tab two", "close tab", "duplicate tab"
• Navigation - "back", "forward", "reload"
• Site navigation - "go to google.com", "open new tab github.com"
• Popup and side panel diagnostics for connection, routing, and lifecycle state

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

Learn more: https://novelbytelabs.github.io/ArqonMaestro/guides/getting-started/
Support: https://novelbytelabs.github.io/maestro-chrome-extension/
Privacy Policy: https://arqon.ai/privacy
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

**Recommended screenshots to create:**

| # | Screenshot Name | Description | Dimensions |
|---|----------------|-------------|------------|
| 1 | popup-ui.png | Popup showing connection ledger and active page state | 1280x800 |
| 2 | sidepanel-ui.png | Side panel showing execution ledger and diagnostics | 1280x800 |
| 3 | overlays-demo.png | `show links` overlay command in action | 1280x800 |
| 4 | navigation-demo.png | `go to <site>` and tab navigation behavior | 1280x800 |
| 5 | policy-demo.png | Sensitive-domain policy posture and blocked overlay toggle | 1280x800 |

### 3. Promotional Images (Optional but recommended)

| Image Type | Size | Purpose |
|------------|------|---------|
| Marquee | 440x280 | Storefront thumbnail |
| Small promo tile | 920x680 | Featured on store |

---

## Existing Assets Available

### Icons (in project)
- `img/icon_default/128x128.png` - Main icon (connected state)
- `img/icon_disconnected/128x128.png` - Disconnected state icon

### Logos (in `docs/assets/`)
- `docs/assets/symbol.png` - Current symbol asset
- `docs/assets/favicon.ico` - Favicon / small brand mark

---

## Store Setup Checklist

- [ ] Create Chrome Web Store developer account ($5)
- [ ] Upload 128x128 icon
- [ ] Write short description (≤132 chars)
- [ ] Write detailed description
- [ ] Create/upload screenshots (1280x800 recommended)
- [ ] Add promotional images (optional)
- [ ] Set category: Developer Tools
- [ ] Add privacy policy URL
- [ ] Verify extension works in Chrome
- [ ] Verify listing copy matches `docs/SUPPORTED_COMMANDS.md`
- [ ] Submit for review

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
