const fs = require("node:fs");
const path = require("node:path");
const {
  atomicWriteJson,
  readJsonFile,
  ensureDir,
  copyDirRecursive,
  removeDirRecursive,
} = require("./file-service");
const {
  getConfigDir,
  getDefaultProjectsParentDir,
  getTemplatesDir,
} = require("../utils/paths");

const RECENT_FILE = "recent-projects.json";
let currentProject = null;

function getRecentFilePath() {
  return path.join(getConfigDir(), RECENT_FILE);
}

function loadRecentList() {
  const recentPath = getRecentFilePath();
  if (!fs.existsSync(recentPath)) return [];
  try {
    const data = readJsonFile(recentPath);
    return Array.isArray(data.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

async function saveRecentList(projects) {
  const recentPath = getRecentFilePath();
  ensureDir(getConfigDir());
  await atomicWriteJson(recentPath, { projects });
}

async function upsertRecent(project) {
  const list = loadRecentList().filter((p) => p.path !== project.path);
  list.unshift(project);
  await saveRecentList(list.slice(0, 20));
}

function sanitizeName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "未命名项目";
}

function stampTemplateProject(projectRoot, config) {
  const now = Date.now();
  const projectPath = path.join(projectRoot, "project.json");
  const project = readJsonFile(projectPath);

  project.name = config.name;
  project.createdAt = now;
  project.modifiedAt = now;
  project.settings.defaultResolution = {
    width: config.width ?? 1920,
    height: config.height ?? 1080,
  };
  const fps = config.fps ?? 30;
  project.settings.defaultFps = fps;
  project.settings.defaultDurationInFrames = config.durationInFrames ?? fps * 5;

  const sub = project.subprojects[0];
  sub.createdAt = now;
  sub.modifiedAt = now;

  const subPath = path.join(projectRoot, sub.path, "subproject.json");
  const subproject = readJsonFile(subPath);
  subproject.timeline.fps = project.settings.defaultFps;
  subproject.timeline.durationInFrames = project.settings.defaultDurationInFrames;
  subproject.timeline.width = project.settings.defaultResolution.width;
  subproject.timeline.height = project.settings.defaultResolution.height;

  return { project, subproject, projectPath, subPath, now };
}

async function createProject(config) {
  const name = sanitizeName(config.name);
  const parentPath = config.parentPath || getDefaultProjectsParentDir();
  const projectRoot = path.join(parentPath, name);

  if (fs.existsSync(projectRoot)) {
    throw new Error("E2101: project directory already exists");
  }

  const templateDir = path.join(getTemplatesDir(), "default-project");
  if (!fs.existsSync(templateDir)) {
    throw new Error("E2103: default project template missing");
  }

  copyDirRecursive(templateDir, projectRoot);

  const stamped = stampTemplateProject(projectRoot, { ...config, name });
  await atomicWriteJson(stamped.subPath, stamped.subproject);
  await atomicWriteJson(stamped.projectPath, stamped.project);

  const summary = {
    id: stamped.project.subprojects[0].id,
    name: stamped.project.name,
    path: projectRoot,
    createdAt: stamped.now,
    modifiedAt: stamped.now,
  };

  currentProject = {
    path: projectRoot,
    data: stamped.project,
  };

  await upsertRecent(summary);
  return { project: stamped.project, path: projectRoot, summary };
}

async function openProject(projectPath) {
  const projectJsonPath = path.join(projectPath, "project.json");
  if (!fs.existsSync(projectJsonPath)) {
    throw new Error("E2104: project.json not found");
  }

  const project = readJsonFile(projectJsonPath);
  const now = Date.now();
  project.modifiedAt = now;
  await atomicWriteJson(projectJsonPath, project);

  currentProject = { path: projectPath, data: project };
  await upsertRecent({
    id: project.subprojects[0]?.id ?? "unknown",
    name: project.name,
    path: projectPath,
    createdAt: project.createdAt,
    modifiedAt: now,
  });

  return { project, path: projectPath };
}

async function saveCurrentProject() {
  if (!currentProject) {
    throw new Error("E2105: no open project");
  }
  const now = Date.now();
  currentProject.data.modifiedAt = now;
  const projectJsonPath = path.join(currentProject.path, "project.json");
  await atomicWriteJson(projectJsonPath, currentProject.data);
  await upsertRecent({
    id: currentProject.data.subprojects[0]?.id ?? "unknown",
    name: currentProject.data.name,
    path: currentProject.path,
    createdAt: currentProject.data.createdAt,
    modifiedAt: now,
  });
  return { project: currentProject.data, path: currentProject.path };
}

function listRecentProjects() {
  return loadRecentList();
}

function readProjectSummary(projectPath) {
  const projectJsonPath = path.join(projectPath, "project.json");
  if (!fs.existsSync(projectJsonPath)) return null;
  try {
    const project = readJsonFile(projectJsonPath);
    return {
      id: project.subprojects?.[0]?.id ?? "unknown",
      name: project.name || path.basename(projectPath),
      path: projectPath,
      createdAt: project.createdAt ?? 0,
      modifiedAt: project.modifiedAt ?? 0,
    };
  } catch {
    return null;
  }
}

function scanProjectsInDirectory(parentDir) {
  if (!fs.existsSync(parentDir)) return [];
  const entries = fs.readdirSync(parentDir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const summary = readProjectSummary(path.join(parentDir, entry.name));
    if (summary) results.push(summary);
  }
  return results;
}

function listLocalProjects() {
  const merged = new Map();

  for (const summary of scanProjectsInDirectory(getDefaultProjectsParentDir())) {
    merged.set(summary.path, summary);
  }

  for (const recent of loadRecentList()) {
    const summary = readProjectSummary(recent.path);
    if (summary) merged.set(summary.path, summary);
  }

  return {
    scanRoot: getDefaultProjectsParentDir(),
    projects: Array.from(merged.values()).sort(
      (a, b) => b.modifiedAt - a.modifiedAt
    ),
  };
}

async function deleteProject(projectPath, options = {}) {
  const keepOutput = Boolean(options.keepOutput);
  const list = loadRecentList().filter((p) => p.path !== projectPath);
  await saveRecentList(list);

  if (currentProject?.path === projectPath) {
    currentProject = null;
  }

  if (!keepOutput && fs.existsSync(projectPath)) {
    removeDirRecursive(projectPath);
  }

  return { success: true, path: projectPath };
}

function getCurrentProject() {
  return currentProject;
}

function closeCurrentProject() {
  if (!currentProject) {
    return { closed: false };
  }
  currentProject = null;
  return { closed: true };
}

module.exports = {
  createProject,
  openProject,
  saveCurrentProject,
  listRecentProjects,
  listLocalProjects,
  deleteProject,
  getCurrentProject,
  closeCurrentProject,
};
