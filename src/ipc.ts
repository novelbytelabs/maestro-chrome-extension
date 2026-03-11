import { v4 as uuidv4 } from "uuid";
import ExtensionCommandHandler from "./extension-command-handler";

export default class IPC {
  private app: string;
  private extensionCommandHandler: ExtensionCommandHandler;
  private connected: boolean = false;
  private id: string = "";
  private websocket?: WebSocket;
  private url: string = "ws://localhost:9100/";
  private readonly probeUrl: string = "http://localhost:9100/";
  private readonly room: string = "maestro";
  private readonly channel: string = "plugin.chrome";
  private readonly protocol: string = "maestro-plugin-v1";
  private messageCounter: number = 0;
  private connectingPromise?: Promise<boolean>;
  private nextRetryAt: number = 0;
  private retryDelayMs: number = 0;

  constructor(app: string, extensionCommandHandler: ExtensionCommandHandler) {
    this.app = app;
    this.extensionCommandHandler = extensionCommandHandler;
    this.id = app; // Two instances of chrome share the same service worker.
  }

  private nextMessageId(): string {
    this.messageCounter += 1;
    const short = uuidv4().replace(/-/g, "").slice(0, 6);
    return `arq_${Date.now()}_${this.messageCounter}_${short}`;
  }

  private toEnvelope(message: string, data: any) {
    return {
      id: this.nextMessageId(),
      timestamp: new Date().toISOString(),
      type: "message",
      version: "1.0",
      room: this.room,
      channel: this.channel,
      payload: {
        protocol: this.protocol,
        app: this.app,
        id: this.id,
        message,
        data,
      },
      metadata: {
        transport: "arqonbus",
      },
    };
  }

  private extractLegacyRequest(parsed: any): any {
    if (!parsed || typeof parsed != "object") {
      return null;
    }

    // Legacy plugin protocol message shape.
    if (typeof parsed.message == "string") {
      return parsed;
    }

    // ArqonBus envelope carrying legacy payload in `payload`.
    if (parsed.payload && typeof parsed.payload.message == "string") {
      return {
        message: parsed.payload.message,
        data: parsed.payload.data,
      };
    }

    return null;
  }

  private onClose() {
    this.connected = false;
    this.websocket = undefined;
    this.setIcon();
  }

  private async onMessage(message: any) {
    if (typeof message == "string") {
      let request;
      try {
        request = this.extractLegacyRequest(JSON.parse(message));
      } catch (e) {
        return;
      }

      if (!request) {
        return;
      }

      if (request.message == "response") {
        const result = await this.handle(request.data.response);
        if (result) {
          this.send("callback", {
            callback: request.data.callback,
            data: result,
          });
        }
      }
    }
  }

  private onOpen() {
    this.connected = true;
    this.retryDelayMs = 0;
    this.nextRetryAt = 0;
    this.sendActive();
    this.setIcon();
  }

  private scheduleRetry() {
    this.retryDelayMs = this.retryDelayMs === 0 ? 5000 : Math.min(this.retryDelayMs * 2, 60000);
    this.nextRetryAt = Date.now() + this.retryDelayMs;
  }

  private async probeAvailability(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      await fetch(this.probeUrl, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      return true;
    } catch (_error) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async openWebSocket(): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const socket = new WebSocket(this.url);
      const finish = (connected: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        if (!connected) {
          this.connected = false;
          this.websocket = undefined;
          this.setIcon();
        }
        resolve(connected);
      };

      const timeoutId = setTimeout(() => {
        try {
          socket.close();
        } catch (_error) {}
        finish(false);
      }, 3000);

      this.websocket = socket;

      socket.addEventListener("open", () => {
        clearTimeout(timeoutId);
        this.onOpen();
        finish(true);
      });

      socket.addEventListener("close", () => {
        clearTimeout(timeoutId);
        this.onClose();
        finish(false);
      });

      socket.addEventListener("error", () => {
        clearTimeout(timeoutId);
        try {
          socket.close();
        } catch (_error) {}
        finish(false);
      });

      socket.addEventListener("message", (event) => {
        this.onMessage(event.data);
      });
    });
  }

  async ensureConnection(force: boolean = false): Promise<boolean> {
    if (this.connected) {
      return true;
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    if (!force && Date.now() < this.nextRetryAt) {
      this.setIcon();
      return false;
    }

    this.connectingPromise = (async () => {
      const available = await this.probeAvailability();
      if (!available) {
        this.connected = false;
        this.websocket = undefined;
        this.scheduleRetry();
        this.setIcon();
        return false;
      }

      try {
        const connected = await this.openWebSocket();
        if (!connected) {
          this.scheduleRetry();
        }
        return connected;
      } catch (_error) {
        this.connected = false;
        this.websocket = undefined;
        this.scheduleRetry();
        this.setIcon();
        return false;
      } finally {
        this.connectingPromise = undefined;
      }
    })();

    return this.connectingPromise;
  }

  private async tab(): Promise<any> {
    const [result] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    return result;
  }

  private async sendMessageToContentScript(message: any): Promise<void> {
    let tab = await this.tab();
    const url = tab?.url || "";
    const isSupportedUrl = /^https?:\/\//.test(url);
    if (!tab?.id || !isSupportedUrl) {
      return;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab!.id!, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve(undefined);
          return;
        }
        resolve(response);
      });
    });
  }

  async handle(response: any): Promise<any> {
    let handlerResponse = null;
    if (response.execute) {
      for (const command of response.execute.commandsList) {
        if (command.type in (this.extensionCommandHandler as any)) {
          handlerResponse = await (this.extensionCommandHandler as any)[command.type](command);
        } else {
          handlerResponse = await this.sendMessageToContentScript({
            type: "injected-script-command-request",
            data: command,
          });
        }
      }
    }

    let result = {
      message: "completed",
      data: {},
    };

    if (handlerResponse) {
      result = { ...handlerResponse };
    }

    return result;
  }

  isConnected() {
    return this.connected;
  }

  sendActive() {
    this.send("active", {
      app: this.app,
      id: this.id,
    });
    this.setIcon();
  }

  sendHeartbeat() {
    this.send("heartbeat", {
      app: this.app,
      id: this.id,
    });
    this.setIcon();
  }

  send(message: string, data: any) {
    if (!this.connected || !this.websocket || this.websocket!.readyState != 1) {
      return false;
    }

    try {
      this.websocket!.send(JSON.stringify(this.toEnvelope(message, data)));
      return true;
    } catch (e) {
      this.connected = false;
      return false;
    }
  }

  setIcon() {
    const iconDir = this.isConnected() ? "icon_default" : "icon_disconnected";
    chrome.action.setIcon({
      path: {
        "16": `../img/${iconDir}/16x16.png`,
        "32": `../img/${iconDir}/32x32.png`,
        "48": `../img/${iconDir}/48x48.png`,
        "128": `../img/${iconDir}/128x128.png`,
      },
    });
  }
}
