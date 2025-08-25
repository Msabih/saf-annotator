/* Run with: node tools/audit.js
 * Prints per-file report + a summary exit code (non-zero on problems).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ext = path.join(root, 'extension');

function ok(x) { return `✅ ${x}` }
function bad(x) { return `❌ ${x}` }

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { return { __error: e.message }; }
}
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }

function globStyles() {
  const dir = path.join(ext, 'styles');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.css')).map(f => path.join('styles', f));
}

function collectManifestRefs(m) {
  const refs = [];
  if (m.background?.service_worker) refs.push(m.background.service_worker);
  if (m.options_page) refs.push(m.options_page);
  if (m.sandbox?.pages) refs.push(...m.sandbox.pages);
  if (m.action?.default_icon) refs.push(...Object.values(m.action.default_icon));
  if (m.icons) refs.push(...Object.values(m.icons));

  for (const cs of (m.content_scripts || [])) {
    (cs.js || []).forEach(f => refs.push(f));
    (cs.css || []).forEach(f => refs.push(f));
  }
  const war = (m.web_accessible_resources || []).flatMap(x => x.resources || []);
  refs.push(...war);

  // extra: expected files from our integration
  const expected = [
    'src/notes/bootstrap-notes.js',
    'src/notes/notesController.js',
    'src/notes/notesStore.js',
    'src/notes/notesSchema.js',
    'src/notes/StickyNoteView.js',
    'src/persist/storage.js',
    'src/ink/bootstrap-ink.js',
    'src/ink/fastInk.js',
    'src/pager/virtualPages.js',
    'src/excaliboard/bootstrap-virtual.js',
    'src/excaliboard/host-iframe.js',
    'src/excaliboard/sceneStore.js',
    'excalidraw_host.html',
    'vendor/excalidraw.bundle.js',
    'src/ui/bootstrap-import-export.js',
    // CSS we added
    'styles/sticky-notes.css',
    'styles/ink.css',
    'styles/virtual-pages.css',
  ];
  refs.push(...expected);

  // Expand styles/*.css patterns
  const styleGlobs = globStyles();
  for (const r of war) {
    if (r.endsWith('styles/*.css')) refs.push(...styleGlobs);
  }
  return Array.from(new Set(refs));
}

function checkPaths(files) {
  const missing = [];
  for (const rel of files) {
    // Ignore wildcard entries that aren’t expanded
    if (rel.includes('*')) continue;
    const abs = path.join(ext, rel);
    if (!exists(abs)) missing.push(rel);
  }
  return missing;
}

function findJSFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...findJSFiles(p));
    else if (/\.(m?js|jsx|ts|tsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

// crude import scanner for `import ... from '...'` and chrome.runtime.getURL('...')
function scanImports(absFile) {
  const src = fs.readFileSync(absFile, 'utf8');
  const rels = [];
  const reImport = /from\s+['"]([^'"]+)['"]/g;
  const reDyn = /chrome\.runtime\.getURL\(\s*['"]([^'"]+)['"]\s*\)/g;
  const reImportBare = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  let m;
  while ((m = reImport.exec(src))) rels.push(m[1]);
  while ((m = reDyn.exec(src))) rels.push(m[1]);
  while ((m = reImportBare.exec(src))) rels.push(m[1]);

  const base = path.dirname(absFile);
  const missing = [];
  for (const ref of rels) {
    if (ref.startsWith('http')) continue;
    if (ref.startsWith('@/') || ref.startsWith('~')) continue; // bundler aliases (unlikely here)
    let target;
    if (ref.startsWith('.')) {
      target = path.resolve(base, ref);
    } else if (ref.startsWith('src/') || ref.startsWith('styles/') || ref.endsWith('.html')) {
      target = path.join(ext, ref);
    } else {
      // bare package import -> ignore (e.g., react/excalidraw in the bundle builder)
      continue;
    }
    // try common extensions
    const candidates = [
      target,
      `${target}.js`, `${target}.mjs`, `${target}.jsx`, `${target}.ts`, `${target}.tsx`,
      `${target}.css`, `${target}.html`
    ];
    if (!candidates.some(p => exists(p))) {
      missing.push({ file: path.relative(ext, absFile), ref });
    }
  }
  return missing;
}

function main() {
  let problems = 0;

  // 1) manifest
  const manifestPath = path.join(ext, 'manifest.json');
  if (!exists(manifestPath)) {
    console.log(bad('extension/manifest.json is missing')); process.exit(2);
  }
  const manifest = readJSON(manifestPath);
  if (manifest.__error) { console.log(bad('manifest.json is invalid JSON: ' + manifest.__error)); problems++; }
  else console.log(ok('manifest.json parsed'));

  // quick CSP sanity for Excalidraw host
  const csp = manifest.content_security_policy?.extension_pages || '';
  if (!/style-src[^;]*'unsafe-inline'/.test(csp)) {
    console.log(bad("CSP: 'style-src' should include 'unsafe-inline' for inlined Excalidraw CSS"));
    problems++;
  } else {
    console.log(ok("CSP: style-src includes 'unsafe-inline'"));
  }

  // 2) referenced files exist
  const refs = collectManifestRefs(manifest);
  const missing = checkPaths(refs);
  if (missing.length) {
    console.log(bad('Missing files referenced by manifest or expected by integration:'));
    missing.forEach(f => console.log('   - ' + f));
    problems += missing.length;
  } else {
    console.log(ok('All referenced files exist'));
  }

  // 3) import path scan across extension/src
  const srcDir = path.join(ext, 'src');
  if (exists(srcDir)) {
    const jsFiles = findJSFiles(srcDir);
    let broken = [];
    for (const f of jsFiles) broken.push(...scanImports(f));
    if (broken.length) {
      console.log(bad('Broken import paths:'));
      for (const b of broken) console.log(`   - ${b.file} imports "${b.ref}" (not found)`);
      problems += broken.length;
    } else {
      console.log(ok('All imports resolved (basic scan)'));
    }
  } else {
    console.log(bad('extension/src directory missing')); problems++;
  }

  // 4) gentle reminders
  if (!refs.includes('vendor/excalidraw.bundle.js')) {
    console.log('ℹ️  Excalidraw bundle not referenced; host will show "bundle missing".');
  } else if (!exists(path.join(ext, 'vendor/excalidraw.bundle.js'))) {
    console.log('⚠️  vendor/excalidraw.bundle.js not present. Run: npm i && npm run build:excalidraw');
  } else {
    console.log(ok('Excalidraw bundle present'));
  }

  console.log('\nSummary: ' + (problems ? bad(`${problems} issue(s) found`) : ok('no problems found')));
  process.exit(problems ? 1 : 0);
}

main();

