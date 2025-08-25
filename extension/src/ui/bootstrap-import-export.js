// Floating Export/Import controls (MV3-safe dynamic import)
(async () => {
  const { exportCurrentUrlBundle, importCurrentUrlBundle } =
    await import(chrome.runtime.getURL('src/persist/exporter.js'));

  const root=document.createElement('div'); root.className='sr-import-export';
  root.innerHTML=`<button data-act="export">Export notes (JSON)</button>
    <label class="sr-imp-label"><input type="file" accept="application/json" hidden />
    <span>Import notes (JSON)</span></label>`;
  document.documentElement.appendChild(root);

  root.addEventListener('click',async e=>{
    if(e.target?.dataset?.act==='export'){
      try{await exportCurrentUrlBundle();}catch(err){console.error(err);}
    }
  });

  const fi=root.querySelector('input[type="file"]');
  root.querySelector('.sr-imp-label').addEventListener('click',()=>fi.click());
  fi.addEventListener('change',async()=>{
    const f=fi.files?.[0]; if(!f) return;
    try{
      const res=await importCurrentUrlBundle(f);
      alert(`Imported: ${res.notes} notes, ${res.scenes} boards`);
      location.reload();
    }catch(err){
      console.error(err);
      alert('Import failed: '+(err?.message||err));
    }finally{
      fi.value='';
    }
  });

  const style=document.createElement('style'); style.textContent=`
    .sr-import-export{position:fixed;left:12px;bottom:56px;z-index:2147483644;display:flex;gap:8px;font:12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}
    .sr-import-export button,.sr-import-export .sr-imp-label span{padding:6px 10px;border:1px solid rgba(0,0,0,.2);border-radius:8px;background:#fff;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.08);display:inline-block;}
    .sr-import-export button:hover,.sr-import-export .sr-imp-label span:hover{background:#f7f7f7;}
  `;
  document.documentElement.appendChild(style);
})();

