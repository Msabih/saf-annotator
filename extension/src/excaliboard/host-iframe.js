import { loadScene, saveScene } from './sceneStore.js';

export class ExcalidrawIframeHost {
  /**
   * @param {HTMLElement} container the virtual page container
   * @param {string} pageUuid the virtual page UUID
   */
  constructor(container, pageUuid) {
    this.container = container;
    this.pageUuid = pageUuid;
    this.iframe = document.createElement('iframe');
    this.iframe.className = 'sr-ex-iframe';
    this.iframe.src = chrome.runtime.getURL('excalidraw_host.html');
    this.iframe.allow = 'clipboard-write';
    this.iframe.setAttribute('referrerpolicy', 'no-referrer');
    Object.assign(this.iframe.style, {
      width: '100%',
      border: '0',
      display: 'block',
      background: 'transparent'
    });
    this.container.appendChild(this.iframe);

    this._onMsg = (ev) => this._handleMessage(ev);
    window.addEventListener('message', this._onMsg);

    this.iframe.addEventListener('load', async () => {
      const scene = loadScene(this.pageUuid) || null;
      this.postToChild({ type: 'init', pageUuid: this.pageUuid, scene });
      // focus it so keyboard shortcuts work
      this.postToChild({ type: 'focus' });
    });
  }

  postToChild(payload) {
    this.iframe.contentWindow?.postMessage({ __sr: true, ...payload }, window.location.origin);
  }

  _handleMessage(ev) {
    const msg = ev.data;
    if (!msg || msg.__sr !== true) return;
    if (msg.type === 'scene:changed' && msg.pageUuid === this.pageUuid) {
      saveScene(this.pageUuid, msg.scene);
    } else if (msg.type === 'height' && msg.pageUuid === this.pageUuid) {
      const h = Math.max(400, Math.ceil(msg.height));
      this.iframe.style.height = h + 'px';
    }
  }

  destroy() {
    window.removeEventListener('message', this._onMsg);
    this.iframe?.remove();
  }
}

