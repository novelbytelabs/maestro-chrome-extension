# Troubleshooting

## Popup shows disconnected

Check these first:
- Arqon Bus is listening on `9100`
- the extension was reloaded after the last build
- the browser tab you are targeting is a normal `http(s)` page

Useful checks:

```bash
ss -ltnp | grep -E "9100|17200|17202|17203"
```

## `show links` does nothing

Work in this order:
1. Confirm the popup shows connected
2. Confirm the side panel or popup has a valid active page summary
3. Reload the extension in `chrome://extensions`
4. Refresh the target tab
5. Retry on a simple `http(s)` page first

If `await self.__debugShowLinks()` works but voice does not, the extension renderer is healthy and the problem is upstream in live command delivery.

## `Reconnect` does not recover the session

Check:
- Arqon Bus is actually running on `9100`
- Maestro desktop app is running in local mode
- Maestro local services are listening on `17200`, `17202`, and `17203`

Then use the popup `Reconnect` button again and verify the side panel lifecycle section updates.

## Overlays keep reappearing

The production policy is:
- overlays are explicit by command
- per-tab auto-overlay can be enabled only on non-sensitive pages
- overlays should not globally reappear across tabs

If they do:
- disable the overlay toggle for that tab
- refresh the page
- confirm you are not on a stale extension build

## Overlay toggle is disabled or blocked

That means the current page is being treated as sensitive by site policy.

Examples:
- login
- billing
- checkout
- admin
- secure account pages

On those pages, per-tab auto-overlay is intentionally blocked. Use explicit commands only where allowed.

## Side panel does not open

Check:
- the extension was reloaded after the last build
- the current tab is a normal `http(s)` page
- Chrome is using the unpacked extension from this repo

If needed:
- reload the extension
- reopen the popup
- click `Open Panel` again

## Browser startup works once and then fails after reboot

Use the startup order in [LOCAL_RUNBOOK.md](LOCAL_RUNBOOK.md).

Most common causes:
- Bus not started
- Maestro not started in local mode
- extension not reloaded after a rebuild
- stale Chrome session after a code change
