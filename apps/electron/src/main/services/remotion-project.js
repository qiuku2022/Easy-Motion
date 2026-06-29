const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { getTemplatesDir } = require("../utils/paths");

const REMOTION_ENTRY = "remotion-entry.tsx";
const REQUIRED_DEPS = {
  "@remotion/bundler": "4.0.269",
  "@remotion/renderer": "4.0.269",
};

function getRemotionDir(projectRoot, subprojectRelativePath = "subprojects/default") {
  return path.join(projectRoot, subprojectRelativePath, "remotion");
}

function getRemotionSrcDir(remotionDir) {
  return path.join(remotionDir, "src");
}

function copyTemplateFile(templateRelativePath, destPath) {
  const templatePath = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    templateRelativePath,
  );
  if (!fs.existsSync(templatePath)) return false;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(templatePath, destPath);
  return true;
}

function ensureRemotionEntry(remotionDir) {
  const entryPath = path.join(remotionDir, "src", REMOTION_ENTRY);
  if (fs.existsSync(entryPath)) return false;
  return copyTemplateFile(`src/${REMOTION_ENTRY}`, entryPath);
}

function ensureRemotionPackageJson(remotionDir) {
  const packagePath = path.join(remotionDir, "package.json");
  if (!fs.existsSync(packagePath)) return false;

  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  pkg.dependencies = pkg.dependencies ?? {};
  let changed = false;

  for (const [name, version] of Object.entries(REQUIRED_DEPS)) {
    if (pkg.dependencies[name] !== version) {
      pkg.dependencies[name] = version;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  }

  return changed;
}

function isRemotionPackageInstalled(remotionDir, packageName) {
  try {
    require.resolve(packageName, { paths: [remotionDir] });
    return true;
  } catch {
    return false;
  }
}

function getMissingRemotionDeps(remotionDir) {
  return Object.keys(REQUIRED_DEPS).filter(
    (name) => !isRemotionPackageInstalled(remotionDir, name),
  );
}

function ensureRemotionProject(remotionDir) {
  const createdEntry = ensureRemotionEntry(remotionDir);
  const changedPackage = ensureRemotionPackageJson(remotionDir);
  const missingDeps = getMissingRemotionDeps(remotionDir);
  return {
    createdEntry,
    changedPackage,
    missingDeps,
    needsInstall: changedPackage || missingDeps.length > 0,
  };
}

function requireFromRemotion(remotionDir, packageName) {
  return require(require.resolve(packageName, { paths: [remotionDir] }));
}

function createNpmProcess(args, cwd) {
  const env = { ...process.env, BROWSER: "none" };
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/d", "/s", "/c", "npm", ...args], {
      cwd,
      windowsHide: true,
      stdio: "inherit",
      env,
    });
  }
  return spawn("npm", args, { cwd, shell: false, stdio: "inherit", env });
}

function installRemotionDeps(remotionDir) {
  return new Promise((resolve, reject) => {
    const child = createNpmProcess(
      ["install", "--no-fund", "--loglevel=error"],
      remotionDir,
    );
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install exited with code ${code}`));
    });
  });
}

/** MainSequence 从 timeline JSON 动态渲染（含预设 props），无需每次改参都重新生成代码 */
function isTimelineDrivenPreview(remotionSrcDir) {
  const mainSeqPath = path.join(remotionSrcDir, "components", "MainSequence.tsx");
  if (!fs.existsSync(mainSeqPath)) return false;
  return fs.readFileSync(mainSeqPath, "utf8").includes("flattenClipsForPreview");
}

function detectCustomRemotionCode(remotionSrcDir) {
  const mainPath = path.join(remotionSrcDir, "components", "MainSequence.tsx");
  if (!fs.existsSync(mainPath)) {
    return { custom: false, reason: null };
  }

  const content = fs.readFileSync(mainPath, "utf8");
  const generatorLayerPattern =
    /<(Text|Image|Shape|Video|Audio|Chart|Animation)Layer\b/;

  if (generatorLayerPattern.test(content)) {
    return { custom: false, reason: null };
  }

  const componentsDir = path.join(remotionSrcDir, "components");
  if (fs.existsSync(componentsDir)) {
    for (const entry of fs.readdirSync(componentsDir, { withFileTypes: true })) {
      if (
        entry.isDirectory() &&
        entry.name !== "layers" &&
        entry.name !== "transitions"
      ) {
        return { custom: true, reason: `自定义模块 components/${entry.name}` };
      }
    }
  }

  return { custom: true, reason: "MainSequence 非 Generator 标准输出" };
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return false;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

const LAYER_FILES = [
  "TextLayer.tsx",
  "ImageLayer.tsx",
  "ShapeLayer.tsx",
  "ChartLayer.tsx",
  "VideoLayer.tsx",
  "ClipTransformWrapper.tsx",
];
const BAD_KEYFRAMES_IMPORT = 'from "../lib/apply-keyframes"';
const GOOD_KEYFRAMES_IMPORT = 'from "../../lib/apply-keyframes"';

function layerNeedsKeyframeSupport(content) {
  return !content.includes("applyKeyframesToClip");
}

function mainSequenceNeedsKeyframePassThrough(content) {
  if (!content.includes("flattenClipsForPreview")) return false;
  return (
    !content.includes("keyframes={clip.keyframes}") ||
    !content.includes("ClipTransformWrapper") ||
    !content.includes("shouldWrapClipMotion")
  );
}

function syncTemplateFile(templateRelativePath, destPath) {
  const templatePath = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    templateRelativePath,
  );
  if (!fs.existsSync(templatePath)) return false;
  const next = fs.readFileSync(templatePath, "utf8");
  if (fs.existsSync(destPath)) {
    const current = fs.readFileSync(destPath, "utf8");
    if (current === next) return false;
  }
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, next, "utf8");
  return true;
}

/** 同步 apply-keyframes、Layer 与 MainSequence，使时间线关键帧在预览中生效 */
function ensureLayerKeyframesImport(remotionDir) {
  const layersDir = path.join(remotionDir, "src", "components", "layers");
  let patched = false;

  const keyframesDest = path.join(remotionDir, "src", "lib", "apply-keyframes.ts");
  patched =
    syncTemplateFile("src/lib/apply-keyframes.ts", keyframesDest) || patched;

  for (const libFile of [
    "src/lib/timeline-coordinates.ts",
    "src/lib/use-layer-screen-position.ts",
    "src/lib/layer-anchor-style.ts",
    "src/lib/clip-motion-wrapper.ts",
  ]) {
    patched =
      syncTemplateFile(
        libFile,
        path.join(remotionDir, libFile),
      ) || patched;
  }

  for (const file of LAYER_FILES) {
    const filePath = path.join(layersDir, file);
    const templatePath = path.join(
      getTemplatesDir(),
      "default-project",
      "subprojects",
      "default",
      "remotion",
      "src",
      "components",
      "layers",
      file,
    );
    if (!fs.existsSync(templatePath)) continue;

    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(layersDir, { recursive: true });
      fs.copyFileSync(templatePath, filePath);
      patched = true;
      continue;
    }

    let content = fs.readFileSync(filePath, "utf8");
    const fixedImport = content.replace(BAD_KEYFRAMES_IMPORT, GOOD_KEYFRAMES_IMPORT);
    if (fixedImport !== content) {
      content = fixedImport;
      fs.writeFileSync(filePath, content, "utf8");
      patched = true;
    }

    const templateContent = fs.readFileSync(templatePath, "utf8");
    const needsUpgrade =
      file === "ClipTransformWrapper.tsx" ||
      layerNeedsKeyframeSupport(content) ||
      content !== templateContent;
    if (needsUpgrade && content !== templateContent) {
      fs.copyFileSync(templatePath, filePath);
      patched = true;
    }
  }

  const mainSeq = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  const templateMain = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "components",
    "MainSequence.tsx",
  );
  if (fs.existsSync(mainSeq) && fs.existsSync(templateMain)) {
    const content = fs.readFileSync(mainSeq, "utf8");
    if (mainSequenceNeedsKeyframePassThrough(content)) {
      fs.copyFileSync(templateMain, mainSeq);
      patched = true;
    }
  }

  return patched;
}

/** 将模板中的 RVE 预设组件同步到已打开项目的 remotion/src（幂等，覆盖 rve 目录） */
function ensurePresetBundle(remotionDir) {
  const templatePresetsDir = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "presets",
  );
  const destPresetsDir = path.join(remotionDir, "src", "presets");
  if (!fs.existsSync(templatePresetsDir)) return false;

  const templateRve = path.join(templatePresetsDir, "rve");
  const destRve = path.join(destPresetsDir, "rve");
  if (fs.existsSync(templateRve)) {
    copyDirRecursive(templateRve, destRve);
  }

  for (const file of ["registry.ts", "rve/index.ts", "ThumbnailComposition.tsx", "ThumbnailRoot.tsx", "thumbnail-entry.tsx"]) {
    const src = path.join(templatePresetsDir, file);
    const dest = path.join(destPresetsDir, file);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  const templateMain = path.join(
    getTemplatesDir(),
    "default-project",
    "subprojects",
    "default",
    "remotion",
    "src",
    "components",
    "MainSequence.tsx",
  );
  const destMain = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  if (fs.existsSync(templateMain) && fs.existsSync(destMain)) {
    const current = fs.readFileSync(destMain, "utf8");
    if (!current.includes("resolvePresetComponent")) {
      fs.copyFileSync(templateMain, destMain);
    }
  }

  return true;
}

async function prepareRemotionForNativeSync(remotionDir) {
  ensurePresetBundle(remotionDir);
  const state = ensureRemotionProject(remotionDir);
  if (state.needsInstall) {
    await installRemotionDeps(remotionDir);
    const stillMissing = getMissingRemotionDeps(remotionDir);
    if (stillMissing.length > 0) {
      throw new Error(
        `E2503: Remotion 依赖未安装完整（缺少 ${stillMissing.join(", ")}）。请在 ${remotionDir} 目录执行 npm install。`,
      );
    }
  }
  return state;
}

module.exports = {
  REMOTION_ENTRY,
  getRemotionDir,
  getRemotionSrcDir,
  ensureRemotionProject,
  ensureRemotionEntry,
  getMissingRemotionDeps,
  isRemotionPackageInstalled,
  requireFromRemotion,
  prepareRemotionForNativeSync,
  detectCustomRemotionCode,
  isTimelineDrivenPreview,
  ensurePresetBundle,
  ensureLayerKeyframesImport,
};
