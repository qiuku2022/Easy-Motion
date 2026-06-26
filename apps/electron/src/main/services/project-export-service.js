const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const archiver = require("archiver");
const timelineService = require("./timeline-service");
const { loadManifest } = require("./asset-service");
const {
  getRemotionDir,
  prepareRemotionForNativeSync,
  isTimelineDrivenPreview,
} = require("./remotion-project");
const { getRemotionSrcDir } = require("./remotion-project");
const { assertWritableOutput } = require("./export-preflight");
const {
  collectReferencedProjectPaths,
  verifyProjectPaths,
  listFilesRecursive,
  buildReadme,
} = require("./project-export-collect");

function validateProjectExportRequest(request) {
  if (!request || typeof request !== "object") {
    throw new Error("E2604: invalid project export request");
  }
  if (!request.projectPath || typeof request.projectPath !== "string") {
    throw new Error("E2105: no open project");
  }
  if (!request.outputZipPath || typeof request.outputZipPath !== "string") {
    throw new Error("E2605: output path required");
  }
  if (!request.outputZipPath.toLowerCase().endsWith(".zip")) {
    throw new Error("E2604: project export output must be a .zip file");
  }
}

async function prepareProjectForExport(projectPath, subprojectPath) {
  const remotionDir = getRemotionDir(projectPath, subprojectPath);
  if (!fs.existsSync(remotionDir)) {
    throw new Error("E2502: remotion project missing");
  }

  await prepareRemotionForNativeSync(remotionDir);
  const timeline = timelineService.loadTimeline(projectPath, subprojectPath);
  timelineService.syncPreviewManifest(projectPath, timeline, subprojectPath);

  const remotionSrcDir = getRemotionSrcDir(remotionDir);
  if (!isTimelineDrivenPreview(remotionSrcDir)) {
    timelineService.generateForSubproject(projectPath, subprojectPath);
  }

  return { remotionDir, timeline };
}

async function zipDirectoryToFile({ files, outputZipPath, readme, onProgress }) {
  await fsp.mkdir(path.dirname(outputZipPath), { recursive: true });

  const total = files.length + 1;
  let processed = 0;

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver("zip", { zlib: { level: 6 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.on("entry", () => {
      processed += 1;
      if (onProgress) {
        onProgress(Math.min(99, Math.round((processed / total) * 100)));
      }
    });

    archive.pipe(output);
    archive.append(readme, { name: "README.md" });

    for (const file of files) {
      archive.file(file.absolutePath, { name: file.archivePath });
    }

    archive.finalize();
  });
}

async function buildProjectZipFileList({
  projectPath,
  remotionDir,
  timeline,
  includeAssets,
}) {
  const files = [];
  const remotionFiles = listFilesRecursive(remotionDir);
  for (const file of remotionFiles) {
    if (file.archivePath === "README.md") continue;
    files.push(file);
  }

  if (includeAssets !== false) {
    const assetManifest = loadManifest(projectPath);
    const referenced = collectReferencedProjectPaths(timeline, assetManifest);
    const { missing } = verifyProjectPaths(projectPath, referenced);
    if (missing.length > 0) {
      throw new Error(
        `E2606: missing referenced files for export: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}`,
      );
    }

    const assetsDir = path.join(projectPath, "assets");
    if (fs.existsSync(assetsDir)) {
      for (const file of listFilesRecursive(assetsDir, { excludeDirs: new Set() })) {
        files.push({
          absolutePath: file.absolutePath,
          archivePath: path.posix.join("assets", file.archivePath),
        });
      }
    }

    const dataDir = path.join(projectPath, "data");
    if (fs.existsSync(dataDir)) {
      for (const file of listFilesRecursive(dataDir, { excludeDirs: new Set() })) {
        files.push({
          absolutePath: file.absolutePath,
          archivePath: path.posix.join("data", file.archivePath),
        });
      }
    }
  }

  return files;
}

async function exportRemotionProjectZip(request, options = {}) {
  validateProjectExportRequest(request);
  await assertWritableOutput(request.outputZipPath);

  const subprojectPath = request.subprojectPath || "subprojects/default";
  const { remotionDir, timeline } = await prepareProjectForExport(
    request.projectPath,
    subprojectPath,
  );

  let projectName = path.basename(request.projectPath);
  try {
    const projectJson = JSON.parse(
      fs.readFileSync(path.join(request.projectPath, "project.json"), "utf8"),
    );
    if (projectJson?.name) projectName = projectJson.name;
  } catch {
    // use folder name
  }

  const files = await buildProjectZipFileList({
    projectPath: request.projectPath,
    remotionDir,
    timeline,
    includeAssets: request.includeAssets,
  });

  if (files.length === 0) {
    throw new Error("E2606: nothing to export");
  }

  const readme = buildReadme(projectName);
  await zipDirectoryToFile({
    files,
    outputZipPath: request.outputZipPath,
    readme,
    onProgress: options.onProgress,
  });

  const stat = await fsp.stat(request.outputZipPath);
  return {
    zipPath: request.outputZipPath,
    fileSize: stat.size,
    fileCount: files.length,
  };
}

module.exports = {
  validateProjectExportRequest,
  prepareProjectForExport,
  collectReferencedProjectPaths,
  buildProjectZipFileList,
  exportRemotionProjectZip,
};
