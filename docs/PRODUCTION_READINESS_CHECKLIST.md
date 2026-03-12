# Production Readiness Checklist

Use this checklist before every public beta release candidate.

## 1. Startup and Cold Restart

- [ ] Restart Chrome, Arqon Bus, and Arqon Maestro from a powered-off state
- [ ] Reload the unpacked extension once after the build
- [ ] Confirm popup shows `Connected to Arqon Bus`
- [ ] Confirm side panel opens successfully
- [ ] Confirm `show links` works without any debug helpers
- [ ] Confirm `show links` still works after a browser restart
- [ ] Confirm `Reconnect` works from the popup

## 2. Bus Connection and Reconnect

- [ ] Stop Arqon Bus while Chrome and Maestro remain running
- [ ] Confirm popup and side panel show disconnected/backoff state
- [ ] Restart Arqon Bus
- [ ] Confirm worker reconnects without extension reload
- [ ] Confirm supported commands work after reconnect
- [ ] Confirm no `socket-not-open` regressions appear in Maestro logs

## 3. Popup and Side Panel Health

- [ ] Popup loads without blank/error state
- [ ] Active Page panel updates when switching tabs
- [ ] Last Action reflects the last supported command
- [ ] Diagnostics render without `n/a` errors or thrown exceptions
- [ ] Side panel execution ledger updates during normal use
- [ ] Capability map renders correctly
- [ ] Policy Preview reflects the current domain and runtime posture

## 4. Core Command QA

- [ ] Complete `docs/COMMAND_QA_MATRIX.md`
- [ ] Every production-supported command has a pass result or documented caveat
- [ ] No production-supported command fails silently
- [ ] Compatibility-routed commands are explicitly labeled in diagnostics

## 5. Sensitive-Page Policy Behavior

- [ ] Open one auth/payment/admin-like page
- [ ] Confirm overlay auto-show cannot be enabled there
- [ ] Confirm policy preview shows conservative posture
- [ ] Confirm blocked commands surface `blocked by policy` clearly in the UI/trace
- [ ] Confirm explicit overlay commands still behave predictably where allowed

## 6. Packaging and Install

- [ ] `npm run build`
- [ ] `npm run dist`
- [ ] Verify `build.zip` contains `build/`, `img/`, and `manifest.json`
- [ ] Load the extension from a clean Chrome profile
- [ ] Confirm icons render in popup and extensions page
- [ ] Confirm docs button opens the getting-started guide

## 7. Chrome Web Store Assets and Listing

- [ ] Finalize `docs/CHROME_WEB_STORE_LISTING.md`
- [ ] Capture at least 5 screenshots
- [ ] Verify icon set and promotional assets exist
- [ ] Verify store copy matches the production-supported command set
- [ ] Verify listing copy states Chrome-first public beta

## 8. Final Release Sign-Off

- [ ] One week of internal soak completed
- [ ] No cold-start regressions observed
- [ ] No overlay spam regressions observed
- [ ] No reconnect dead-end regressions observed
- [ ] No critical regressions in the supported command set
- [ ] Beta version number updated in `manifest.json`
- [ ] `build.zip` uploaded to Chrome Web Store dashboard
