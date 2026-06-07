const fs = require("node:fs");
const path = require("node:path");
const { readJsonFile } = require("../services/file-service");

const MANIFEST_FILE = "easymotion-timeline.manifest.json";

function getManifestPath(remotionSrcDir) {
  return path.join(remotionSrcDir, MANIFEST_FILE);
}

function readTimelineManifest(remotionSrcDir) {
  const manifestPath = getManifestPath(remotionSrcDir);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return readJsonFile(manifestPath);
  } catch {
    return null;
  }
}

function writeTimelineManifest(remotionSrcDir, timeline, updatedBy = "generator") {
  const manifestPath = getManifestPath(remotionSrcDir);
  const { remotionFingerprint, remotionSyncedAt, remotionSyncSource, ...timelineData } =
    timeline;

  const manifest = {
    version: "1.0",
    compositionId: "Main",
    updatedAt: Date.now(),
    updatedBy,
    timeline: timelineData,
  };

  fs.mkdirSync(remotionSrcDir, { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function extractTracksFromManifest(manifest) {
  if (!manifest?.timeline?.tracks || !Array.isArray(manifest.timeline.tracks)) {
    return null;
  }
  return manifest.timeline.tracks;
}

module.exports = {
  MANIFEST_FILE,
  getManifestPath,
  readTimelineManifest,
  writeTimelineManifest,
  extractTracksFromManifest,
};
