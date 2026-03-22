# Scenario S04: Verified Medium-Risk Command After Grace Expiry

## Setup
- **Mode**: ASSIST
- **Trust State**: verified
- **Risk Level**: medium
- **Initial State**: Grace window expired (>9s since last verification)

## Test Steps
1. Start with system in ASSIST mode with verified speaker
2. Wait for grace window to expire (>9 seconds)
3. Issue a medium-risk command

## Expected Outcome
- Command blocked due to expired grace
- Re-authentication required
- Reason code: `grace_expired_timeout` or `auth_required_medium_risk`

## Actual Outcome
In ASSIST mode, after 9 seconds, the medium-risk "insert hello world" command still worked.

## Reason Code
[To be filled during test execution]

## Verdict
[FAIL]
