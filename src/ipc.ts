import { v4 as uuidv4 } from "uuid";
import ExtensionCommandHandler from "./extension-command-handler";
import { commandCapability } from "./command-capabilities";
import {
  ActivePageSummary,
  CommandResult,
  CommandTrace,
  ConnectionState,
  createOperatorSnapshot,
  DispatchRoute,
  emptyActivePageSummary,
  LifecycleEvent,
  OperatorSnapshot,
  PageAnalysisResult,
  ResolvedTarget,
  TargetResolutionState,
} from "./operator-snapshot";

export default class IPC {
  private static readonly preferredTabStorageKey = "preferredTabId";
  private static readonly historyStorageKey = "operatorHistory";
  private static readonly activePageStorageKey = "operatorActivePage";
  private static readonly maxHistoryEntries = 20;
  private static readonly maxLifecycleEntries = 25;
  private static readonly analyzeThrottleMs = 1000;

  private app: string;
  private extensionCommandHandler: ExtensionCommandHandler;
  private connected: boolean = false;
  private id: string = "";
  private websocket?: WebSocket;
  private url: string = "ws://localhost:9100/?room=maestro&channel=plugin.chrome";
  private readonly probeUrl: string = "http://localhost:9100/";
  private readonly room: string = "maestro";
  private readonly channel: string = "plugin.chrome";
  private readonly protocol: string = "maestro-plugin-v1";
  private messageCounter: number = 0;
  private connectingPromise?: Promise<boolean>;
  private nextRetryAt: number = 0;
  private retryDelayMs: number = 0;
  private consecutiveFailures: number = 0;
  private preferredTabId?: number;
  private lastLiveShow?: any;
  private lastLiveCommand?: any;
  private lastResolvedTargetDetails: ResolvedTarget = {
    tabId: null,
    frameId: null,
    state: "unknown",
    source: "none",
    reason: null,
  };
  private persistedLoaded: boolean = false;
  private snapshot: OperatorSnapshot = createOperatorSnapshot();
  private lastAnalyzeAtByTabId: { [tabId: number]: number } = {};

  constructor(app: string, extensionCommandHandler: ExtensionCommandHandler) {
    this.app = app;
    this.extensionCommandHandler = extensionCommandHandler;
    this.id = app;
    this.recordLifecycle("worker-start", "Service worker runtime initialized.");
  }

  private async ensurePersistedStateLoaded(): Promise<void> {
    if (this.persistedLoaded) {
      return;
    }

    this.persistedLoaded = true;
    try {
      const stored = await chrome.storage.local.get([
        IPC.preferredTabStorageKey,
        IPC.historyStorageKey,
        IPC.activePageStorageKey,
      ]);
      const storedTabId = stored[IPC.preferredTabStorageKey];
      if (typeof storedTabId == "number") {
        this.preferredTabId = storedTabId;
        this.snapshot.targeting.preferredTabId = storedTabId;
      }

      if (Array.isArray(stored[IPC.historyStorageKey])) {
        this.snapshot.history = stored[IPC.historyStorageKey].slice(0, IPC.maxHistoryEntries);
        const latest = this.snapshot.history[0];
        if (latest) {
          this.syncLastActionFromTrace(latest);
        }
      }

      const activePage = stored[IPC.activePageStorageKey];
      if (activePage && typeof activePage == "object") {
        this.snapshot.activePage = Object.assign(emptyActivePageSummary(), activePage);
      }
    } catch (error) {
      this.setLastError(String(error));
    }
  }

  private persistSnapshotFragments(): void {
    const payload: { [key: string]: any } = {
      [IPC.historyStorageKey]: this.snapshot.history,
      [IPC.activePageStorageKey]: this.snapshot.activePage,
    };

    if (this.preferredTabId === undefined) {
      payload[IPC.preferredTabStorageKey] = null;
    } else {
      payload[IPC.preferredTabStorageKey] = this.preferredTabId;
    }

    chrome.storage.local.set(payload, () => {
      void chrome.runtime.lastError;
    });
  }

  private cloneSnapshot(): OperatorSnapshot {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  private syncLastActionFromTrace(trace: CommandTrace) {
    this.snapshot.lastAction = {
      commandType: trace.commandType,
      label: trace.label,
      route: trace.route,
      result: trace.result,
      latencyMs: trace.latencyMs,
      error: trace.error,
      timestamp: trace.timestamp,
    };
  }

  private recordLifecycle(kind: LifecycleEvent["kind"], detail: string) {
    const event: LifecycleEvent = {
      timestamp: Date.now(),
      kind,
      detail,
    };
    this.snapshot.lifecycle = [event].concat(this.snapshot.lifecycle).slice(0, IPC.maxLifecycleEntries);
  }

  private setLastError(error: string | null) {
    this.snapshot.diagnostics.lastError = error;
  }

  private updateConnectionState(patch: Partial<ConnectionState>) {
    this.snapshot.connection = Object.assign({}, this.snapshot.connection, patch, {
      retryDelayMs: this.retryDelayMs,
      nextRetryAt: this.nextRetryAt || null,
      consecutiveFailures: this.consecutiveFailures,
      websocketReadyState: this.websocket ? this.websocket.readyState : null,
    });
  }

  private updateTargeting(patch: Partial<OperatorSnapshot["targeting"]>) {
    this.snapshot.targeting = Object.assign({}, this.snapshot.targeting, patch);
  }

  private updateActivePage(patch: Partial<ActivePageSummary>) {
    this.snapshot.activePage = Object.assign({}, this.snapshot.activePage, patch);
  }

  private updateResolvedTarget(target: ResolvedTarget) {
    this.lastResolvedTargetDetails = Object.assign({}, this.lastResolvedTargetDetails, target);
    this.updateTargeting({
      lastResolvedTabId: target.tabId,
      lastResolvedFrameId: target.frameId,
      targetResolutionState: target.state,
    });
  }

  noteWorkerWake(reason: string) {
    this.snapshot.diagnostics.lastWakeReason = reason;
    this.snapshot.diagnostics.lastKeepAliveAt = Date.now();
    this.recordLifecycle("worker-wake", reason);
  }

  noteKeepAlive(detail: string) {
    this.snapshot.diagnostics.lastKeepAliveAt = Date.now();
    this.recordLifecycle("keepalive", detail);
  }

  noteContentScriptReinjection(reason: string) {
    this.snapshot.diagnostics.contentScriptReinjections += 1;
    this.snapshot.diagnostics.lastContentScriptReinjectionAt = Date.now();
    this.snapshot.diagnostics.lastContentScriptReinjectionReason = reason;
    this.recordLifecycle("reinjection", reason);
  }

  private deriveCommandLabel(command: any, fallbackText?: string): string {
    const commandType = String(command?.type || "unknown");
    const capability = commandCapability(commandType);
    const text = String(
      command?.text ?? command?.path ?? command?.value ?? command?.target ?? fallbackText ?? ""
    )
      .trim()
      .replace(/\s+/g, " ");

    if (commandType == "COMPAT_OPEN_SITE") {
      return `go to ${text}`.trim();
    }
    if (commandType == "COMPAT_OPEN_SITE_NEW_TAB") {
      return `open new tab ${text}`.trim();
    }
    if (commandType == "COMMAND_TYPE_SHOW") {
      return `show ${text}`.trim();
    }
    if (commandType == "COMMAND_TYPE_USE") {
      return `use ${String(command?.index ?? text)}`.trim();
    }
    if (commandType == "COMMAND_TYPE_SWITCH_TAB") {
      return `switch tab ${text}`.trim();
    }
    if (capability && !text) {
      return capability.label;
    }
    if (text) {
      return `${commandType.replace(/^COMMAND_TYPE_/, "").toLowerCase().replace(/_/g, " ")} ${text}`.trim();
    }
    return commandType.replace(/^COMMAND_TYPE_/, "").toLowerCase().replace(/_/g, " ");
  }

  private normalizePayload(command: any, overrideText?: string): any {
    const normalized: { [key: string]: any } = {
      type: command?.type || "unknown",
    };

    ["text", "path", "value", "target", "index", "direction", "cursor", "cursorEnd", "source"].forEach(
      (key) => {
        if (command && command[key] !== undefined) {
          if (key == "source" && typeof command[key] == "string") {
            normalized[key] = `[source:${command[key].length}]`;
          } else {
            normalized[key] = command[key];
          }
        }
      }
    );

    if (overrideText) {
      normalized.text = overrideText;
    }

    if (Array.isArray(command?.modifiersList)) {
      normalized.modifiersList = command.modifiersList;
    }
    if (Array.isArray(command?.modifiers)) {
      normalized.modifiers = command.modifiers;
    }

    return normalized;
  }

  private classifyResult(response: any, route: DispatchRoute, compatibilityPathUsed: boolean): CommandResult {
    const error =
      (response && response.error) ||
      (response && response.data && response.data.error) ||
      (response && response.response && response.response.error);

    if (error) {
      return String(error).toLowerCase().includes("out of range") || String(error).toLowerCase().includes("requires")
        ? "blocked"
        : "failed";
    }

    if (response && response.ok === false) {
      return "failed";
    }

    if (compatibilityPathUsed || route == "browser-nav-compat") {
      return "fallback";
    }

    return "success";
  }

  private pushTrace(trace: CommandTrace) {
    this.snapshot.history = [trace].concat(this.snapshot.history).slice(0, IPC.maxHistoryEntries);
    this.syncLastActionFromTrace(trace);
    this.snapshot.diagnostics.compatibilityPathUsed = trace.compatibilityPathUsed;
    this.persistSnapshotFragments();
  }

  private isAddressBarFocusCommand(command: any): boolean {
    const modifiers = Array.isArray(command?.modifiersList)
      ? command.modifiersList
      : Array.isArray(command?.modifiers)
      ? command.modifiers
      : [];
    const key = String(command?.text || "").toLowerCase();
    return (
      command?.type == "COMMAND_TYPE_PRESS" &&
      key == "l" &&
      modifiers.some((modifier: string) => modifier == "command" || modifier == "control")
    );
  }

  private isEnterPress(command: any): boolean {
    return command?.type == "COMMAND_TYPE_PRESS" && String(command?.text || "").toLowerCase() == "enter";
  }

  private extractNavigationSequence(commands: any[], startIndex: number) {
    let index = startIndex;
    let createTab = false;

    if (commands[index]?.type == "COMMAND_TYPE_CREATE_TAB") {
      createTab = true;
      index += 1;
    }

    if (!this.isAddressBarFocusCommand(commands[index])) {
      return undefined;
    }
    const insertCommand = commands[index + 1];
    const enterCommand = commands[index + 2];
    if (insertCommand?.type != "COMMAND_TYPE_INSERT" || !this.isEnterPress(enterCommand)) {
      return undefined;
    }

    const url = String(insertCommand?.text || "").trim();
    if (!url) {
      return undefined;
    }

    return {
      createTab,
      url,
      consumedUntil: index + 2,
      commands: commands.slice(startIndex, index + 3),
    };
  }

  private nextMessageId(): string {
    this.messageCounter += 1;
    const short = uuidv4().replace(/-/g, "").slice(0, 6);
    return `arq_${Date.now()}_${this.messageCounter}_${short}`;
  }

  private toEnvelope(message: string, data: any) {
    return {
      id: this.nextMessageId(),
      timestamp: new Date().toISOString(),
      type: "message",
      version: "1.0",
      room: this.room,
      channel: this.channel,
      payload: {
        protocol: this.protocol,
        app: this.app,
        id: this.id,
        message,
        data,
      },
      metadata: {
        transport: "arqonbus",
      },
    };
  }

  private extractLegacyRequest(parsed: any): any {
    if (!parsed || typeof parsed != "object") {
      return null;
    }

    if (typeof parsed.message == "string") {
      return parsed;
    }

    if (parsed.payload && typeof parsed.payload.message == "string") {
      return {
        message: parsed.payload.message,
        data: parsed.payload.data,
      };
    }

    return null;
  }

  private onClose() {
    this.connected = false;
    this.websocket = undefined;
    this.consecutiveFailures += 1;
    this.updateConnectionState({
      busConnected: false,
      reconnectState: this.retryDelayMs > 0 ? "backoff" : "failed",
    });
    this.recordLifecycle("worker-disconnect", "WebSocket connection closed.");
    this.setIcon();
  }

  private async onMessage(message: any) {
    if (typeof message != "string") {
      return;
    }

    let request;
    try {
      request = this.extractLegacyRequest(JSON.parse(message));
    } catch (_error) {
      return;
    }

    if (!request) {
      return;
    }

    if (request.message == "response") {
      const result = await this.handle(request.data.response);
      if (result) {
        this.send("callback", {
          callback: request.data.callback,
          data: result,
        });
      }
    }
  }

  private onOpen() {
    this.connected = true;
    this.retryDelayMs = 0;
    this.nextRetryAt = 0;
    this.consecutiveFailures = 0;
    this.updateConnectionState({
      busConnected: true,
      lastConnectedAt: Date.now(),
      reconnectState: "connected",
      retryDelayMs: 0,
    });
    this.recordLifecycle("worker-connect", "WebSocket connection opened.");
    this.sendActive();
    this.setIcon();
  }

  private scheduleRetry() {
    this.retryDelayMs = this.retryDelayMs === 0 ? 5000 : Math.min(this.retryDelayMs * 2, 60000);
    this.nextRetryAt = Date.now() + this.retryDelayMs;
    this.updateConnectionState({
      busConnected: false,
      reconnectState: "backoff",
      retryDelayMs: this.retryDelayMs,
    });
    this.recordLifecycle("worker-backoff", `Retry scheduled in ${this.retryDelayMs}ms.`);
  }

  private async probeAvailability(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      await fetch(this.probeUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      return true;
    } catch (_error) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async openWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const socket = new WebSocket(this.url);
      const finish = (connected: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        if (!connected) {
          this.connected = false;
          this.websocket = undefined;
          this.setIcon();
        }
        resolve(connected);
      };

      const timeoutId = setTimeout(() => {
        try {
          socket.close();
        } catch (_error) {}
        finish(false);
      }, 3000);

      this.websocket = socket;

      socket.addEventListener("open", () => {
        clearTimeout(timeoutId);
        this.onOpen();
        finish(true);
      });

      socket.addEventListener("close", () => {
        clearTimeout(timeoutId);
        this.onClose();
        finish(false);
      });

      socket.addEventListener("error", () => {
        clearTimeout(timeoutId);
        try {
          socket.close();
        } catch (_error) {}
        finish(false);
      });

      socket.addEventListener("message", (event) => {
        this.onMessage(event.data);
      });
    });
  }

  async ensureConnection(force: boolean = false): Promise<boolean> {
    await this.ensurePersistedStateLoaded();

    if (this.connected) {
      this.updateConnectionState({
        busConnected: true,
        reconnectState: "connected",
      });
      return true;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (!force && Date.now() < this.nextRetryAt) {
      this.updateConnectionState({
        busConnected: false,
        reconnectState: "backoff",
      });
      this.setIcon();
      return false;
    }

    this.updateConnectionState({
      busConnected: false,
      reconnectState: "connecting",
      lastReconnectAttemptAt: Date.now(),
    });
    this.recordLifecycle("worker-reconnect-attempt", force ? "Forced reconnect requested." : "Automatic reconnect attempt.");

    this.connectingPromise = (async () => {
      const available = await this.probeAvailability();
      if (!available) {
        this.connected = false;
        this.websocket = undefined;
        this.scheduleRetry();
        this.setIcon();
        return false;
      }

      try {
        const connected = await this.openWebSocket();
        if (!connected) {
          this.scheduleRetry();
        }
        return connected;
      } catch (error) {
        this.connected = false;
        this.websocket = undefined;
        this.scheduleRetry();
        this.setIcon();
        this.setLastError(String(error));
        return false;
      } finally {
        this.connectingPromise = undefined;
      }
    })();

    return this.connectingPromise;
  }

  private async tab(): Promise<chrome.tabs.Tab | undefined> {
    await this.ensurePersistedStateLoaded();

    if (this.preferredTabId !== undefined) {
      try {
        const preferred = await chrome.tabs.get(this.preferredTabId);
        if (preferred?.id && /^https?:\/\//.test(preferred.url || "")) {
          this.updateResolvedTarget({
            tabId: preferred.id,
            frameId: this.snapshot.targeting.lastResolvedFrameId,
            state: "resolved",
            source: "preferred",
            reason: "Preferred tab was still valid and targetable.",
          });
          return preferred;
        }
      } catch (_error) {
        await this.rememberPreferredTab(undefined);
      }
    }

    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tab = tabs.find((candidate) => /^https?:\/\//.test(candidate.url || ""));
    if (tab?.id) {
      this.updateResolvedTarget({
        tabId: tab.id,
        frameId: this.snapshot.targeting.lastResolvedFrameId,
        state: "fallback",
        source: "active",
        reason: "Preferred tab was unavailable. Fell back to active tab in the last focused window.",
      });
      this.preferredTabId = tab.id;
      return tab;
    }

    const windows = await chrome.windows.getAll({ populate: true });
    for (const window of windows) {
      if (window.type != "normal") {
        continue;
      }
      const active = (window.tabs || []).find((candidate) => candidate.active);
      const url = active?.url || "";
      if (active?.id && /^https?:\/\//.test(url)) {
        this.preferredTabId = active.id;
        this.updateResolvedTarget({
          tabId: active.id,
          frameId: this.snapshot.targeting.lastResolvedFrameId,
          state: "fallback",
          source: "window-scan",
          reason: "Preferred tab and focused active tab were unavailable. Fell back to scanning normal windows.",
        });
        return active;
      }
    }

    this.updateResolvedTarget({
      tabId: null,
      frameId: null,
      state: "missing",
      source: "none",
      reason: "No targetable http(s) tab could be resolved.",
    });
    return undefined;
  }

  rememberPreferredTab(tabId?: number) {
    this.preferredTabId = tabId;
    this.updateTargeting({
      preferredTabId: tabId === undefined ? null : tabId,
    });
    this.persistSnapshotFragments();
    if (tabId === undefined) {
      return chrome.storage.local.remove(IPC.preferredTabStorageKey);
    }
    return chrome.storage.local.set({
      [IPC.preferredTabStorageKey]: tabId,
    });
  }

  preferredTab() {
    return this.preferredTabId;
  }

  lastLiveShowDiagnostics() {
    return this.lastLiveShow;
  }

  lastLiveCommandDiagnostics() {
    return this.lastLiveCommand;
  }

  async getOperatorSnapshot(forceAnalysis: boolean = false): Promise<OperatorSnapshot> {
    await this.ensurePersistedStateLoaded();
    if (forceAnalysis) {
      await this.refreshActivePage(true);
    }
    return this.cloneSnapshot();
  }

  async refreshActivePage(force: boolean = false): Promise<ActivePageSummary> {
    await this.ensurePersistedStateLoaded();
    const tab = await this.tab();
    if (!tab?.id) {
      this.snapshot.activePage = emptyActivePageSummary();
      this.snapshot.activePage.tabId = null;
      this.snapshot.activePage.injectionHealth = "missing";
      this.snapshot.activePage.analyzedAt = Date.now();
      this.snapshot.diagnostics.analyzePageReachable = false;
      this.persistSnapshotFragments();
      return this.snapshot.activePage;
    }

    return this.analyzePageForTab(tab.id, force);
  }

  recordPageContext(message: any, senderTabId?: number) {
    this.snapshot.diagnostics.lastPageContextAt = Date.now();
    this.recordLifecycle("page-context", message?.href ? `Page context received for ${message.href}` : "Page context received.");
    if (senderTabId !== undefined && message?.isTopFrame) {
      this.preferredTabId = senderTabId;
      this.updateTargeting({
        preferredTabId: senderTabId,
      });
      this.persistSnapshotFragments();
    }
  }

  private async sendToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        resolve({
          ok: true,
          response,
        });
      });
    });
  }

  private async sendToFrame(tabId: number, frameId: number, message: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, { frameId }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            error: chrome.runtime.lastError.message,
            frameId,
          });
          return;
        }
        resolve({
          ok: true,
          response,
          frameId,
        });
      });
    });
  }

  private async frameIdsForTab(tabId: number): Promise<number[]> {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    const ids = (frames || [])
      .filter((frame) => /^https?:\/\//.test(frame.url || ""))
      .map((frame) => frame.frameId);
    const unique = Array.from(new Set(ids));
    return unique.length > 0 ? unique : [0];
  }

  private async ensureContentScript(tabId: number): Promise<void> {
    this.noteContentScriptReinjection(`Injected content script into tab ${tabId}.`);
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["build/content-script.js"],
    });
  }

  private async sendShowToBestFrame(tabId: number, message: any): Promise<any> {
    let frameIds = await this.frameIdsForTab(tabId);
    let attempts = await Promise.all(frameIds.map((frameId) => this.sendToFrame(tabId, frameId, message)));

    const missingReceiver = attempts.every(
      (attempt) => !attempt.ok && attempt.error == "Could not establish connection. Receiving end does not exist."
    );

    if (missingReceiver) {
      try {
        await this.ensureContentScript(tabId);
      } catch (_error) {}
      frameIds = await this.frameIdsForTab(tabId);
      attempts = await Promise.all(frameIds.map((frameId) => this.sendToFrame(tabId, frameId, message)));
    }

    const successful = attempts.filter((attempt) => attempt.ok);
    this.snapshot.diagnostics.contentScriptReachable = successful.length > 0;

    if (successful.length == 0) {
      return {
        ok: false,
        error: (attempts[0] && attempts[0].error) || "No frame responded",
        targetTabId: tabId,
        targetFrameId: null,
        route: "content-script-direct" as DispatchRoute,
      };
    }

    successful.sort((left, right) => {
      const leftCount = Number(left.response?.count || 0);
      const rightCount = Number(right.response?.count || 0);
      return rightCount - leftCount;
    });

    this.updateResolvedTarget({
      tabId,
      frameId: successful[0].frameId,
      state: this.snapshot.targeting.targetResolutionState == "missing" ? "fallback" : "resolved",
      source: "frame-analysis",
      reason: "Selected the best responding frame based on overlay count.",
    });

    return {
      ok: true,
      response: successful[0].response,
      targetTabId: tabId,
      targetFrameId: successful[0].frameId,
      route: "content-script-direct" as DispatchRoute,
      frameIdsTried: frameIds,
      attempts,
    };
  }

  private inferRouteFromContentResponse(command: any, response: any): DispatchRoute {
    const capability = commandCapability(String(command?.type || ""));
    if (capability) {
      return capability.route;
    }
    if (response?.path == "content-script-direct") {
      return "content-script-direct";
    }
    if (response && typeof response == "object" && response.id !== undefined && response.data !== undefined) {
      return "injected";
    }
    if (command?.type == "COMMAND_TYPE_SHOW" || command?.type == "COMMAND_TYPE_USE" || command?.type == "COMMAND_TYPE_CANCEL") {
      return "content-script-direct";
    }
    return "unknown";
  }

  private async sendMessageToContentScript(command: any): Promise<any> {
    const tab = await this.tab();
    if (!tab?.id) {
      return {
        ok: false,
        error: "No active tab available",
        route: "unknown" as DispatchRoute,
        targetTabId: null,
        targetFrameId: null,
      };
    }

    const message = {
      type: "injected-script-command-request",
      data: command,
    };

    if (command?.type == "COMMAND_TYPE_SHOW") {
      return this.sendShowToBestFrame(tab.id, message);
    }

    let attempt = await this.sendToTab(tab.id, message);
    if (!attempt.ok && attempt.error == "Could not establish connection. Receiving end does not exist.") {
      try {
        await this.ensureContentScript(tab.id);
      } catch (_error) {}
      attempt = await this.sendToTab(tab.id, message);
    }

    this.snapshot.diagnostics.contentScriptReachable = attempt.ok;
    this.updateResolvedTarget({
      tabId: tab.id,
      frameId: this.snapshot.targeting.lastResolvedFrameId,
      state: attempt.ok ? this.snapshot.targeting.targetResolutionState : "missing",
      source: attempt.ok ? this.snapshot.targeting.targetResolutionState == "fallback" ? "active" : "preferred" : "none",
      reason: attempt.ok ? "Delivered command to the resolved tab target." : "Content script delivery failed for the resolved tab target.",
    });

    if (!attempt.ok) {
      return {
        ok: false,
        error: attempt.error,
        route: "unknown" as DispatchRoute,
        targetTabId: tab.id,
        targetFrameId: this.snapshot.targeting.lastResolvedFrameId,
      };
    }

    return {
      ok: true,
      response: attempt.response,
      route: this.inferRouteFromContentResponse(command, attempt.response),
      targetTabId: tab.id,
      targetFrameId: this.snapshot.targeting.lastResolvedFrameId,
    };
  }

  private choosePrimaryFrame(frames: Array<PageAnalysisResult & { frameId: number }>) {
    const focused = frames.find((frame) => frame.hasFocus);
    if (focused) {
      return focused;
    }

    const topFrame = frames.find((frame) => frame.isTopFrame);
    if (topFrame) {
      return topFrame;
    }

    return frames.sort((left, right) => right.actionableCounts.all - left.actionableCounts.all)[0];
  }

  private async analyzePageForTab(tabId: number, force: boolean = false): Promise<ActivePageSummary> {
    const now = Date.now();
    if (
      !force &&
      this.snapshot.activePage.tabId == tabId &&
      this.lastAnalyzeAtByTabId[tabId] !== undefined &&
      now - this.lastAnalyzeAtByTabId[tabId] < IPC.analyzeThrottleMs
    ) {
      return this.snapshot.activePage;
    }

    const tab = await chrome.tabs.get(tabId).catch(() => undefined);
    let frameIds = await this.frameIdsForTab(tabId).catch(() => [0]);
    let attempts = await Promise.all(
      frameIds.map((frameId) => this.sendToFrame(tabId, frameId, { type: "analyze-page" }))
    );

    const missingReceiver = attempts.every(
      (attempt) => !attempt.ok && attempt.error == "Could not establish connection. Receiving end does not exist."
    );

    if (missingReceiver) {
      try {
        await this.ensureContentScript(tabId);
      } catch (_error) {}
      frameIds = await this.frameIdsForTab(tabId).catch(() => [0]);
      attempts = await Promise.all(
        frameIds.map((frameId) => this.sendToFrame(tabId, frameId, { type: "analyze-page" }))
      );
    }

    const successful = attempts
      .filter((attempt) => attempt.ok && attempt.response)
      .map((attempt) => Object.assign({}, attempt.response, { frameId: attempt.frameId })) as Array<
      PageAnalysisResult & { frameId: number }
    >;

    this.snapshot.diagnostics.analyzePageReachable = successful.length > 0;
    this.snapshot.diagnostics.contentScriptReachable = successful.length > 0;

    if (successful.length == 0) {
      this.snapshot.activePage = Object.assign(emptyActivePageSummary(), {
        tabId,
        title: (tab && tab.title) || "",
        url: (tab && tab.url) || "",
        hostname: (() => {
          try {
            return new URL((tab && tab.url) || "").hostname;
          } catch (_error) {
            return "";
          }
        })(),
        frameCount: frameIds.length,
        injectionHealth: "missing",
        analyzedAt: now,
      });
      this.lastAnalyzeAtByTabId[tabId] = now;
      this.persistSnapshotFragments();
      return this.snapshot.activePage;
    }

    const primary = this.choosePrimaryFrame(successful);
    const topFrameResponded = successful.some((frame) => frame.isTopFrame);
    const shadowPresent = successful.some((frame) => frame.shadowDomPresent);
    const injectionHealth = topFrameResponded && successful.length >= 1 ? "healthy" : "degraded";

    this.snapshot.activePage = {
      tabId,
      title: primary.title || (tab && tab.title) || "",
      url: primary.tabLocalUrl || (tab && tab.url) || "",
      hostname: primary.hostname || "",
      pageType: primary.pageType,
      focusedTarget: primary.focusedTarget,
      actionableCounts: primary.actionableCounts,
      frameCount: frameIds.length,
      shadowDomPresent: shadowPresent,
      injectionHealth,
      analyzedAt: now,
    };
    this.lastAnalyzeAtByTabId[tabId] = now;
    this.updateResolvedTarget({
      tabId,
      frameId: primary.frameId,
      state: this.snapshot.targeting.targetResolutionState == "missing" ? "fallback" : "resolved",
      source: "frame-analysis",
      reason: "Chose the primary frame using focus, top-frame, then actionable-count priority.",
    });
    this.persistSnapshotFragments();
    return this.snapshot.activePage;
  }

  async handle(response: any): Promise<any> {
    let handlerResponse = null;
    if (response.execute) {
      const commands = response.execute.commandsList || [];
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i];
        const startedAt = Date.now();
        const navigationSequence = this.extractNavigationSequence(commands, i);
        const capability = commandCapability(String(command?.type || ""));
        let route: DispatchRoute = capability ? capability.route : "unknown";
        let error: string | null = null;
        let targetTabId: number | null = this.snapshot.targeting.lastResolvedTabId;
        let targetFrameId: number | null = this.snapshot.targeting.lastResolvedFrameId;
        let compatibilityPathUsed = false;
        let label = this.deriveCommandLabel(command);
        let normalizedPayload = this.normalizePayload(command);

        try {
          if (navigationSequence) {
            route = "browser-nav-compat";
            compatibilityPathUsed = true;
            label = this.deriveCommandLabel(
              { type: navigationSequence.createTab ? "COMPAT_OPEN_SITE_NEW_TAB" : "COMPAT_OPEN_SITE" },
              navigationSequence.url
            );
            normalizedPayload = this.normalizePayload(
              { type: navigationSequence.createTab ? "COMPAT_OPEN_SITE_NEW_TAB" : "COMPAT_OPEN_SITE" },
              navigationSequence.url
            );
            this.lastLiveCommand = {
              at: new Date().toISOString(),
              preferredTabId: this.preferredTabId,
              command: {
                type: navigationSequence.createTab ? "COMPAT_OPEN_SITE_NEW_TAB" : "COMPAT_OPEN_SITE",
                text: navigationSequence.url,
                commands: navigationSequence.commands,
              },
            };
            handlerResponse = await this.extensionCommandHandler.navigateToSite(
              navigationSequence.url,
              navigationSequence.createTab
            );
            targetTabId = handlerResponse?.tabId ?? targetTabId;
            this.lastLiveCommand = Object.assign({}, this.lastLiveCommand || {}, {
              result: handlerResponse,
            });
            i = navigationSequence.consumedUntil;
          } else if (command.type in (this.extensionCommandHandler as any)) {
            route = capability ? capability.route : "extension-worker";
            this.lastLiveCommand = {
              at: new Date().toISOString(),
              preferredTabId: this.preferredTabId,
              command,
            };
            handlerResponse = await (this.extensionCommandHandler as any)[command.type](command);
            this.lastLiveCommand = Object.assign({}, this.lastLiveCommand || {}, {
              result: handlerResponse,
            });
          } else {
            this.lastLiveCommand = {
              at: new Date().toISOString(),
              preferredTabId: this.preferredTabId,
              command,
            };
            if (command.type == "COMMAND_TYPE_SHOW") {
              const tab = await this.tab();
              this.lastLiveShow = {
                at: new Date().toISOString(),
                preferredTabId: this.preferredTabId,
                resolvedTabId: tab?.id,
                command,
              };
            }
            const delivery = await this.sendMessageToContentScript(command);
            route = delivery.route || route;
            targetTabId = delivery.targetTabId;
            targetFrameId = delivery.targetFrameId;
            handlerResponse = delivery.ok ? delivery.response : { ok: false, error: delivery.error };
            this.lastLiveCommand = Object.assign({}, this.lastLiveCommand || {}, {
              result: handlerResponse,
              route,
            });
            if (command.type == "COMMAND_TYPE_SHOW") {
              this.lastLiveShow = Object.assign({}, this.lastLiveShow || {}, {
                result: handlerResponse,
                route,
                targetFrameId,
              });
            }
          }
        } catch (caughtError) {
          error = String(caughtError);
          handlerResponse = { ok: false, error };
          this.setLastError(error);
        }

        error =
          error ||
          (handlerResponse && handlerResponse.error) ||
          (handlerResponse && handlerResponse.data && handlerResponse.data.error) ||
          null;

        const trace: CommandTrace = {
          timestamp: Date.now(),
          commandType: navigationSequence
            ? navigationSequence.createTab
              ? "COMPAT_OPEN_SITE_NEW_TAB"
              : "COMPAT_OPEN_SITE"
            : String(command?.type || "unknown"),
          label,
          normalizedPayload,
          targetTabId,
          targetFrameId,
          targetResolutionState: this.lastResolvedTargetDetails.state,
          targetResolutionSource: this.lastResolvedTargetDetails.source || null,
          targetResolutionReason: this.lastResolvedTargetDetails.reason || null,
          route,
          result: this.classifyResult(handlerResponse, route, compatibilityPathUsed),
          latencyMs: Date.now() - startedAt,
          error,
          compatibilityPathUsed,
        };
        this.pushTrace(trace);
      }
    }

    let result = {
      message: "completed",
      data: {},
    };

    if (handlerResponse) {
      result = Object.assign({}, handlerResponse);
    }

    return result;
  }

  isConnected() {
    return this.connected;
  }

  sendActive() {
    const sent = this.send("active", {
      app: this.app,
      id: this.id,
    });
    if (sent) {
      this.updateConnectionState({
        lastHeartbeatAt: Date.now(),
      });
    }
    this.setIcon();
  }

  sendHeartbeat() {
    const sent = this.send("heartbeat", {
      app: this.app,
      id: this.id,
    });
    if (sent) {
      this.updateConnectionState({
        lastHeartbeatAt: Date.now(),
      });
    }
    this.setIcon();
  }

  send(message: string, data: any) {
    if (!this.connected || !this.websocket || this.websocket.readyState != 1) {
      return false;
    }

    try {
      this.websocket.send(JSON.stringify(this.toEnvelope(message, data)));
      return true;
    } catch (_error) {
      this.connected = false;
      return false;
    }
  }

  setIcon() {
    const iconDir = this.isConnected() ? "icon_default" : "icon_disconnected";
    chrome.action.setIcon({
      path: {
        "16": `../img/${iconDir}/16x16.png`,
        "32": `../img/${iconDir}/32x32.png`,
        "48": `../img/${iconDir}/48x48.png`,
        "128": `../img/${iconDir}/128x128.png`,
      },
    });
  }
}
