# Scenario S05: Contaminated/Degraded Provider State (Fail-Closed)

## Setup
- **Mode**: Any (ASSIST/PILOT)
- **Trust State**: contaminated OR provider_degraded
- **Risk Level**: any
- **Initial State**: Provider degraded or contaminated detection active

## Test Steps
1. Simulate contaminated speaker state OR provider degraded state
2. Issue any executable command (low/medium/high risk)
3. Observe fail-closed behavior

## Expected Outcome
- Only reflex commands allowed (stop, cancel, pause)
- All other commands blocked
- Reason code: `authorize_block_fail_closed_contaminated` or `authorize_block_fail_closed_provider_degraded`
- Low/medium/high risk actuation blocked

## Actual Outcome
[To be filled during test execution]

## Reason Code
[To be filled during test execution]

## Verdict
[PASS/FAIL]
