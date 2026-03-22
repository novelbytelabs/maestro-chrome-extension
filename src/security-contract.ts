export const SECURITY_CONTRACT_VERSION = "a1.v1" as const;

export const SECURITY_BRIDGE_TIMEOUT_MS = 1500;
export const SECURITY_BRIDGE_RETRY_DELAYS_MS = [250, 750] as const;

export type SecurityBridgeErrorCode =
  | "security_bridge_timeout"
  | "security_bridge_unavailable"
  | "security_bridge_invalid_payload"
  | "security_bridge_unauthorized_source"
  | "security_bridge_reset_forbidden"
  | "security_bridge_version_mismatch";

export type SecurityLifecyclePhase = "heard" | "activated" | "executed" | "pause_to_listening" | "trust_state_change" | "context_jump";

export interface SecurityBridgeRequest {
  requestId: string;
  securityContractVersion: typeof SECURITY_CONTRACT_VERSION;
}

export interface SecurityBridgeResponseBase {
  requestId: string;
  securityContractVersion: typeof SECURITY_CONTRACT_VERSION;
}

export interface SecurityReplaySummaryPayload extends SecurityBridgeResponseBase {
  generatedAt: string;
  totalRecords: number;
  recordsByCategory: Record<string, number>;
  lastSequence: number;
}

export interface SecuritySnapshotPayload extends SecurityBridgeResponseBase {
  securityPolicyMode: string;
  securityRequiresReauthNext: boolean;
  securityGraceValid: boolean;
  securityGraceExpiresAt: string;
  securityLastReasonCode: string;
  securityLastLifecyclePhase: string;
  securityLastInteractionId: number;
  securityReplayGeneratedAt: string;
  securityReplayTotalRecords: number;
  securityReplaySessionEventCount: number;
  securityReplayLastSequence: number;
}

export interface SecurityReplaySnapshotPayload extends SecurityBridgeResponseBase {
  generatedAt: string;
  totalRecords: number;
  recordsByCategory: Record<string, number>;
  lastSequence: number;
  records: any[];
}

export interface SecurityBridgeErrorPayload extends SecurityBridgeResponseBase {
  errorCode: SecurityBridgeErrorCode;
  errorMessage: string;
}

export type SecurityPasskeyProviderMethod = "passkey" | "totp_recovery";
export type SecurityPasskeyProviderOutcome = "none" | "verified" | "failed";

export interface SecurityReportPasskeyProviderOutcomeRequest extends SecurityBridgeRequest {
  provider: string;
  verified: boolean;
  method: SecurityPasskeyProviderMethod;
  challengeId?: string;
  reasonCode?: string;
}

export interface SecurityReportPasskeyProviderOutcomeAck extends SecurityBridgeResponseBase {
  app: string;
  provider: string;
  challengeId: string;
  verified: boolean;
  method: SecurityPasskeyProviderMethod;
  reasonCode: string;
}

export function hasOwn<T extends string>(value: unknown, key: T): value is Record<T, unknown> {
  return !!value && typeof value == "object" && Object.prototype.hasOwnProperty.call(value, key);
}

export function validateContractVersion(payload: unknown): SecurityBridgeErrorCode | null {
  if (!hasOwn(payload, "securityContractVersion")) {
    return "security_bridge_version_mismatch";
  }
  if (payload.securityContractVersion !== SECURITY_CONTRACT_VERSION) {
    return "security_bridge_version_mismatch";
  }
  return null;
}

export function validateRequestId(payload: unknown): SecurityBridgeErrorCode | null {
  if (!hasOwn(payload, "requestId") || typeof payload.requestId != "string" || payload.requestId.trim().length == 0) {
    return "security_bridge_invalid_payload";
  }
  return null;
}

export function validatePasskeyProviderMethod(value: unknown): SecurityBridgeErrorCode | null {
  return value == "passkey" || value == "totp_recovery" ? null : "security_bridge_invalid_payload";
}

export function validatePasskeyProviderOutcomeRequest(payload: unknown): SecurityBridgeErrorCode | null {
  const versionError = validateContractVersion(payload);
  if (versionError) {
    return versionError;
  }
  const requestIdError = validateRequestId(payload);
  if (requestIdError) {
    return requestIdError;
  }
  if (!hasOwn(payload, "provider") || typeof payload.provider != "string" || payload.provider.trim().length == 0) {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "verified") || typeof payload.verified != "boolean") {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "method") || validatePasskeyProviderMethod(payload.method)) {
    return "security_bridge_invalid_payload";
  }
  if (hasOwn(payload, "challengeId") && payload.challengeId !== undefined && typeof payload.challengeId != "string") {
    return "security_bridge_invalid_payload";
  }
  if (hasOwn(payload, "reasonCode") && payload.reasonCode !== undefined && typeof payload.reasonCode != "string") {
    return "security_bridge_invalid_payload";
  }
  return null;
}

export function validatePasskeyProviderOutcomeAck(payload: unknown): SecurityBridgeErrorCode | null {
  const versionError = validateContractVersion(payload);
  if (versionError) {
    return versionError;
  }
  const requestIdError = validateRequestId(payload);
  if (requestIdError) {
    return requestIdError;
  }
  if (!hasOwn(payload, "app") || typeof payload.app != "string" || payload.app.trim().length == 0) {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "provider") || typeof payload.provider != "string" || payload.provider.trim().length == 0) {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "challengeId") || typeof payload.challengeId != "string") {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "verified") || typeof payload.verified != "boolean") {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "method") || validatePasskeyProviderMethod(payload.method)) {
    return "security_bridge_invalid_payload";
  }
  if (!hasOwn(payload, "reasonCode") || typeof payload.reasonCode != "string") {
    return "security_bridge_invalid_payload";
  }
  return null;
}

export function securityBridgeUnavailableThresholdMs(): number {
  return SECURITY_BRIDGE_TIMEOUT_MS + SECURITY_BRIDGE_RETRY_DELAYS_MS[0] + SECURITY_BRIDGE_RETRY_DELAYS_MS[1];
}

export function createSecurityBridgeRequest(requestId: string): SecurityBridgeRequest {
  return {
    requestId,
    securityContractVersion: SECURITY_CONTRACT_VERSION,
  };
}

export function isReflexCommandType(commandType: string): boolean {
  return ["COMMAND_TYPE_CANCEL", "COMMAND_TYPE_STOP", "COMMAND_TYPE_PAUSE"].includes(commandType);
}
