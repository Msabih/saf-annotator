import { VirtualPager } from '../pager/virtualPages.js';
import { ExcalidrawIframeHost } from './host-iframe.js';
import { deleteScene } from './sceneStore.js';

(function () {
  const state = { pager: null, boards: new Map() }; // uuid -> host

  function getPageContainers() {
    const candidates = [
      '.sr-page',
      '.scholar-reader-page',
      '.pdfViewer .page',
      'div[data-page-number]',
      '.page', '.pdf-page'
    ];
    for (const sel of candidates) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length) return nodes;
    }
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => c.parentElement).filter(Boolean);
    return canvases;
  }

  function getPager() {
    if (!state.pager) state.pager = new VirtualPager({ getPageContainers });
    return state.pager;
  }

  function injectUi() {
    const btnBar = document.createElement('div');
    btnBar.className = 'sr-virtual-controls';
    btnBar.innerHTML = `
      <button data-act="add">+ Blank page</button>
      <button data-act="del">Delete blank page</button>
    `;
    document.documentElement.appendChild(btnBar);

    btnBar.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act;
      const pager = getPager();
      const pages = getPageContainers();
      if (!pages.length) return;

      if (act === 'add') {
        const mid = window.scrollY + innerHeight / 2;
        let bestIdx = 0, bestDist = Infinity;
        pages.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const top = r.top + window.scrollY, bottom = r.bottom + window.scrollY;
          const center = (top + bottom) / 2;
          const d = Math.abs(center - mid);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        const { uuid, el } = pager.insertVirtualAfter(bestIdx);
        mountHost(el, uuid);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (act === 'del') {
        const allV = Array.from(document.querySelectorAll('[data-sr-virtual-page]'));
        if (!allV.length) return;
        const mid = window.scrollY + innerHeight / 2;
        let bestEl = allV[0], bestDist = Infinity;
        for (const el of allV) {
          const r = el.getBoundingClientRect();
          const center = (r.top + r.bottom) / 2 + window.scrollY;
          const d = Math.abs(center - mid);
          if (d < bestDist) { bestDist = d; bestEl = el; }
        }
        const uuid = bestEl.getAttribute('data-sr-virtual-page');
        unmountHost(uuid);
        deleteScene(uuid);
        pager.removeVirtual(uuid);
      }
    });
  }

  function mountHost(container, uuid) {
    container.classList.add('sr-virtual-page');
    const host = new ExcalidrawIframeHost(container, uuid);
    state.boards.set(uuid, host);
  }

  function unmountHost(uuid) {
    const host = state.boards.get(uuid);
    host?.destroy?.();
    const el = document.querySelector(`[data-sr-virtual-page="${uuid}"]`);
    el?.remove();
    state.boards.delete(uuid);
  }

  function boot() {
    // CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/virtual-pages.css');
    document.documentElement.appendChild(link);

    injectUi();
    getPager();
    for (const el of document.querySelectorAll('[data-sr-virtual-page]')) {
      const uuid = el.getAttribute('data-sr-virtual-page');
      mountHost(el, uuid);
    }
  }

  boot();
})();
ne, saveScene } from './sceneStore.js';
