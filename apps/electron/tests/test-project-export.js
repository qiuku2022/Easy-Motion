const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  collectReferencedProjectPaths,
  buildReadme,
  listFilesRecursive,
} = require("../src/main/services/project-export-collect");
const {
  validateProjectExportRequest,
  exportRemotionProjectZip,
} = require("../src/main/services/project-export-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  validateProjectExportRequest({
    projectPath: "/tmp/project",
    outputZipPath: "/tmp/out.zip",
  });

  try {
    validateProjectExportRequest({
      projectPath: "/tmp/project",
      outputZipPath: "/tmp/out.mp4",
    });
    throw new Error("expected zip extension validation");
  } catch (error) {
    assert(String(error.message).includes("E2604"), "zip extension");
  }

  const timeline = {
    tracks: [
      {
        type: "image",
        clips: [
          {
            source: {
              kind: "asset",
              assetId: "a1",
              path: "assets/image/clip.png",
            },
          },
        ],
      },
      {
        type: "chart",
        clips: [{ source: { dataPath: "data/chart.csv" } }],
      },
    ],
  };
  const manifest = {
    assets: [
      {
        id: "a1",
        path: "assets/image/clip.png",
        isDeleted: false,
      },
    ],
  };

  const refs = collectReferencedProjectPaths(timeline, manifest);
  assert(refs.includes("assets/image/clip.png"), "asset path collected");
  assert(refs.includes("data/chart.csv"), "data path collected");

  const readme = buildReadme("演示项目");
  assert(readme.includes("npm install"), "readme install");
  assert(readme.includes("演示项目"), "readme title");

  const templateProject = path.join(
    __dirname,
    "../resources/templates/default-project",
  );
  const remotionDir = path.join(
    templateProject,
    "subprojects/default/remotion",
  );
  assert(fs.existsSync(remotionDir), "template remotion exists");

  const remotionFiles = listFilesRecursive(remotionDir);
  assert(
    remotionFiles.some((f) => f.archivePath === "package.json"),
    "package.json in remotion tree",
  );
  assert(
    !remotionFiles.some((f) => f.archivePath.includes("node_modules")),
    "node_modules excluded",
  );

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-export-"));
  const exportProject = path.join(tmpRoot, "default-project");
  const zipPath = path.join(tmpRoot, "demo-remotion.zip");

  try {
    fs.cpSync(templateProject, exportProject, { recursive: true });

    const result = await exportRemotionProjectZip({
      projectPath: exportProject,
      subprojectPath: "subprojects/default",
      outputZipPath: zipPath,
      includeAssets: true,
    });

    assert(fs.existsSync(result.zipPath), "zip created");
    assert(result.fileSize > 1024, "zip has content");
    assert(result.fileCount > 10, "zip has multiple files");

    const header = fs.readFileSync(zipPath);
    assert(header[0] === 0x50 && header[1] === 0x4b, "zip magic bytes");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  console.log("project export tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
