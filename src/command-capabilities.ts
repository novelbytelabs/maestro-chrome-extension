import { CommandSupportLevel, DispatchRoute } from "./operator-snapshot";

export type CommandCategory = "browser" | "page" | "editor" | "navigation" | "compat";

export interface CommandCapability {
  type: string;
  label: string;
  description: string;
  category: CommandCategory;
  route: DispatchRoute;
  support: CommandSupportLevel;
  note?: string;
  legacy?: boolean;
}

export const COMMAND_CAPABILITIES: CommandCapability[] = [
  {
    type: "COMPAT_OPEN_SITE",
    label: "Go to <site>",
    description: "Navigates the current tab to a specified URL using legacy compatibility protocols. Examples: 'Open google.com', 'Go to arqonmaestro.com'",
    category: "compat",
    route: "browser-nav-compat",
    support: "compatibility",
    note: "Uses legacy address-bar navigation compatibility sequence.",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_CLOSE_TAB",
    label: "Close tab",
    description: "Terminates the active browser tab session immediately. Examples: 'Close this tab', 'Terminate session'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_CREATE_TAB",
    label: "Create tab",
    description: "Launches a new, empty browser tab in the current window. Examples: 'Open new tab', 'Create empty tab'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_DUPLICATE_TAB",
    label: "Duplicate tab",
    description: "Creates an exact clone of the current tab, including its navigation history. Examples: 'Clone this tab', 'Duplicate session'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_NEXT_TAB",
    label: "Next tab",
    description: "Shifts focus to the immediate next tab in the current browser window. Examples: 'Go to next tab', 'Switch to right tab'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_PREVIOUS_TAB",
    label: "Previous tab",
    description: "Shifts focus to the immediate preceding tab in the current browser window. Examples: 'Go to previous tab', 'Switch to left tab'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_RELOAD",
    label: "Reload tab",
    description: "Refreshes the active page to synchronize with the latest server state. Examples: 'Refresh page', 'Reload site'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_SWITCH_TAB",
    label: "Switch tab",
    description: "Jumps directly to a specific tab identified by its unique session ID. Examples: 'Switch to tab 5', 'Go to tab with ID 123'",
    category: "browser",
    route: "extension-worker",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_SHOW",
    label: "Show overlays",
    description: "Activates the Maestro interactive UI elements on the current page surface. Examples: 'Show overlays', 'Activate Maestro UI'",
    category: "page",
    route: "content-script-direct",
    support: "stable",
    note: "Direct content-script overlay path.",
  },
  {
    type: "COMMAND_TYPE_USE",
    label: "Use overlay",
    description: "Selects and interacts with a specific active Maestro overlay component. Examples: 'Use overlay 1', 'Select Submit button'",
    category: "page",
    route: "content-script-direct",
    support: "stable",
    note: "Direct content-script overlay selection path.",
  },
  {
    type: "COMMAND_TYPE_CANCEL",
    label: "Cancel overlays",
    description: "Dismisses all active Maestro UI elements and returns to standard page view. Examples: 'Dismiss overlays', 'Hide Maestro UI'",
    category: "page",
    route: "content-script-direct",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_BACK",
    label: "Back",
    description: "Navigates one step backward in the current tab's session history. Examples: 'Go back', 'Previous page'",
    category: "navigation",
    route: "content-script-direct",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_FORWARD",
    label: "Forward",
    description: "Navigates one step forward in the current tab's session history. Examples: 'Go forward', 'Next page'",
    category: "navigation",
    route: "content-script-direct",
    support: "stable",
  },
  {
    type: "COMMAND_TYPE_CLICK",
    label: "Click target",
    description: "Executes a synthetic click on a page element using advanced matching heuristics. Examples: 'Click search button', 'Click on Add to cart'",
    category: "page",
    route: "injected",
    support: "experimental",
    note: "Still depends on injected-page selectors and matching heuristics.",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_CLICKABLE",
    label: "Check clickable",
    description: "Validates whether a target element is interactive and reachable within the DOM. Examples: 'Check if button is clickable', 'Is search input interactive?'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DOM_BLUR",
    label: "Blur selector",
    description: "Removes focus from a specified element, triggering its blur event transition. Examples: 'Blur search input', 'Remove focus from field'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DOM_CLICK",
    label: "Click selector",
    description: "Performs a direct DOM click event on an element identified by a CSS selector. Examples: 'Click selector #submit', 'Click button.primary'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DOM_COPY",
    label: "Copy selector",
    description: "Extracts and copies the textual content of a specific DOM element to the clipboard. Examples: 'Copy selector .price', 'Extract text from #description'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DOM_FOCUS",
    label: "Focus selector",
    description: "Directs browser focus to a target element, preparing it for immediate input. Examples: 'Focus selector #username', 'Select input[name=email]'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DOM_SCROLL",
    label: "Scroll selector",
    description: "Smoothly scrolls the viewport or container to bring a specific element into view. Examples: 'Scroll to #footer', 'Bring .article into view'",
    category: "page",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_SCROLL",
    label: "Scroll page",
    description: "Adjusts the page scroll position based on focused containers and DOM geometry. Examples: 'Scroll down', 'Scroll up 500px'",
    category: "page",
    route: "injected",
    support: "experimental",
    note: "Injected-page scroll heuristics depend on hovered container and DOM shape.",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_DIFF",
    label: "Apply diff",
    description: "Intelligently merges and applies text transformations to the active editor state. Examples: 'Apply code changes', 'Merge editor diff'",
    category: "editor",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_GET_EDITOR_STATE",
    label: "Get editor state",
    description: "Retrieves the current content, cursor position, and metadata from active editors. Examples: 'Get cursor position', 'Retrieve editor content'",
    category: "editor",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_REDO",
    label: "Redo",
    description: "Reapplies the next forward action in the editor's command history. Examples: 'Redo last change', 'Redo edit'",
    category: "editor",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_SELECT",
    label: "Select range",
    description: "Precisely highlights a specified range of text or elements within an editor. Examples: 'Select line 10-20', 'Highlight header text'",
    category: "editor",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
  {
    type: "COMMAND_TYPE_UNDO",
    label: "Undo",
    description: "Reverts the last executed action in the editor to restore previous state. Examples: 'Undo last edit', 'Revert change'",
    category: "editor",
    route: "injected",
    support: "experimental",
    legacy: true,
  },
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
