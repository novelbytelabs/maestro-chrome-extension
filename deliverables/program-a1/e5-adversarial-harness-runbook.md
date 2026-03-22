# Program A1 E5 Adversarial Harness Runbook

Each scenario must produce one artifact bundle with:
1. screenshot
2. raw event log
3. reason-code line
4. expected vs actual verdict

## Artifact naming

`scenario-<N>-<slug>/`
- `screenshot.png`
- `event-log.json`
- `reason-code.txt`
- `verdict.txt`

## Raw event log capture

From extension popup/sidepanel context:

```js
chrome.runtime.sendMessage({ type: "security-export-artifact" }, (payload) => {
  console.log(payload);
});
```

Persist payload JSON as `event-log.json`.

## Scenarios

1. heard-only ambient noise (no activation)
2. unknown speaker activation in Pilot mode
3. verified medium-risk inside grace window
4. verified medium-risk after grace expiry
5. contamination/provider degraded fail-closed
6. pause -> listening reauth boundary
7. rapid context jumps across surfaces/modals
8. repeated unknown activation bursts (rate guard)

For every scenario, record:
- expected policy result
- actual result
- matched reason code line
- pass/fail
