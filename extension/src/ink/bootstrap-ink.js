// Bootstraps Fast Ink overlay (MV3-safe dynamic import)
(async () => {
  const { FastInk } = await import(chrome.runtime.getURL('src/ink/fastInk.js'));

  const state = {
    enabled: true, color: '#000000', width: 2.0,
    perPage: new Map(), active: null
  };

  function getPageContainers() {
    const sels = ['.sr-page','.scholar-reader-page','.pdfViewer .page','div[data-page-number]','.page','.pdf-page','canvas.page'];
    for (const sel of sels) { const a=[...document.querySelectorAll(sel)]; if (a.length) return a; }
    return [...document.querySelectorAll('canvas')].map(c=>c.parentElement).filter(Boolean);
  }
  function ensureInks() {
    for (const el of getPageContainers()) if (!state.perPage.has(el)) {
      el.style.position ||= 'relative';
      state.perPage.set(el, new FastInk(el, { color: state.color, width: state.width }));
    }
  }
  function cleanupInks() {
    for (const [el, ink] of state.perPage) if (!document.contains(el)) { ink.destroy(); state.perPage.delete(el); }
  }
  function findPageFromTarget(t) { return getPageContainers().find(el => el.contains(t)); }
  function toPageCoords(e, el) { const r = el.getBoundingClientRect(); return { x:e.clientX-r.left, y:e.clientY-r.top }; }
  function addFromEvent(e){ const a=state.active; if(!a)return; const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
    a.ink.add(evs.map(ev=>{const {x,y}=toPageCoords(ev,a.pageEl); return {x,y,p:ev.pressure??0.5};})); }
  function onPointerDown(e){
    if(!state.enabled||e.button!==0||(e.pointerType!=='pen'&&!e.shiftKey))return;
    const pageEl=findPageFromTarget(e.target); if(!pageEl) return;
    ensureInks(); const ink=state.perPage.get(pageEl); if(!ink) return;
    e.target.setPointerCapture?.(e.pointerId); state.active={ink,pageEl,pointerId:e.pointerId};
    const {x,y}=toPageCoords(e,pageEl); ink.start(x,y,e.pressure??0.5);
  }
  function onPointerMove(e){ if(state.enabled&&state.active) addFromEvent(e); }
  function onPointerRawUpdate(e){ if(state.enabled&&state.active) addFromEvent(e); }
  function onPointerUp(e){ const a=state.active; if(!a||e.pointerId!==a.pointerId) return; a.ink.clear(); state.active=null; }
  function onResize(){ for (const ink of state.perPage.values()) ink.resizeToPage(); }

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('pointerup', onPointerUp, true);
  document.addEventListener('pointercancel', onPointerUp, true);
  document.addEventListener('pointerrawupdate', onPointerRawUpdate, true);
  window.addEventListener('resize', onResize);
  new MutationObserver(()=>{ensureInks();cleanupInks();}).observe(document.documentElement,{childList:true,subtree:true});

  // UI + hotkey
  const link=document.createElement('link'); link.rel='stylesheet'; link.href=chrome.runtime.getURL('styles/ink.css'); document.documentElement.appendChild(link);
  const btn=document.createElement('button'); btn.className='sr-fast-ink-btn'; btn.textContent='Fast Ink';
  btn.title='Realtime ink preview (F to toggle). Hold Shift for mouse.';
  btn.addEventListener('click',()=>toggle()); document.documentElement.appendChild(btn);
  function toggle(force){ state.enabled=(typeof force==='boolean')?force:!state.enabled; btn.dataset.active=state.enabled?'1':'0'; if(state.enabled) ensureInks(); }
  window.addEventListener('keydown',(e)=>{ if(!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key==='f'||e.key==='F')){toggle();e.preventDefault();}}, {capture:true});
  toggle(true);
  window.SR_FAST_INK={toggle, state};
})();

