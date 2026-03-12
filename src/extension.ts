import ExtensionCommandHandler from "./extension-command-handler";
import IPC from "./ipc";

const extensionCommandHandler = new ExtensionCommandHandler();
const ipc = new IPC(
  navigator.userAgent.includes("Brave")
    ? "brave"
    : navigator.userAgent.includes("Edg")
    ? "edge"
    : "chrome",
  extensionCommandHandler
);
ipc.noteWorkerWake("service-worker-evaluated");
const overlayPolicyStorageKey = "overlayPolicyTabIds";
const overlayPolicyTabIds = new Set<number>();
let overlayPolicyLoaded = false;
const overlayCooldownMs = 1500;
const lastOverlayApplyAtByTabId: { [tabId: number]: number } = {};

const isSensitiveTab = (tab?: chrome.tabs.Tab) => {
  const raw = tab?.url || "";
  try {
    const hostname = new URL(raw).hostname;
    return /(^|\.)((auth|login|signin|account|identity|checkout|billing|pay|bank|wallet|admin|secure|oauth|sso)(\.|$))/i.test(
      hostname
    );
  } catch (_error) {
    return false;
  }
};

const ensureOverlayPolicyLoaded = async () => {
  if (overlayPolicyLoaded) {
    return;
  }
  overlayPolicyLoaded = true;
  try {
    const stored = await chrome.storage.local.get(overlayPolicyStorageKey);
    const raw = stored[overlayPolicyStorageKey];
    if (Array.isArray(raw)) {
      raw.forEach((value) => {
        if (typeof value == "number") {
          overlayPolicyTabIds.add(value);
        }
      });
    }
  } catch (_error) {}
};

const persistOverlayPolicy = async () => {
  await chrome.storage.local.set({
    [overlayPolicyStorageKey]: Array.from(overlayPolicyTabIds.values()),
  });
};

const ensureConnection = async (force: boolean = false) => {
  const connected = await ipc.ensureConnection(force);
  if (connected) {
    ipc.sendActive();
    ipc.sendHeartbeat();
  }
};

const rememberPreferredTab = async (tabId?: number) => {
  if (tabId === undefined) {
    return;
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.id && /^https?:\/\//.test(tab.url || "")) {
      await ipc.rememberPreferredTab(tab.id);
    }
  } catch (_error) {}
};

const activeNormalTab = async () => {
  const preferredTabId = ipc.preferredTab();
  if (preferredTabId !== undefined) {
    try {
      const preferred = await chrome.tabs.get(preferredTabId);
      if (preferred?.id && /^https?:\/\//.test(preferred.url || "")) {
        return preferred;
      }
    } catch (_error) {
      await ipc.rememberPreferredTab(undefined);
    }
  }

  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs.find((candidate) => /^https?:\/\//.test(candidate.url || ""));
  if (tab?.id) {
    await ipc.rememberPreferredTab(tab.id);
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
      await ipc.rememberPreferredTab(active.id);
      return active;
    }
  }

  return undefined;
};

const sendToTab = async (tabId: number, message: any): Promise<any> =>
  new Promise((resolve) => {
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

const sendToFrame = async (tabId: number, frameId: number, message: any): Promise<any> =>
  new Promise((resolve) => {
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

const frameIdsForTab = async (tabId: number): Promise<number[]> => {
  const frames = await chrome.webNavigation.getAllFrames({ tabId });
  const ids = (frames || [])
    .filter((frame) => /^https?:\/\//.test(frame.url || ""))
    .map((frame) => frame.frameId);
  const unique = Array.from(new Set(ids));
  return unique.length > 0 ? unique : [0];
};

const ensureContentScriptAllFrames = async (tabId: number): Promise<void> => {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["build/content-script.js"],
  });
};

const sendShowToBestFrame = async (tabId: number, message: any): Promise<any> => {
  let frameIds = await frameIdsForTab(tabId);
  let attempts = await Promise.all(frameIds.map((frameId) => sendToFrame(tabId, frameId, message)));

  const missingReceiver = attempts.every(
    (attempt) => !attempt.ok && attempt.error == "Could not establish connection. Receiving end does not exist."
  );

  if (missingReceiver) {
    await ensureContentScriptAllFrames(tabId);
    frameIds = await frameIdsForTab(tabId);
    attempts = await Promise.all(frameIds.map((frameId) => sendToFrame(tabId, frameId, message)));
  }

  const successful = attempts.filter((attempt) => attempt.ok);
  if (successful.length == 0) {
    return attempts[0] || { ok: false, error: "No frame responded" };
  }

  successful.sort((left, right) => {
    const leftCount = Number(left.response?.count || 0);
    const rightCount = Number(right.response?.count || 0);
    return rightCount - leftCount;
  });

  return successful[0];
};

const sendCommandToAllFrames = async (tabId: number, message: any): Promise<any[]> => {
  let frameIds = await frameIdsForTab(tabId);
  let attempts = await Promise.all(frameIds.map((frameId) => sendToFrame(tabId, frameId, message)));

  const missingReceiver = attempts.every(
    (attempt) => !attempt.ok && attempt.error == "Could not establish connection. Receiving end does not exist."
  );

  if (missingReceiver) {
    await ensureContentScriptAllFrames(tabId);
    frameIds = await frameIdsForTab(tabId);
    attempts = await Promise.all(frameIds.map((frameId) => sendToFrame(tabId, frameId, message)));
  }

  return attempts;
};

const clearOverlaysForTab = async (tabId: number) => {
  try {
    await sendCommandToAllFrames(tabId, {
      type: "injected-script-command-request",
      data: {
        type: "COMMAND_TYPE_CANCEL",
      },
    });
  } catch (_error) {}
};

const overlayPolicyEnabledForTab = async (tabId?: number) => {
  await ensureOverlayPolicyLoaded();
  return tabId !== undefined ? overlayPolicyTabIds.has(tabId) : false;
};

const setOverlayPolicyForTab = async (tabId: number, enabled: boolean) => {
  await ensureOverlayPolicyLoaded();
  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  if (enabled && isSensitiveTab(tab)) {
    ipc.noteOverlayPolicy(tabId, false);
    return {
      ok: false,
      error: "Overlay auto-show is blocked by site policy on sensitive domains.",
      blockedByPolicy: true,
    };
  }
  if (enabled) {
    overlayPolicyTabIds.add(tabId);
  } else {
    overlayPolicyTabIds.delete(tabId);
  }
  await persistOverlayPolicy();
  ipc.noteOverlayPolicy(tabId, enabled);
  return { ok: true, enabled };
};

const applyOverlayPolicyToTab = async (tabId: number, force: boolean = false) => {
  await ensureOverlayPolicyLoaded();
  if (!overlayPolicyTabIds.has(tabId)) {
    return { ok: false, skipped: true };
  }
  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  if (isSensitiveTab(tab)) {
    overlayPolicyTabIds.delete(tabId);
    await persistOverlayPolicy();
    ipc.noteOverlayPolicy(tabId, false);
    return { ok: false, blockedByPolicy: true, error: "Overlay auto-show is blocked by site policy on sensitive domains." };
  }
  const now = Date.now();
  if (!force && lastOverlayApplyAtByTabId[tabId] && now - lastOverlayApplyAtByTabId[tabId] < overlayCooldownMs) {
    return { ok: true, throttled: true };
  }
  lastOverlayApplyAtByTabId[tabId] = now;
  return sendShowToBestFrame(tabId, {
    type: "injected-script-command-request",
    data: {
      type: "COMMAND_TYPE_SHOW",
      text: "all",
    },
  });
};

const refreshOverlayPolicyForActiveTab = async (force: boolean = false) => {
  const tab = await activeNormalTab();
  if (!tab?.id) {
    return;
  }
  const enabled = await overlayPolicyEnabledForTab(tab.id);
  const blockedByPolicy = isSensitiveTab(tab);
  ipc.noteOverlayPolicy(tab.id, blockedByPolicy ? false : enabled);
  if (enabled) {
    await applyOverlayPolicyToTab(tab.id, force);
  }
};

const debugShowLinks = async () => {
  const tab = await activeNormalTab();
  if (!tab?.id) {
    return { ok: false, error: "No active http(s) browser tab found" };
  }

  const request = {
    type: "injected-script-command-request",
    data: {
      type: "COMMAND_TYPE_SHOW",
      text: "links",
    },
  };

  try {
    return await sendShowToBestFrame(tab.id, request);
  } catch (error) {
    return { ok: false, error: String(error) };
  }
};

const debugConnectionStatus = async () => {
  const snapshot = await ipc.getOperatorSnapshot(false);
  return {
    connected: snapshot.connection.busConnected,
    preferredTabId: snapshot.targeting.preferredTabId,
    lastLiveShow: ipc.lastLiveShowDiagnostics(),
    reconnectState: snapshot.connection.reconnectState,
  };
};

const debugReconnect = async () => {
  await ensureConnection(true);
  await ipc.refreshActivePage(true);
  return debugConnectionStatus();
};

const debugPingContentScript = async () => {
  const tab = await activeNormalTab();
  if (!tab?.id) {
    return { ok: false, error: "No active http(s) browser tab found" };
  }

  let result = await sendToTab(tab.id, {
    type: "debug-content-script-ping",
  });

  if (!result.ok && result.error == "Could not establish connection. Receiving end does not exist.") {
    try {
      await ensureContentScriptAllFrames(tab.id);
    } catch (error) {
      return { ok: false, error: String(error) };
    }
    result = await sendToTab(tab.id, {
      type: "debug-content-script-ping",
    });
  }

  return result;
};

const openSidePanel = async () => {
  const sidePanelApi = (chrome as any).sidePanel;
  if (!sidePanelApi) {
    return { ok: false, error: "sidePanel API unavailable" };
  }

  const tab = await activeNormalTab();
  if (!tab?.id) {
    return { ok: false, error: "No active http(s) browser tab found" };
  }

  try {
    await sidePanelApi.setOptions({
      tabId: tab.id,
      path: "build/sidepanel.html",
      enabled: true,
    });
    await sidePanelApi.open({ tabId: tab.id });
    return { ok: true, tabId: tab.id };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
};

(globalThis as any).__debugShowLinks = debugShowLinks;
(globalThis as any).__debugPingContentScript = debugPingContentScript;
(globalThis as any).__debugLastLiveShow = () => ipc.lastLiveShowDiagnostics();
(globalThis as any).__debugLastLiveCommand = () => ipc.lastLiveCommandDiagnostics();
(globalThis as any).__debugConnectionStatus = debugConnectionStatus;
(globalThis as any).__debugReconnect = debugReconnect;
(globalThis as any).__debugOperatorSnapshot = () => ipc.getOperatorSnapshot(true);
(globalThis as any).__debugOpenSidePanel = openSidePanel;

chrome.runtime.onStartup.addListener(async () => {
  ipc.noteWorkerWake("chrome.runtime.onStartup");
  await ensureOverlayPolicyLoaded();
  await ensureConnection();
  await ipc.refreshActivePage(false);
});

chrome.alarms.create("keepAlive", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name == "keepAlive") {
    ipc.noteKeepAlive("Periodic keepAlive alarm fired.");
    await ensureConnection();
    await ipc.refreshActivePage(false);
    await refreshOverlayPolicyForActiveTab(false);
  }
});

chrome.tabs.onActivated.addListener(async () => {
  ipc.noteWorkerWake("chrome.tabs.onActivated");
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await rememberPreferredTab(tabs[0]?.id);
  await ensureConnection();
  await ipc.refreshActivePage(false);
  if (tabs[0]?.id) {
    await refreshOverlayPolicyForActiveTab(true);
  }
});

chrome.windows.onFocusChanged.addListener(async () => {
  ipc.noteWorkerWake("chrome.windows.onFocusChanged");
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await rememberPreferredTab(tabs[0]?.id);
  await ensureConnection();
  await ipc.refreshActivePage(false);
  if (tabs[0]?.id) {
    await refreshOverlayPolicyForActiveTab(true);
  }
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state == "active") {
    ipc.noteWorkerWake("chrome.idle.onStateChanged(active)");
    await ensureConnection();
    await ipc.refreshActivePage(false);
    await refreshOverlayPolicyForActiveTab(false);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type == "reconnect") {
    ensureConnection(true)
      .then(async () => {
        await ipc.refreshActivePage(true);
        sendResponse({ connected: ipc.isConnected() });
      })
      .catch(() => {
        sendResponse({ connected: ipc.isConnected() });
      });
    return true;
  }

  if (message.type == "connection-status") {
    ipc.getOperatorSnapshot(false)
      .then((snapshot) => {
        sendResponse({ connected: snapshot.connection.busConnected });
      })
      .catch(() => {
        sendResponse({ connected: ipc.isConnected() });
      });
    return true;
  }

  if (message.type == "get-operator-snapshot") {
    ipc.getOperatorSnapshot(true)
      .then((snapshot) => {
        sendResponse(snapshot);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type == "open-side-panel") {
    openSidePanel()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type == "get-overlay-policy") {
    activeNormalTab()
      .then(async (tab) => {
        const enabled = await overlayPolicyEnabledForTab(tab?.id);
        const blockedByPolicy = isSensitiveTab(tab);
        if (tab?.id) {
          ipc.noteOverlayPolicy(tab.id, blockedByPolicy ? false : enabled);
        }
        sendResponse({
          ok: true,
          tabId: tab?.id,
          enabled: blockedByPolicy ? false : enabled,
          blockedByPolicy,
        });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type == "set-overlay-policy") {
    activeNormalTab()
      .then(async (tab) => {
        if (!tab?.id) {
          sendResponse({ ok: false, error: "No active http(s) browser tab found" });
          return;
        }
        const enabled = Boolean(message.enabled);
        const result = await setOverlayPolicyForTab(tab.id, enabled);
        if (!result.ok) {
          sendResponse(Object.assign({ ok: false, tabId: tab.id, enabled: false }, result));
          return;
        }
        if (enabled) {
          await applyOverlayPolicyToTab(tab.id, true);
        } else {
          await clearOverlaysForTab(tab.id);
        }
        sendResponse({ ok: true, tabId: tab.id, enabled });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type == "page-context") {
    const senderTabId = sender.tab?.id;
    (async () => {
      ipc.recordPageContext(message, senderTabId);
      if (message.isTopFrame && senderTabId !== undefined) {
        await rememberPreferredTab(senderTabId);
        if (await overlayPolicyEnabledForTab(senderTabId)) {
          await applyOverlayPolicyToTab(senderTabId, false);
        }
      }
      await ipc.refreshActivePage(false).catch(() => undefined);
      sendResponse({ ok: true, preferredTabId: ipc.preferredTab() });
    })().catch((error) => {
      sendResponse({ ok: false, error: String(error), preferredTabId: ipc.preferredTab() });
    });
    return true;
  }

  if (message.type == "debug-show-links") {
    debugShowLinks()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type == "debug-ping-content-script") {
    debugPingContentScript()
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  return false;
});

let lifeline: any = undefined;
keepAlive();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    lifeline = port;
    createKeepAliveAlarm();
    port.onDisconnect.addListener(createKeepAliveAlarm);
  }
});

function createKeepAliveAlarm() {
  ipc.noteKeepAlive("Scheduled forced keepAlive alarm.");
  chrome.alarms.create("keepAliveForced", { delayInMinutes: 4 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "keepAliveForced") {
    ipc.noteKeepAlive("Forced keepAlive alarm fired.");
    lifeline?.disconnect();
    lifeline = null;
    keepAlive();
  }
});

async function keepAlive() {
  if (lifeline) {
    return;
  }
  ipc.noteKeepAlive("Attempting to establish keepAlive lifeline.");
  for (const tab of await chrome.tabs.query({
    url: "*://*/*",
  })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab!.id! },
        func: () => chrome.runtime.connect({ name: "keepAlive" }),
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (_e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(_tabId: any, info: any, _tab: any) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}
