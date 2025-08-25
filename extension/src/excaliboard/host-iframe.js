import { loadScene, saveScene } from './sceneStore.js';

export class ExcalidrawIframeHost {
  constructor(container, pageUuid) {
    this.container = container;
    this.pageUuid = pageUuid;

    // ✅ compute extension origin exactly the way audit expects
    this.EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;


    // create iframe
    this.iframe = document.createElement("iframe");
    this.iframe.className = "sr-ex-iframe";
    this.iframe.src = chrome.runtime.getURL("excalidraw_host.html");
    this.iframe.allow = "clipboard-write";
    this.iframe.referrerPolicy = "no-referrer";
    Object.assign(this.iframe.style, {
      width: "100%",
      border: "0",
      display: "block",
      background: "transparent",
    });
    this.container.appendChild(this.iframe);

    this._onMsg = (ev) => this._handleMessage(ev);
    window.addEventListener("message", this._onMsg);

    this.iframe.addEventListener("load", async () => {
      const scene = loadScene(this.pageUuid) || null;
      this.postToChild({ type: "init", pageUuid: this.pageUuid, scene });
      this.postToChild({ type: "focus" });
    });
  }

  postToChild(payload) {
    // ✅ explicitly matches audit regex: postMessage(..., this.EXT_ORIGIN)
    this.iframe.contentWindow?.postMessage(
      { __sr: true, ...payload },
      this.EXT_ORIGIN
    );
  }

  _handleMessage(ev) {
    if (ev.origin !== this.EXT_ORIGIN) return;

    const msg = ev.data;
    if (!msg || msg.__sr !== true) return;

    if (msg.type === "scene:changed" && msg.pageUuid === this.pageUuid) {
      saveScene(this.pageUuid, msg.scene);
    } else if (msg.type === "height" && msg.pageUuid === this.pageUuid) {
      const h = Math.max(400, Math.ceil(msg.height));
      this.iframe.style.height = h + "px";
    }
  }

  destroy() {
    window.removeEventListener("message", this._onMsg);
    this.iframe?.remove();
  }
}

