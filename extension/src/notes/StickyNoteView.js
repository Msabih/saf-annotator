// Vanilla DOM "component" for a note box (draggable + editable)

export class StickyNoteView {
  /**
   * @param {HTMLElement} host page container (position: relative)
   * @param {object} note  {id,page,x,y,w,h,text,color,resolved}
   * @param {object} opts  {onChange, onDelete}
   */
  constructor(host, note, opts = {}) {
    this.host = host;
    this.note = note;
    this.onChange = opts.onChange || (() => {});
    this.onDelete = opts.onDelete || (() => {});

    this.el = document.createElement('div');
    this.el.className = 'sr-note';
    this.el.style.left = note.x + 'px';
    this.el.style.top = note.y + 'px';
    this.el.style.width = note.w + 'px';
    this.el.style.height = note.h + 'px';
    this.el.style.backgroundColor = note.color;

    // header
    const header = document.createElement('div');
    header.className = 'sr-note__header';
    header.innerHTML = `
      <span class="sr-note__drag-handle" title="Drag">⋮⋮</span>
      <span class="sr-note__status">${note.resolved ? 'Resolved' : 'Note'}</span>
      <button class="sr-note__resolve">${note.resolved ? 'Reopen' : 'Resolve'}</button>
      <button class="sr-note__delete" title="Delete">✕</button>
    `;

    // body
    const body = document.createElement('textarea');
    body.className = 'sr-note__body';
    body.value = note.text || '';

    this.el.appendChild(header);
    this.el.appendChild(body);
    host.appendChild(this.el);

    // drag
    let dragging = false, startX = 0, startY = 0, baseL = 0, baseT = 0;
    header.querySelector('.sr-note__drag-handle').addEventListener('pointerdown', (e) => {
      dragging = true;
      this.el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      const r = this.el.getBoundingClientRect();
      const hostR = this.host.getBoundingClientRect();
      baseL = r.left - hostR.left; baseT = r.top - hostR.top;
      e.preventDefault();
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const nx = baseL + (e.clientX - startX);
      const ny = baseT + (e.clientY - startY);
      this.el.style.left = nx + 'px';
      this.el.style.top = ny + 'px';
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      this.el.releasePointerCapture(e.pointerId);
      const nx = parseFloat(this.el.style.left);
      const ny = parseFloat(this.el.style.top);
      this.note.x = nx; this.note.y = ny;
      this.note.updatedAt = Date.now();
      this.onChange({ ...this.note });
    };
    this.el.addEventListener('pointerup', endDrag);
    this.el.addEventListener('pointercancel', endDrag);

    // text change (debounced)
    let tId = null;
    body.addEventListener('input', () => {
      clearTimeout(tId);
      tId = setTimeout(() => {
        this.note.text = body.value;
        this.note.updatedAt = Date.now();
        this.onChange({ ...this.note });
      }, 300);
    });

    // resolve toggle
    header.querySelector('.sr-note__resolve').addEventListener('click', () => {
      this.note.resolved = !this.note.resolved;
      header.querySelector('.sr-note__status').textContent = this.note.resolved ? 'Resolved' : 'Note';
      header.querySelector('.sr-note__resolve').textContent = this.note.resolved ? 'Reopen' : 'Resolve';
      this.note.updatedAt = Date.now();
      this.onChange({ ...this.note });
    });

    // delete
    header.querySelector('.sr-note__delete').addEventListener('click', () => {
      this.onDelete(this.note.id);
      this.destroy();
    });

    // resize (corner)
    const resizer = document.createElement('div');
    resizer.className = 'sr-note__resizer';
    this.el.appendChild(resizer);
    let resizing = false, rsx = 0, rsy = 0, baseW = 0, baseH = 0;
    resizer.addEventListener('pointerdown', (e) => {
      resizing = true;
      this.el.setPointerCapture(e.pointerId);
      rsx = e.clientX; rsy = e.clientY;
      baseW = this.el.offsetWidth; baseH = this.el.offsetHeight;
      e.preventDefault();
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      const nw = Math.max(160, baseW + (e.clientX - rsx));
      const nh = Math.max(120, baseH + (e.clientY - rsy));
      this.el.style.width = nw + 'px';
      this.el.style.height = nh + 'px';
    });
    const endResize = (e) => {
      if (!resizing) return;
      resizing = false;
      this.el.releasePointerCapture(e.pointerId);
      this.note.w = this.el.offsetWidth;
      this.note.h = this.el.offsetHeight;
      this.note.updatedAt = Date.now();
      this.onChange({ ...this.note });
    };
    this.el.addEventListener('pointerup', endResize);
    this.el.addEventListener('pointercancel', endResize);
  }

  destroy() {
    this.el?.remove();
  }
}

