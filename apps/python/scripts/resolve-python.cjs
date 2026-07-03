const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const MIN_PYTHON = { major: 3, minor: 10 };

function candidateList() {
  if (process.platform === "win32") {
    return [
      { command: "py", extraArgs: ["-3.11"] },
      { command: "py", extraArgs: ["-3.12"] },
      { command: "py", extraArgs: ["-3.10"] },
      { command: "py", extraArgs: ["-3"] },
      { command: "python", extraArgs: [] },
      { command: "python3", extraArgs: [] },
    ];
  }

  return [
    { command: "python3", extraArgs: [] },
    { command: "python", extraArgs: [] },
  ];
}

function cleanHostPythonEnv() {
  const env = { ...process.env };
  delete env.PYTHONHOME;
  delete env.PYTHONPATH;
  delete env.VIRTUAL_ENV;
  return env;
}

function probeVersion(command, extraArgs = []) {
  const result = spawnSync(
    command,
    [...extraArgs, "-c", "import sys; print(sys.version_info[:2])"],
    {
      encoding: "utf8",
      windowsHide: true,
      env: cleanHostPythonEnv(),
    }
  );
  if (result.status !== 0) return null;
  const match = String(result.stdout)
    .trim()
    .match(/^\((\d+),\s*(\d+)\)$/);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (
    major < MIN_PYTHON.major ||
    (major === MIN_PYTHON.major && minor < MIN_PYTHON.minor)
  ) {
    return null;
  }
  return { command, extraArgs, version: `${major}.${minor}` };
}

function resolveHostPython() {
  const explicitPython = process.env.EASYMOTION_PYTHON?.trim();
  if (explicitPython) {
    const found = probeVersion(explicitPython);
    if (found) {
      return { ...found, source: "EASYMOTION_PYTHON" };
    }

    throw new Error(
      `EASYMOTION_PYTHON 指向的 Python 不可用或版本低于 ${MIN_PYTHON.major}.${MIN_PYTHON.minor}: ${explicitPython}`
    );
  }

  for (const candidate of candidateList()) {
    const found = probeVersion(candidate.command, candidate.extraArgs);
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

module.exports = {
  resolveHostPython,
  venvPythonPath,
  probeVersion,
  cleanHostPythonEnv,
};
