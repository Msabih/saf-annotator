// Shared schema + small migration helpers for import/export.

export const BUNDLE_VERSION = 2;

/**
 * Bundle format (per URL):
 * {
 *   version: 2,
 *   urlKey: string,
 *   annotations: Array<AnyAnnotation>,       // sticky notes live here as type:"note"
 *   excaliScenes: Record<pageUuid, SceneJSON> // virtual-page boards
 * }
 */

export function makeEmptyBundle(urlKey) {
  return { version: BUNDLE_VERSION, urlKey, annotations: [], excaliScenes: {} };
}

export function migrateBundle(input) {
  if (!input || typeof input !== 'object') return null;
  const out = { ...input };
  if (!out.version) out.version = 1;
  if (out.version === 1) {
    // v1 -> v2: ensure excaliScenes exists
    out.excaliScenes = out.excaliScenes || {};
    out.version = 2;
  }
  if (out.version !== BUNDLE_VERSION) {
    // future-proof: reject unknown versions
    return null;
  }
  // sanity
  out.annotations = Array.isArray(out.annotations) ? out.annotations : [];
  out.excaliScenes = out.excaliScenes && typeof out.excaliScenes === 'object' ? out.excaliScenes : {};
  return out;
}

