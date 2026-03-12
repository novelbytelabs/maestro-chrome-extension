# ArqonMaestro Chrome Extension

Welcome to the Arqon Maestro Chrome Extension public beta documentation.

## Overview

The Arqon Maestro Chrome Extension is a Chrome-first browser control layer for Arqon Maestro. It provides voice-driven browser navigation, overlays, tab management, and release diagnostics through the popup and side panel.

## Quick Links

- [Local Runbook](LOCAL_RUNBOOK.md)
- [Supported Commands](SUPPORTED_COMMANDS.md)
- [Production Readiness Checklist](PRODUCTION_READINESS_CHECKLIST.md)
- [Command QA Matrix](COMMAND_QA_MATRIX.md)
- [Site Compatibility Sweep](SITE_COMPATIBILITY_SWEEP.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Phase 3 Runbook](PHASE3_RUNBOOK.md)
- [Technical Specification](SPEC.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)

## Features

- Chrome-first public beta
- Popup and side panel operator UX
- Overlay-based page interaction
- Tab management and browser navigation
- Explicit diagnostics, lifecycle state, and execution ledger
- Conservative runtime policy on sensitive domains

## Getting Started

1. Start Arqon Bus and the Arqon Maestro desktop app in local mode
2. Build or download the extension package
3. Open Chrome and navigate to `chrome://extensions`
4. Enable Developer Mode and load the extension
5. Verify the popup reports `Connected to Arqon Bus`

## Public Beta Scope

The public beta supports the command surface defined in [Supported Commands](SUPPORTED_COMMANDS.md).

The beta does not commit to:
- arbitrary text-click automation
- full editor automation parity across all sites
- broad browser parity beyond Chrome-first support
- advanced semantic features such as Teach Mode or Session Memory

## Related Documentation

- [ArqonMaestro Main Documentation](https://novelbytelabs.github.io/ArqonMaestro/)
- [Arqon Maestro Getting Started](https://novelbytelabs.github.io/ArqonMaestro/guides/getting-started/)
