const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const {
  getPythonBundleDir,
  getBundledPythonExecutable,
  getPythonRuntimeDir,
  getPythonAppDir,
} = require("../utils/paths");

const WIN_SPAWN_HIDDEN =
  process.platform === "win32" ? { creationFlags: 0x08000000 } : {};

/** @type {import("node:child_process").ChildProcess | null} */
let pythonProcess = null;
let pythonPort = null;
let pythonStatus = "idle";

function getStatus() {
  return {
    status: pythonStatus,
    port: pythonPort,
    pid: pythonProcess?.pid ?? null,
  };
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function pickPort() {
  const preferred = Number(process.env.EASY_MOTION_PYTHON_PORT || 8000);
  if (await isPortFree(preferred)) {
    return preferred;
  }

  for (let port = 8001; port <= 8019; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }

  throw new Error("E1000: no free port for Python service (8000–8019)");
}

function buildPythonEnv(bundleDir) {
  const runtimeDir = getPythonRuntimeDir(bundleDir);
  const venvDir = path.join(bundleDir, "venv");
  const appDir = getPythonAppDir(bundleDir);
  const pathKey = process.platform === "win32" ? "Path" : "PATH";

  const env = {
    ...process.env,
    PYTHONHOME: runtimeDir,
    PYTHONNOUSERSITE: "1",
    VIRTUAL_ENV: venvDir,
    EASY_MOTION_PYTHON_PORT: String(pythonPort ?? ""),
  };

  const scriptsBin =
    process.platform === "win32"
      ? path.join(venvDir, "Scripts")
      : path.join(venvDir, "bin");

  env[pathKey] = [scriptsBin, env[pathKey]].filter(Boolean).join(path.delimiter);

  if (appDir) {
    env.PYTHONPATH = appDir;
  }

  return env;
}

async function startBundledPython() {
  if (pythonProcess) {
    return getStatus();
  }

  const bundleDir = getPythonBundleDir();
  const pythonExe = getBundledPythonExecutable(bundleDir);
  const appDir = getPythonAppDir(bundleDir);

  if (!bundleDir || !pythonExe || !appDir) {
    pythonStatus = "unavailable";
    return getStatus();
  }

  const port = await pickPort();
  pythonPort = port;
  pythonStatus = "starting";

  const env = buildPythonEnv(bundleDir);
  env.EASY_MOTION_PYTHON_PORT = String(port);

  pythonProcess = spawn(
    pythonExe,
    [
      "-m",
      "uvicorn",
      "main:app",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: appDir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      ...WIN_SPAWN_HIDDEN,
    },
  );

  pythonProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(`[python] ${chunk}`);
  });
  pythonProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(`[python] ${chunk}`);
  });

  pythonProcess.on("exit", (code, signal) => {
    if (pythonStatus !== "stopped") {
      pythonStatus = code === 0 ? "stopped" : "crashed";
    }
    pythonProcess = null;
    if (code !== 0 && code !== null) {
      console.error(`[python] exited code=${code} signal=${signal ?? ""}`);
    }
  });

  pythonStatus = "running";
  console.log(`[python] bundled service http://127.0.0.1:${port}`);
  return getStatus();
}

function stopBundledPython() {
  if (!pythonProcess) {
    pythonStatus = "stopped";
    return;
  }
  pythonStatus = "stopped";
  pythonProcess.kill();
  pythonProcess = null;
}

module.exports = {
  startBundledPython,
  stopBundledPython,
  getStatus,
  pickPort,
};
