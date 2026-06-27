/**
 * 打包后 asar 内必须存在的主进程依赖（pnpm peer 不会自动进包）。
 */
const fs = require("node:fs");
const path = require("node:path");

const REQUIRED = [
  "@langchain/core",
  "@langchain/anthropic",
  "@langchain/openai",
  '"langchain":',
  "@easymotion/shared",
  "presets/thumbnails",
];

function asarContains(header, entry) {
  const variants = [
    entry,
    entry.replace(/\//g, "\\"),
    entry.replace(/\\/g, "/"),
  ];
  return variants.some((needle) => header.includes(needle));
}

function main() {
  const appDir = process.argv[2];
  if (!appDir) {
    console.error("usage: node verify-packaged-deps.cjs <win-unpacked-dir>");
    process.exit(1);
  }

  const asarPath = path.join(appDir, "resources", "app.asar");
  if (!fs.existsSync(asarPath)) {
    console.error(`app.asar not found: ${asarPath}`);
    process.exit(1);
  }

  const header = fs.readFileSync(asarPath);
  const missing = REQUIRED.filter((entry) => !asarContains(header, entry));

  if (missing.length > 0) {
    console.error("[verify-packaged-deps] missing in app.asar:");
    for (const m of missing) console.error(`  - ${m}`);
    process.exit(1);
  }

  console.log("[verify-packaged-deps] ok");
}

main();
