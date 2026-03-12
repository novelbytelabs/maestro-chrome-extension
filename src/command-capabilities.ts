import { DispatchRoute } from "./operator-snapshot";

export type CommandCategory = "browser" | "page" | "editor" | "navigation" | "compat";
export type CommandSupportLevel = "stable" | "compatibility" | "experimental";

export interface CommandCapability {
  type: string;
  label: string;
  category: CommandCategory;
  route: DispatchRoute;
  support: CommandSupportLevel;
  note?: string;
}

export const COMMAND_CAPABILITIES: CommandCapability[] = [
  {
    type: "COMPAT_OPEN_SITE",
    label: "Go to site",
    category: "compat",
    route: "browser-nav-compat",
    support: "compatibility",
    note: "Uses legacy address-bar navigation compatibility sequence.",
  },
  {
    type: "COMPAT_OPEN_SITE_NEW_TAB",
    label: "Open site in new tab",
    category: "compat",
    route: "browser-nav-compat",
    support: "compatibility",
    note: "Uses legacy create-tab plus address-bar compatibility sequence.",
  },
  { type: "COMMAND_TYPE_CLOSE_TAB", label: "Close tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_CREATE_TAB", label: "Create tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_DUPLICATE_TAB", label: "Duplicate tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_NEXT_TAB", label: "Next tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_PREVIOUS_TAB", label: "Previous tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_RELOAD", label: "Reload tab", category: "browser", route: "extension-worker", support: "stable" },
  { type: "COMMAND_TYPE_SWITCH_TAB", label: "Switch tab", category: "browser", route: "extension-worker", support: "stable" },
  {
    type: "COMMAND_TYPE_SHOW",
    label: "Show overlays",
    category: "page",
    route: "content-script-direct",
    support: "stable",
    note: "Direct content-script overlay path.",
  },
  {
    type: "COMMAND_TYPE_USE",
    label: "Use overlay",
    category: "page",
    route: "content-script-direct",
    support: "stable",
    note: "Direct content-script overlay selection path.",
  },
  {
    type: "COMMAND_TYPE_CANCEL",
    label: "Cancel overlays",
    category: "page",
    route: "content-script-direct",
    support: "stable",
  },
  { type: "COMMAND_TYPE_BACK", label: "Back", category: "navigation", route: "injected", support: "stable" },
  { type: "COMMAND_TYPE_FORWARD", label: "Forward", category: "navigation", route: "injected", support: "stable" },
  {
    type: "COMMAND_TYPE_CLICK",
    label: "Click target",
    category: "page",
    route: "injected",
    support: "experimental",
    note: "Still depends on injected-page selectors and matching heuristics.",
  },
  {
    type: "COMMAND_TYPE_CLICKABLE",
    label: "Check clickable",
    category: "page",
    route: "injected",
    support: "experimental",
  },
  { type: "COMMAND_TYPE_DOM_BLUR", label: "Blur selector", category: "page", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_DOM_CLICK", label: "Click selector", category: "page", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_DOM_COPY", label: "Copy selector", category: "page", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_DOM_FOCUS", label: "Focus selector", category: "page", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_DOM_SCROLL", label: "Scroll selector", category: "page", route: "injected", support: "experimental" },
  {
    type: "COMMAND_TYPE_SCROLL",
    label: "Scroll page",
    category: "page",
    route: "injected",
    support: "experimental",
    note: "Injected-page scroll heuristics depend on hovered container and DOM shape.",
  },
  { type: "COMMAND_TYPE_DIFF", label: "Apply diff", category: "editor", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_GET_EDITOR_STATE", label: "Get editor state", category: "editor", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_REDO", label: "Redo", category: "editor", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_SELECT", label: "Select range", category: "editor", route: "injected", support: "experimental" },
  { type: "COMMAND_TYPE_UNDO", label: "Undo", category: "editor", route: "injected", support: "experimental" },
];

export function commandCapability(commandType: string): CommandCapability | undefined {
  return COMMAND_CAPABILITIES.find((capability) => capability.type == commandType);
}

export function capabilitySummary() {
  return COMMAND_CAPABILITIES.reduce(
    (summary, capability) => {
      summary[capability.support] = (summary[capability.support] || 0) + 1;
      return summary;
    },
    {} as { [route: string]: number }
  );
}
