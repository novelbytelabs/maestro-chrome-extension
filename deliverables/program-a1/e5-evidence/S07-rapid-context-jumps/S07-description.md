# Scenario S07: Rapid Context Jumps (Surface/Modal Change)

## Setup
- **Mode**: ASSIST or PILOT
- **Trust State**: verified
- **Risk Level**: medium
- **Initial State**: Valid grace window, active in one context

## Test Steps
1. Start with system with valid grace window
2. Rapidly change contexts (switch apps, open/close modals)
3. Issue a medium-risk command after context jumps

## Expected Outcome
- Grace token invalidated on context/surface jump
- Reason code: `grace_invalidated_context_jump`
- Command requires fresh authentication context

## Actual Outcome
[To be filled during test execution]

## Reason Code
[To be filled during test execution]

## Verdict
[PASS/FAIL]
