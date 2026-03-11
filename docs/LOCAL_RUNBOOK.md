# Local Runbook

This runbook is the shortest reliable path to bring up the Chrome extension, Arqon Bus, and Arqon Maestro after a reboot.

## What Is Running

- `9100` = Arqon Bus WebSocket
- `17200` = Maestro core stream endpoint
- `17202` = Maestro speech engine
- `17203` = Maestro code engine

For the Chrome extension specifically:

- the extension now connects to `ws://localhost:9100/`
- Maestro desktop local mode still uses its own local voice stack on `17200`, `17202`, and `17203`

That means you currently need both:

1. Arqon Bus for the Chrome extension
2. Maestro local services for the desktop app voice stack

## One-Time Prerequisites

### 1. Chrome extension build

From this repo:

```bash
cd ~/Projects/arqon/maestro-chrome-extension
npm run build
```

### 2. Maestro local endpoint

Make sure Maestro is pointed at `local`:

```bash
mkdir -p ~/.arqon
python - <<'PY'
import json, os
path = os.path.expanduser("~/.arqon/arqon.json")
data = {}
if os.path.exists(path) and os.path.getsize(path) > 0:
    with open(path) as f:
        data = json.load(f)
data["streaming_endpoint"] = "local"
with open(path, "w") as f:
    json.dump(data, f, indent=2)
PY
```

### 3. Maestro local bundle

If Maestro has not been packaged for local mode yet:

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./gradlew client:installServer -x downloadModels
```

## Startup Order After Reboot

### Terminal 1: Start Arqon Bus

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

Expected result:

- Bus starts listening on `127.0.0.1:9100`
- Terminal prints `ArqonBus listening on 127.0.0.1:9100`

### Terminal 2: Start Arqon Maestro desktop app

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./scripts/run_client.sh
```

Expected result:

- Electron launches
- In local mode it should bring up the bundled local services
- You should eventually have listeners on `17200`, `17202`, and `17203`

### Terminal 3: Rebuild the Chrome extension if needed

Use this when you have changed the extension code:

```bash
cd ~/Projects/arqon/maestro-chrome-extension
npm run build
```

Then in `chrome://extensions`:

1. Turn on Developer mode
2. Click `Reload` on the Arqon Maestro extension
3. Refresh any tabs you are testing on

## Health Checks

Run this after startup:

```bash
ss -ltnp | rg "9100|17200|17202|17203"
```

Healthy output should show listeners for:

- `9100`
- `17200`
- `17202`
- `17203`

## Quick Smoke Test

### 1. Verify Arqon Bus

```bash
curl -i -N \
  -H 'Connection: Upgrade' \
  -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' \
  -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  http://127.0.0.1:9100/ --max-time 3
```

Expected result:

- `HTTP/1.1 101 Switching Protocols`

### 2. Verify extension connection

Open the extension popup. It should show `Connected`.

If it shows `Disconnected`, the most likely causes are:

- Arqon Bus is not running on `9100`
- the extension was not reloaded after a build
- Chrome still has an older unpacked build loaded

### 3. Verify Maestro local mode

If Maestro is up but voice is broken, check:

```bash
ss -ltnp | rg "17200|17202|17203"
```

If only `17200` exists, local mode is incomplete. Voice will not be stable without `17202` and `17203`.

## Known Current Architecture

This is the part that has caused confusion:

- Chrome extension transport has been moved to Arqon Bus on `9100`
- Maestro desktop local runtime still uses its local voice stack on `17200`, `17202`, and `17203`
- therefore the system is currently mixed-mode, not full single-bus cutover

So the correct operational answer today is:

- yes, start Arqon Bus for the extension
- yes, start Maestro local mode for the desktop app and voice stack

## If Things Start Failing After 30 Seconds

Check these first:

1. Bus still listening on `9100`
2. Maestro local services still listening on `17200`, `17202`, and `17203`
3. Extension popup still reports `Connected`
4. Chrome extension has been reloaded since the last build

Fast check:

```bash
ss -ltnp | rg "9100|17200|17202|17203"
```

If `9100` drops, the extension will disconnect.

If `17202` or `17203` drop, Maestro local voice behavior can degrade even if the UI is still open.

## Short Version

After reboot, do this:

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

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro
./scripts/run_client.sh
```

```bash
cd ~/Projects/arqon/maestro-chrome-extension
npm run build
```

Then reload the unpacked extension in Chrome and verify the popup says `Connected`.
