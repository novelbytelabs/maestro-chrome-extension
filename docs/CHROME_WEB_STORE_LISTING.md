# Chrome Web Store Listing - Arqon Maestro

## Store Listing Details

### Name
**Arqon Maestro**

### Short Description (up to 132 characters)
Code with voice. Control your browser hands-free with AI-powered voice commands.

### Detailed Description

```
Arqon Maestro - Voice-First Browser Control

Control your browser with voice commands using Arqon Maestro, the AI-powered voice assistant for web development and browsing.

Features:
• Voice-controlled navigation - "go to github.com", "scroll down", "click submit"
• Click any element by speaking its text
• Tab management - "open new tab", "next tab", "close tab"
• Form filling via voice
• Editor integration - Works with web-based code editors (Monaco, Ace, CodeMirror)
• Hands-free web browsing for accessibility

How it works:
1. Install the Chrome extension
2. Run the Arqon Maestro desktop app
3. Start speaking commands!

Requirements:
• Arqon Maestro desktop application (free download at arqon.ai)
• Microphone access

Supported browsers: Chrome, Edge, Brave

Learn more: https://arqon.ai
Support: https://arqon.ai/docs
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
| 1 | popup-ui.png | Show the extension popup with Arqon Maestro branding | 1280x800 |
| 2 | voice-command-demo.png | Demo voice command in action | 1280x800 |
| 3 | overlays-demo.png | Show clickable overlays highlighted | 1280x800 |
| 4 | editor-integration.png | Show voice control in a web editor | 1280x800 |
| 5 | tab-management.png | Show tab management commands | 1280x800 |

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
- `logo_transparent.png` - Full logo with transparent background
- `logo_consistent_final.png` - Consistent branding logo
- `symbol_fixed.png` - Symbol/logo mark only
- `arqon_a.png` - Arqon "A" symbol

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

Current extension version: `2.0.3` (see `package.json`)

When updating:
1. Increment version in `package.json`
2. Run `npm run dist` to rebuild
3. Upload new zip to developer dashboard
