const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ipcPath = path.join(__dirname, "..", "ipc.ts");
const extensionPath = path.join(__dirname, "..", "extension.ts");

const ipc = fs.readFileSync(ipcPath, "utf8");
const extension = fs.readFileSync(extensionPath, "utf8");

assert.ok(
  ipc.includes('request.message == "securityReportPasskeyProviderOutcomeAck"'),
  "IPC must route securityReportPasskeyProviderOutcomeAck"
);
assert.ok(
  ipc.includes("validatePasskeyProviderOutcomeRequest"),
  "IPC must validate passkey provider outcome requests"
);
assert.ok(
  ipc.includes("validatePasskeyProviderOutcomeAck"),
  "IPC must validate passkey provider outcome ack payloads"
);
assert.ok(
  ipc.includes("security passkey provider outcome ack requestId mismatch"),
  "IPC must flag requestId mismatch for passkey outcome ack"
);
assert.ok(
  ipc.includes('this.startSecurityRequest(\n        "securityReportPasskeyProviderOutcome"'),
  "IPC must send securityReportPasskeyProviderOutcome through correlated bridge request flow"
);
assert.ok(
  ipc.includes("this.pendingProviderOutcomeByFingerprint"),
  "IPC must dedupe duplicate passkey provider outcome requests in-flight"
);
assert.ok(
  ipc.includes("await this.refreshSecuritySnapshot().catch(() => undefined);"),
  "IPC must refresh security snapshot after provider outcome ack"
);

assert.ok(
  extension.includes('message.type == "security-begin-passkey-provider-challenge"'),
  "extension runtime must expose challenge initiation message route"
);
assert.ok(
  extension.includes('message.type == "security-report-passkey-provider-outcome"'),
  "extension runtime must expose provider outcome report message route"
);
assert.ok(
  extension.includes("reportPasskeyProviderOutcome(payload)"),
  "extension route must call IPC provider outcome reporting"
);

console.log("security-provider-outcome-runtime-wiring: ok");
