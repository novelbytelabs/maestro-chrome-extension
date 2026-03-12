# Supported Commands

This document defines the Chrome-first command surface for the first public beta of the Arqon Maestro Chrome Extension.

## Production-Supported Commands

| Voice phrase | Command type | Route | Support level | Expected result |
|---|---|---:|---:|---|
| `show links` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | Number visible links, buttons, and link-like targets on the active page |
| `show inputs` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | Number visible input controls on the active page |
| `show code` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | Number visible code blocks on the active page |
| `show all` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | Number all visible actionable targets on the active page |
| `use <n>` | `COMMAND_TYPE_USE` | `content-script-direct` | stable | Activate the numbered overlay target |
| `cancel` | `COMMAND_TYPE_CANCEL` | `content-script-direct` | stable | Clear overlays on the active page |
| `next tab` | `COMMAND_TYPE_NEXT_TAB` | `extension-worker` | stable | Activate the next tab in the current Chrome window |
| `previous tab` | `COMMAND_TYPE_PREVIOUS_TAB` | `extension-worker` | stable | Activate the previous tab in the current Chrome window |
| `switch tab <n>` | `COMMAND_TYPE_SWITCH_TAB` | `extension-worker` | stable | Activate tab number `n` in the current Chrome window |
| `close tab` | `COMMAND_TYPE_CLOSE_TAB` | `extension-worker` | stable | Close the active tab |
| `duplicate tab` | `COMMAND_TYPE_DUPLICATE_TAB` | `extension-worker` | stable | Duplicate the active tab |
| `reload` | `COMMAND_TYPE_RELOAD` | `extension-worker` | stable | Reload the active tab |
| `back` | `COMMAND_TYPE_BACK` | `content-script-direct` | stable | Navigate browser history backward |
| `forward` | `COMMAND_TYPE_FORWARD` | `content-script-direct` | stable | Navigate browser history forward |
| `go to <site>` | `COMPAT_OPEN_SITE` | `browser-nav-compat` | compatibility | Navigate the active tab to a valid URL |
| `open <site>` | `COMPAT_OPEN_SITE` | `browser-nav-compat` | compatibility | Navigate the active tab to a valid URL |
| `open new tab <site>` | `COMPAT_OPEN_SITE_NEW_TAB` | `browser-nav-compat` | compatibility | Create a new tab and navigate to a valid URL |

## Degraded / Experimental Commands

These commands exist in the runtime and capability registry, but they are not part of the public beta contract.

| Command type | Public status | Reason |
|---|---:|---|
| `COMMAND_TYPE_CLICK` | experimental | Still depends on injected-page selectors and heuristic text matching |
| `COMMAND_TYPE_CLICKABLE` | experimental | Still depends on injected-page matching and legacy selector logic |
| `COMMAND_TYPE_DOM_BLUR` | experimental | Injected-page DOM selector path |
| `COMMAND_TYPE_DOM_CLICK` | experimental | Injected-page DOM selector path |
| `COMMAND_TYPE_DOM_COPY` | experimental | Injected-page DOM selector path |
| `COMMAND_TYPE_DOM_FOCUS` | experimental | Injected-page DOM selector path |
| `COMMAND_TYPE_DOM_SCROLL` | experimental | Injected-page DOM selector path |
| `COMMAND_TYPE_SCROLL` | experimental | Hover/container scroll heuristics remain legacy and site-dependent |
| `COMMAND_TYPE_DIFF` | experimental | Editor mutation path still relies on injected editor bindings |
| `COMMAND_TYPE_GET_EDITOR_STATE` | experimental | Editor discovery path is still legacy/injected |
| `COMMAND_TYPE_REDO` | experimental | Editor command path is still legacy/injected |
| `COMMAND_TYPE_SELECT` | experimental | Editor selection path is still legacy/injected |
| `COMMAND_TYPE_UNDO` | experimental | Editor command path is still legacy/injected |
| `COMMAND_TYPE_CREATE_TAB` | internal only | Runtime utility, not part of the public beta command set |

## Beta Support Boundaries

The public beta commits to:
- Chrome-first support
- the command set in the production-supported table above
- popup and side panel diagnostics
- explicit degraded behavior instead of silent failures

The public beta does not commit to:
- arbitrary text-click automation
- broad editor mutation reliability across all sites
- full browser parity across Chrome, Edge, and Brave
- semantic/teaching features
- advanced policy authoring
