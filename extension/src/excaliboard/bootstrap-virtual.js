// Mounts virtual pages + Excalidraw iframe (MV3-safe)
(async () => {
  const { VirtualPager } = await import(chrome.runtime.getURL('src/pager/virtualPages.js'));
  const { ExcalidrawIframeHost } = await import(chrome.runtime.getURL('src/excaliboard/host-iframe.js'));
  const { deleteScene } = await import(chrome.runtime.getURL('src/excaliboard/sceneStore.js'));

  const state = { pager:null, boards:new Map() };
  function getPageContainers(){
    const sels=['.sr-page','.scholar-reader-page','.pdfViewer .page','div[data-page-number]','.page','.pdf-page'];
    for(const s of sels){const a=[...document.querySelectorAll(s)]; if(a.length) return a;}
    return [...document.querySelectorAll('canvas')].map(c=>c.parentElement).filter(Boolean);
  }
  function getPager(){ return state.pager||(state.pager=new VirtualPager({ getPageContainers })); }

  function injectUi(){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href=chrome.runtime.getURL('styles/virtual-pages.css');
    document.documentElement.appendChild(link);
    const bar=document.createElement('div'); bar.className='sr-virtual-controls';
    bar.innerHTML=`<button data-act="add">+ Blank page</button><button data-act="del">Delete blank page</button>`;
    document.documentElement.appendChild(bar);
    bar.addEventListener('click',(e)=>{
      const act=e.target?.dataset?.act; const pager=getPager(); const pages=getPageContainers(); if(!pages.length) return;
      if(act==='add'){
        const mid=scrollY+innerHeight/2; let best=0,bd=1e12;
        pages.forEach((el,i)=>{const r=el.getBoundingClientRect(); const c=(r.top+r.bottom)/2+scrollY; const d=Math.abs(c-mid); if(d<bd){bd=d;best=i;}});
        const { uuid, el } = pager.insertVirtualAfter(best);
        mountHost(el, uuid); el.scrollIntoView({behavior:'smooth',block:'center'});
      }
      if(act==='del'){
        const all=[...document.querySelectorAll('[data-sr-virtual-page]')]; if(!all.length) return;
        const mid=scrollY+innerHeight/2; let bestEl=all[0],bd=1e12;
        for(const el of all){const r=el.getBoundingClientRect(); const c=(r.top+r.bottom)/2+scrollY; const d=Math.abs(c-mid); if(d<bd){bd=d;bestEl=el;}}
        const uuid=bestEl.getAttribute('data-sr-virtual-page'); unmountHost(uuid); deleteScene(uuid); pager.removeVirtual(uuid);
      }
    });
  }

  function mountHost(container, uuid){ container.classList.add('sr-virtual-page'); const host=new ExcalidrawIframeHost(container, uuid); state.boards.set(uuid, host); }
  function unmountHost(uuid){ state.boards.get(uuid)?.destroy?.(); document.querySelector(`[data-sr-virtual-page="${uuid}"]`)?.remove(); state.boards.delete(uuid); }

  injectUi(); getPager();
  for(const el of document.querySelectorAll('[data-sr-virtual-page]')) mountHost(el, el.getAttribute('data-sr-virtual-page'));
})();

