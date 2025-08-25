// Virtual page order + helpers. Keeps a mixed list of real pdf pages and virtual pages.

const VP_ATTR = 'data-sr-virtual-page'; // attribute on the virtual page container

export class VirtualPager {
  constructor(opts) {
    this.opts = opts;
    // Example pageOrder: [{type:'pdf', index:0}, ..., {type:'virtual', uuid:'ex-123'}]
    this.pageOrder = [];
    this._loadFromDom(); // best effort on reload
  }

  // Discover existing real pages to seed pageOrder
  _discoverRealPages() {
    const pages = this.opts.getPageContainers();
    return pages.map((_, i) => ({ type: 'pdf', index: i }));
  }

  _loadFromDom() {
    // Rebuild order: interleave pdf pages and any existing virtual markers
    const real = this._discoverRealPages();
    // Scan between real pages for our virtual nodes
    const pages = this.opts.getPageContainers();
    const order = [];
    for (let i = 0; i < real.length; i++) {
      order.push({ type: 'pdf', index: i });
      // Any virtual pages that are direct siblings after this pdf page?
      const pdfEl = pages[i];
      const nextSiblings = [];
      let n = pdfEl.nextElementSibling;
      while (n && !pages.includes(n)) { // walk until the next real pdf page
        if (n.hasAttribute?.(VP_ATTR)) {
          nextSiblings.push({ type: 'virtual', uuid: n.getAttribute(VP_ATTR) });
        }
        n = n.nextElementSibling;
      }
      order.push(...nextSiblings);
    }
    this.pageOrder = order.length ? order : real;
  }

  getOrder() { return this.pageOrder.slice(); }

  insertVirtualAfter(pdfPageIndex, uuid = crypto.randomUUID()) {
    const pages = this.opts.getPageContainers();
    const anchor = pages[pdfPageIndex];
    if (!anchor) throw new Error('Invalid pdfPageIndex');

    // Create container
    const vp = document.createElement('div');
    vp.setAttribute(VP_ATTR, uuid);
    vp.className = 'sr-virtual-page';
    // Insert after anchor (before next real page)
    anchor.parentElement.insertBefore(vp, anchor.nextSibling);

    // Update order immediately after the matching pdf page in current order array
    const idxInOrder = this.pageOrder.findIndex(e => e.type === 'pdf' && e.index === pdfPageIndex);
    const insertAt = idxInOrder >= 0 ? idxInOrder + 1 : this.pageOrder.length;
    this.pageOrder.splice(insertAt, 0, { type: 'virtual', uuid });

    return { uuid, el: vp };
  }

  removeVirtual(uuid) {
    const node = document.querySelector(`[${VP_ATTR}="${uuid}"]`);
    if (node) node.remove();
    this.pageOrder = this.pageOrder.filter(p => !(p.type === 'virtual' && p.uuid === uuid));
  }

  // Find or create the DOM element for a virtual page entry in pageOrder
  ensureVirtualElement(uuid, pdfLikeForSizing) {
    let el = document.querySelector(`[${VP_ATTR}="${uuid}"]`);
    if (!el) {
      el = document.createElement('div');
      el.setAttribute(VP_ATTR, uuid);
      el.className = 'sr-virtual-page';
      // place it after the provided sizing element (a pdf page)
      pdfLikeForSizing.parentElement.insertBefore(el, pdfLikeForSizing.nextSibling);
    }
    return el;
  }
}

