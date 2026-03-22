const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const ipcPath = path.join(repoRoot, "ipc.ts");
const popupPath = path.join(repoRoot, "popup.ts");
const sidepanelPath = path.join(repoRoot, "sidepanel.ts");
const snapshotPath = path.join(repoRoot, "operator-snapshot.ts");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const ipc = read(ipcPath);
const popup = read(popupPath);
const sidepanel = read(sidepanelPath);
const snapshot = read(snapshotPath);

assert(
  snapshot.includes("passkeyOutcomeAckStatus"),
  "operator snapshot must expose passkey outcome ack status"
);
assert(
  snapshot.includes("passkeyOutcomePendingRequestId"),
  "operator snapshot must expose pending request id for outcome ack correlation"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("pending"'),
  "IPC must mark passkey outcome as pending before waiting for ack"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("matched"'),
  "IPC must mark passkey outcome ack as matched on success"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("mismatch"'),
  "IPC must mark passkey outcome ack mismatch for unknown request id"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("timeout"'),
  "IPC must mark passkey outcome ack timeout after retry budget"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("bridge_error"'),
  "IPC must mark passkey outcome bridge error when bridge responds with error"
);
assert(
  ipc.includes('this.setPasskeyOutcomeAckState("invalid_ack"'),
  "IPC must mark passkey outcome invalid ack when ack payload validation fails"
);
assert(
  popup.includes("Passkey ack status:"),
  "popup diagnostics must render passkey ack correlation status"
);
assert(
  sidepanel.includes("Passkey ack correlation"),
  "sidepanel diagnostics must render passkey ack correlation status"
);

console.log("security-provider-outcome-ack-tracing: PASS");
