import { loadScene, saveScene } from './sceneStore.js';

export class LiteBoard {
  constructor(containerEl, { pageUuid }) {
    this.container = containerEl;
    this.pageUuid = pageUuid;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sr-ex-lite-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.scene = loadScene(pageUuid) || { type: 'lite-scene', version: 1, strokes: [] };
    this.active = null;

    this._mount();
    this._renderAll();
  }

  _mount() {
    // toolbar (minimal)
    const bar = document.createElement('div');
    bar.className = 'sr-ex-lite-toolbar';
    bar.innerHTML = `
      <button data-act="pen">Pen</button>
      <button data-act="clear">Clear</button>
      <span class="sr-ex-lite-tip">This is a placeholder board. Excalidraw will replace this in the next step.</span>
    `;
    this.container.appendChild(bar);

    // canvas sizing
    this.container.appendChild(this.canvas);
    this._resizeToContainer();
    new ResizeObserver(() => this._resizeToContainer()).observe(this.container);

    // events
    bar.addEventListener('click', (e) => {
      const a = e.target?.dataset?.act;
      if (a === 'clear') { this.scene.strokes = []; this._rerenderAndSave(); }
    });
    this.canvas.addEventListener('pointerdown', (e) => this._onDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onMove(e));
    this.canvas.addEventListener('pointerup', (e) => this._onUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this._onUp(e));
  }

  _resizeToContainer() {
    const r = this.container.getBoundingClientRect();
    const dpr = Math.max(1, devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    Object.assign(this.canvas.style, { width: r.width + 'px', height: r.height + 'px' });
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._renderAll();
  }

  _toLocal(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure ?? 0.5 };
    }

  _onDown(e) {
    if (e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    const pt = this._toLocal(e);
    this.active = { color: '#111', width: 2, points: [pt] };
    this._strokePreview(this.active);
  }
  _onMove(e) {
    if (!this.active) return;
    const events = (this.canvas.getCoalescedEvents ? e.getCoalescedEvents() : [e]);
    for (const ev of events) this.active.points.push(this._toLocal(ev));
    this._strokePreview(this.active);
  }
  _onUp(e) {
    if (!this.active) return;
    this.canvas.releasePointerCapture?.(e.pointerId);
    // commit
    this.scene.strokes.push(this.active);
    this.active = null;
    this._rerenderAndSave();
  }

  _strokePreview(stroke) {
    // redraw entire canvas for simplicity
    this._clear();
    this._renderAll();
    this._drawStroke(stroke);
  }

  _rerenderAndSave() {
    this._clear();
    this._renderAll();
    saveScene(this.pageUuid, this.scene);
  }

  _clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    // background like a paper page
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _renderAll() {
    for (const s of this.scene.strokes) this._drawStroke(s);
  }

  _drawStroke(s) {
    const ctx = this.ctx;
    if (!s.points?.length) return;
    ctx.strokeStyle = s.color || '#111';
    ctx.lineWidth = s.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const p = s.points[i];
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

