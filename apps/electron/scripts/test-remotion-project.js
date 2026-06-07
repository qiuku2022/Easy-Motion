const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { removeDirRecursive } = require("../src/main/services/file-service");
const {
  ensureRemotionProject,
  getMissingRemotionDeps,
} = require("../src/main/services/remotion-project");

const tmpRoot = path.join(os.tmpdir(), `easymotion-remotion-proj-${Date.now()}`);

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function run() {
  const remotionDir = path.join(tmpRoot, "remotion");
  write(
    path.join(remotionDir, "package.json"),
    JSON.stringify(
      {
        name: "test-remotion",
        dependencies: {
          remotion: "4.0.269",
          react: "^18.3.1",
        },
      },
      null,
      2,
    ),
  );
  fs.mkdirSync(path.join(remotionDir, "node_modules", "remotion"), { recursive: true });
  write(path.join(remotionDir, "node_modules", "remotion", "package.json"), "{}");

  const before = ensureRemotionProject(remotionDir);
  if (!before.needsInstall) {
    throw new Error("expected needsInstall when @remotion/bundler is missing");
  }
  if (!before.missingDeps.includes("@remotion/bundler")) {
    throw new Error("missingDeps should list @remotion/bundler");
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(remotionDir, "package.json"), "utf8"));
  if (!pkg.dependencies["@remotion/bundler"]) {
    throw new Error("ensureRemotionProject should patch package.json with bundler");
  }

  if (getMissingRemotionDeps(remotionDir).length === 0) {
    throw new Error("bundler should still be missing before npm install");
  }

  console.log("[PASS] remotion-project");
}

try {
  run();
} finally {
  removeDirRecursive(tmpRoot);
}
