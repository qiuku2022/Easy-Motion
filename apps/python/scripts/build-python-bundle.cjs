/**
 * 将 Python venv + 依赖 + 标准库运行时复制到 apps/electron/resources/python/
 * 供 electron-builder extraResources 打进安装包（需在目标平台本机构建）。
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveHostPython, venvPythonPath, cleanHostPythonEnv } = require("./resolve-python.cjs");

const PYTHON_ROOT = path.join(__dirname, "..");
const BUILD_DIR = path.join(PYTHON_ROOT, ".build-bundle");
const VENV_DIR = path.join(BUILD_DIR, "venv");
const OUT_DIR = path.join(PYTHON_ROOT, "..", "electron", "resources", "python");
const REQUIREMENTS = path.join(PYTHON_ROOT, "requirements.txt");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    windowsHide: true,
    env: cleanHostPythonEnv(),
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with code ${result.status}`);
  }
  return result;
}

function runCapture(pythonExe, args) {
  const result = spawnSync(pythonExe, args, {
    encoding: "utf8",
    windowsHide: true,
    env: cleanHostPythonEnv(),
  });
  if (result.status !== 0) {
    throw new Error(
      `${pythonExe} ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return String(result.stdout).trim();
}

function rimraf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function copyTree(src, dest, { skipDirNames = new Set() } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipDirNames.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyTree(from, to, { skipDirNames });
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function copyRuntimeFromBasePrefix(basePrefix, runtimeDir) {
  fs.mkdirSync(runtimeDir, { recursive: true });

  if (process.platform === "win32") {
    for (const entry of fs.readdirSync(basePrefix, { withFileTypes: true })) {
      if (entry.isFile() && /\.dll$/i.test(entry.name)) {
        fs.copyFileSync(path.join(basePrefix, entry.name), path.join(runtimeDir, entry.name));
      }
    }
    for (const sub of ["Lib", "DLLs"]) {
      const src = path.join(basePrefix, sub);
      if (fs.existsSync(src)) {
        copyTree(src, path.join(runtimeDir, sub), {
          skipDirNames: new Set(["__pycache__", "test", "tests", "idlelib", "turtledemo"]),
        });
      }
    }
    return;
  }

  const libDir = path.join(basePrefix, "lib");
  if (fs.existsSync(libDir)) {
    copyTree(libDir, path.join(runtimeDir, "lib"), {
      skipDirNames: new Set(["__pycache__"]),
    });
  }

  const binDir = path.join(basePrefix, "bin");
  if (fs.existsSync(binDir)) {
    fs.mkdirSync(path.join(runtimeDir, "bin"), { recursive: true });
    for (const entry of fs.readdirSync(binDir)) {
      if (/^python3(\.\d+)?$/.test(entry) || entry.startsWith("libpython")) {
        fs.copyFileSync(path.join(binDir, entry), path.join(runtimeDir, "bin", entry));
      }
    }
  }
}

function copyAppSource(appDir) {
  fs.mkdirSync(appDir, { recursive: true });
  fs.copyFileSync(path.join(PYTHON_ROOT, "main.py"), path.join(appDir, "main.py"));
  copyTree(path.join(PYTHON_ROOT, "src"), path.join(appDir, "src"), {
    skipDirNames: new Set(["__pycache__"]),
  });
}

function writeManifest(outDir, meta) {
  fs.writeFileSync(path.join(outDir, "manifest.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
}

function main() {
  const host = resolveHostPython();
  if (!host) {
    console.error(
      "未找到 Python 3.10+。请先安装 Python，然后执行：\n" +
        "  cd apps/python && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt",
    );
    process.exit(1);
  }

  console.log(`[build:python] 使用 ${host.command} ${host.extraArgs.join(" ")} (${host.version})`);

  rimraf(BUILD_DIR);
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  run(host.command, [...host.extraArgs, "-m", "venv", "--copies", "--clear", VENV_DIR]);

  const venvPython = venvPythonPath(VENV_DIR);
  if (!venvPython) {
    throw new Error(`venv 创建失败：未找到 ${VENV_DIR} 内的 python`);
  }

  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
  run(venvPython, ["-m", "pip", "install", "-r", REQUIREMENTS]);

  const basePrefix = runCapture(venvPython, [
    "-c",
    "import sys; print(sys.base_prefix)",
  ]);

  console.log("[build:python] 复制 venv 与标准库运行时…");
  rimraf(OUT_DIR);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  copyTree(VENV_DIR, path.join(OUT_DIR, "venv"), {
    skipDirNames: new Set(["__pycache__"]),
  });
  copyRuntimeFromBasePrefix(basePrefix, path.join(OUT_DIR, "runtime"));
  copyAppSource(path.join(OUT_DIR, "app"));

  writeManifest(OUT_DIR, {
    builtAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    pythonVersion: host.version,
    basePrefix,
  });

  console.log(`[build:python] 完成 → ${OUT_DIR}`);
}

main();
