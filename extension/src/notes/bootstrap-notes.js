// Bootstraps sticky notes + provider init, no edits to your existing scripts.
(async () => {
  const [{ NotesController, defaultToPageCoords }, storage] = await Promise.all([
    import(chrome.runtime.getURL('src/notes/notesController.js')),
    import(chrome.runtime.getURL('src/persist/storage.js'))
  ]);

  await storage.initProviderFromPrefs(); // default local; respects prior choice

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
    const canvases = Array.from(document.querySelectorAll('canvas'))
      .map(c => c.closest('div')).filter(Boolean);
    return canvases;
  }

  function getPageIndex(el) {
    const attr = el.getAttribute('data-page-number') ?? el.getAttribute('data-page-index');
    if (attr != null) {
      return parseInt(attr, 10) - (el.hasAttribute('data-page-number') ? 1 : 0);
    }
    return getPageContainers().indexOf(el);
  }

  const ctrl = new NotesController({
    getPageContainers,
    getPageIndex,
    toPageCoords: (client, pageEl) => defaultToPageCoords(client, pageEl),
  });
  await ctrl.init();

  // dev helpers
  window.SR_NOTES = ctrl;
  window.SR_NOTES_USE_SYNC = async (on) => (await storage.__dev_setSync(!!on));
})();

