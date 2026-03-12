export default class ExtensionCommandHandler {
  private async activeTab(): Promise<chrome.tabs.Tab | undefined> {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tabs[0];
  }

  private normalizeUrl(raw: string): string | undefined {
    const candidate = raw.trim().replace(/\s+/g, "");
    if (!candidate) {
      return undefined;
    }

    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
      return candidate;
    }

    if (
      /^(localhost(?::\d+)?(\/.*)?|(\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/.*)?|[a-z0-9-]+(\.[a-z0-9-]+)+(?::\d+)?(\/.*)?)$/i.test(
        candidate
      )
    ) {
      return `https://${candidate}`;
    }

    return undefined;
  }

  async navigateToSite(raw: string, createTab: boolean = false): Promise<any> {
    const url = this.normalizeUrl(raw);
    if (!url) {
      return { ok: false, error: `Unsupported URL: ${raw}` };
    }

    if (createTab) {
      return new Promise((resolve) => {
        chrome.tabs.create({ url }, (tab) => {
          resolve({
            ok: true,
            url,
            tabId: tab?.id,
            created: true,
          });
        });
      });
    }

    const tab = await this.activeTab();
    if (!tab?.id) {
      return { ok: false, error: "No active tab available" };
    }

    return new Promise((resolve) => {
      chrome.tabs.update(tab.id!, { url, active: true }, (updatedTab) => {
        resolve({
          ok: true,
          url,
          tabId: updatedTab?.id ?? tab.id,
          created: false,
        });
      });
    });
  }

  private parseSpokenNumber(value: string): number | undefined {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/-/g, " ")
      .replace(/\band\b/g, " ")
      .replace(/\s+/g, " ");

    const directMap: { [key: string]: number } = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
      eight: 8,
      nine: 9,
      ten: 10,
      eleven: 11,
      twelve: 12,
      thirteen: 13,
      fourteen: 14,
      fifteen: 15,
      sixteen: 16,
      seventeen: 17,
      eighteen: 18,
      nineteen: 19,
      twenty: 20,
    };

    if (normalized in directMap) {
      return directMap[normalized];
    }

    const tensMap: { [key: string]: number } = {
      twenty: 20,
      thirty: 30,
      forty: 40,
      fifty: 50,
      sixty: 60,
      seventy: 70,
      eighty: 80,
      ninety: 90,
    };

    let total = 0;
    for (const part of normalized.split(" ")) {
      if (!part) {
        continue;
      }
      if (part in tensMap) {
        total += tensMap[part];
        continue;
      }
      if (part in directMap) {
        total += directMap[part];
        continue;
      }
      return undefined;
    }

    return total > 0 ? total : undefined;
  }

  private normalizeTabIndex(data: any): number | undefined {
    const candidate = data?.index ?? data?.text ?? data?.path ?? data?.value;
    const raw = String(candidate ?? "").trim();
    const parsed = Number.parseInt(raw, 10);
    const spoken = Number.isFinite(parsed) ? parsed : this.parseSpokenNumber(raw);
    const resolved = spoken ?? parsed;
    if (!Number.isFinite(resolved) || resolved < 1) {
      return undefined;
    }
    return resolved - 1;
  }

  private async changeTab(direction: number): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTab) => {
        if (!activeTab || activeTab.length == 0) {
          resolve();
          return;
        }

        chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
          const tabCount = tabs.length;
          let index = (activeTab[0].index + direction) % tabCount;
          if (index == -1) {
            index = tabCount - 1;
          }

          chrome.tabs.query({ lastFocusedWindow: true, index }, (tab) => {
            if (!tab || tab.length == 0) {
              resolve();
              return;
            }

            chrome.tabs.update(tab[0].id!, { active: true }, (_v) => {
              resolve();
            });
          });
        });
      });
    });
  }

  async COMMAND_TYPE_CLOSE_TAB(_data: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (!tabs || tabs.length == 0) {
          resolve();
          return;
        }

        chrome.tabs.remove(tabs[0].id!, resolve);
      });
    });
  }

  async COMMAND_TYPE_CREATE_TAB(_data: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.create({}, (tab) => {
        resolve({ ok: true, tabId: tab?.id });
      });
    });
  }

  async COMMAND_TYPE_DUPLICATE_TAB(_data: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (activeTab) => {
        if (!activeTab || activeTab.length == 0) {
          resolve();
          return;
        }
        chrome.tabs.duplicate(activeTab[0].id!, (_v) => {
          resolve();
        });
      });
    });
  }

  async COMMAND_TYPE_NEXT_TAB(_data: any): Promise<any> {
    return this.changeTab(1);
  }

  async COMMAND_TYPE_PREVIOUS_TAB(_data: any): Promise<any> {
    return this.changeTab(-1);
  }

  async COMMAND_TYPE_RELOAD(_data: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.reload(() => resolve({ ok: true }));
    });
  }

  async COMMAND_TYPE_SWITCH_TAB(data: any): Promise<any> {
    return new Promise((resolve) => {
      chrome.tabs.query({ lastFocusedWindow: true }, (tabs) => {
        if (!tabs || tabs.length == 0) {
          resolve({ ok: false, error: "No tabs available" });
          return;
        }

        const sortedTabs = [...tabs].sort((left, right) => (left.index || 0) - (right.index || 0));
        const requestedIndex = this.normalizeTabIndex(data);
        if (requestedIndex === undefined) {
          resolve({ ok: false, error: "Switch tab requires a positive tab number" });
          return;
        }
        if (requestedIndex >= sortedTabs.length) {
          resolve({
            ok: false,
            error: `Tab ${requestedIndex + 1} is out of range`,
            tabCount: sortedTabs.length,
          });
          return;
        }

        chrome.tabs.update(sortedTabs[requestedIndex].id!, { active: true }, (_v: any) => {
          resolve({
            ok: true,
            index: requestedIndex + 1,
            tabId: sortedTabs[requestedIndex].id,
          });
        });
      });
    });
  }
}
