# Phase 3 Runbook

This is the working runbook for the current Chrome extension + Arqon Bus + Arqon Maestro setup.

## What Working Looks Like

- Arqon Bus listens on `127.0.0.1:9100`
- Maestro local services listen on `17200`, `17202`, and `17203`
- Chrome extension is loaded from this repository and reloaded after each build
- `show links` works by voice
- `await self.__debugShowLinks()` works from the extension service worker console

## Ports

- `9100` = Arqon Bus WebSocket
- `17200` = Maestro local core stream endpoint
- `17202` = Maestro speech engine
- `17203` = Maestro code engine

## Startup Order

### 1. Start Arqon Bus

```bash
cd ~/Projects/arqon/ArqonBus
python - <<'PY'
import asyncio
from arqonbus.config.config import get_config
from arqonbus.transport.websocket_bus import WebSocketBus
from arqonbus.routing.client_registry import ClientRegistry

async def main():
    config = get_config()
    ws_bus = WebSocketBus(ClientRegistry(), config=config)
    await ws_bus.start_server(host=config.server.host, port=config.server.port)
    print(f"ArqonBus listening on {config.server.host}:{config.server.port}")
    await asyncio.Future()

asyncio.run(main())
PY
```

### 2. Start Arqon Maestro

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./scripts/run_client.sh
```

### 3. Build the Chrome extension

```bash
cd ~/Projects/arqon/maestro-chrome-extension
npm run build
```

### 4. Load or reload the unpacked extension in Chrome

Open `chrome://extensions` and:

1. Turn on `Developer mode`
2. If needed, click `Load unpacked` and select:
   - `/home/irbsurfer/Projects/arqon/maestro-chrome-extension`
3. Otherwise click `Reload` on the existing unpacked extension

### 5. Refresh Maestro and the target page

After a browser restart or extension reload:

1. Refresh the Maestro desktop app window if it looks stale
2. Refresh the target Chrome tab
3. Click the exact tab you want to control
4. Wait one second
5. Then test voice commands

## Health Checks

Use this to confirm the local stack:

```bash
ss -ltnp | grep -E "9100|17200|17202|17203"
```

Healthy output should show all four listeners.

Use this to confirm the local endpoints:

```bash
curl -i http://localhost:17200/api/status
curl -i http://localhost:17202/api/status
curl -i http://localhost:17203/api/status
```

Healthy output should be `200 OK`.

## Manual Extension Smoke Test

If voice `show links` is not working, test the extension directly first.

Open the extension service worker console and run:

```js
await self.__debugShowLinks()
```

Expected result:

- returned object is `ok: true`
- page shows numbered overlays on visible links/buttons

If manual debug works but voice does not:

- Bus and browser-side rendering are fine
- the remaining problem is live Maestro session state
- refresh the Maestro desktop app and test again

Additional worker diagnostics:

```js
await self.__debugConnectionStatus()
await self.__debugReconnect()
```

Use these to confirm:

- extension Bus connection state
- learned preferred target tab
- whether any live `SHOW` command has reached the worker

## Working Voice Test Sequence

Use one normal `https://` Chrome tab and test:

1. `show links`
2. `show inputs`
3. `next tab`
4. `back`
5. `close tab`

Current known-good state:

- these commands pass
- `show links` is working by voice

## Overlay Behavior

Expected current behavior:

- overlays appear on explicit `show ...` commands
- overlays clear automatically after a short timeout
- overlays clear on interaction like click, scroll, blur, or page hide

Expected non-behavior:

- overlays should not appear on every tab automatically
- overlays should not reappear on `GET_EDITOR_STATE`
- `Always show overlays` is intentionally disabled

## Recovery Cases

### Case 1: Browser restarted and nothing works

Do this in order:

1. Confirm `9100`, `17200`, `17202`, `17203` are healthy
2. Reload the unpacked extension in `chrome://extensions`
3. Refresh the target page
4. Refresh the Maestro desktop app window
5. Click the exact tab you want to control
6. Retry `show links`

### Case 2: Voice fails but manual debug works

Run:

```js
self.__debugConnectionStatus()
self.__debugLastLiveShow()
```

Interpretation:

- `connected: false` means the extension worker is not connected to Arqon Bus
- `connected: true` with `lastLiveShow: undefined` means the extension never received a live `SHOW`
- if Maestro logs `readyState: 3` / `socket-not-open`, the cold-start issue is on the Maestro plugin transport side

Root cause we fixed:

- Maestro was reusing a closed virtual Chrome plugin socket after cold restart
- that left Chrome stuck at `readyState: 3`
- live browser commands were dropped until Maestro refreshed or re-established plugin state

### Case 3: Extension context invalidated

This usually means old content scripts are still sitting in stale tabs after reload.

Recovery:

1. Reload the unpacked extension
2. Hard refresh the page, or close and reopen the tab

### Case 4: Trusted Types / TrustedHTML blocked

This can happen on stricter sites like Google AI Studio.

Current status:

- the injected overlay path was updated to use `textContent`
- if it reappears, reload the extension and refresh the page

## Known Limits

- Complex multi-window Chrome usage can still be more fragile than a single focused window
- After browser restart, Maestro may need a UI refresh before live voice and extension state line up again
- Complex apps with frames or strict browser policies may behave differently than ordinary pages

## Short Version

If things go sideways, use this exact reset:

1. Confirm the four ports are healthy
2. `npm run build`
3. Reload the unpacked extension
4. Refresh the Maestro app window
5. Refresh the target Chrome tab
6. Click the target tab
7. Test `await self.__debugShowLinks()`
8. If that works, test voice `show links`
