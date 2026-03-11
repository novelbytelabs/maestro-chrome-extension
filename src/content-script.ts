function injectScript(path: string) {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", path);
  document.documentElement.appendChild(script);
}

function injectCSS(path: string) {
  const css = document.createElement("link");
  css.setAttribute("rel", "stylesheet");
  css.setAttribute("type", "text/css");
  css.setAttribute("href", path);
  document.documentElement.appendChild(css);
}

try {
  if (chrome?.runtime?.id) {
    injectScript(chrome.runtime.getURL("build/injected.js"));
    injectCSS(chrome.runtime.getURL("build/injected.css"));
  }
} catch (_error) {
  // Ignore stale content scripts after extension reloads.
}

const contentOverlayIds = new Set<string>();
let overlayClearTimeout: number | undefined;

function reportPageContext() {
  try {
    if (!chrome?.runtime?.id) {
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: "page-context",
        href: window.location.href,
        isTopFrame: window === window.top,
        readyState: document.readyState,
        hasFocus: document.hasFocus(),
        visibilityState: document.visibilityState,
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  } catch (_error) {
    // Ignore stale content scripts after extension reloads.
  }
}

function showDebugBanner(label: string) {
  const existing = document.getElementById("arqon-debug-banner");
  existing?.remove();

  const banner = document.createElement("div");
  banner.id = "arqon-debug-banner";
  banner.textContent = label;
  banner.style.position = "fixed";
  banner.style.top = "12px";
  banner.style.right = "12px";
  banner.style.zIndex = "2147483647";
  banner.style.padding = "10px 14px";
  banner.style.background = "#c62828";
  banner.style.color = "#fff";
  banner.style.fontFamily = "monospace";
  banner.style.fontSize = "14px";
  banner.style.fontWeight = "700";
  banner.style.borderRadius = "8px";
  banner.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.35)";
  banner.style.pointerEvents = "none";
  banner.style.maxWidth = "60vw";
  banner.style.whiteSpace = "pre-wrap";
  banner.style.border = "2px solid #fff";
  (document.body || document.documentElement).appendChild(banner);

  window.setTimeout(() => {
    banner.remove();
  }, 2000);
}

function clearContentOverlays() {
  if (overlayClearTimeout !== undefined) {
    window.clearTimeout(overlayClearTimeout);
    overlayClearTimeout = undefined;
  }
  for (const id of Array.from(contentOverlayIds)) {
    document.getElementById(id)?.remove();
  }
  contentOverlayIds.clear();
}

function scheduleOverlayClear() {
  if (overlayClearTimeout !== undefined) {
    window.clearTimeout(overlayClearTimeout);
  }
  overlayClearTimeout = window.setTimeout(() => {
    clearContentOverlays();
  }, 5000);
}

function inViewport(element: HTMLElement) {
  const bounding = element.getBoundingClientRect();
  return (
    ((bounding.top >= 0 && bounding.top <= window.innerHeight) ||
      (bounding.bottom >= 0 && bounding.bottom <= window.innerHeight)) &&
    ((bounding.left >= 0 && bounding.left <= window.innerWidth) ||
      (bounding.right >= 0 && bounding.right <= window.innerWidth)) &&
    !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length)
  );
}

function showContentOverlays(nodes: HTMLElement[], overlayType: string) {
  clearContentOverlays();
  for (let i = 0; i < nodes.length; i++) {
    const rect = nodes[i].getBoundingClientRect();
    const overlay = document.createElement("div");
    const id = `arqon-content-overlay-${i + 1}`;
    overlay.id = id;
    overlay.className = "arqon-overlay";
    overlay.textContent = `${i + 1}`;
    overlay.setAttribute("data-overlay-type", overlayType);
    overlay.style.position = "fixed";
    overlay.style.top = `${Math.max(0, rect.top)}px`;
    overlay.style.left = `${Math.max(0, rect.left)}px`;
    overlay.style.zIndex = "2147483647";
    overlay.style.padding = "4px 8px";
    overlay.style.background = "#ff1744";
    overlay.style.color = "#ffffff";
    overlay.style.border = "2px solid #ffffff";
    overlay.style.borderRadius = "999px";
    overlay.style.boxShadow = "0 6px 18px rgba(0, 0, 0, 0.45)";
    overlay.style.fontFamily = "monospace";
    overlay.style.fontSize = "14px";
    overlay.style.fontWeight = "700";
    overlay.style.lineHeight = "1";
    overlay.style.pointerEvents = "none";
    overlay.style.transform = "translate(-20%, -20%)";
    overlay.style.minWidth = "24px";
    overlay.style.textAlign = "center";
    (document.body || document.documentElement).appendChild(overlay);
    contentOverlayIds.add(id);
  }
  scheduleOverlayClear();
}

function selectorForShowText(text: string): string {
  if (text == "links") {
    return 'a, button, summary, [role="link"], [role="button"]';
  }
  if (text == "inputs") {
    return 'input, textarea, [role="checkbox"], [role="radio"], label, [contenteditable="true"]';
  }
  if (text == "code") {
    return "pre, code";
  }
  if (text == "all") {
    return 'a, button, summary, [role="link"], [role="button"], input, textarea, [role="checkbox"], [role="radio"], label, [contenteditable="true"]';
  }
  return "";
}

function normalizeShowTarget(data: any): string {
  const candidate = data?.text || data?.path || data?.value || data?.target || "";
  return String(candidate).toLowerCase().trim();
}

function handleShowCommand(data: any) {
  const target = normalizeShowTarget(data);
  const selector = selectorForShowText(target);
  if (!selector) {
    return {
      ok: false,
      error: `Unsupported show target: ${String(target || "")}`,
      received: data,
    };
  }

  const nodes = Array.from(document.querySelectorAll(selector)).filter((node) =>
    inViewport(node as HTMLElement)
  ) as HTMLElement[];
  showContentOverlays(nodes, target);
  return {
    ok: true,
    overlayType: target,
    count: nodes.length,
    path: "content-script-direct",
    location: window.location.href,
    received: data,
  };
}

let resolvers: { [k: number]: any } = [];
document.addEventListener(`arqon-injected-script-command-response`, (e: any) => {
  if (resolvers[e.detail.id]) {
    resolvers[e.detail.id](e.detail);
    delete resolvers[e.detail.id];
  }
});

async function sendMessageToInjectedScript(data: any) {
  const id = Math.random();
  const response = await new Promise((resolve) => {
    resolvers[id] = resolve;
    const timeoutId = setTimeout(() => {
      if (resolvers[id]) {
        delete resolvers[id];
        resolve({
          id,
          data: {
            error: "Injected script response timeout",
          },
        });
      }
    }, 1000);

    document.dispatchEvent(
      new CustomEvent(`arqon-injected-script-command-request`, {
        detail: {
          id,
          data: data,
        },
      })
    );

    const resolver = resolvers[id];
    resolvers[id] = (value: any) => {
      clearTimeout(timeoutId);
      resolver(value);
    };
  });
  return response;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type == "debug-content-script-ping") {
    showDebugBanner("Arqon content script attached");
    sendResponse({
      ok: true,
      location: window.location.href,
      readyState: document.readyState,
    });
    return false;
  }

  if (request.type == "injected-script-command-request") {
    (async () => {
      try {
        if (request.data?.type == "COMMAND_TYPE_SHOW") {
          sendResponse(handleShowCommand(request.data));
          return;
        }
        const response = await sendMessageToInjectedScript(request.data);
        sendResponse(response);
      } catch (error) {
        sendResponse({
          error: String(error),
        });
      }
    })();
    return true;
  }
  return false;
});

document.addEventListener("DOMContentLoaded", async () => {
  reportPageContext();
  const settings = await chrome.storage.sync.get(["alwaysShowClickables"]);
  if (settings.alwaysShowClickables) {
    await chrome.storage.sync.set({ alwaysShowClickables: false });
  }
  sendMessageToInjectedScript({
    type: "clearOverlays",
  });
  sendMessageToInjectedScript({
    type: "updateSettings",
    alwaysShowClickables: false,
  });
});

window.addEventListener("focus", () => {
  reportPageContext();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState == "visible") {
    reportPageContext();
  } else {
    clearContentOverlays();
  }
});
