/**
 * 确保 electron 已下载完整二进制（path.txt + dist/electron.exe）。
 * pnpm 10 若未 approve electron 的 postinstall，会出现 F5 报 ENOENT path.txt。
 */
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { promisify } = require("node:util");
const { execFileSync } = require("node:child_process");

const ELECTRON_APP = path.join(__dirname, "..");

function getElectronDir() {
  const pkgJson = createRequire(path.join(ELECTRON_APP, "package.json")).resolve(
    "electron/package.json",
  );
  return path.dirname(pkgJson);
}

function platformExecutable() {
  return process.platform === "win32" ? "electron.exe" : "electron";
}

function isElectronReady(electronDir) {
  const exeName = platformExecutable();
  const pathFile = path.join(electronDir, "path.txt");
  const exePath = path.join(electronDir, "dist", exeName);
  if (!fs.existsSync(pathFile) || !fs.existsSync(exePath)) {
    return false;
  }
  try {
    return fs.readFileSync(pathFile, "utf8").trim() === exeName;
  } catch {
    return false;
  }
}

async function downloadAndExtract(electronDir) {
  const req = createRequire(path.join(electronDir, "package.json"));
  const { downloadArtifact } = req("@electron/get");
  const extract = promisify(req("extract-zip"));
  const { version } = req(path.join(electronDir, "package.json"));
  const exeName = platformExecutable();

  console.log(`[ensure-electron] downloading Electron ${version}…`);
  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    force: process.env.ELECTRON_FORCE_DOWNLOAD === "1",
    checksums: req(path.join(electronDir, "checksums.json")),
    platform: process.platform,
    arch: process.arch,
  });

  const distDir = path.join(electronDir, "dist");
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  console.log("[ensure-electron] extracting…");
  await extract(zipPath, { dir: distDir });
  await fs.promises.writeFile(path.join(electronDir, "path.txt"), exeName);
}

async function main() {
  const electronDir = getElectronDir();
  if (isElectronReady(electronDir)) {
    return;
  }

  try {
    await downloadAndExtract(electronDir);
  } catch (err) {
    console.error("[ensure-electron] auto download failed:", err.message || err);
    console.error(
      "Run from repo root: pnpm approve-builds (select electron) && pnpm install",
    );
    process.exit(1);
  }

  if (!isElectronReady(electronDir)) {
    console.error("[ensure-electron] Electron binary still missing after install.");
    process.exit(1);
  }

  console.log("[ensure-electron] ok");
}

main().catch((err) => {
  console.error("[ensure-electron]", err);
  process.exit(1);
});
