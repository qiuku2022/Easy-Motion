const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { app } = require("electron");

function getConfigDir() {
  return path.join(os.homedir(), ".easymotion");
}

function getDefaultProjectsParentDir() {
  return path.join(os.homedir(), "Documents", "EasyMotion");
}

function getAppRootDir() {
  if (app?.isPackaged) {
    return app.getAppPath();
  }

  const fromModule = path.resolve(__dirname, "../../..");
  if (fs.existsSync(path.join(fromModule, "package.json"))) {
    return fromModule;
  }

  const appPath = app?.getAppPath?.();
  if (appPath) {
    const fromMainEntry = path.resolve(appPath, "../..");
    if (fs.existsSync(path.join(fromMainEntry, "resources", "templates"))) {
      return fromMainEntry;
    }
    if (fs.existsSync(path.join(appPath, "resources", "templates"))) {
      return appPath;
    }
  }

  return fromModule;
}

function getTemplatesDir() {
  return path.join(getAppRootDir(), "resources/templates");
}

function getPresetsDir() {
  return path.join(getAppRootDir(), "resources/presets");
}

function getPythonBundleDir() {
  const candidates = app?.isPackaged
    ? [path.join(process.resourcesPath, "python")]
    : [path.join(getAppRootDir(), "resources/python")];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "venv")) && fs.existsSync(path.join(dir, "app", "main.py"))) {
      return dir;
    }
  }
  return null;
}

function getBundledPythonExecutable(bundleDir) {
  if (!bundleDir) return null;
  if (process.platform === "win32") {
    const candidates = [
      path.join(bundleDir, "venv", "Scripts", "python.exe"),
      path.join(bundleDir, "venv", "python.exe"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? null;
  }
  const unixPython = path.join(bundleDir, "venv", "bin", "python");
  return fs.existsSync(unixPython) ? unixPython : null;
}

function getPythonRuntimeDir(bundleDir) {
  return bundleDir ? path.join(bundleDir, "runtime") : null;
}

function getPythonAppDir(bundleDir) {
  return bundleDir ? path.join(bundleDir, "app") : null;
}

module.exports = {
  getConfigDir,
  getDefaultProjectsParentDir,
  getAppRootDir,
  getTemplatesDir,
  getPresetsDir,
  getPythonBundleDir,
  getBundledPythonExecutable,
  getPythonRuntimeDir,
  getPythonAppDir,
};
