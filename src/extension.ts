import ExtensionCommandHandler from "./extension-command-handler";
import IPC from "./ipc";

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
      ipc.rememberPreferredTab(tab.id);
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
      ipc.rememberPreferredTab(undefined);
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

const debugPingContentScript = async () => {
  const tab = await activeNormalTab();
  if (!tab?.id) {
    return { ok: false, error: "No active http(s) browser tab found" };
  }

  let result = await sendToTab(tab.id, {
    type: "debug-content-script-ping",
  });

  if (
    !result.ok &&
    result.error == "Could not establish connection. Receiving end does not exist."
  ) {
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

// Expose a direct worker-console test hook.
(globalThis as any).__debugShowLinks = debugShowLinks;
(globalThis as any).__debugPingContentScript = debugPingContentScript;
(globalThis as any).__debugLastLiveShow = () => ipc.lastLiveShowDiagnostics();

const extensionCommandHandler = new ExtensionCommandHandler();
const ipc = new IPC(
  navigator.userAgent.includes("Brave")
    ? "brave"
    : navigator.userAgent.includes("Edg")
    ? "edge"
    : "chrome",
  extensionCommandHandler
);

chrome.runtime.onStartup.addListener(async () => {
  await ensureConnection();
});

chrome.alarms.create("keepAlive", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name == "keepAlive") {
    await ensureConnection();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await rememberPreferredTab(tabs[0]?.id);
  await ensureConnection();
});

chrome.windows.onFocusChanged.addListener(async () => {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  await rememberPreferredTab(tabs[0]?.id);
  await ensureConnection();
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state == "active") {
    await ensureConnection();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type == "reconnect") {
    ensureConnection(true)
      .then(() => {
        sendResponse({ connected: ipc.isConnected() });
      })
      .catch(() => {
        sendResponse({ connected: ipc.isConnected() });
      });
    return true;
  }

  if (message.type == "connection-status") {
    sendResponse({ connected: ipc.isConnected() });
    return false;
  }

  if (message.type == "page-context") {
    const senderTabId = _sender.tab?.id;
    if (message.isTopFrame && senderTabId !== undefined) {
      rememberPreferredTab(senderTabId);
    }
    sendResponse({ ok: true, preferredTabId: ipc.preferredTab() });
    return false;
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

// The rest of this is adapted from the solution here:
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/66618269
let lifeline: any = undefined;
keepAlive();

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    lifeline = port;
    createKeepAliveAlarm();
    port.onDisconnect.addListener(createKeepAliveAlarm);
  }
});

function createKeepAliveAlarm() {
  chrome.alarms.create('keepAliveForced', { delayInMinutes: 4 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAliveForced') {
    lifeline?.disconnect();
    lifeline = null;
    keepAlive();
  }
});

async function keepAlive() {
  if (lifeline) {
    return;
  }
  for (const tab of await chrome.tabs.query({
    url: '*://*/*'
  })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab!.id! },
        func: () => chrome.runtime.connect({ name: 'keepAlive' }),
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId: any, info: any, tab: any) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}
