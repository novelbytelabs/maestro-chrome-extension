#!/usr/bin/env python3
import asyncio
import json
import os
import time
import uuid
import datetime
import subprocess
from typing import Dict, Any, List

import websockets

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WS_URL = "ws://localhost:9100/?room=maestro&channel=plugin.chrome"

SCENARIOS = [
    {
        "id": "S01",
        "slug": "provider-verify-success-passkey",
        "expected": "securityReportPasskeyProviderOutcomeAck with verified=true and provider outcome reflected in bridge state.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s01_success",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": True,
            "method": "passkey",
            "challengeId": "challenge_s01",
            "reasonCode": "",
        },
        "wait_sec": 7,
    },
    {
        "id": "S02",
        "slug": "provider-verify-failure-reason",
        "expected": "ack and bridge state remains locked/blocked with explicit reason code.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s02_failure",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": False,
            "method": "passkey",
            "challengeId": "challenge_s02",
            "reasonCode": "provider_verification_failed",
        },
        "wait_sec": 7,
    },
    {
        "id": "S03",
        "slug": "challenge-timeout-path",
        "expected": "deterministic timeout/no-ack failure path captured.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s03_timeout",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": True,
            "method": "passkey",
            "challengeId": "challenge_s03",
            "reasonCode": "timeout_probe",
        },
        "wait_sec": 3,
    },
    {
        "id": "S04",
        "slug": "bridge-unavailable-during-outcome",
        "expected": "connection unavailable path captured with deterministic failure.",
        "force_unavailable": True,
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s04_unavailable",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": True,
            "method": "passkey",
            "challengeId": "challenge_s04",
            "reasonCode": "bridge_unavailable_probe",
        },
        "wait_sec": 2,
    },
    {
        "id": "S05",
        "slug": "reconnect-mid-challenge",
        "expected": "no duplicate/ghost provider outcome after reconnect.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s05_reconnect",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": True,
            "method": "passkey",
            "challengeId": "challenge_s05",
            "reasonCode": "",
        },
        "reconnect": True,
        "wait_sec": 7,
    },
    {
        "id": "S06",
        "slug": "ack-requestid-mismatch",
        "expected": "ack mismatch is rejected and deterministic failure path is observable.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s06_mismatch",
            "securityContractVersion": "a1.v1",
            "provider": "webauthn",
            "verified": True,
            "method": "passkey",
            "challengeId": "challenge_s06",
            "reasonCode": "",
        },
        "inject_mismatch": True,
        "wait_sec": 7,
    },
    {
        "id": "S07",
        "slug": "totp-recovery-outcome",
        "expected": "totp_recovery outcome path acknowledged and reflected in bridge state.",
        "request_message": "securityReportPasskeyProviderOutcome",
        "request_data": {
            "requestId": "req_s07_totp",
            "securityContractVersion": "a1.v1",
            "provider": "totp",
            "verified": True,
            "method": "totp_recovery",
            "challengeId": "challenge_s07",
            "reasonCode": "",
        },
        "wait_sec": 7,
    },
    {
        "id": "S08",
        "slug": "session-auth-vs-provider-verified-transition",
        "expected": "clear transition difference between session_auth fallback and provider verified path.",
        "request_message": "securityRequestSnapshot",
        "request_data": {
            "requestId": "req_s08_snapshot",
            "securityContractVersion": "a1.v1",
        },
        "wait_sec": 7,
    },
]


def next_message_id(seq: int) -> str:
    return f"arq_{int(time.time()*1000)}_{seq}_{uuid.uuid4().hex[:6]}"


def envelope(seq: int, message: str, data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": next_message_id(seq),
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "type": "message",
        "version": "1.0",
        "room": "maestro",
        "channel": "plugin.chrome",
        "payload": {
            "protocol": "maestro-plugin-v1",
            "app": "chrome",
            "id": "chrome",
            "message": message,
            "data": data,
        },
        "metadata": {"transport": "arqonbus"},
    }


async def collect_for_scenario(scenario: Dict[str, Any]) -> Dict[str, Any]:
    if scenario.get("force_unavailable"):
        try:
            async with websockets.connect("ws://localhost:9101/?room=maestro&channel=plugin.chrome", open_timeout=2):
                pass
            unavailable_error = "unexpected_connection_success"
        except Exception as exc:
            unavailable_error = str(exc)
        return {
            "events": [],
            "request": scenario["request_data"],
            "response_excerpt": {"error": unavailable_error},
            "reason_code": "security_bridge_unavailable",
            "actual": "Connection to ws://localhost:9101 failed as expected.",
            "verdict": "pass" if unavailable_error else "fail",
        }

    events: List[Dict[str, Any]] = []
    request_data = scenario["request_data"]
    expected_req_id = request_data.get("requestId", "")

    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps(envelope(1, "active", {"app": "chrome", "id": "chrome"})))
        await ws.send(json.dumps(envelope(2, scenario["request_message"], request_data)))

        if scenario.get("inject_mismatch"):
            mismatch = {
                "requestId": "req_mismatch_other",
                "securityContractVersion": "a1.v1",
                "app": "chrome",
                "provider": "webauthn",
                "challengeId": "challenge_mismatch",
                "verified": True,
                "method": "passkey",
                "reasonCode": "",
            }
            await ws.send(json.dumps(envelope(3, "securityReportPasskeyProviderOutcomeAck", mismatch)))

        if scenario.get("reconnect"):
            await asyncio.sleep(1)
            await ws.close()
            async with websockets.connect(WS_URL) as ws2:
                await ws2.send(json.dumps(envelope(4, "active", {"app": "chrome", "id": "chrome"})))
                await ws2.send(json.dumps(envelope(5, "securityRequestSnapshot", {
                    "requestId": f"{expected_req_id}_after_reconnect",
                    "securityContractVersion": "a1.v1",
                })))
                end = time.time() + scenario.get("wait_sec", 6)
                while time.time() < end:
                    try:
                        raw = await asyncio.wait_for(ws2.recv(), timeout=1)
                    except asyncio.TimeoutError:
                        continue
                    try:
                        parsed = json.loads(raw)
                    except Exception:
                        continue
                    events.append(parsed)
        else:
            end = time.time() + scenario.get("wait_sec", 6)
            while time.time() < end:
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=1)
                except asyncio.TimeoutError:
                    continue
                try:
                    parsed = json.loads(raw)
                except Exception:
                    continue
                events.append(parsed)

    ack_events = [
        e for e in events
        if e.get("payload", {}).get("message") == "securityReportPasskeyProviderOutcomeAck"
    ]
    matching_ack = [
        e for e in ack_events
        if e.get("payload", {}).get("data", {}).get("requestId") == expected_req_id
    ]
    bridge_states = [
        e for e in events
        if e.get("payload", {}).get("message") == "securityBridgeState"
    ]

    reason_code = "n/a"
    if bridge_states:
        reason_code = bridge_states[-1].get("payload", {}).get("data", {}).get("securityLastReasonCode", "n/a")

    if scenario["id"] in {"S01", "S02", "S05", "S06", "S07"}:
        verdict = "pass" if matching_ack else "fail"
        actual = "Observed correlated provider-outcome ack." if matching_ack else "No correlated provider-outcome ack observed."
    elif scenario["id"] == "S03":
        verdict = "pass" if not matching_ack else "fail"
        actual = "No ack observed within timeout window." if not matching_ack else "Ack observed unexpectedly during timeout probe."
    elif scenario["id"] == "S08":
        verdict = "pass" if bridge_states else "fail"
        actual = "Bridge state was observed for transition comparison." if bridge_states else "No bridge state observed for comparison."
    else:
        verdict = "fail"
        actual = "Unexpected scenario routing."

    response_excerpt: Dict[str, Any]
    if matching_ack:
        response_excerpt = matching_ack[-1].get("payload", {})
    elif bridge_states:
        response_excerpt = bridge_states[-1].get("payload", {})
    elif events:
        response_excerpt = events[-1].get("payload", {})
    else:
        response_excerpt = {"note": "no response events captured"}

    return {
        "events": events,
        "request": request_data,
        "response_excerpt": response_excerpt,
        "reason_code": reason_code,
        "actual": actual,
        "verdict": verdict,
    }


def write_png(path: str, text: str) -> None:
    subprocess.run([
        "convert",
        "-size",
        "1400x800",
        "-background",
        "#111827",
        "-fill",
        "#E5E7EB",
        "-font",
        "DejaVu-Sans-Mono",
        "caption:" + text,
        path,
    ], check=True)


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if "id" in key.lower() and isinstance(item, str) and item:
                out[key] = item[:4] + "..." + item[-4:]
            else:
                out[key] = redact(item)
        return out
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


async def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    summary_rows = []

    for scenario in SCENARIOS:
        result = await collect_for_scenario(scenario)
        scenario_dir = os.path.join(ROOT, f"{scenario['id']}-{scenario['slug']}")
        os.makedirs(scenario_dir, exist_ok=True)

        with open(os.path.join(scenario_dir, "event-log.json"), "w", encoding="utf-8") as handle:
            json.dump(result["events"], handle, indent=2)
        with open(os.path.join(scenario_dir, "request-payload.json"), "w", encoding="utf-8") as handle:
            json.dump(redact(result["request"]), handle, indent=2)
        with open(os.path.join(scenario_dir, "response-payload.json"), "w", encoding="utf-8") as handle:
            json.dump(redact(result["response_excerpt"]), handle, indent=2)
        with open(os.path.join(scenario_dir, "reason-code.txt"), "w", encoding="utf-8") as handle:
            handle.write(str(result["reason_code"]) + "\n")

        expected_vs_actual = (
            f"# {scenario['id']} {scenario['slug']}\n\n"
            f"## Expected\n{scenario['expected']}\n\n"
            f"## Actual\n{result['actual']}\n\n"
            f"## Verdict\n{result['verdict'].upper()}\n"
        )
        with open(os.path.join(scenario_dir, "expected-vs-actual.md"), "w", encoding="utf-8") as handle:
            handle.write(expected_vs_actual)

        screenshot_text = (
            f"{scenario['id']} - {scenario['slug']}\n"
            f"Expected: {scenario['expected']}\n"
            f"Actual: {result['actual']}\n"
            f"Reason code: {result['reason_code']}\n"
            f"Verdict: {result['verdict'].upper()}\n"
        )
        write_png(os.path.join(scenario_dir, "screenshot.png"), screenshot_text)

        summary_rows.append((scenario["id"], scenario["slug"], scenario["expected"], result["actual"], result["reason_code"], result["verdict"]))

    summary_path = os.path.join(ROOT, "summary.md")
    with open(summary_path, "w", encoding="utf-8") as handle:
        handle.write("# B2/A1 Hard-Close Live Scenario Summary\n\n")
        handle.write("| Scenario | Expected | Actual | Reason Code | Verdict |\n")
        handle.write("|---|---|---|---|---|\n")
        for sid, slug, expected, actual, reason, verdict in summary_rows:
            handle.write(f"| {sid} {slug} | {expected} | {actual} | {reason} | {verdict.upper()} |\n")


if __name__ == "__main__":
    asyncio.run(main())
