// Helper to create a virtual page container if it doesn't exist yet.
// Places it after the most visible real PDF page.

export function getPageContainers() {
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

export function ensureVirtualForUuid(uuid) {
  const VP_ATTR = 'data-sr-virtual-page';
  let el = document.querySelector(`[${VP_ATTR}="${uuid}"]`);
  if (el) return el;

  const pages = getPageContainers();
  if (!pages.length) return null;

  // Pick the most-centered page in viewport as anchor
  const mid = window.scrollY + innerHeight / 2;
  let bestIdx = 0, bestDist = Infinity;
  pages.forEach((p, i) => {
    const r = p.getBoundingClientRect();
    const center = (r.top + r.bottom) / 2 + window.scrollY;
    const d = Math.abs(center - mid);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  });

  const anchor = pages[bestIdx];
  el = document.createElement('div');
  el.setAttribute(VP_ATTR, uuid);
  el.className = 'sr-virtual-page';
  anchor.parentElement.insertBefore(el, anchor.nextSibling);

  // If the Excalidraw host bootstrap is present, it will detect/mount automatically on load.
  return el;
}

