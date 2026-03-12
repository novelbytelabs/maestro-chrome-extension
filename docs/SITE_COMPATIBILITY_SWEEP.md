# Site Compatibility Sweep

Use this matrix to define the beta support boundary by site class.

| Site class | Example targets | Expected bucket | Result | Notes |
|---|---|---:|---|---|
| Documentation / content | Wikipedia, docs sites | supported |  |  |
| GitHub | github.com | supported with caveats |  |  |
| Form-heavy / admin | dashboard or CRUD app | supported with caveats |  |  |
| Editor-heavy | local editor test page | degraded |  |  |
| Multi-frame app | diagrams.net | supported with caveats |  |  |
| Shadow-DOM-heavy modern app | AI Studio or similar | degraded |  |  |
| Sensitive auth / payment / admin | login, billing, checkout, admin | blocked by policy |  |  |

## Bucket Definitions

- `supported`: production-supported commands work as expected
- `supported with caveats`: production-supported commands mostly work but require documented caution
- `degraded`: commands may work, but route or runtime behavior is not strong enough for public promises
- `blocked by policy`: conservative runtime policy intentionally restricts automation behavior

## Minimum Evidence To Record

For each site class, capture:
- tested URL or representative app
- commands exercised
- route/result from the side panel execution ledger
- any policy block or degraded-path note
