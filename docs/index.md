# ArqonMaestro Chrome Extension

Welcome to the ArqonMaestro Chrome Extension documentation.

## Overview

The ArqonMaestro Chrome Extension enables voice-controlled web browsing and code editing directly in Chrome. Control your browser with voice commands, interact with web-based code editors, and navigate the web hands-free.

## Quick Links

- [Local Runbook](LOCAL_RUNBOOK.md)
- [Phase 3 Runbook](PHASE3_RUNBOOK.md)
- [Technical Specification](SPEC.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)

## Features

### Browser Control
- Tab management (create, close, switch, duplicate)
- Navigation (back, forward, reload)
- Page interaction via overlays

### Editor Integration
- Ace Editor
- CodeMirror
- Monaco Editor
- Native input/textarea elements

### Voice Commands
- `new tab` - Create a new browser tab
- `close tab` - Close the current tab
- `switch to tab <n>` - Switch to specific tab
- `open <site>` - Navigate to a website
- `back` / `forward` - Navigate history
- `links` - Show clickable elements overlay
- `inputs` - Show input fields overlay
- `click <text>` - Click element by text

## Getting Started

1. Download the extension from the releases
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

## Related Documentation

- [ArqonMaestro Main Documentation](https://novelbytelabs.github.io/ArqonMaestro/)
- [Browser Getting Started](../ArqonMaestro/docs/browser/getting-started.md)
- [Browser Commands](../ArqonMaestro/docs/guides/browser-and-system-control.md)
