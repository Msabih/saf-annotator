// Minimal shared types + helpers for sticky notes

export function createNote({ page, x, y, color = '#ffd666' }) {
  return {
    id: crypto.randomUUID(),
    type: 'note',
    page,               // PDF page index (0-based)
    x, y,               // top-left (page viewport coords, CSS pixels)
    w: 240, h: 160,     // default size (CSS px)
    text: '',
    color,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    resolved: false
  };
}

// Simple stable key for current PDF URL (ignores hash/query noise)
export function urlKeyFromLocation(loc = location) {
  const u = new URL(loc.href);
  u.hash = '';
  // keep path + origin; strip transient query params
  u.search = '';
  return u.toString();
}

