const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  DEFAULT_WORKSPACE,
  getWorkspacePath,
  loadWorkspace,
  normalizeWorkspace,
  saveWorkspace,
} = require("../src/main/services/workspace-service");

function testDefaultWhenMissing() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-ws-"));
  const ws = loadWorkspace(root);
  if (ws.timeline.keyframePanelExpanded !== false) {
    throw new Error("missing workspace should default to collapsed");
  }
}

async function testSaveAndLoadExpanded() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-ws-"));
  fs.mkdirSync(path.join(root, "subprojects/default/.easymotion"), {
    recursive: true,
  });

  await saveWorkspace(root, "subprojects/default", {
    timeline: { keyframePanelExpanded: true },
  });

  const filePath = getWorkspacePath(root);
  if (!fs.existsSync(filePath)) {
    throw new Error("workspace file was not written");
  }

  const loaded = loadWorkspace(root);
  if (!loaded.timeline.keyframePanelExpanded) {
    throw new Error("expanded workspace was not persisted");
  }
}

function testNormalizeInvalid() {
  const normalized = normalizeWorkspace({
    timeline: { keyframePanelExpanded: "yes" },
  });
  if (normalized.timeline.keyframePanelExpanded !== true) {
    throw new Error("truthy string should coerce to true");
  }

  const fallback = loadWorkspace("/nonexistent/path");
  if (fallback.version !== DEFAULT_WORKSPACE.version) {
    throw new Error("invalid path should return default workspace");
  }
}

async function main() {
  testDefaultWhenMissing();
  await testSaveAndLoadExpanded();
  testNormalizeInvalid();
  console.log("[PASS] workspace-service");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
