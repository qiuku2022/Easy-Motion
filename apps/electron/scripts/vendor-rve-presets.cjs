#!/usr/bin/env node
/**
 * Vendor reactvideoeditor/remotion-templates into EasyMotion preset bundle.
 * Run: node apps/electron/scripts/vendor-rve-presets.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const { RVE_PRESET_CATALOG } = require("./rve-preset-catalog.cjs");

const ROOT = path.resolve(__dirname, "..");
const RVE_SRC_BASE =
  "https://raw.githubusercontent.com/reactvideoeditor/remotion-templates/main/templates";
const RVE_OUT_DIR = path.join(
  ROOT,
  "resources/templates/default-project/subprojects/default/remotion/src/presets/rve",
);
const PRESETS_DIR = path.join(ROOT, "resources/presets");
const RENDERER_DATA_DIR = path.join(ROOT, "src/renderer/src/data/presets");

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

function sanitizeForRemotionVite(code, fileName) {
  if (code.includes('from "next/') || code.includes("from 'next/")) {
    throw new Error(
      `${fileName}: uses Next.js imports — add a hand-written Remotion patch in vendor-rve-presets.cjs`,
    );
  }
  if (code.includes("style jsx")) {
    throw new Error(
      `${fileName}: uses styled-jsx — add a hand-written Remotion patch in vendor-rve-presets.cjs`,
    );
  }
  if (/\banimation\s*:/.test(code) && !code.includes("Adapted for Remotion")) {
    console.warn(`[warn] ${fileName}: may use CSS animation (check manually)`);
  }
  return code;
}

/** Files that need full rewrite after download (Next.js / styled-jsx). */
const MANUAL_PATCHES = {};

function transformSource(source, componentName, fileName) {
  let code = source.replace(/^"use client";\s*\n?/m, "");

  const hasNamedFn = /export\s+default\s+function\s+\w+/.test(code);
  const constExport = code.match(/export\s+const\s+(\w+)/);

  if (hasNamedFn) {
    code = code.replace(
      /export\s+default\s+function\s+(\w+)/,
      `export function ${componentName}`,
    );
  } else if (constExport) {
    const oldName = constExport[1];
    code = code.replace(
      new RegExp(`export\\s+const\\s+${oldName}\\b`),
      `export const ${componentName}`,
    );
    code = code.replace(
      new RegExp(`export\\s+default\\s+${oldName}\\s*;?`, "m"),
      "",
    );
  } else {
    throw new Error(`Could not transform export for ${componentName}`);
  }

  if (
    !code.includes(`export function ${componentName}`) &&
    !code.includes(`export const ${componentName}`)
  ) {
    throw new Error(`Missing export for ${componentName}`);
  }

  code = sanitizeForRemotionVite(code, item.file);

  const attribution = `/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */\n\n`;

  if (!code.includes("Vendored from reactvideoeditor")) {
    code = attribution + code;
  }

  return code;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Upstream uses Next.js or local parameter patches — keep on re-vendor. */
const SKIP_VENDOR_FILES = new Set([
  "zoom-pulse.tsx",
  "parallax-pan.tsx",
  "ken-burns.tsx",
  "countdown-timer.tsx",
]);

function shouldSkipVendorFile(item) {
  if (SKIP_VENDOR_FILES.has(item.file)) return true;
  const outPath = path.join(RVE_OUT_DIR, item.file);
  if (!fs.existsSync(outPath)) return false;
  const content = fs.readFileSync(outPath, "utf8");
  return (
    content.includes("RveBaseProps") || content.includes('from "./shared"')
  );
}

async function main() {
  ensureDir(RVE_OUT_DIR);
  ensureDir(PRESETS_DIR);
  ensureDir(RENDERER_DATA_DIR);

  const componentRegistry = {};
  const manifest = [];
  const barrelExports = [];

  for (const item of RVE_PRESET_CATALOG) {
    if (shouldSkipVendorFile(item)) {
      process.stdout.write(`Skipping ${item.file} (local Remotion patch)... ok\n`);
    } else {
      const url = `${RVE_SRC_BASE}/${item.file}`;
      process.stdout.write(`Fetching ${item.file}... `);
      const raw = await fetchUrl(url);
      const transformed = transformSource(raw, item.component, item.file);
      const outPath = path.join(RVE_OUT_DIR, item.file);
      fs.writeFileSync(outPath, transformed, "utf8");
      console.log("ok");
    }

    const importPath = `./presets/rve/${item.file.replace(/\.tsx$/, "")}`;
    componentRegistry[item.component] = {
      importPath,
      exportName: item.component,
    };

    manifest.push({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category,
      kind: "component",
      component: item.component,
      modulePath: importPath.replace(/^\.\//, ""),
      durationInFrames: item.durationInFrames,
      isBuiltin: true,
      thumbnail: null,
      parameters: [],
      license: "MIT",
      source: "reactvideoeditor/remotion-templates",
    });

    const moduleBase = item.file.replace(/\.tsx$/, "");
    barrelExports.push(
      `export { ${item.component} } from "./${moduleBase}";`,
    );
  }

  const indexTs = `${barrelExports.join("\n")}\n`;
  fs.writeFileSync(path.join(RVE_OUT_DIR, "index.ts"), indexTs, "utf8");

  const registryTs = `/**
 * Auto-generated by vendor-rve-presets.cjs — do not edit manually.
 */
import type { FC } from "react";
import * as Rve from "./rve";

export const PRESET_COMPONENT_MAP: Record<string, FC> = {
${RVE_PRESET_CATALOG.map(
  (item) => `  ${item.component}: Rve.${item.component} as FC,`,
).join("\n")}
};

export function resolvePresetComponent(name: string): FC | undefined {
  return PRESET_COMPONENT_MAP[name];
}

export const PRESET_COMPONENT_NAMES = new Set<string>([
${RVE_PRESET_CATALOG.map((item) => `  "${item.component}",`).join("\n")}
]);
`;
  fs.writeFileSync(
    path.join(ROOT, "resources/templates/default-project/subprojects/default/remotion/src/presets/registry.ts"),
    registryTs,
    "utf8",
  );

  const categories = [
    { id: "all", label: "全部", icon: "LayoutGrid" },
    { id: "background", label: "背景", icon: "Layers" },
    { id: "title", label: "文字", icon: "Type" },
    { id: "data-chart", label: "图表", icon: "BarChart3" },
    { id: "intro-outro", label: "片头片尾", icon: "Clapperboard" },
    { id: "social-media", label: "媒体", icon: "Image" },
    { id: "content", label: "动效", icon: "Sparkles" },
    { id: "transition", label: "转场", icon: "ArrowLeftRight" },
  ];

  fs.writeFileSync(
    path.join(PRESETS_DIR, "categories.json"),
    JSON.stringify(categories, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    path.join(PRESETS_DIR, "component-registry.json"),
    JSON.stringify(componentRegistry, null, 2),
    "utf8",
  );

  fs.writeFileSync(
    path.join(PRESETS_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  // Renderer bundle copy
  fs.copyFileSync(
    path.join(PRESETS_DIR, "manifest.json"),
    path.join(RENDERER_DATA_DIR, "manifest.json"),
  );
  fs.copyFileSync(
    path.join(PRESETS_DIR, "categories.json"),
    path.join(RENDERER_DATA_DIR, "categories.json"),
  );

  const notice = `# RVE Preset Components (MIT)

The following components are vendored from:
https://github.com/reactvideoeditor/remotion-templates

License: MIT — Copyright (c) React Video Editor team.
Credit appreciated but not required.

Component count: ${RVE_PRESET_CATALOG.length}
Generated: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(PRESETS_DIR, "NOTICE-RVE.md"), notice, "utf8");

  const { execSync } = require("node:child_process");
  execSync("node scripts/annotate-preset-parameters.cjs", {
    cwd: ROOT,
    stdio: "inherit",
  });
  execSync("node scripts/apply-preset-props.cjs", {
    cwd: ROOT,
    stdio: "inherit",
  });

  console.log(`\nDone: ${RVE_PRESET_CATALOG.length} components vendored.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
