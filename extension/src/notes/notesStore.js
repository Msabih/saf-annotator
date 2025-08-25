// Storage for sticky notes (backed by localStorage for now).
// You can later swap these to your provider abstraction.

import { urlKeyFromLocation } from './notesSchema.js';

const KEY_PREFIX = 'sr-notes:';

function keyFor(urlKey) {
  return KEY_PREFIX + urlKey;
}

export function loadNotes(urlKey = urlKeyFromLocation()) {
  try {
    const raw = localStorage.getItem(keyFor(urlKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes, urlKey = urlKeyFromLocation()) {
  try {
    localStorage.setItem(keyFor(urlKey), JSON.stringify(notes));
  } catch {
    // swallow quota errors etc.
  }
}

export function upsertNote(note, urlKey = urlKeyFromLocation()) {
  const notes = loadNotes(urlKey);
  const ix = notes.findIndex(n => n.id === note.id);
  if (ix >= 0) {
    notes[ix] = { ...notes[ix], ...note, updatedAt: Date.now() };
  } else {
    notes.push(note);
  }
  saveNotes(notes, urlKey);
  return notes;
}

export function removeNote(id, urlKey = urlKeyFromLocation()) {
  const notes = loadNotes(urlKey).filter(n => n.id !== id);
  saveNotes(notes, urlKey);
  return notes;
}

