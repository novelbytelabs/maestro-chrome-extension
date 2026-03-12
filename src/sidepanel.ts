import { capabilitySummary, COMMAND_CAPABILITIES } from "./command-capabilities";
import { CommandTrace, createOperatorSnapshot, OperatorSnapshot } from "./operator-snapshot";

const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const panelModeSelect = document.getElementById("panelModeSelect") as HTMLSelectElement;
const panelModePolicyNote = document.getElementById("panelModePolicyNote") as HTMLParagraphElement;

const pageSite = document.getElementById("pageSite") as HTMLSpanElement;
const pageTitle = document.getElementById("pageTitle") as HTMLSpanElement;
const pageType = document.getElementById("pageType") as HTMLSpanElement;
const pageFocus = document.getElementById("pageFocus") as HTMLSpanElement;
const countLinks = document.getElementById("countLinks") as HTMLSpanElement;
const countButtons = document.getElementById("countButtons") as HTMLSpanElement;
const countInputs = document.getElementById("countInputs") as HTMLSpanElement;
const countCode = document.getElementById("countCode") as HTMLSpanElement;
const pageFrames = document.getElementById("pageFrames") as HTMLSpanElement;
const pageShadow = document.getElementById("pageShadow") as HTMLSpanElement;
const pageInjection = document.getElementById("pageInjection") as HTMLSpanElement;
const pageAnalyzed = document.getElementById("pageAnalyzed") as HTMLSpanElement;
const policyDomain = document.getElementById("policyDomain") as HTMLSpanElement;
const policyOverlay = document.getElementById("policyOverlay") as HTMLSpanElement;
const policyAutomation = document.getElementById("policyAutomation") as HTMLSpanElement;
const policyDryRun = document.getElementById("policyDryRun") as HTMLSpanElement;

const historyList = document.getElementById("historyList") as HTMLDivElement;
const diagnosticsList = document.getElementById("diagnosticsList") as HTMLDivElement;
const lifecycleList = document.getElementById("lifecycleList") as HTMLDivElement;
const capabilityList = document.getElementById("capabilityList") as HTMLDivElement;
let refreshTimer: number | undefined;

function titleCase(value?: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSnapshot(snapshot: Partial<OperatorSnapshot> | undefined | null): OperatorSnapshot {
  const base = createOperatorSnapshot();
  if (!snapshot) {
    return base;
  }

  return {
    ...base,
    ...snapshot,
    connection: { ...base.connection, ...(snapshot.connection || {}) },
    targeting: { ...base.targeting, ...(snapshot.targeting || {}) },
    activePage: { ...base.activePage, ...(snapshot.activePage || {}) },
    lastAction: { ...base.lastAction, ...(snapshot.lastAction || {}) },
    diagnostics: { ...base.diagnostics, ...(snapshot.diagnostics || {}) },
    sitePolicy: { ...base.sitePolicy, ...(snapshot.sitePolicy || {}) },
    future: { ...base.future, ...(snapshot.future || {}) },
    modePolicy: { ...base.modePolicy, ...(snapshot.modePolicy || {}) },
    history: Array.isArray(snapshot.history) ? snapshot.history : base.history,
    lifecycle: Array.isArray(snapshot.lifecycle) ? snapshot.lifecycle : base.lifecycle,
  };
}

function relativeTime(timestamp: number | null) {
  if (!timestamp) {
    return "n/a";
  }
  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 1000) {
    return "just now";
  }
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function renderActivePage(snapshot: OperatorSnapshot) {
  const { activePage } = snapshot;
  pageSite.textContent = activePage.hostname || "No active page";
  pageTitle.textContent = activePage.title || "n/a";
  pageType.textContent = titleCase(activePage.pageType);
  pageFocus.textContent = titleCase(activePage.focusedTarget);
  countLinks.textContent = String(activePage.actionableCounts.links);
  countButtons.textContent = String(activePage.actionableCounts.buttons);
  countInputs.textContent = String(activePage.actionableCounts.inputs);
  countCode.textContent = String(activePage.actionableCounts.code);
  pageFrames.textContent = String(activePage.frameCount);
  pageShadow.textContent = activePage.shadowDomPresent ? "Yes" : "No";
  pageInjection.textContent = titleCase(activePage.injectionHealth);
  pageAnalyzed.textContent = relativeTime(activePage.analyzedAt);
  policyDomain.textContent = activePage.hostname || "n/a";
}

function renderMode(snapshot: OperatorSnapshot) {
  panelModeSelect.value = snapshot.requestedMode || snapshot.mode;
  if (snapshot.effectiveMode != snapshot.requestedMode) {
    panelModePolicyNote.classList.add("policy-override-note");
    panelModePolicyNote.textContent = `Effective on this page: ${titleCase(
      snapshot.effectiveMode
    )}. Requested: ${titleCase(snapshot.requestedMode)}. ${snapshot.modePolicy.note}`;
  } else {
    panelModePolicyNote.classList.remove("policy-override-note");
    panelModePolicyNote.textContent = `${titleCase(snapshot.effectiveMode)} mode active. ${snapshot.modePolicy.note}`;
  }
}

function renderHistoryItem(trace: CommandTrace) {
  const item = document.createElement("article");
  item.className = "history-item";

  const title = document.createElement("h3");
  title.textContent = trace.label;
  item.appendChild(title);

  const route = document.createElement("p");
  route.textContent = `Route: ${titleCase(trace.route)} • Support: ${titleCase(trace.supportLevel)} • Result: ${titleCase(
    trace.result
  )}`;
  item.appendChild(route);

  const target = document.createElement("p");
  target.textContent = `Target: tab ${trace.targetTabId ?? "n/a"} / frame ${trace.targetFrameId ?? "n/a"} • ${titleCase(
    trace.targetResolutionState
  )} via ${trace.targetResolutionSource || "n/a"} • ${trace.latencyMs} ms`;
  item.appendChild(target);

  if (trace.targetResolutionReason) {
    const resolution = document.createElement("p");
    resolution.textContent = `Resolution: ${trace.targetResolutionReason}`;
    item.appendChild(resolution);
  }

  if (trace.error) {
    const error = document.createElement("p");
    error.textContent = `Error: ${trace.error}`;
    item.appendChild(error);
  }

  if (trace.degradationReason) {
    const degraded = document.createElement("p");
    degraded.textContent = `Degraded: ${trace.degradationReason}`;
    item.appendChild(degraded);
  }

  const when = document.createElement("p");
  when.textContent = `When: ${relativeTime(trace.timestamp)}`;
  item.appendChild(when);

  return item;
}

function renderHistory(snapshot: OperatorSnapshot) {
  historyList.innerHTML = "";
  if (snapshot.history.length == 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No command trace recorded yet.";
    historyList.appendChild(empty);
    return;
  }

  snapshot.history.slice(0, 12).forEach((trace) => {
    historyList.appendChild(renderHistoryItem(trace));
  });
}

function diagnosticItem(titleText: string, bodyText: string) {
  const item = document.createElement("article");
  item.className = "diagnostic-item";
  const title = document.createElement("h3");
  title.textContent = titleText;
  item.appendChild(title);
  const body = document.createElement("p");
  body.textContent = bodyText;
  item.appendChild(body);
  return item;
}

function renderDiagnostics(snapshot: OperatorSnapshot) {
  diagnosticsList.innerHTML = "";
  diagnosticsList.appendChild(
    diagnosticItem(
      "Connection",
      `Bus ${snapshot.connection.busConnected ? "connected" : "disconnected"} • ${titleCase(
        snapshot.connection.reconnectState
      )} • last heartbeat ${relativeTime(snapshot.connection.lastHeartbeatAt)} • readyState ${
        snapshot.connection.websocketReadyState === null ? "n/a" : snapshot.connection.websocketReadyState
      }`
    )
  );
  diagnosticsList.appendChild(
    diagnosticItem(
      "Targeting",
      `Preferred tab ${snapshot.targeting.preferredTabId ?? "n/a"} • resolved ${
        snapshot.targeting.lastResolvedTabId ?? "n/a"
      } / frame ${snapshot.targeting.lastResolvedFrameId ?? "n/a"} • ${titleCase(
        snapshot.targeting.targetResolutionState
      )}`
    )
  );
  diagnosticsList.appendChild(
    diagnosticItem(
      "Content reachability",
      `Content script ${
        snapshot.diagnostics.contentScriptReachable === null
          ? "unknown"
          : snapshot.diagnostics.contentScriptReachable
          ? "reachable"
          : "missing"
      } • analyze-page ${
        snapshot.diagnostics.analyzePageReachable === null
          ? "unknown"
          : snapshot.diagnostics.analyzePageReachable
          ? "reachable"
          : "missing"
      }`
    )
  );
  diagnosticsList.appendChild(
    diagnosticItem(
      "Last page context",
      `Updated ${relativeTime(snapshot.diagnostics.lastPageContextAt)} • compatibility path ${
        snapshot.diagnostics.compatibilityPathUsed ? "used" : "not used"
      }`
    )
  );
  diagnosticsList.appendChild(
    diagnosticItem(
      "Reinjection",
      `${snapshot.diagnostics.contentScriptReinjections} attempts • last ${relativeTime(
        snapshot.diagnostics.lastContentScriptReinjectionAt
      )} • ${snapshot.diagnostics.lastContentScriptReinjectionReason || "n/a"}`
    )
  );
  if (snapshot.diagnostics.lastError) {
    diagnosticsList.appendChild(diagnosticItem("Last error", snapshot.diagnostics.lastError));
  }
}

function renderLifecycle(snapshot: OperatorSnapshot) {
  lifecycleList.innerHTML = "";
  lifecycleList.appendChild(
    diagnosticItem(
      "Reconnect State",
      `${titleCase(snapshot.connection.reconnectState)} • failures ${snapshot.connection.consecutiveFailures} • next retry ${relativeTime(
        snapshot.connection.nextRetryAt
      )}`
    )
  );
  lifecycleList.appendChild(
    diagnosticItem(
      "Worker Activity",
      `Wake reason ${snapshot.diagnostics.lastWakeReason || "n/a"} • keepalive ${relativeTime(
        snapshot.diagnostics.lastKeepAliveAt
      )} • last connect ${relativeTime(snapshot.connection.lastConnectedAt)}`
    )
  );

  snapshot.lifecycle.slice(0, 8).forEach((event) => {
    lifecycleList.appendChild(
      diagnosticItem(titleCase(event.kind), `${event.detail} • ${relativeTime(event.timestamp)}`)
    );
  });
}

function renderCapabilities() {
  capabilityList.innerHTML = "";
  const summary = capabilitySummary();
  capabilityList.appendChild(
    diagnosticItem(
      "Support Summary",
      `Stable ${summary.stable || 0} • Compatibility ${summary.compatibility || 0} • Experimental ${summary.experimental || 0}`
    )
  );
  COMMAND_CAPABILITIES.forEach((capability) => {
    capabilityList.appendChild(
      diagnosticItem(
        capability.label,
        `${titleCase(capability.support)} • ${titleCase(capability.category)} • ${titleCase(capability.route)} • ${capability.type}${
          capability.note ? ` • ${capability.note}` : ""
        }`
      )
    );
  });
}

function renderPolicy(snapshot: OperatorSnapshot) {
  policyDomain.textContent = snapshot.sitePolicy.domain || snapshot.activePage.hostname || "n/a";
  policyOverlay.textContent = snapshot.sitePolicy.sensitiveDomain
    ? `${titleCase(snapshot.sitePolicy.overlayPolicy)} (sensitive)`
    : titleCase(snapshot.sitePolicy.overlayPolicy);
  policyAutomation.textContent = titleCase(snapshot.sitePolicy.automationPolicy);
  policyDryRun.textContent = snapshot.sitePolicy.dryRunRecommended ? "Recommended" : "Not required";
}

function renderSnapshot(snapshot: OperatorSnapshot) {
  renderMode(snapshot);
  renderActivePage(snapshot);
  renderHistory(snapshot);
  renderDiagnostics(snapshot);
  renderLifecycle(snapshot);
  renderPolicy(snapshot);
}

function fetchSnapshot() {
  chrome.runtime.sendMessage({ type: "get-operator-snapshot" }, (response) => {
    if (chrome.runtime.lastError || !response || response.ok === false) {
      diagnosticsList.innerHTML = "";
      diagnosticsList.appendChild(
        diagnosticItem(
          "Snapshot unavailable",
          chrome.runtime.lastError?.message || response?.error || "Worker did not return a snapshot."
        )
      );
      return;
    }

    renderSnapshot(normalizeSnapshot(response as Partial<OperatorSnapshot>));
  });
}

function scheduleRefresh() {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    fetchSnapshot();
  }, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  renderCapabilities();
  fetchSnapshot();
  scheduleRefresh();
});

window.addEventListener("unload", () => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
});

refreshButton.addEventListener("click", (event) => {
  event.preventDefault();
  fetchSnapshot();
});

panelModeSelect.addEventListener("change", () => {
  chrome.runtime.sendMessage({ type: "set-mode", mode: panelModeSelect.value }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      fetchSnapshot();
      return;
    }
    renderSnapshot(normalizeSnapshot(response.snapshot as Partial<OperatorSnapshot>));
  });
});
