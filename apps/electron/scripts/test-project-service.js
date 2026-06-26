const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  createProject,
  openProject,
  saveCurrentProject,
  listRecentProjects,
  listLocalProjects,
  deleteProject,
  closeCurrentProject,
  getCurrentProject,
} = require("../src/main/services/project-service");

const parentPath = path.join(os.tmpdir(), `easymotion-proj-test-${Date.now()}`);

async function run() {
  fs.mkdirSync(parentPath, { recursive: true });

  const created = await createProject({
    name: "测试项目",
    parentPath,
    width: 1280,
    height: 720,
    fps: 24,
    durationInFrames: 120,
  });

  if (!fs.existsSync(path.join(created.path, "project.json"))) {
    throw new Error("project.json missing");
  }

  const recentAfterCreate = listRecentProjects();
  if (!recentAfterCreate.some((p) => p.path === created.path)) {
    throw new Error("recent list missing created project");
  }

  const local = listLocalProjects();
  if (!local.projects.some((p) => p.path === created.path)) {
    throw new Error("local list missing created project");
  }

  const opened = await openProject(created.path);
  if (opened.project.name !== "测试项目") {
    throw new Error("open project failed");
  }

  opened.project.name = "测试项目-已保存";
  await saveCurrentProject();

  const reopened = await openProject(created.path);
  if (reopened.project.name !== "测试项目-已保存") {
    throw new Error("save project failed");
  }

  const closed = closeCurrentProject();
  if (!closed.closed || getCurrentProject() !== null) {
    throw new Error("close project failed");
  }

  await deleteProject(created.path);
  if (fs.existsSync(created.path)) {
    throw new Error("delete project failed");
  }

  fs.rmSync(parentPath, { recursive: true, force: true });
  console.log("[PASS] project-service");
}

run().catch((err) => {
  console.error("[FAIL] project-service", err);
  process.exit(1);
});
