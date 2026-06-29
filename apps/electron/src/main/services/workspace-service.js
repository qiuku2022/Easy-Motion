const fs = require("node:fs");
const path = require("node:path");
const { readJsonFile, atomicWriteJson, ensureDir } = require("./file-service");

const WORKSPACE_VERSION = "1.0";
const WORKSPACE_FILE = "workspace.json";
const DEFAULT_SUBPROJECT = "subprojects/default";

const DEFAULT_WORKSPACE = {
  version: WORKSPACE_VERSION,
  timeline: {
    keyframePanelExpanded: false,
  },
};

function getSubprojectDir(projectRoot, subprojectRelativePath = DEFAULT_SUBPROJECT) {
  return path.join(projectRoot, subprojectRelativePath);
}

function getWorkspacePath(projectRoot, subprojectRelativePath = DEFAULT_SUBPROJECT) {
  return path.join(
    getSubprojectDir(projectRoot, subprojectRelativePath),
    ".easymotion",
    WORKSPACE_FILE,
  );
}

function normalizeWorkspace(raw) {
  return {
    version: WORKSPACE_VERSION,
    timeline: {
      keyframePanelExpanded: Boolean(raw?.timeline?.keyframePanelExpanded),
    },
  };
}

function loadWorkspace(projectRoot, subprojectRelativePath = DEFAULT_SUBPROJECT) {
  const filePath = getWorkspacePath(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(filePath)) {
    return normalizeWorkspace(DEFAULT_WORKSPACE);
  }

  try {
    return normalizeWorkspace(readJsonFile(filePath));
  } catch {
    return normalizeWorkspace(DEFAULT_WORKSPACE);
  }
}

async function saveWorkspace(
  projectRoot,
  subprojectRelativePath = DEFAULT_SUBPROJECT,
  patch = {},
) {
  const current = loadWorkspace(projectRoot, subprojectRelativePath);
  const next = normalizeWorkspace({
    version: WORKSPACE_VERSION,
    timeline: {
      ...current.timeline,
      ...(patch.timeline && typeof patch.timeline === "object" ? patch.timeline : {}),
    },
  });

  const filePath = getWorkspacePath(projectRoot, subprojectRelativePath);
  ensureDir(path.dirname(filePath));
  await atomicWriteJson(filePath, next);
  return next;
}

module.exports = {
  DEFAULT_SUBPROJECT,
  DEFAULT_WORKSPACE,
  getWorkspacePath,
  loadWorkspace,
  normalizeWorkspace,
  saveWorkspace,
};
