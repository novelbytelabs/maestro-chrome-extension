# Scenario S08: Unknown Activation Burst/Rate Guard Behavior

## Setup
- **Mode**: ASSIST
- **Trust State**: unknown
- **Risk Level**: N/A (rate limiting)
- **Initial State**: ASSIST mode

## Test Steps
1. Start with system in ASSIST mode
2. Issue multiple rapid unknown speaker activations
3. Trigger rate guard thresholds:
   - 3 unknown activations / 10s → ASSIST → LOCKED for 30s
   - 5 unknown activations / 60s → remain LOCKED until verified restoration

## Expected Outcome
- Rate guard triggers mode downgrade
- At 3/10s: Mode transitions to LOCKED for 30 seconds
- At 5/60s: Mode remains LOCKED until verified speaker restoration
- Reason code: `mode_transition_assist_to_locked_unknown_rate_limit`

## Actual Outcome
[To be filled during test execution]

## Reason Code
[To be filled during test execution]

## Verdict
[PASS/FAIL]
