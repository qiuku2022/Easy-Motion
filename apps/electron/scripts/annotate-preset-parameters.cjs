#!/usr/bin/env node
/**
 * Write PresetParameter definitions for all 81 presets into manifest files.
 */
const fs = require("node:fs");
const path = require("node:path");
const { PRESET_PARAMETERS_BY_ID } = require("./preset-parameters-registry.cjs");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATHS = [
  path.join(ROOT, "resources/presets/manifest.json"),
  path.join(ROOT, "src/renderer/src/data/presets/manifest.json"),
];

function annotateManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let updated = 0;

  for (const item of manifest) {
    const parameters = PRESET_PARAMETERS_BY_ID[item.id];
    if (!parameters) continue;
    item.parameters = parameters;
    updated += 1;
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return updated;
}

function main() {
  for (const manifestPath of MANIFEST_PATHS) {
    const count = annotateManifest(manifestPath);
    console.log(`${path.relative(ROOT, manifestPath)}: ${count} presets annotated`);
  }
}

main();
