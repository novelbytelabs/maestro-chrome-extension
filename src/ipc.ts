import { v4 as uuidv4 } from "uuid";
import ExtensionCommandHandler from "./extension-command-handler";

export default class IPC {
  private app: string;
  private extensionCommandHandler: ExtensionCommandHandler;
  private connected: boolean = false;
  private id: string = "";
  private websocket?: WebSocket;
  private url: string = "ws://localhost:9100/";
  private readonly room: string = "maestro";
  private readonly channel: string = "plugin.chrome";
  private readonly protocol: string = "maestro-plugin-v1";
  private messageCounter: number = 0;

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
    this.sendActive();
    this.setIcon();
  }

  async ensureConnection(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(this.url);

        this.websocket.addEventListener("open", () => {
          this.onOpen();
          resolve();
        });

        this.websocket.addEventListener("close", () => {
          this.onClose();
        });

        this.websocket.addEventListener("message", (event) => {
          this.onMessage(event.data);
        });
      } catch (e) {
        console.error(e);
        this.connected = false;
        this.setIcon();
      }
    });
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
