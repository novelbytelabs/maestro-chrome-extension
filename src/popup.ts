const showClickablesCheckbox = document.getElementById("showClickables") as HTMLInputElement;
const docsButton = document.getElementById("docs") as HTMLButtonElement;
const reconnectButton = document.getElementById("reconnect") as HTMLButtonElement;
const connectionStatus = document.getElementById("connectionStatus") as HTMLParagraphElement;
const connectionHint = document.getElementById("connectionHint") as HTMLParagraphElement;

function setConnectionStatus(connected: boolean | undefined) {
  if (connected === undefined) {
    connectionStatus.textContent = "Connection unknown";
    connectionHint.textContent = "Worker unreachable or stale. Reload the extension if this persists.";
    connectionStatus.classList.remove("connected", "disconnected");
    document.body.dataset.connectionState = "unknown";
    return;
  }
  connectionStatus.textContent = connected ? "Connected to Arqon Bus" : "Disconnected from Arqon Bus";
  connectionHint.textContent = connected
    ? "Live browser commands should route through the worker."
    : "The extension worker is not currently connected to the local Bus.";
  connectionStatus.classList.toggle("connected", connected);
  connectionStatus.classList.toggle("disconnected", !connected);
  document.body.dataset.connectionState = connected ? "connected" : "disconnected";
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
