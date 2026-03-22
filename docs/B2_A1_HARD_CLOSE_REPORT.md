# B2/A1 Hard-Close Execution Report

Date: 2026-03-22

## Scope Landed

- Added provider-outcome contract request/ack types and strict validators (`a1.v1`, `requestId`, payload shape).
- Wired extension runtime provider-outcome reporting with correlated ack handling and deterministic failure paths.
- Added passkey-provider observability fields to extension security snapshot ingestion and state.
- Added contract and runtime wiring tests.
- Executed 8 live adversarial scenario probes and captured artifact bundles.

## Commands Run

1. `git checkout -b feat/b2-a1-hard-close-provider-outcome` -> pass
2. `git status --short && git rev-parse --short HEAD` -> pass
3. `npm run build` -> pass (after fixing type issues)
4. `node src/test/security-contract-fixtures.test.js` -> pass
5. `node src/test/security-provider-outcome-contract.test.js` -> pass
6. `node src/test/security-provider-outcome-runtime-wiring.test.js` -> pass
7. `python3 deliverables/program-a1/b2-a1-hard-close-evidence/scripts/run_scenarios.py` -> pass

## Live Scenario Bundles

All bundle artifacts are under:

- `deliverables/program-a1/b2-a1-hard-close-evidence/`
- `deliverables/program-a1/b2-a1-hard-close-evidence/summary.md`

Observed outcome in this runtime:

- S01: FAIL (no correlated provider-outcome ack observed)
- S02: FAIL (no correlated provider-outcome ack observed)
- S03: PASS (timeout/no-ack path observed)
- S04: PASS (bridge unavailable path observed)
- S05: FAIL (no correlated provider-outcome ack observed after reconnect probe)
- S06: FAIL (no correlated provider-outcome ack observed; mismatch rejection path not observed via ack)
- S07: FAIL (no correlated provider-outcome ack observed for `totp_recovery`)
- S08: PASS (bridge state observed for transition comparison)

## Residual Risks

- Desktop/plugin-bus path did not emit correlated `securityReportPasskeyProviderOutcomeAck` during live probes.
- Because correlated ack did not appear in runtime telemetry, hard-close criteria requiring successful provider-outcome transition evidence are not met yet.
- Existing policy/snapshot telemetry remains live, but provider-outcome authority shift is unverified in this environment.

## Next Step

Validate desktop/plugin-bus responder path for `securityReportPasskeyProviderOutcome` end-to-end, then rerun S01/S02/S05/S06/S07 until correlated ack and bridge-state transition are observed.
