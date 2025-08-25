// Provider selector + interface (async).
// Default = LocalProvider. Toggle with window.SR_NOTES_USE_SYNC(true/false).

let _provider = null;

export function currentProvider() {
  if (_provider) return _provider;
  // Lazy init as Local by default
  _provider = new LocalProvider();
  return _provider;
}

export async function setProviderByName(name) {
  if (name === 'sync') _provider = new ChromeSyncProvider();
  else _provider = new LocalProvider();
  // persist choice for future sessions
  await chrome.storage?.local?.set?.({ 'sr-notes-provider': name || 'local' }).catch(() => {});
  return _provider;
}

export async function initProviderFromPrefs() {
  try {
    const { ['sr-notes-provider']: name } = await chrome.storage?.local?.get?.('sr-notes-provider');
    await setProviderByName(name || 'local');
  } catch {
    _provider = new LocalProvider();
  }
  return _provider;
}

/* -------- Providers -------- */

export class LocalProvider {
  _key(urlKey) { return 'sr-notes:' + urlKey; }
  async getNotes(urlKey) {
    try {
      const raw = localStorage.getItem(this._key(urlKey));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  async setNotes(urlKey, notes) {
    localStorage.setItem(this._key(urlKey), JSON.stringify(notes));
  }
}

export class ChromeSyncProvider {
  _key(urlKey) { return 'sr-notes:' + urlKey; }
  async getNotes(urlKey) {
    try {
      const obj = await chrome.storage.sync.get(this._key(urlKey));
      return obj[this._key(urlKey)] || [];
    } catch { return []; }
  }
  async setNotes(urlKey, notes) {
    // NOTE: No compression/chunking here; fine for typical note sizes.
    await chrome.storage.sync.set({ [this._key(urlKey)]: notes });
  }
}

// Convenience toggle from DevTools / future settings UI:
export async function __dev_setSync(enabled) {
  return setProviderByName(enabled ? 'sync' : 'local');
}

