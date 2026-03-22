export type ReconnectState = "idle" | "connecting" | "backoff" | "connected" | "failed";
export type TargetResolutionState = "unknown" | "resolved" | "fallback" | "missing";
export type OperatorMode = "observe" | "assist" | "pilot" | "locked";
export type PageType = "editor" | "form" | "dashboard" | "docs" | "generic" | "unknown";
export type FocusedTarget =
  | "monaco"
  | "codemirror"
  | "ace"
  | "input"
  | "textarea"
  | "contenteditable"
  | "none"
  | "unknown";
export type InjectionHealth = "healthy" | "degraded" | "missing" | "unknown";
export type DispatchRoute =
  | "extension-worker"
  | "content-script-direct"
  | "injected"
  | "browser-nav-compat"
  | "unknown";
export type CommandResult = "success" | "partial" | "blocked" | "fallback" | "failed";
export type CommandSupportLevel = "stable" | "compatibility" | "experimental";

export interface ActionableCounts {
  links: number;
  buttons: number;
  inputs: number;
  code: number;
  all: number;
}

export interface ActivePageSummary {
  tabId: number | null;
  title: string;
  url: string;
  hostname: string;
  pageType: PageType;
  focusedTarget: FocusedTarget;
  actionableCounts: ActionableCounts;
  frameCount: number;
  shadowDomPresent: boolean;
  injectionHealth: InjectionHealth;
  analyzedAt: number | null;
}

export interface CommandTrace {
  timestamp: number;
  commandType: string;
  label: string;
  normalizedPayload: any;
  targetTabId: number | null;
  targetFrameId: number | null;
  targetResolutionState: TargetResolutionState;
  targetResolutionSource: string | null;
  targetResolutionReason: string | null;
  route: DispatchRoute;
  supportLevel: CommandSupportLevel;
  result: CommandResult;
  latencyMs: number;
  error: string | null;
  compatibilityPathUsed: boolean;
  legacyPathUsed: boolean;
  degradationReason: string | null;
}

export interface ResolvedTarget {
  tabId: number | null;
  frameId: number | null;
  state: TargetResolutionState;
  source?: "preferred" | "active" | "window-scan" | "frame-analysis" | "none";
  reason?: string | null;
}

export interface ConnectionState {
  busConnected: boolean;
  workerSessionStartedAt: number | null;
  lastConnectedAt: number | null;
  lastHeartbeatAt: number | null;
  reconnectState: ReconnectState;
  retryDelayMs: number;
  nextRetryAt: number | null;
  lastReconnectAttemptAt: number | null;
  consecutiveFailures: number;
  websocketReadyState: number | null;
}

export interface LifecycleEvent {
  timestamp: number;
  kind:
    | "worker-start"
    | "worker-wake"
    | "worker-connect"
    | "worker-disconnect"
    | "worker-backoff"
    | "worker-reconnect-attempt"
    | "keepalive"
    | "page-context"
    | "reinjection";
  detail: string;
}

export interface PageAnalysisResult {
  tabLocalUrl: string;
  title: string;
  hostname: string;
  isTopFrame: boolean;
  hasFocus: boolean;
  visibilityState: string;
  pageType: PageType;
  focusedTarget: FocusedTarget;
  actionableCounts: ActionableCounts;
  shadowDomPresent: boolean;
  injectionHealth: InjectionHealth;
  frameLocalTimestamp: number;
}

export interface SitePolicyPreview {
  domain: string;
  scope: "tab" | "domain" | "global";
  overlayPolicy: "disabled" | "tab-scoped" | "domain-scoped" | "global";
  automationPolicy: "observe" | "assist" | "pilot" | "locked";
  sensitiveDomain: boolean;
  teachModeAllowed: boolean;
  dryRunRecommended: boolean;
}

export interface FutureFeatureState {
  teachMode: "planned";
  dryRun: "planned";
  siteProfiles: "planned";
  semanticMemory: "foundation";
  semanticHandlesCount: number;
  rememberedCommandsCount: number;
}

export interface ModePolicy {
  commandExecution: "blocked" | "limited" | "full";
  overlayCommandsAllowed: boolean;
  navigationCommandsAllowed: boolean;
  mutatingCommandsAllowed: boolean;
  note: string;
}

export interface OperatorSnapshot {
  mode: OperatorMode;
  requestedMode: OperatorMode;
  effectiveMode: OperatorMode;
  connection: ConnectionState;
  targeting: {
    preferredTabId: number | null;
    lastResolvedTabId: number | null;
    lastResolvedFrameId: number | null;
    targetResolutionState: TargetResolutionState;
  };
  activePage: ActivePageSummary;
  lastAction: {
    commandType: string | null;
    label: string | null;
    route: DispatchRoute | null;
    result: CommandResult | null;
    latencyMs: number | null;
    error: string | null;
    timestamp: number | null;
  };
  history: CommandTrace[];
  diagnostics: {
    lastError: string | null;
    contentScriptReachable: boolean | null;
    analyzePageReachable: boolean | null;
    lastPageContextAt: number | null;
    compatibilityPathUsed: boolean;
    lastKeepAliveAt: number | null;
    lastWakeReason: string | null;
    contentScriptReinjections: number;
    lastContentScriptReinjectionAt: number | null;
    lastContentScriptReinjectionReason: string | null;
  };
  lifecycle: LifecycleEvent[];
  sitePolicy: SitePolicyPreview;
  future: FutureFeatureState;
  modePolicy: ModePolicy;
  security: {
    bridgeHealthy: boolean;
    bridgeUnavailableAt: number | null;
    bridgeLastErrorCode: string | null;
    bridgeLastErrorMessage: string | null;
    bridgeLastRequestId: string | null;
    bridgeLastUpdatedAt: number | null;
    contractVersion: string;
    policyMode: "observe" | "assist" | "pilot" | "locked";
    requiresReauthNext: boolean;
    graceValid: boolean;
    graceExpiresAt: string;
    lastReasonCode: string;
    lastLifecyclePhase: string;
    lastInteractionId: number;
    replayGeneratedAt: string;
    replayTotalRecords: number;
    replaySessionEventCount: number;
    replayLastSequence: number;
    passkeyProviderChallengeActive: boolean;
    passkeyProviderChallengeId: string;
    passkeyLastProviderName: string;
    passkeyLastProviderOutcome: "none" | "verified" | "failed";
    passkeyLastProviderReasonCode: string;
    passkeyLastProviderOutcomeAt: string;
    passkeyOutcomeAckStatus:
      | "none"
      | "pending"
      | "matched"
      | "mismatch"
      | "timeout"
      | "bridge_error"
      | "invalid_ack";
    passkeyOutcomePendingRequestId: string;
    passkeyOutcomeLastAckRequestId: string;
    passkeyOutcomeLastAckAt: string;
    passkeyOutcomeLastAckMessage: string;
    lifecycleMonotonicResetAt: number | null;
  };
}

export function emptyActionableCounts(): ActionableCounts {
  return {
    links: 0,
    buttons: 0,
    inputs: 0,
    code: 0,
    all: 0,
  };
}

export function emptyActivePageSummary(): ActivePageSummary {
  return {
    tabId: null,
    title: "",
    url: "",
    hostname: "",
    pageType: "unknown",
    focusedTarget: "unknown",
    actionableCounts: emptyActionableCounts(),
    frameCount: 0,
    shadowDomPresent: false,
    injectionHealth: "unknown",
    analyzedAt: null,
  };
}

export function createOperatorSnapshot(): OperatorSnapshot {
  return {
    mode: "pilot",
    requestedMode: "pilot",
    effectiveMode: "pilot",
    connection: {
      busConnected: false,
      workerSessionStartedAt: Date.now(),
      lastConnectedAt: null,
      lastHeartbeatAt: null,
      reconnectState: "idle",
      retryDelayMs: 0,
      nextRetryAt: null,
      lastReconnectAttemptAt: null,
      consecutiveFailures: 0,
      websocketReadyState: null,
    },
    targeting: {
      preferredTabId: null,
      lastResolvedTabId: null,
      lastResolvedFrameId: null,
      targetResolutionState: "unknown",
    },
    activePage: emptyActivePageSummary(),
    lastAction: {
      commandType: null,
      label: null,
      route: null,
      result: null,
      latencyMs: null,
      error: null,
      timestamp: null,
    },
    history: [],
    diagnostics: {
      lastError: null,
      contentScriptReachable: null,
      analyzePageReachable: null,
      lastPageContextAt: null,
      compatibilityPathUsed: false,
      lastKeepAliveAt: null,
      lastWakeReason: null,
      contentScriptReinjections: 0,
      lastContentScriptReinjectionAt: null,
      lastContentScriptReinjectionReason: null,
    },
    lifecycle: [],
    sitePolicy: {
      domain: "",
      scope: "tab",
      overlayPolicy: "disabled",
      automationPolicy: "pilot",
      sensitiveDomain: false,
      teachModeAllowed: false,
      dryRunRecommended: false,
    },
    future: {
      teachMode: "planned",
      dryRun: "planned",
      siteProfiles: "planned",
      semanticMemory: "foundation",
      semanticHandlesCount: 0,
      rememberedCommandsCount: 0,
    },
    modePolicy: {
      commandExecution: "full",
      overlayCommandsAllowed: true,
      navigationCommandsAllowed: true,
      mutatingCommandsAllowed: true,
      note: "Pilot mode allows normal supported command execution.",
    },
    security: {
      bridgeHealthy: false,
      bridgeUnavailableAt: null,
      bridgeLastErrorCode: null,
      bridgeLastErrorMessage: null,
      bridgeLastRequestId: null,
      bridgeLastUpdatedAt: null,
      contractVersion: "a1.v1",
      policyMode: "assist",
      requiresReauthNext: false,
      graceValid: false,
      graceExpiresAt: "",
      lastReasonCode: "",
      lastLifecyclePhase: "heard",
      lastInteractionId: 0,
      replayGeneratedAt: "",
      replayTotalRecords: 0,
      replaySessionEventCount: 0,
      replayLastSequence: 0,
      passkeyProviderChallengeActive: false,
      passkeyProviderChallengeId: "",
      passkeyLastProviderName: "",
      passkeyLastProviderOutcome: "none",
      passkeyLastProviderReasonCode: "",
      passkeyLastProviderOutcomeAt: "",
      passkeyOutcomeAckStatus: "none",
      passkeyOutcomePendingRequestId: "",
      passkeyOutcomeLastAckRequestId: "",
      passkeyOutcomeLastAckAt: "",
      passkeyOutcomeLastAckMessage: "",
      lifecycleMonotonicResetAt: null,
    },
  };
}
