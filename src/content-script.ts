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
let contentOverlayEntries: { node: HTMLElement; type: string }[] = [];

type PageType = "editor" | "form" | "dashboard" | "docs" | "generic" | "unknown";
type FocusedTarget =
  | "monaco"
  | "codemirror"
  | "ace"
  | "input"
  | "textarea"
  | "contenteditable"
  | "none"
  | "unknown";

type ActionableCounts = {
  links: number;
  buttons: number;
  inputs: number;
  code: number;
  all: number;
};

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
  contentOverlayEntries = [];
  document.getElementById("arqon-copy-overlay")?.remove();
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
  contentOverlayEntries = nodes.map((node) => ({
    node,
    type: overlayType,
  }));
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

function clickNode(node: HTMLElement) {
  if (node.className?.includes("CodeMirror")) {
    const textarea = node.getElementsByTagName("textarea")[0];
    textarea?.focus();
    textarea?.click();
    return;
  }
  node.focus();
  node.click();
}

async function copyCode(node: HTMLElement) {
  await navigator.clipboard.writeText(node.innerText);
}

function showCopyOverlay(index: number) {
  document.getElementById("arqon-copy-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "arqon-copy-overlay";
  overlay.textContent = `Copied ${index}`;
  overlay.style.position = "fixed";
  overlay.style.bottom = "16px";
  overlay.style.right = "16px";
  overlay.style.zIndex = "2147483647";
  overlay.style.padding = "10px 14px";
  overlay.style.borderRadius = "999px";
  overlay.style.background = "#0f172a";
  overlay.style.color = "#f8fafc";
  overlay.style.fontFamily = "monospace";
  overlay.style.fontSize = "13px";
  overlay.style.fontWeight = "700";
  overlay.style.boxShadow = "0 10px 30px rgba(15, 23, 42, 0.35)";
  overlay.style.pointerEvents = "none";
  (document.body || document.documentElement).appendChild(overlay);
  window.setTimeout(() => {
    overlay.remove();
  }, 1500);
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
  return "";
}

function normalizeShowTarget(data: any): string {
  const candidate = data?.text || data?.path || data?.value || data?.target || "";
  return String(candidate).toLowerCase().trim();
}

function collectVisible(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll(selector)).filter((node) =>
    inViewport(node as HTMLElement)
  ) as HTMLElement[];
}

function actionableCounts(): ActionableCounts {
  const links = collectVisible('a, [role="link"]').length;
  const buttons = collectVisible('button, summary, [role="button"]').length;
  const inputs = collectVisible(
    'input, textarea, select, [role="checkbox"], [role="radio"], label, [contenteditable="true"]'
  ).length;
  const code = collectVisible("pre, code").length;

  return {
    links,
    buttons,
    inputs,
    code,
    all: links + buttons + inputs + code,
  };
}

function focusedTarget(): FocusedTarget {
  const active = document.activeElement as HTMLElement | null;
  if (!active) {
    return "none";
  }
  if (active.closest(".monaco-editor")) {
    return "monaco";
  }
  if (active.closest(".CodeMirror")) {
    return "codemirror";
  }
  if (active.closest(".ace_editor")) {
    return "ace";
  }
  if (active.isContentEditable || active.closest('[contenteditable="true"]')) {
    return "contenteditable";
  }
  if (active.tagName == "TEXTAREA") {
    return "textarea";
  }
  if (active.tagName == "INPUT") {
    return "input";
  }
  return "none";
}

function pageTypeFromCounts(counts: ActionableCounts, focus: FocusedTarget): PageType {
  const visibleTextLength = (document.body?.innerText || "").trim().length;
  const codeDensity = counts.code;
  const formDensity = counts.inputs;
  const controlDensity = counts.links + counts.buttons;

  if (focus == "monaco" || focus == "codemirror" || focus == "ace") {
    return "editor";
  }

  if (
    document.querySelector(".monaco-editor, .CodeMirror, .ace_editor, [data-mode-id], [data-editor]")
  ) {
    return "editor";
  }

  if (formDensity >= Math.max(4, controlDensity) || focus == "input" || focus == "textarea" || focus == "contenteditable") {
    return "form";
  }

  if (codeDensity >= 3 || (visibleTextLength > 400 && codeDensity >= 1)) {
    return "docs";
  }

  if (controlDensity >= 12 && formDensity <= 3) {
    return "dashboard";
  }

  if (visibleTextLength > 600 && controlDensity < 20) {
    return "docs";
  }

  return "generic";
}

function shadowDomPresent(): boolean {
  const queue: Element[] = Array.from(document.querySelectorAll("*"));
  for (const element of queue) {
    if ((element as HTMLElement).shadowRoot) {
      return true;
    }
  }
  return false;
}

function analyzePage() {
  const counts = actionableCounts();
  const focus = focusedTarget();
  return {
    tabLocalUrl: window.location.href,
    title: document.title || "",
    hostname: window.location.hostname || "",
    isTopFrame: window === window.top,
    hasFocus: document.hasFocus(),
    visibilityState: document.visibilityState,
    pageType: pageTypeFromCounts(counts, focus),
    focusedTarget: focus,
    actionableCounts: counts,
    shadowDomPresent: shadowDomPresent(),
    injectionHealth: "healthy",
    frameLocalTimestamp: Date.now(),
  };
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

  const nodes = collectVisible(selector);
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

function normalizeOverlayIndex(data: any): number {
  const candidate = data?.index ?? data?.text ?? data?.path ?? data?.value ?? "";
  const index = Number.parseInt(String(candidate), 10);
  return Number.isFinite(index) ? index : Number.NaN;
}

async function handleUseCommand(data: any) {
  const index = normalizeOverlayIndex(data);
  if (!Number.isFinite(index) || index < 1 || index > contentOverlayEntries.length) {
    return {
      ok: false,
      error: `Invalid overlay index: ${String(data?.index ?? data?.text ?? data?.path ?? "")}`,
      count: contentOverlayEntries.length,
    };
  }

  const overlay = contentOverlayEntries[index - 1];
  if (overlay.type == "code") {
    await copyCode(overlay.node);
    showCopyOverlay(index);
  } else {
    clickNode(overlay.node);
  }

  clearContentOverlays();
  return {
    ok: true,
    index,
    overlayType: overlay.type,
  };
}

function handleNavigationCommand(type: string) {
  if (type == "COMMAND_TYPE_BACK") {
    window.history.back();
    return { ok: true, path: "content-script-direct" };
  }
  if (type == "COMMAND_TYPE_FORWARD") {
    window.history.forward();
    return { ok: true, path: "content-script-direct" };
  }
  return undefined;
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
  if (request.type == "analyze-page") {
    sendResponse(analyzePage());
    return false;
  }

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
        const directNavigation = handleNavigationCommand(request.data?.type);
        if (directNavigation) {
          sendResponse(directNavigation);
          return;
        }
        if (request.data?.type == "COMMAND_TYPE_SHOW") {
          sendResponse(handleShowCommand(request.data));
          return;
        }
        if (request.data?.type == "COMMAND_TYPE_USE" && contentOverlayEntries.length > 0) {
          sendResponse(await handleUseCommand(request.data));
          return;
        }
        if (request.data?.type == "COMMAND_TYPE_CANCEL" && contentOverlayEntries.length > 0) {
          clearContentOverlays();
          sendResponse({ ok: true });
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
