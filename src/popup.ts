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
  showClickablesCheckbox.checked = false;
  showClickablesCheckbox.disabled = true;
  chrome.storage.sync.set({
    alwaysShowClickables: false,
  });
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
  showClickablesCheckbox.checked = false;
});
