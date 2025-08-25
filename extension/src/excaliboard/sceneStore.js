// Persist scene JSON per URL + virtual page UUID.
// Kept separate so we can swap to Chrome Sync / Drive later.

import { urlKeyFromLocation } from '../notes/notesSchema.js';

const KEY = 'sr-excali-scenes';

function getAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function setAll(obj) {
  try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {}
}

export function loadScene(pageUuid, urlKey = urlKeyFromLocation()) {
  const all = getAll();
  return all[urlKey]?.[pageUuid] || null;
}
export function saveScene(pageUuid, sceneJson, urlKey = urlKeyFromLocation()) {
  const all = getAll();
  all[urlKey] ||= {};
  all[urlKey][pageUuid] = sceneJson;
  setAll(all);
}
export function deleteScene(pageUuid, urlKey = urlKeyFromLocation()) {
  const all = getAll();
  if (all[urlKey]) {
    delete all[urlKey][pageUuid];
    setAll(all);
  }
}

