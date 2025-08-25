// Export/import for the current URL.
// Collects sticky notes and virtual-page scenes into a single JSON file.

import { urlKeyFromLocation } from '../notes/notesSchema.js';
import { loadNotes, saveNotes } from '../notes/notesStore.js';
import { makeEmptyBundle, migrateBundle } from './schema.js';
import { loadScene, saveScene } from '../excaliboard/sceneStore.js';

const VP_SELECTOR = '[data-sr-virtual-page]';

export async function exportCurrentUrlBundle() {
  const urlKey = urlKeyFromLocation();
  const bundle = makeEmptyBundle(urlKey);

  // 1) Sticky notes (type: "note") already included in your annotations store model for notes.
  bundle.annotations = await loadNotes(urlKey);

  // 2) Excalidraw scenes for each virtual page present in DOM.
  const virtualEls = Array.from(document.querySelectorAll(VP_SELECTOR));
  for (const el of virtualEls) {
    const uuid = el.getAttribute('data-sr-virtual-page');
    const scene = loadScene(uuid, urlKey);
    if (scene) bundle.excaliScenes[uuid] = scene;
  }

  // Download
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.download = 'scholar-notes.json';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function importCurrentUrlBundle(fileOrJson) {
  let data = null;
  if (fileOrJson instanceof File) {
    data = JSON.parse(await fileOrJson.text());
  } else if (typeof fileOrJson === 'string') {
    data = JSON.parse(fileOrJson);
  } else {
    data = fileOrJson;
  }

  const bundle = migrateBundle(data);
  if (!bundle) throw new Error('Unsupported or invalid bundle');

  const urlKey = urlKeyFromLocation();

  // 1) Merge notes (same id -> update; new id -> add)
  const existing = await loadNotes(urlKey);
  const byId = new Map(existing.map(n => [n.id, n]));
  for (const n of bundle.annotations) {
    const prev = byId.get(n.id);
    if (!prev || (n.updatedAt || 0) > (prev.updatedAt || 0)) {
      byId.set(n.id, n);
    }
  }
  const merged = Array.from(byId.values());
  await saveNotes(merged, urlKey);

  // 2) Ensure virtual pages exist for each scene and save the scenes
  const { ensureVirtualForUuid } = await import('../excaliboard/utils-ensure-virtual.js');
  for (const [uuid, scene] of Object.entries(bundle.excaliScenes || {})) {
    ensureVirtualForUuid(uuid); // creates DOM container if missing (right after last visible page)
    saveScene(uuid, scene, urlKey);
  }

  return { notes: merged.length, scenes: Object.keys(bundle.excaliScenes || {}).length };
}

