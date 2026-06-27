const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const CANDIDATES =
  process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];

function cleanHostPythonEnv() {
  const env = { ...process.env };
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;
  delete env.VIRTUAL_ENV;
  return env;
}

function probeVersion(command, extraArgs = []) {
  const result = spawnSync(command, [...extraArgs, "-c", "import sys; print(sys.version_info[:2])"], {
    encoding: "utf8",
    windowsHide: true,
    env: cleanHostPythonEnv(),
  });
  if (result.status !== 0) return null;
  const match = String(result.stdout).trim().match(/^\((\d+),\s*(\d+)\)$/);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major < 3 || (major === 3 && minor < 10)) return null;
  return { command, extraArgs, version: `${major}.${minor}` };
}

function resolveHostPython() {
  for (const candidate of CANDIDATES) {
    if (candidate === "py") {
      const found = probeVersion("py", ["-3"]);
      if (found) return found;
      continue;
    }
    const found = probeVersion(candidate);
    if (found) return found;
  }
  return null;
}

function venvPythonPath(venvDir) {
  return process.platform === "win32"
    ? [
        require("node:path").join(venvDir, "Scripts", "python.exe"),
        require("node:path").join(venvDir, "python.exe"),
      ].find((p) => fs.existsSync(p))
    : require("node:path").join(venvDir, "bin", "python");
}

module.exports = { resolveHostPython, venvPythonPath, probeVersion, cleanHostPythonEnv };
