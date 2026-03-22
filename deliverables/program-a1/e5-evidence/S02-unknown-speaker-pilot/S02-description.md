# Scenario S02: Unknown Speaker Activation in Pilot (Degrade Behavior)

## Setup
- **Mode**: PILOT
- **Trust State**: unknown (unverified speaker attempts activation)
- **Risk Level**: low/medium/high
- **Initial State**: PILOT mode, verified speaker previously active

## Test Steps
1. Start with system in PILOT mode with verified speaker
2. Have an unknown/verification-failed speaker activate with a command
3. Observe mode downgrade behavior

## Expected Outcome
- Unknown speaker activation causes automatic downgrade to ASSIST
- Command evaluated under Assist rules
- Mode transition reason: `mode_transition_pilot_to_assist_unknown_activation`
- Low-risk: block until verification (Assist matrix)
- Medium/High: block until verification (Assist matrix)

## Actual Outcome
I started the system in Pilot mode,  i tested my verification to verify and passed, i put it into listening mode, use "focus chrome", "new tab" and it worked. I then had my sister say "focus chrome" and "new tab" and it worked.
My re-auth next diagnostics says Yes.

## Reason Code
`mode_transition_pilot_to_assist_unknown_activation`

## Verdict
[FAIL]
