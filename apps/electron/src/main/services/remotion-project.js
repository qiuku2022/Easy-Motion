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

async function prepareRemotionForNativeSync(remotionDir) {
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
};
