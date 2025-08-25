// Extended audit script for Chrome MV3 extension
// Run with: node tools/audit-extended.js

import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const ext = path.join(root, "extension");
const manPath = path.join(ext, "manifest.json");

function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function ok(m) { console.log("✅", m); }
function bad(m) { console.log("❌", m); problems++; }

let problems = 0;
if (!exists(manPath)) { bad("extension/manifest.json missing"); process.exit(2); }
let manifest;
try {
  manifest = JSON.parse(read(manPath));
  ok("manifest.json parsed");
} catch (e) {
  bad("manifest.json invalid: " + e.message);
  process.exit(2);
}

const csFiles = (manifest.content_scripts || [])
  .flatMap((cs) => cs.js || [])
  .map((f) => path.join(ext, f));
const hostHtml = path.join(ext, "excalidraw_host.html");
const hostIframeJs = path.join(ext, "src/excaliboard/host-iframe.js");

// 1) static import in content scripts?
for (const f of csFiles) {
  if (!exists(f)) {
    bad(`content script missing: ${path.relative(ext, f)}`);
    continue;
  }
  const src = read(f);
  if (/\bimport\s+[^('"]/.test(src)) {
    bad(
      `static "import" in content script: ${path.relative(
        ext,
        f
      )} (use dynamic import(chrome.runtime.getURL(...)))`
    );
  }
}
if (problems === 0) ok("No static import in content scripts");

// 2) referenced files exist
const refs = new Set();
(manifest.content_scripts || []).forEach((cs) => {
  (cs.js || []).forEach((f) => refs.add(f));
  (cs.css || []).forEach((f) => refs.add(f));
});
if (manifest.background?.service_worker) refs.add(manifest.background.service_worker);
(manifest.web_accessible_resources || []).forEach((w) =>
  (w.resources || []).forEach((r) => refs.add(r))
);

for (const r of refs) {
  if (r.includes("*")) continue;
  const p = path.join(ext, r);
  if (!exists(p)) bad(`missing referenced file: ${r}`);
}
if (problems === 0) ok("All manifest-referenced files exist");

// 3) excalidraw_host.html CSP check
if (!exists(hostHtml)) bad("excalidraw_host.html missing");
else {
  const html = read(hostHtml);
  if (/frame-ancestors/i.test(html))
    bad("excalidraw_host.html sets frame-ancestors; remove it so it can be iframed");
  else ok("excalidraw_host.html allows framing (no frame-ancestors lockout)");
}

// 4) host-iframe uses extension origin
//
if (exists(hostIframeJs)) {
  const s = read(hostIframeJs);

  // check for EXT origin computed the correct way
  if (!/new URL\s*\(\s*chrome\.runtime\.getURL\(['"]{1}\s*['"]{1}\)\s*\)\.origin/.test(s)) {
    bad("host-iframe.js: EXT origin not computed via new URL(chrome.runtime.getURL('')).origin");
  } else {
    ok("host-iframe.js computes EXT_ORIGIN securely");
  }

  // check that postMessage is scoped to EXT_ORIGIN
  if (!/postMessage\([\s\S]*?,\s*this\.EXT_ORIGIN\)/.test(s)) {
    bad("host-iframe.js: postMessage to child should target EXT_ORIGIN");
  } else {
    ok("host-iframe.js targets extension origin for postMessage");
  }
} else {
  bad("src/excaliboard/host-iframe.js missing");
}

// 5) esbuild parse check for all extension/src files
async function parseAll() {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) files.push(p);
    }
  })(path.join(ext, "src"));
  try {
    await build({
      entryPoints: files,
      outdir: "out", // ✅ instead of outfile
      bundle: false,
      write: false,
      logLevel: "silent",
    });
    ok("JS parses cleanly (esbuild)");
  } catch (e) {
    bad("JS parse errors (esbuild):");
    console.error(e.message);
  }
}
await parseAll();

console.log("\nSummary:", problems ? `❌ ${problems} issue(s) found` : "✅ no problems found");
process.exit(problems ? 1 : 0);

