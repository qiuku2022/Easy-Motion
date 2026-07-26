#!/usr/bin/env node
/**
 * Vendor av/remotion-bits demo bits into EasyMotion preset bundle.
 * Run: node apps/electron/scripts/vendor-bits-presets.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { BITS_PRESET_CATALOG } = require("./bits-preset-catalog.cjs");
const { composePresetBundle } = require("./compose-preset-bundle.cjs");

const ROOT = path.resolve(__dirname, "..");
const GITHUB_RAW =
  "https://raw.githubusercontent.com/av/remotion-bits/master";
const BITS_OUT_DIR = path.join(
  ROOT,
  "resources/templates/default-project/subprojects/default/remotion/src/presets/bits"
);
const PRESETS_DIR = path.join(ROOT, "resources/presets");

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          fetchUrl(res.headers.location).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Strip demo metadata / controls and rename Component → BitsXxx.
 * Preserve `props` defaults object so controls-driven bits keep working.
 */
function transformBitSource(source, componentName, fileName) {
  let code = source.replace(/\r\n/g, "\n");

  code = code.replace(/export const metadata = \{[\s\S]*?\n\};?\n*/m, "");
  code = code.replace(/export const controls = \[[\s\S]*?\];?\n*/m, "");

  const hasPropsExport = /export const props = \{/.test(code);
  if (hasPropsExport) {
    code = code.replace(
      /export const props = \{/,
      "const defaultProps = {"
    );
  }

  const attribution = `/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: ${fileName}
 */\n\n`;

  const arrowParen = code.match(
    /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\(/
  );
  const arrowBlock = code.match(
    /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\{/
  );

  if (arrowParen) {
    if (hasPropsExport) {
      code = code.replace(
        /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\(/,
        `export function ${componentName}(incoming: Record<string, unknown> = {}) {\n  const props = { ...defaultProps, ...incoming };\n  return (`
      );
    } else {
      code = code.replace(
        /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\(/,
        `export function ${componentName}(_props: Record<string, unknown> = {}) {\n  return (`
      );
    }
    // Close arrow-paren body: keep `);` then add function `}`
    const lastClose = code.lastIndexOf(");");
    if (lastClose === -1) {
      throw new Error(`Could not close arrow component for ${componentName}`);
    }
    code = `${code.slice(0, lastClose + 2)}\n}\n${code.slice(lastClose + 2)}`;
  } else if (arrowBlock) {
    if (hasPropsExport) {
      code = code.replace(
        /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\{/,
        `export function ${componentName}(incoming: Record<string, unknown> = {}) {\n  const props = { ...defaultProps, ...incoming };`
      );
    } else {
      code = code.replace(
        /export const Component:\s*React\.FC(?:<[^>]*>)?\s*=\s*\(\)\s*=>\s*\{/,
        `export function ${componentName}(_props: Record<string, unknown> = {}) {`
      );
    }
  } else {
    throw new Error(`Unrecognized Component export shape in ${fileName}`);
  }

  // Drop unused React default import warnings are fine; keep source imports.
  if (!code.includes("Vendored from av/remotion-bits")) {
    code = attribution + code;
  }

  return code.trimEnd() + "\n";
}

/**
 * Extract controls[] defaults into manifest parameters when present in source.
 * Falls back to empty parameters (click-to-use still works).
 */
function extractParametersFromSource(source) {
  const controlsMatch = source.match(/export const controls = (\[[\s\S]*?\]);/);
  const propsMatch = source.match(/export const props = (\{[\s\S]*?\n\});/);
  if (!controlsMatch || !propsMatch) return [];

  let defaults;
  let controls;
  try {
    // Pinned MIT demo files from our catalog only (not untrusted input).
    const stripTs = (s) => s.replace(/\s+as const\b/g, "");
    defaults = Function(`"use strict"; return (${stripTs(propsMatch[1])});`)();
    controls = Function(`"use strict"; return (${stripTs(controlsMatch[1])});`)();
  } catch {
    return [];
  }

  if (!Array.isArray(controls) || typeof defaults !== "object" || !defaults) {
    return [];
  }

  return controls
    .filter((c) => c && typeof c.key === "string")
    .map((c) => {
      const type =
        c.type === "color"
          ? "color"
          : c.type === "number"
            ? "number"
            : "text";
      /** @type {Record<string, unknown>} */
      const param = {
        key: c.key,
        label: typeof c.label === "string" ? c.label : c.key,
        type,
        defaultValue: defaults[c.key],
      };
      if (type === "number") {
        if (typeof c.min === "number") param.min = c.min;
        if (typeof c.max === "number") param.max = c.max;
        if (typeof c.step === "number") param.step = c.step;
      }
      return param;
    })
    .filter((p) => p.defaultValue !== undefined);
}

async function main() {
  ensureDir(BITS_OUT_DIR);
  ensureDir(PRESETS_DIR);

  const force = process.argv.includes("--force");
  const barrelExports = [];
  /** @type {Record<string, unknown[]>} */
  const parametersById = {};

  for (const item of BITS_PRESET_CATALOG) {
    const url = `${GITHUB_RAW}/${item.sourcePath}`;
    const outPath = path.join(BITS_OUT_DIR, item.file);
    process.stdout.write(`Fetching ${item.file}... `);
    const raw = await fetchUrl(url);
    parametersById[item.id] = extractParametersFromSource(raw);

    if (!force && fs.existsSync(outPath)) {
      barrelExports.push(
        `export { ${item.component} } from "./${item.file.replace(/\.tsx$/, "")}";`
      );
      console.log("skip (exists)");
      continue;
    }

    const transformed = transformBitSource(raw, item.component, item.sourcePath);
    fs.writeFileSync(outPath, transformed, "utf8");
    barrelExports.push(
      `export { ${item.component} } from "./${item.file.replace(/\.tsx$/, "")}";`
    );
    console.log("ok");
  }

  fs.writeFileSync(
    path.join(BITS_OUT_DIR, "index.ts"),
    `${barrelExports.join("\n")}\n`,
    "utf8"
  );

  const { includeBits, manifestCount } = composePresetBundle();
  if (!includeBits) {
    throw new Error("Bits catalog composed but bitsVendored() returned false");
  }

  // Annotate Bits parameters extracted from upstream controls (RVE still via annotate script)
  const manifestPaths = [
    path.join(PRESETS_DIR, "manifest.json"),
    path.join(ROOT, "src/renderer/src/data/presets/manifest.json"),
  ];
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const entry of manifest) {
      const params = parametersById[entry.id];
      if (params && params.length > 0) {
        entry.parameters = params;
      }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  // Keep RVE parameters annotated (annotate skips unknown Bits ids)
  const { execSync } = require("node:child_process");
  execSync("node scripts/annotate-preset-parameters.cjs", {
    cwd: ROOT,
    stdio: "inherit",
  });

  // Re-apply Bits params after annotate (annotate does not clear unknown ids,
  // but rewrite from source of truth in case compose wiped them)
  for (const manifestPath of manifestPaths) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    for (const entry of manifest) {
      const params = parametersById[entry.id];
      if (params && params.length > 0) {
        entry.parameters = params;
      }
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }

  const notice = `# Remotion Bits Preset Components (MIT)

The following components are adapted from demo bits in:
https://github.com/av/remotion-bits

License: MIT — Copyright (c) remotion-bits contributors.
Runtime dependency: \`remotion-bits\` (see remotion/package.json).

Component count: ${BITS_PRESET_CATALOG.length} (full bit catalog)
Generated: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(PRESETS_DIR, "NOTICE-BITS.md"), notice, "utf8");

  console.log(
    `\nDone: ${BITS_PRESET_CATALOG.length} Bits presets vendored. Manifest total: ${manifestCount}.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
