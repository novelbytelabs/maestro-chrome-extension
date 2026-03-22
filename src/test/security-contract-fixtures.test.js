const fs = require("fs");
const path = require("path");
const assert = require("assert");

const base = path.join(__dirname, "fixtures", "security-contract");

function read(name) {
  return JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
}

function assertVersion(payload) {
  assert.strictEqual(payload.securityContractVersion, "a1.v1", "securityContractVersion must be a1.v1");
}

function assertRequestId(payload) {
  assert.strictEqual(typeof payload.requestId, "string", "requestId must be string");
  assert.ok(payload.requestId.length > 0, "requestId must be non-empty");
}

const request = read("security-request-snapshot.json");
assertRequestId(request);
assertVersion(request);

const snapshot = read("security-response-snapshot.json");
assertRequestId(snapshot);
assertVersion(snapshot);
assert.strictEqual(typeof snapshot.securityReplaySessionEventCount, "number");

const replaySummary = read("security-response-replay-summary.json");
assertRequestId(replaySummary);
assertVersion(replaySummary);
assert.strictEqual(typeof replaySummary.recordsByCategory.security_session_event, "number");

const errorPayload = read("security-response-error-version-mismatch.json");
assertRequestId(errorPayload);
assertVersion(errorPayload);
assert.strictEqual(errorPayload.errorCode, "security_bridge_version_mismatch");

const providerOutcomeRequest = read("security-request-passkey-provider-outcome.json");
assertRequestId(providerOutcomeRequest);
assertVersion(providerOutcomeRequest);
assert.strictEqual(typeof providerOutcomeRequest.provider, "string");
assert.ok(providerOutcomeRequest.provider.trim().length > 0, "provider must be non-empty");
assert.strictEqual(typeof providerOutcomeRequest.verified, "boolean", "verified must be boolean");
assert.ok(
  providerOutcomeRequest.method == "passkey" || providerOutcomeRequest.method == "totp_recovery",
  "method must be passkey or totp_recovery"
);
assert.strictEqual(typeof providerOutcomeRequest.challengeId, "string", "challengeId must be string when provided");
assert.strictEqual(typeof providerOutcomeRequest.reasonCode, "string", "reasonCode must be string when provided");

const providerOutcomeRequestMissingProvider = read("security-request-passkey-provider-outcome-missing-provider.json");
assertRequestId(providerOutcomeRequestMissingProvider);
assertVersion(providerOutcomeRequestMissingProvider);
assert.strictEqual(
  providerOutcomeRequestMissingProvider.provider,
  undefined,
  "missing-provider fixture must omit provider to exercise invalid payload path"
);
assert.strictEqual(
  typeof providerOutcomeRequestMissingProvider.verified,
  "boolean",
  "missing-provider fixture still requires verified"
);
assert.ok(
  providerOutcomeRequestMissingProvider.method == "passkey" ||
    providerOutcomeRequestMissingProvider.method == "totp_recovery",
  "missing-provider fixture still requires valid method"
);

const providerOutcomeAck = read("security-response-passkey-provider-outcome-ack.json");
assertRequestId(providerOutcomeAck);
assertVersion(providerOutcomeAck);
assert.strictEqual(typeof providerOutcomeAck.app, "string");
assert.ok(providerOutcomeAck.app.trim().length > 0, "ack app must be non-empty");
assert.strictEqual(typeof providerOutcomeAck.provider, "string");
assert.ok(providerOutcomeAck.provider.trim().length > 0, "ack provider must be non-empty");
assert.strictEqual(typeof providerOutcomeAck.challengeId, "string", "ack challengeId must be string");
assert.strictEqual(typeof providerOutcomeAck.verified, "boolean", "ack verified must be boolean");
assert.ok(
  providerOutcomeAck.method == "passkey" || providerOutcomeAck.method == "totp_recovery",
  "ack method must be passkey or totp_recovery"
);
assert.strictEqual(typeof providerOutcomeAck.reasonCode, "string", "ack reasonCode must be string");

const providerOutcomeVersionMismatch = read("security-request-passkey-provider-outcome-version-mismatch.json");
assertRequestId(providerOutcomeVersionMismatch);
assert.notStrictEqual(
  providerOutcomeVersionMismatch.securityContractVersion,
  "a1.v1",
  "version-mismatch fixture must not use current contract version"
);

console.log("security-contract-fixtures: ok");
