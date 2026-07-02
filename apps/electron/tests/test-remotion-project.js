const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { removeDirRecursive } = require("../src/main/services/file-service");
const {
  ensureRemotionProject,
  ensureLayerKeyframesImport,
  getMissingRemotionDeps,
} = require("../src/main/services/remotion-project");

const tmpRoot = path.join(os.tmpdir(), `easymotion-remotion-proj-${Date.now()}`);

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function run() {
  const remotionDir = path.join(tmpRoot, "remotion");
  write(
    path.join(remotionDir, "package.json"),
    JSON.stringify(
      {
        name: "test-remotion",
        dependencies: {
          remotion: "4.0.269",
          react: "^18.3.1",
        },
      },
      null,
      2,
    ),
  );
  fs.mkdirSync(path.join(remotionDir, "node_modules", "remotion"), { recursive: true });
  write(path.join(remotionDir, "node_modules", "remotion", "package.json"), "{}");

  const before = ensureRemotionProject(remotionDir);
  if (!before.needsInstall) {
    throw new Error("expected needsInstall when @remotion/bundler is missing");
  }
  if (!before.missingDeps.includes("@remotion/bundler")) {
    throw new Error("missingDeps should list @remotion/bundler");
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(remotionDir, "package.json"), "utf8"));
  if (!pkg.dependencies["@remotion/bundler"]) {
    throw new Error("ensureRemotionProject should patch package.json with bundler");
  }

  if (getMissingRemotionDeps(remotionDir).length === 0) {
    throw new Error("bundler should still be missing before npm install");
  }

  const layersDir = path.join(remotionDir, "src", "components", "layers");
  write(
    path.join(layersDir, "TextLayer.tsx"),
    'import { applyKeyframesToClip } from "../lib/apply-keyframes";\n',
  );
  if (!ensureLayerKeyframesImport(remotionDir)) {
    throw new Error("ensureLayerKeyframesImport should patch bad import");
  }
  const fixed = fs.readFileSync(path.join(layersDir, "TextLayer.tsx"), "utf8");
  if (!fixed.includes('from "../../lib/apply-keyframes"')) {
    throw new Error("layer import should be rewritten to ../../lib/apply-keyframes");
  }
  if (!fixed.includes("applyKeyframesToClip")) {
    throw new Error("layer should be replaced with template that applies keyframes");
  }
  if (!fs.existsSync(path.join(remotionDir, "src", "lib", "apply-keyframes.ts"))) {
    throw new Error("apply-keyframes.ts should be copied from template");
  }

  write(
    path.join(layersDir, "TextLayer.tsx"),
    "export const TextLayer = () => null;\n",
  );
  write(
    path.join(remotionDir, "src", "components", "MainSequence.tsx"),
    'import { flattenClipsForPreview } from "../lib/flatten-clips-for-preview";\nexport const MainSequence = () => null;\n',
  );
  if (!ensureLayerKeyframesImport(remotionDir)) {
    throw new Error("ensureLayerKeyframesImport should upgrade legacy layers");
  }
  const upgraded = fs.readFileSync(path.join(layersDir, "TextLayer.tsx"), "utf8");
  if (!upgraded.includes("applyKeyframesToClip")) {
    throw new Error("legacy TextLayer should be upgraded from template");
  }
  const mainSeq = fs.readFileSync(
    path.join(remotionDir, "src", "components", "MainSequence.tsx"),
    "utf8",
  );
  if (!mainSeq.includes("ClipTransformWrapper")) {
    throw new Error("MainSequence should wrap presets with ClipTransformWrapper");
  }
  if (!fs.existsSync(path.join(layersDir, "ClipTransformWrapper.tsx"))) {
    throw new Error("ClipTransformWrapper should be copied from template");
  }

  console.log("[PASS] remotion-project");
}

try {
  run();
} finally {
  removeDirRecursive(tmpRoot);
}
