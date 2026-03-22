# B2/A1 Hard-Close Live Scenario Summary

| Scenario | Expected | Actual | Reason Code | Verdict |
|---|---|---|---|---|
| S01 provider-verify-success-passkey | securityReportPasskeyProviderOutcomeAck with verified=true and provider outcome reflected in bridge state. | No correlated provider-outcome ack observed. | activation_detected_unknown | FAIL |
| S02 provider-verify-failure-reason | ack and bridge state remains locked/blocked with explicit reason code. | No correlated provider-outcome ack observed. | activation_detected_unknown | FAIL |
| S03 challenge-timeout-path | deterministic timeout/no-ack failure path captured. | No ack observed within timeout window. | activation_detected_unknown | PASS |
| S04 bridge-unavailable-during-outcome | connection unavailable path captured with deterministic failure. | Connection to ws://localhost:9101 failed as expected. | security_bridge_unavailable | PASS |
| S05 reconnect-mid-challenge | no duplicate/ghost provider outcome after reconnect. | No correlated provider-outcome ack observed. | activation_detected_unknown | FAIL |
| S06 ack-requestid-mismatch | ack mismatch is rejected and deterministic failure path is observable. | No correlated provider-outcome ack observed. | activation_detected_unknown | FAIL |
| S07 totp-recovery-outcome | totp_recovery outcome path acknowledged and reflected in bridge state. | No correlated provider-outcome ack observed. | activation_detected_unknown | FAIL |
| S08 session-auth-vs-provider-verified-transition | clear transition difference between session_auth fallback and provider verified path. | Bridge state was observed for transition comparison. | activation_detected_unknown | PASS |
