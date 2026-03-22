# Scenario S06: Pause -> Listening Transition (Reauth Boundary)

## Setup
- **Mode**: ASSIST or PILOT
- **Trust State**: verified
- **Risk Level**: medium/high
- **Initial State**: Active listening, verified speaker with valid grace

## Test Steps
1. Start with system in active listening state with verified speaker
2. Have grace window valid for medium-risk command
3. Toggle to PAUSED state
4. Toggle back to LISTENING state
5. Issue a medium-risk command

## Expected Outcome
- Grace token cleared on pause->listen transition
- Fresh auth context required for medium/high risk
- Reason code: `grace_invalidated_pause_to_listen`
- Medium/high commands require re-authentication

## Actual Outcome
Voice Security Status never changes after verifying. It never expires or invalidates. It always displays as Verified with 90% confidence.

## Reason Code
[To be filled during test execution]

## Verdict
[PASS/FAIL]
