// Build script that outputs a single JS file with CSS inlined.
// Run with: node extension/scripts/build-excalidraw-bundle.mjs

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd(), "extension");
const outdir = path.join(root, "vendor");
const entry = path.join(root, "src/excalidraw-bundle/index.jsx");

// Simple CSS-in-JS injector so we don't need separate CSS files in MV3.
const cssInjectPlugin = {
  name: "css-inject",
  setup(pluginBuild) {
    pluginBuild.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, "utf8");
      const js =
        `(()=>{const s=document.createElement('style');` +
        `s.textContent=${JSON.stringify(css)};` +
        `document.head.appendChild(s);})();`;
      return { contents: js, loader: "js" };
    });
  },
};

await fs.promises.mkdir(outdir, { recursive: true });

await build({
  entryPoints: [entry],
  outfile: path.join(outdir, "excalidraw.bundle.js"),
  bundle: true,
  minify: true,
  format: "iife",
  legalComments: "none",
  target: ["chrome110"],
  plugins: [cssInjectPlugin],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    global: "window"
  }
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

console.log("Built vendor/excalidraw.bundle.js");

