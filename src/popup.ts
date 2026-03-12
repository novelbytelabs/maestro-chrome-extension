import { OperatorSnapshot } from "./operator-snapshot";

const docsButton = document.getElementById("docs") as HTMLButtonElement;
const reconnectButton = document.getElementById("reconnect") as HTMLButtonElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const sidePanelButton = document.getElementById("sidepanel") as HTMLButtonElement;
const showClickablesCheckbox = document.getElementById("showClickables") as HTMLInputElement;
const overlayPolicyCopy = document.getElementById("overlayPolicyCopy") as HTMLParagraphElement;
const modeBadge = document.getElementById("modeBadge") as HTMLSpanElement;

const connectionStatus = document.getElementById("connectionStatus") as HTMLParagraphElement;
const connectionHint = document.getElementById("connectionHint") as HTMLParagraphElement;
const reconnectMeta = document.getElementById("reconnectMeta") as HTMLParagraphElement;

const pageSite = document.getElementById("pageSite") as HTMLSpanElement;
const pageType = document.getElementById("pageType") as HTMLSpanElement;
const pageFocus = document.getElementById("pageFocus") as HTMLSpanElement;
const pageActionables = document.getElementById("pageActionables") as HTMLSpanElement;
const pageFrames = document.getElementById("pageFrames") as HTMLSpanElement;
const pageShadow = document.getElementById("pageShadow") as HTMLSpanElement;
const pageInjection = document.getElementById("pageInjection") as HTMLSpanElement;

const lastActionCommand = document.getElementById("lastActionCommand") as HTMLParagraphElement;
const lastActionRoute = document.getElementById("lastActionRoute") as HTMLSpanElement;
const lastActionResult = document.getElementById("lastActionResult") as HTMLSpanElement;
const lastActionLatency = document.getElementById("lastActionLatency") as HTMLSpanElement;
const lastActionError = document.getElementById("lastActionError") as HTMLParagraphElement;

const diagnosticsContent = document.getElementById("diagnosticsContent") as HTMLDivElement;
const futureTeachMode = document.getElementById("futureTeachMode") as HTMLSpanElement;
const futureDryRun = document.getElementById("futureDryRun") as HTMLSpanElement;
const futureSiteProfiles = document.getElementById("futureSiteProfiles") as HTMLSpanElement;
const futureMemory = document.getElementById("futureMemory") as HTMLSpanElement;

let refreshTimer: number | undefined;
let reconnectInFlight = false;

function titleCase(value: string) {
  return value
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function setConnectionStatus(snapshot: OperatorSnapshot) {
  const { connection } = snapshot;
  let state: "connected" | "disconnected" | "unknown" = "unknown";
  if (connection.busConnected) {
    state = "connected";
  } else if (connection.reconnectState == "failed" || connection.reconnectState == "backoff") {
    state = "disconnected";
  }

  document.body.dataset.connectionState = state;
  connectionStatus.textContent =
    state == "connected" ? "Connected to Arqon Bus" : state == "disconnected" ? "Disconnected from Arqon Bus" : "Connection unknown";
  connectionHint.textContent =
    state == "connected"
      ? "Live browser commands should route through the worker."
      : state == "disconnected"
      ? "Worker is live, but Bus transport is not currently connected."
      : "Worker state is available, but connection health is still settling.";
  reconnectMeta.textContent = `State: ${titleCase(connection.reconnectState)} • Last heartbeat: ${relativeTime(
    connection.lastHeartbeatAt
  )}`;
}

function renderMode(snapshot: OperatorSnapshot) {
  modeBadge.textContent = titleCase(snapshot.mode);
}

function renderActivePage(snapshot: OperatorSnapshot) {
  const { activePage } = snapshot;
  pageSite.textContent = activePage.hostname || "No active page";
  pageType.textContent = titleCase(activePage.pageType);
  pageFocus.textContent = titleCase(activePage.focusedTarget);
  pageActionables.textContent = String(activePage.actionableCounts.all);
  pageFrames.textContent = String(activePage.frameCount);
  pageShadow.textContent = activePage.shadowDomPresent ? "Yes" : "No";
  pageInjection.textContent = titleCase(activePage.injectionHealth);
}

function renderLastAction(snapshot: OperatorSnapshot) {
  const { lastAction } = snapshot;
  const latestTrace = snapshot.history[0];
  lastActionCommand.textContent = lastAction.label || "No live command recorded yet";
  lastActionRoute.textContent =
    lastAction.route && latestTrace?.supportLevel
      ? `${titleCase(lastAction.route)} / ${titleCase(latestTrace.supportLevel)}`
      : lastAction.route
      ? titleCase(lastAction.route)
      : "n/a";
  lastActionResult.textContent = lastAction.result ? titleCase(lastAction.result) : "n/a";
  lastActionLatency.textContent = lastAction.latencyMs === null ? "n/a" : `${lastAction.latencyMs} ms`;
  lastActionError.textContent = lastAction.error || latestTrace?.degradationReason || "No error recorded.";
  lastActionError.classList.toggle("has-error", Boolean(lastAction.error || latestTrace?.degradationReason));
}

function renderDiagnostics(snapshot: OperatorSnapshot) {
  const lines = [
    `Preferred tab: ${snapshot.targeting.preferredTabId ?? "n/a"}`,
    `Resolved target: ${snapshot.targeting.lastResolvedTabId ?? "n/a"} / frame ${
      snapshot.targeting.lastResolvedFrameId ?? "n/a"
    }`,
    `Target state: ${titleCase(snapshot.targeting.targetResolutionState)}`,
    `Reconnect: ${titleCase(snapshot.connection.reconnectState)} • failures ${snapshot.connection.consecutiveFailures}`,
    `Next retry: ${relativeTime(snapshot.connection.nextRetryAt)}`,
    `Worker wake: ${snapshot.diagnostics.lastWakeReason || "n/a"}`,
    `Keepalive: ${relativeTime(snapshot.diagnostics.lastKeepAliveAt)}`,
    `Page context: ${relativeTime(snapshot.diagnostics.lastPageContextAt)}`,
    `Content script: ${
      snapshot.diagnostics.contentScriptReachable === null
        ? "unknown"
        : snapshot.diagnostics.contentScriptReachable
        ? "reachable"
        : "missing"
    }`,
    `Page analysis: ${
      snapshot.diagnostics.analyzePageReachable === null
        ? "unknown"
        : snapshot.diagnostics.analyzePageReachable
        ? "reachable"
        : "missing"
    }`,
    `Reinjections: ${snapshot.diagnostics.contentScriptReinjections} • ${
      snapshot.diagnostics.lastContentScriptReinjectionReason || "n/a"
    }`,
    `Legacy history: ${snapshot.history.filter((trace) => trace.legacyPathUsed).length}`,
    `Compatibility path: ${snapshot.diagnostics.compatibilityPathUsed ? "used" : "not used"}`,
    `History depth: ${snapshot.history.length}`,
  ];

  diagnosticsContent.innerHTML = "";
  for (const line of lines) {
    const item = document.createElement("p");
    item.className = "diagnostic-line";
    item.textContent = line;
    diagnosticsContent.appendChild(item);
  }
}

function renderFutureSurface(snapshot: OperatorSnapshot) {
  futureTeachMode.textContent = titleCase(snapshot.future.teachMode);
  futureDryRun.textContent = titleCase(snapshot.future.dryRun);
  futureSiteProfiles.textContent = titleCase(snapshot.future.siteProfiles);
  futureMemory.textContent = `${titleCase(snapshot.future.semanticMemory)} • ${snapshot.future.rememberedCommandsCount} traces`;
}

function renderSnapshot(snapshot: OperatorSnapshot) {
  renderMode(snapshot);
  setConnectionStatus(snapshot);
  renderActivePage(snapshot);
  renderLastAction(snapshot);
  renderDiagnostics(snapshot);
  renderFutureSurface(snapshot);
}

function fetchSnapshot() {
  chrome.runtime.sendMessage({ type: "get-operator-snapshot" }, (response) => {
    if (chrome.runtime.lastError || !response || response.ok === false) {
      document.body.dataset.connectionState = "unknown";
      connectionStatus.textContent = "Snapshot unavailable";
      connectionHint.textContent = chrome.runtime.lastError?.message || response?.error || "Worker did not return a snapshot.";
      reconnectMeta.textContent = "State: Unknown";
      return;
    }

    renderSnapshot(response as OperatorSnapshot);
  });
}

function setReconnectBusyState(busy: boolean) {
  reconnectInFlight = busy;
  reconnectButton.disabled = busy;
  reconnectButton.textContent = busy ? "Reconnecting..." : "Reconnect";
}

function refreshOverlayPolicy() {
  chrome.runtime.sendMessage({ type: "get-overlay-policy" }, (response) => {
    if (chrome.runtime.lastError || !response?.ok) {
      showClickablesCheckbox.checked = false;
      showClickablesCheckbox.disabled = true;
      overlayPolicyCopy.textContent = "Overlay policy unavailable for the current page.";
      return;
    }

    showClickablesCheckbox.disabled = false;
    showClickablesCheckbox.checked = Boolean(response.enabled);
    overlayPolicyCopy.textContent = response.enabled
      ? "Enabled only for the current tab. Overlays will follow focus on this tab."
      : "Selective policy for the current active tab only.";
  });
}

async function openSidePanelFromPopup() {
  const sidePanelApi = (chrome as any).sidePanel;
  if (!sidePanelApi) {
    throw new Error("sidePanel API unavailable");
  }

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs.find((candidate) => /^https?:\/\//.test(candidate.url || ""));
  if (!tab?.id) {
    throw new Error("No active http(s) browser tab found");
  }

  await sidePanelApi.setOptions({
    tabId: tab.id,
    path: "build/sidepanel.html",
    enabled: true,
  });
  await sidePanelApi.open({ tabId: tab.id });
}

function scheduleRefresh() {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
  refreshTimer = window.setInterval(() => {
    fetchSnapshot();
  }, 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  fetchSnapshot();
  refreshOverlayPolicy();
  scheduleRefresh();
});

window.addEventListener("unload", () => {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
  }
});

docsButton.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: "https://novelbytelabs.github.io/ArqonMaestro/guides/getting-started/" });
});

refreshButton.addEventListener("click", (event) => {
  event.preventDefault();
  fetchSnapshot();
  refreshOverlayPolicy();
});

reconnectButton.addEventListener("click", (event) => {
  event.preventDefault();
  if (reconnectInFlight) {
    return;
  }
  setReconnectBusyState(true);
  chrome.runtime.sendMessage({ type: "reconnect" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      document.body.dataset.connectionState = "unknown";
      connectionHint.textContent = chrome.runtime.lastError?.message || "Reconnect request did not return a response.";
    }
    fetchSnapshot();
    refreshOverlayPolicy();
    setReconnectBusyState(false);
  });
});

sidePanelButton.addEventListener("click", (event) => {
  event.preventDefault();
  openSidePanelFromPopup()
    .then(() => {
      window.close();
    })
    .catch(() => {
      chrome.runtime.sendMessage({ type: "open-side-panel" }, (response) => {
        if (!chrome.runtime.lastError && response?.ok) {
          window.close();
        }
      });
    });
});

showClickablesCheckbox.addEventListener("change", () => {
  chrome.runtime.sendMessage(
    {
      type: "set-overlay-policy",
      enabled: showClickablesCheckbox.checked,
    },
    (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        showClickablesCheckbox.checked = false;
        showClickablesCheckbox.disabled = true;
        overlayPolicyCopy.textContent =
          chrome.runtime.lastError?.message || response?.error || "Failed to update overlay policy.";
        return;
      }

      showClickablesCheckbox.checked = Boolean(response.enabled);
      showClickablesCheckbox.disabled = false;
      overlayPolicyCopy.textContent = response.enabled
        ? "Enabled only for the current tab. Overlays will follow focus on this tab."
        : "Selective policy for the current active tab only.";
    }
  );
});
