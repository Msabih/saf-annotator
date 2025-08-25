// Bootstraps Fast Ink overlay without changing your existing draw tool.
// Toggle with the injected button or hotkey "F".

import { FastInk } from './fastInk.js';

(function () {
  const state = {
    enabled: true,
    color: '#000000',
    width: 2.0,
    perPage: new Map(), // pageEl -> FastInk
    active: null        // {ink, pageEl, pointerId}
  };

  function getPageContainers() {
    const candidates = [
      '.sr-page',
      '.scholar-reader-page',
      '.pdfViewer .page',
      'div[data-page-number]',
      '.page', '.pdf-page', 'canvas.page'
    ];
    for (const sel of candidates) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length) return nodes;
    }
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => c.parentElement).filter(Boolean);
    return canvases;
  }

  function ensureInks() {
    for (const el of getPageContainers()) {
      if (!state.perPage.has(el)) {
        el.style.position ||= 'relative';
        state.perPage.set(el, new FastInk(el, { color: state.color, width: state.width }));
      }
    }
  }

  function cleanupInks() {
    for (const [el, ink] of state.perPage) {
      if (!document.contains(el)) {
        ink.destroy();
        state.perPage.delete(el);
      }
    }
  }

  function findPageFromTarget(tgt) {
    return getPageContainers().find(el => el.contains(tgt));
  }

  function toPageCoords(e, pageEl) {
    const r = pageEl.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function addFromEvent(e) {
    const a = state.active;
    if (!a) return;
    const evs = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : [e];
    const pts = evs.map(ev => {
      const { x, y } = toPageCoords(ev, a.pageEl);
      return { x, y, p: ev.pressure ?? 0.5 };
    });
    a.ink.add(pts);
  }

  function onPointerDown(e) {
    if (!state.enabled) return;
    if (e.button !== 0) return;
    if (e.pointerType !== 'pen' && !e.shiftKey) return;

    const pageEl = findPageFromTarget(e.target);
    if (!pageEl) return;

    ensureInks();
    const ink = state.perPage.get(pageEl);
    if (!ink) return;

    e.target.setPointerCapture?.(e.pointerId);
    state.active = { ink, pageEl, pointerId: e.pointerId };
    const { x, y } = toPageCoords(e, pageEl);
    ink.start(x, y, e.pressure ?? 0.5);
  }

  function onPointerMove(e) {
    if (!state.enabled || !state.active) return;
    addFromEvent(e);
  }
  function onPointerRawUpdate(e) {
    if (!state.enabled || !state.active) return;
    addFromEvent(e);
  }
  function onPointerUp(e) {
    const a = state.active;
    if (!a || e.pointerId !== a.pointerId) return;
    a.ink.clear();              // clear preview; your real tool keeps its stroke
    state.active = null;
  }

  function onResize() {
    for (const ink of state.perPage.values()) ink.resizeToPage();
  }

  function installListeners() {
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('pointerrawupdate', onPointerRawUpdate, true);
    window.addEventListener('resize', onResize);
    new MutationObserver(() => { ensureInks(); cleanupInks(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  }

  function toggleEnabled(force) {
    state.enabled = typeof force === 'boolean' ? force : !state.enabled;
    document.documentElement.classList.toggle('sr-fast-ink-enabled', state.enabled);
    inkBtn && (inkBtn.dataset.active = state.enabled ? '1' : '0');
    if (state.enabled) ensureInks();
  }

  // UI button + hotkey
  let inkBtn = null;
  function injectButton() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/ink.css');
    document.documentElement.appendChild(link);

    inkBtn = document.createElement('button');
    inkBtn.className = 'sr-fast-ink-btn';
    inkBtn.textContent = 'Fast Ink';
    inkBtn.title = 'Realtime ink preview (F to toggle). Hold Shift to draw with mouse.';
    inkBtn.addEventListener('click', () => toggleEnabled());
    document.documentElement.appendChild(inkBtn);
    toggleEnabled(true);
  }
  function installHotkey() {
    window.addEventListener('keydown', (e) => {
      if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'f' || e.key === 'F')) {
        toggleEnabled();
        e.preventDefault();
      }
    }, { capture: true });
  }

  // Boot
  installListeners();
  injectButton();
  installHotkey();

  // Dev hook
  window.SR_FAST_INK = { toggleEnabled, state };
})();

