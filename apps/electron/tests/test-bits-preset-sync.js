const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  ensurePresetBundle,
  ensureRemotionProject,
} = require("../src/main/services/remotion-project");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "em-bits-"));
  const remotionDir = path.join(tmp, "remotion");
  fs.mkdirSync(path.join(remotionDir, "src", "components"), { recursive: true });
  fs.writeFileSync(
    path.join(remotionDir, "package.json"),
    `${JSON.stringify(
      {
        name: "t",
        dependencies: {
          remotion: "4.0.269",
          "@remotion/bundler": "4.0.269",
          "@remotion/renderer": "4.0.269",
        },
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(remotionDir, "src", "components", "MainSequence.tsx"),
    'import { resolvePresetComponent } from "../presets/registry";\n'
  );

  ensurePresetBundle(remotionDir);
  assert(
    fs.existsSync(path.join(remotionDir, "src", "presets", "bits", "index.ts")),
    "bits/index.ts synced"
  );
  assert(
    fs.existsSync(path.join(remotionDir, "src", "presets", "bits", "fade-in.tsx")),
    "bits/fade-in.tsx synced"
  );
  const registry = fs.readFileSync(
    path.join(remotionDir, "src", "presets", "registry.ts"),
    "utf8"
  );
  assert(registry.includes('from "./bits"'), "registry imports bits");

  const state = ensureRemotionProject(remotionDir);
  const pkg = JSON.parse(
    fs.readFileSync(path.join(remotionDir, "package.json"), "utf8")
  );
  assert(state.needsInstall, "needsInstall when remotion-bits missing");
  assert(pkg.dependencies.three, "three added");
  assert(pkg.dependencies["remotion-bits"] === "0.2.0", "remotion-bits added");
  assert(Boolean(pkg.dependencies.culori), "culori added");
  assert(
    fs.existsSync(path.join(remotionDir, "src", "presets", "bits", "3d-basic.tsx")),
    "3d bit synced"
  );

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log("test-bits-preset-sync: passed");
}

main();
