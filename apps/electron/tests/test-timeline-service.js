const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createProject, openProject } = require("../src/main/services/project-service");
const timelineService = require("../src/main/services/timeline-service");

const parentPath = path.join(os.tmpdir(), `easymotion-tl-${Date.now()}`);

async function run() {
  fs.mkdirSync(parentPath, { recursive: true });
  const created = await createProject({ name: "时间线测试", parentPath });

  timelineService.applySampleTimeline(created.path);
  const generated = timelineService.generateForSubproject(created.path);
  const rootPath = path.join(created.path, "subprojects/default/remotion/src/Root.tsx");

  if (!fs.existsSync(rootPath)) {
    throw new Error("generated Root.tsx missing");
  }
  if (generated.files.length < 2) {
    throw new Error("generate output invalid");
  }

  await openProject(created.path);
  const timeline = timelineService.loadTimeline(created.path);
  if (timeline.tracks.length !== 2) {
    throw new Error("sample timeline tracks mismatch");
  }

  fs.rmSync(parentPath, { recursive: true, force: true });
  console.log("[PASS] timeline-service");
}

run().catch((err) => {
  console.error("[FAIL] timeline-service", err);
  process.exit(1);
});
