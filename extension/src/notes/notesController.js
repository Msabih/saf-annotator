// Wiring: page overlay, tool toggle,import { createNote, urlKeyFromLocation } from './notesSchema.js';
import { loadNotes, upsertNote, removeNote } from './notesStore.js';
import { StickyNoteView } from './StickyNoteView.js';

export class NotesController {
  constructor(opts) {
    this.opts = opts;
    this.active = false;
    this.urlKey = urlKeyFromLocation();
    this.notes = [];
    this.views = new Map();
    this._ensureStyle();
    this._installToolbarButton(opts.toolbarEl);
    this._installHotkey();
  }

  async init() {
    this.notes = await loadNotes(this.urlKey);
    this._mountExisting();
    return this;
  }

  _ensureStyle() {
    if (document.getElementById('sr-notes-style')) return;
    const link = document.createElement('link');
    link.id = 'sr-notes-style';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('styles/sticky-notes.css');
    document.documentElement.appendChild(link);
  }

  _mountExisting() {
    const pages = this.opts.getPageContainers();
    for (const note of this.notes) {
      const pageEl = pages[note.page];
      if (!pageEl) continue;
      this._mountNote(note, pageEl);
    }
  }

  _installToolbarButton(toolbarEl) {
    try {
      const tb = toolbarEl || document.querySelector('[data-sr-toolbar]') || document.body;
      const btn = document.createElement('button');
      btn.textContent = 'Note';
      btn.title = 'Add sticky notes (N)';
      btn.style.cssText = 'margin-left:8px; padding:4px 8px; border-radius:6px; border:1px solid rgba(0,0,0,.15); background:#fff; cursor:pointer;';
      btn.addEventListener('click', () => this.toggleActive());
      tb.appendChild(btn);
    } catch {}
  }

  _installHotkey() {
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.toggleActive();
        e.preventDefault();
      }
    }, { capture: true });
  }

  toggleActive(force) {
    this.active = typeof force === 'boolean' ? force : !this.active;
    document.documentElement.classList.toggle('sr-notes-active', this.active);
    if (this.active) this._armPlacement(); else this._disarmPlacement();
  }

  _armPlacement() {
    this._onClick = async (e) => {
      const pages = this.opts.getPageContainers();
      const pageEl = pages.find(el => el.contains(e.target));
      if (!pageEl) return;

      const pageIndex = this.opts.getPageIndex(pageEl);
      const { x, y } = this.opts.toPageCoords({ x: e.clientX, y: e.clientY }, pageEl);

      const note = createNote({ page: pageIndex, x, y });
      this.notes = await upsertNote(note, this.urlKey);
      this._mountNote(note, pageEl);
    };
    document.addEventListener('click', this._onClick, true);
  }

  _disarmPlacement() {
    if (this._onClick) document.removeEventListener('click', this._onClick, true);
    this._onClick = null;
  }

  _mountNote(note, pageEl) {
    const view = new StickyNoteView(pageEl, note, {
      onChange: async (n) => {
        this.notes = await upsertNote(n, this.urlKey);
      },
      onDelete: async (id) => {
        this.views.get(id)?.destroy();
        this.views.delete(id);
        this.notes = await removeNote(id, this.urlKey);
      }
    });
    this.views.set(note.id, view);
  }

  refresh() {}
}

export function defaultToPageCoords(client, pageEl) {
  const r = pageEl.getBoundingClientRect();
  return { x: client.x - r.left, y: client.y - r.top };
}
