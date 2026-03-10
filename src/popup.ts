const showClickablesCheckbox = document.getElementById("showClickables") as HTMLInputElement;
const docsButton = document.getElementById("docs") as HTMLAnchorElement;
const reconnectButton = document.getElementById("reconnect") as HTMLAnchorElement;
const connectionStatus = document.getElementById("connectionStatus") as HTMLParagraphElement;

function setConnectionStatus(connected: boolean | undefined) {
  if (connected === undefined) {
    connectionStatus.textContent = "Status: unknown";
    connectionStatus.classList.remove("connected", "disconnected");
    return;
  }
  connectionStatus.textContent = connected ? "Status: connected" : "Status: disconnected";
  connectionStatus.classList.toggle("connected", connected);
  connectionStatus.classList.toggle("disconnected", !connected);
}

function refreshConnectionStatus() {
  chrome.runtime.sendMessage({ type: "connection-status" }, (response) => {
    if (chrome.runtime.lastError) {
      setConnectionStatus(undefined);
      return;
    }
    setConnectionStatus(response?.connected);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  refreshConnectionStatus();
  chrome.storage.sync.get(
    {
      alwaysShowClickables: false,
    },
    function (settings) {
      showClickablesCheckbox.checked = settings.alwaysShowClickables;
    }
  );
});

docsButton.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: "https://arqon.ai/docs" })
});

reconnectButton?.addEventListener("click", (event) => {
  event.preventDefault();
  chrome.runtime.sendMessage({
    type: "reconnect",
  }, (response) => {
    if (chrome.runtime.lastError) {
      setConnectionStatus(undefined);
      return;
    }
    setConnectionStatus(response?.connected);
  });
});

showClickablesCheckbox?.addEventListener("change", () => {
  const settings = {
    alwaysShowClickables: showClickablesCheckbox.checked,
  };
  chrome.storage.sync.set({
    alwaysShowClickables: settings.alwaysShowClickables
  });
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    const tabUrl = tab?.url || "";
    const isSupportedUrl = /^https?:\/\//.test(tabUrl);
    if (!tab?.id || !isSupportedUrl) {
      return;
    }
    chrome.tabs.sendMessage(tab.id, {
      type: "injected-script-command-request",
      data: {
        type: "updateSettings",
        ...settings,
      },
    }, () => {
      if (chrome.runtime.lastError) {
        return;
      }
    });
  });
});
