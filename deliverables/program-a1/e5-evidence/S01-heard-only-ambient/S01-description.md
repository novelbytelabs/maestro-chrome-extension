# Scenario S01: Heard-only Ambient Speech (No Activation)

## Setup
- **Mode**: PILOT
- **Trust State**: verified
- **Risk Level**: N/A (no activation)
- **Initial State**: System idle, listening enabled

## Test Steps
1. Start with system in PILOT mode with verified speaker
2. Play ambient conversation/speech in background (TV, nearby people)
3. Do NOT activate with wake word
4. Observe diagnostics - transcript should show "heard" state but no activation

## Expected Outcome
- `heard` transcript appears but no activation
- No mode downgrade occurs
- No grace invalidation
- Reason code: `ingress_heard_no_transition`

## Actual Outcome
I listened to a tv show for 20 minutes to all kinds of stuff and it never activated one time. Of course it never executed either.
`heard` transcript appears but no activation
No mode downgrade occurs
No grace invalidation

## Reason Code
- Reason code: `ingress_heard_no_transition`
## Verdict
[PASS]
