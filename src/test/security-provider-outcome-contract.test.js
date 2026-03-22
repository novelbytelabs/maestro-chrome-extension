const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const contractPath = path.join(root, "security-contract.ts");
const fixtureDir = path.join(__dirname, "fixtures", "security-contract");

function loadContractModule() {
  const tsSource = fs.readFileSync(contractPath, "utf8");
  const transpiled = ts.transpileModule(tsSource, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2019,
      module: ts.ModuleKind.CommonJS,
    },
    fileName: "security-contract.ts",
  }).outputText;

  const module = { exports: {} };
  const context = vm.createContext({
    module,
    exports: module.exports,
    require,
    __dirname: path.dirname(contractPath),
    __filename: contractPath,
    console,
    process,
  });
  vm.runInContext(transpiled, context);
  return module.exports;
}

function readFixture(name) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, name), "utf8"));
}

const contract = loadContractModule();

const validRequest = readFixture("security-request-passkey-provider-outcome.json");
assert.strictEqual(contract.validatePasskeyProviderOutcomeRequest(validRequest), null);

const missingProviderRequest = readFixture("security-request-passkey-provider-outcome-missing-provider.json");
assert.strictEqual(
  contract.validatePasskeyProviderOutcomeRequest(missingProviderRequest),
  "security_bridge_invalid_payload"
);

const versionMismatchRequest = readFixture("security-request-passkey-provider-outcome-version-mismatch.json");
assert.strictEqual(
  contract.validatePasskeyProviderOutcomeRequest(versionMismatchRequest),
  "security_bridge_version_mismatch"
);

const validAck = readFixture("security-response-passkey-provider-outcome-ack.json");
assert.strictEqual(contract.validatePasskeyProviderOutcomeAck(validAck), null);

const wrongAckRequestId = { ...validAck, requestId: "" };
assert.strictEqual(contract.validatePasskeyProviderOutcomeAck(wrongAckRequestId), "security_bridge_invalid_payload");

const wrongMethodAck = { ...validAck, method: "sms" };
assert.strictEqual(contract.validatePasskeyProviderOutcomeAck(wrongMethodAck), "security_bridge_invalid_payload");

console.log("security-provider-outcome-contract: ok");
