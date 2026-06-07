const fs = require("node:fs");
const path = require("node:path");
let writeChain = Promise.resolve();

function enqueueWrite(task) {
  const run = writeChain.then(task);
  writeChain = run.catch(() => {});
  return run;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function atomicWriteJson(filePath, data) {
  return enqueueWrite(async () => {
    const dir = path.dirname(filePath);
    ensureDir(dir);

    const content = `${JSON.stringify(data, null, 2)}\n`;
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;

    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, bakPath);
    }

    fs.writeFileSync(tmpPath, content, "utf8");
    JSON.parse(fs.readFileSync(tmpPath, "utf8"));
    fs.renameSync(tmpPath, filePath);
    return { path: filePath };
  });
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDirRecursive(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

async function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
}

module.exports = {
  enqueueWrite,
  ensureDir,
  readJsonFile,
  atomicWriteJson,
  copyDirRecursive,
  removeDirRecursive,
  copyFile,
};
