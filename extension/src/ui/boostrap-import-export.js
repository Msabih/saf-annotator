import { exportCurrentUrlBundle, importCurrentUrlBundle } from '../persist/exporter.js';

(function () {
  const root = document.createElement('div');
  root.className = 'sr-import-export';
  root.innerHTML = `
    <button data-act="export">Export notes (JSON)</button>
    <label class="sr-imp-label">
      <input type="file" accept="application/json" hidden />
      <span>Import notes (JSON)</span>
    </label>
  `;
  document.documentElement.appendChild(root);

  root.addEventListener('click', async (e) => {
    const act = e.target?.dataset?.act;
    if (act === 'export') {
      try { await exportCurrentUrlBundle(); } catch (err) { console.error(err); }
    }
  });

  const fileInput = root.querySelector('input[type="file"]');
  root.querySelector('.sr-imp-label').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const res = await importCurrentUrlBundle(f);
      console.info('Imported', res);
      alert(`Imported: ${res.notes} notes, ${res.scenes} boards`);
      location.reload(); // simplest: reload to mount any new virtual pages
    } catch (err) {
      console.error(err);
      alert('Import failed: ' + (err?.message || err));
    } finally {
      fileInput.value = '';
    }
  });

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    .sr-import-export {
      position: fixed;
      left: 12px;
      bottom: 56px; /* above virtual controls */
      z-index: 2147483644;
      display: flex; gap: 8px;
      font: 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .sr-import-export button,
    .sr-import-export .sr-imp-label span {
      padding: 6px 10px;
      border: 1px solid rgba(0,0,0,.2);
      border-radius: 8px;
      background: #fff; cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,.08);
      display: inline-block;
    }
    .sr-import-export button:hover,
    .sr-import-export .sr-imp-label span:hover { background: #f7f7f7; }
  `;
  document.documentElement.appendChild(style);
})();

