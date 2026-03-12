# Production Readiness Checklist

Use this checklist before every public beta release candidate.

## 1. Startup and Cold Restart

- [x] Restart Chrome, Arqon Bus, and Arqon Maestro from a powered-off state
- [x] Reload the unpacked extension once after the build
- [x] Confirm popup shows `Connected to Arqon Bus`
- [x] Confirm side panel opens successfully
- [x] Confirm `show links` works without any debug helpers
- [x] Confirm `show links` still works after a browser restart
- [x] Confirm `Reconnect` works from the popup

## 2. Bus Connection and Reconnect

- [x] Stop Arqon Bus while Chrome and Maestro remain running
- [x] Confirm popup and side panel show disconnected/backoff state
- [x] Restart Arqon Bus
- [x] Confirm worker reconnects without extension reload
- [x] Confirm supported commands work after reconnect
- [ ] Confirm no `socket-not-open` regressions appear in Maestro logs

## 3. Popup and Side Panel Health

- [x] Popup loads without blank/error state
- [x] Active Page panel updates when switching tabs
- [ ] Last Action reflects the last supported command
- [x] Diagnostics render without `n/a` errors or thrown exceptions
- [x] Side panel execution ledger updates during normal use
- [x] Capability map renders correctly
- [x] Policy Preview reflects the current domain and runtime posture

## 4. Core Command QA

- [ ] Complete `docs/COMMAND_QA_MATRIX.md`
- [x] Every production-supported command has a pass result or documented caveat
- [x] No production-supported command fails silently
- [x] Compatibility-routed commands are explicitly labeled in diagnostics

## 5. Sensitive-Page Policy Behavior

- [x] Open one auth/payment/admin-like page
- [x] Confirm overlay auto-show cannot be enabled there
- [x] Confirm policy preview shows conservative posture
- [x] Confirm blocked commands surface `blocked by policy` clearly in the UI/trace
- [x] Confirm explicit overlay commands still behave predictably where allowed

## 6. Packaging and Install

- [x] `npm run build`
- [x] `npm run dist`
- [x] Verify `build.zip` contains `build/`, `img/`, and `manifest.json`
- [x] Load the extension from a clean Chrome profile
- [x] Confirm icons render in popup and extensions page
- [x] Confirm docs button opens the getting-started guide

## 7. Chrome Web Store Assets and Listing

- [x] Finalize `docs/CHROME_WEB_STORE_LISTING.md`
- [x] Capture at least 5 screenshots
- [x] Verify icon set and promotional assets exist
- [x] Verify store copy matches the production-supported command set
- [x] Verify listing copy states Chrome-first public beta

## 8. Final Release Sign-Off

- [x] One week of internal soak completed
- [x] No cold-start regressions observed
- [x] No overlay spam regressions observed
- [x] No reconnect dead-end regressions observed
- [x] No critical regressions in the supported command set
- [x] Beta version number updated in `manifest.json`
- [x] `build.zip` uploaded to Chrome Web Store dashboard
