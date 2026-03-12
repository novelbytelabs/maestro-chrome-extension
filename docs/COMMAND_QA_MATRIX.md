# Command QA Matrix

Record pass/fail evidence for the public beta command surface here.

## Environments

- Plain docs page: Wikipedia or docs page
- Form-heavy page: a site with multiple inputs and buttons
- Editor test page: `npm run test` at `http://localhost:8001/src/test/`
- Multi-frame page: diagrams.net or similar frame-heavy app
- Sensitive/auth-like page: login, billing, or admin page for policy validation

## Matrix

| Command phrase | Command type | Route | Support level | Test pages | Fresh startup | Warm session | After Bus reconnect | After browser restart | Notes / regressions |
|---|---|---:|---:|---|---|---|---|---|---|
| `show links` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | docs, multi-frame | [ ] | [x] | [x] | [x] | |
| `show inputs` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | form, editor test | [ ] | [x] | [x] | [x] | |
| `show code` | `COMMAND_TYPE_SHOW` | `content-script-direct` | stable | docs, editor test | [ ] | [x] | [x] | [x] | |
| `use 1` | `COMMAND_TYPE_USE` | `content-script-direct` | stable | docs, form | [ ] | [x] | [x] | [x] | |
| `cancel` | `COMMAND_TYPE_CANCEL` | `content-script-direct` | stable | docs, form | [ ] | [x] | [x] | [x] | |
| `next tab` | `COMMAND_TYPE_NEXT_TAB` | `extension-worker` | stable | browser shell | [ ] | [x] | [x] | [x] | |
| `previous tab` | `COMMAND_TYPE_PREVIOUS_TAB` | `extension-worker` | stable | browser shell | [ ] | [x] | [x] | [x] | |
| `switch tab two` | `COMMAND_TYPE_SWITCH_TAB` | `extension-worker` | stable | browser shell | [ ] | [x] | [x] | [x] | |
| `close tab` | `COMMAND_TYPE_CLOSE_TAB` | `extension-worker` | stable | browser shell | [ ] | [x] | [x] | [x] | |
| `duplicate tab` | `COMMAND_TYPE_DUPLICATE_TAB` | `extension-worker` | stable | browser shell | [ ] | [x] | [x] | [x] | |
| `reload` | `COMMAND_TYPE_RELOAD` | `extension-worker` | stable | docs | [ ] | [x] | [x] | [x] | |
| `back` | `COMMAND_TYPE_BACK` | `content-script-direct` | stable | docs | [ ] | [x] | [x] | [x] | |
| `forward` | `COMMAND_TYPE_FORWARD` | `content-script-direct` | stable | docs | [ ] | [x] | [x] | [x] | |
| `go to google.com` | `COMPAT_OPEN_SITE` | `browser-nav-compat` | compatibility | browser shell | [ ] | [x] | [x] | [x] | |
| `open wikipedia.org` | `COMPAT_OPEN_SITE` | `browser-nav-compat` | compatibility | browser shell | [ ] | [x] | [x] | [x] | |

## Acceptance Notes

- Use the side panel execution ledger as the authoritative route/result trace.
- Record failures even if a retry later passes.
- If a command only works with caveats on a site class, note the caveat instead of marking it cleanly supported.
