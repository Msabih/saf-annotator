// Builds a single-file bundle that exposes window.__ExHost.mount(appEl, onSceneChange)
// and embeds Excalidraw + React with styles inlined (MV3-safe).

import React, { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/dist/excalidraw.css";

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const App = forwardRef(function App({ onSceneChange }, ref) {
  const excaliRef = useRef(null);

  useImperativeHandle(ref, () => ({
    loadScene(scene) {
      if (scene && typeof scene === "object") {
        excaliRef.current?.updateScene(scene);
      }
    },
    setElements(elements) {
      const files = {}; // keep empty unless you handle files
      excaliRef.current?.updateScene({ elements, files, appState: {} });
    },
    focus() {
      try { excaliRef.current?.focusContainer(); } catch {}
    }
  }));

  const handleChange = useMemo(() => debounce((elements, appState, files) => {
    onSceneChange?.({ elements, appState, files });
  }, 400), [onSceneChange]);

  return (
    <div style={{ height: "100%" }}>
      <Excalidraw
        ref={excaliRef}
        onChange={handleChange}
        initialData={{ elements: [], appState: {}, files: {} }}
      />
    </div>
  );
});

export function mount(container, onSceneChange) {
  const ref = React.createRef();
  const root = createRoot(container);
  root.render(<App ref={ref} onSceneChange={onSceneChange} />);
  return {
    loadScene: (s) => ref.current?.loadScene?.(s),
    setElements: (els) => ref.current?.setElements?.(els),
    focus: () => ref.current?.focus?.()
  };
}

// Expose as global for excalidraw_host.html
if (!window.__ExHost) window.__ExHost = {};
window.__ExHost.mount = mount;

