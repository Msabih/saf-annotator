// This file gets bundled with React, ReactDOM, and @excalidraw/excalidraw.
// It must define window.__ExHost.mount(appEl, onSceneChange) => { loadScene, setElements, focus }

import React from "react";
import { createRoot } from "react-dom/client";
import { Excalidraw } from "@excalidraw/excalidraw";

function App({ onSceneChange }, ref) {
  const excaliRef = React.useRef(null);

  React.useImperativeHandle(ref, () => ({
    loadScene(scene) {
      if (scene?.elements) {
        excaliRef.current?.updateScene(scene);
      }
    },
    setElements(elements) {
      const curr = excaliRef.current?.getSceneElements() || [];
      excaliRef.current?.updateScene({ elements, appState: {}, files: {} });
    },
    focus() {
      excaliRef.current?.focusContainer();
    }
  }));

  const onChange = React.useMemo(() => {
    let tId = null;
    return (elements, appState, files) => {
      clearTimeout(tId);
      tId = setTimeout(() => onSceneChange({ elements, appState, files }), 400);
    };
  }, [onSceneChange]);

  return React.createElement(
    "div",
    { style: { height: "100%" } },
    React.createElement(Excalidraw, {
      ref: excaliRef,
      onChange,
      initialData: { elements: [], appState: {}, files: {} }
    })
  );
}

export function mount(container, onSceneChange) {
  const ref = React.createRef();
  const root = createRoot(container);
  root.render(React.createElement(React.forwardRef(App), { onSceneChange, ref }));
  return {
    loadScene: (s) => ref.current?.loadScene?.(s),
    setElements: (els) => ref.current?.setElements?.(els),
    focus: () => ref.current?.focus?.()
  };
}

window.__ExHost = { mount };

