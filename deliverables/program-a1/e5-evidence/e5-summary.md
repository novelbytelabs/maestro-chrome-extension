# E5 Adversarial Scenarios Summary

## Execution Date: [DATE]
## Environment: [DEV/PROD]
## Extension Version: [VERSION]

| # | Scenario | Expected | Actual | Reason Code | Verdict |
|---|----------|----------|--------|-------------|---------|
| S01 | Heard-only ambient speech | No activation, no downgrade | | | |
| S02 | Unknown speaker in Pilot | Degrade to ASSIST | | | |
| S03 | Verified medium-risk within grace | Allow (9s grace) | | | |
| S04 | Verified medium-risk after grace | Require re-auth | | | |
| S05 | Contaminated/degraded state | Fail-closed (reflex only) | | | |
| S06 | Pause -> Listening transition | Clear grace, require fresh auth | | | |
| S07 | Rapid context jumps | Grace invalidated | | | |
| S08 | Unknown activation rate guard | LOCKED after 3/10s | | | |

## Summary

- **Total Scenarios**: 8
- **Passed**: X
- **Failed**: Y
- **Pass Rate**: X/8 (Z%)

## Notes

[Any overall observations or issues]

## Evidence Location

All scenario artifacts are stored in:
`maestro-chrome-extension/deliverables/program-a1/e5-evidence/`
