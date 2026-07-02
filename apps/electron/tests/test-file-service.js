const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  atomicWriteJson,
  readJsonFile,
  ensureDir,
  removeDirRecursive,
} = require("../src/main/services/file-service");

const tmpRoot = path.join(os.tmpdir(), `easymotion-test-${Date.now()}`);
const filePath = path.join(tmpRoot, "sample.json");

async function run() {
  ensureDir(tmpRoot);

  await atomicWriteJson(filePath, { version: "1.0", name: "first" });
  const first = readJsonFile(filePath);
  if (first.name !== "first") throw new Error("read after write failed");

  await atomicWriteJson(filePath, { version: "1.0", name: "second" });
  const second = readJsonFile(filePath);
  if (second.name !== "second") throw new Error("overwrite failed");

  const bakPath = `${filePath}.bak`;
  if (!fs.existsSync(bakPath)) throw new Error("backup file missing");

  removeDirRecursive(tmpRoot);
  console.log("[PASS] file-service");
}

run().catch((err) => {
  console.error("[FAIL] file-service", err);
  process.exit(1);
});
