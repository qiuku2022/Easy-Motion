const fs = require("node:fs");
const path = require("node:path");
const { readJsonFile, atomicWriteJson } = require("./file-service");
const { validateTimeline, fitTimelineDuration } = require("@easymotion/shared");
const { writeTimelineManifest } = require("../importer/timeline-manifest");
const { generateRemotionCode } = require("../generator");
const { fingerprintRemotionSrc } = require("../importer/remotion-fingerprint");
const { syncTimelineFromRemotion } = require("../importer/sync-from-remotion");
const {
  getRemotionDir,
  getRemotionSrcDir,
  prepareRemotionForNativeSync,
  detectCustomRemotionCode,
  isTimelineDrivenPreview,
} = require("./remotion-project");

function getSubprojectDir(projectRoot, subprojectRelativePath = "subprojects/default") {
  return path.join(projectRoot, subprojectRelativePath);
}

function getSubprojectJsonPath(projectRoot, subprojectRelativePath) {
  return path.join(
    getSubprojectDir(projectRoot, subprojectRelativePath),
    "subproject.json",
  );
}

function getRemotionSrcDirForProject(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
) {
  return getRemotionSrcDir(getRemotionDir(projectRoot, subprojectRelativePath));
}

function loadTimeline(projectRoot, subprojectRelativePath = "subprojects/default") {
  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  validateTimeline(subproject.timeline);
  return subproject.timeline;
}

function writePreviewConfig(remotionSrcDir, timeline) {
  const previewConfig = {
    durationInFrames: timeline.durationInFrames,
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
  };
  const previewConfigPath = path.join(remotionSrcDir, "preview-config.json");
  fs.writeFileSync(
    previewConfigPath,
    `${JSON.stringify(previewConfig, null, 2)}\n`,
    "utf8",
  );
}

async function saveTimeline(
  projectRoot,
  timeline,
  subprojectRelativePath = "subprojects/default",
) {
  const fitted = fitTimelineDuration(timeline);
  validateTimeline(fitted);
  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  subproject.timeline = fitted;
  await atomicWriteJson(subprojectPath, subproject);
  return fitted;
}

function applySampleTimeline(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
) {
  const samplePath = path.join(
    __dirname,
    "../../../../../packages/shared/fixtures/sample-timeline.json",
  );
  const timeline = readJsonFile(samplePath);
  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  subproject.timeline = timeline;
  fs.writeFileSync(subprojectPath, `${JSON.stringify(subproject, null, 2)}\n`, "utf8");
  return timeline;
}

function syncPreviewManifest(
  projectRoot,
  timeline,
  subprojectRelativePath = "subprojects/default",
) {
  const remotionSrcDir = getRemotionSrcDirForProject(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(remotionSrcDir)) {
    throw new Error("E2201: remotion/src directory not found");
  }

  const fitted = fitTimelineDuration(timeline);
  const { fingerprint } = fingerprintRemotionSrc(remotionSrcDir);
  const nextTimeline = {
    ...fitted,
    remotionFingerprint: fingerprint,
    remotionSyncedAt: Date.now(),
  };
  validateTimeline(nextTimeline);

  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  subproject.timeline = nextTimeline;
  fs.writeFileSync(subprojectPath, `${JSON.stringify(subproject, null, 2)}\n`, "utf8");
  writeTimelineManifest(remotionSrcDir, nextTimeline, "preview");
  writePreviewConfig(remotionSrcDir, nextTimeline);

  return { manifestWritten: true, timeline: nextTimeline };
}

/** 仅刷新指纹（预览工具链自动修补 Remotion 源码后，避免误报漂移） */
function refreshRemotionFingerprint(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
) {
  const remotionSrcDir = getRemotionSrcDirForProject(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(remotionSrcDir)) {
    return null;
  }

  const { fingerprint } = fingerprintRemotionSrc(remotionSrcDir);
  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  subproject.timeline = {
    ...subproject.timeline,
    remotionFingerprint: fingerprint,
    remotionSyncedAt: Date.now(),
  };
  fs.writeFileSync(subprojectPath, `${JSON.stringify(subproject, null, 2)}\n`, "utf8");

  return { fingerprint, timeline: subproject.timeline };
}

function generateForSubproject(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
) {
  const timeline = loadTimeline(projectRoot, subprojectRelativePath);
  const remotionSrcDir = getRemotionSrcDirForProject(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(remotionSrcDir)) {
    throw new Error("E2201: remotion/src directory not found");
  }
  const { ensurePreviewPlayheadPreserve } = require("./preview-service");
  ensurePreviewPlayheadPreserve(
    getRemotionDir(projectRoot, subprojectRelativePath),
  );
  const result = generateRemotionCode({ remotionSrcDir, timeline });
  const { fingerprint } = fingerprintRemotionSrc(remotionSrcDir);
  timeline.remotionFingerprint = fingerprint;
  timeline.remotionSyncedAt = Date.now();
  timeline.remotionSyncSource = "generate";
  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  subproject.timeline = timeline;
  fs.writeFileSync(subprojectPath, `${JSON.stringify(subproject, null, 2)}\n`, "utf8");
  return result;
}

function checkRemotionDrift(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
) {
  const remotionSrcDir = getRemotionSrcDirForProject(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(remotionSrcDir)) {
    return { drifted: false, reason: "missing-remotion-src" };
  }

  const timeline = loadTimeline(projectRoot, subprojectRelativePath);
  const { fingerprint, fileCount } = fingerprintRemotionSrc(remotionSrcDir);
  const stored = timeline.remotionFingerprint ?? null;
  const drifted = Boolean(stored && stored !== fingerprint);
  const customRemotion = detectCustomRemotionCode(remotionSrcDir);
  const timelineDrivenPreview = isTimelineDrivenPreview(remotionSrcDir);

  return {
    drifted,
    fingerprint,
    storedFingerprint: stored,
    fileCount,
    tracksEmpty: timeline.tracks.length === 0,
    suggestSync:
      !timelineDrivenPreview &&
      (drifted || (timeline.tracks.length === 0 && fileCount > 0)),
    hasCustomRemotionCode: customRemotion.custom,
    customRemotionReason: customRemotion.reason,
    timelineDrivenPreview,
  };
}

async function syncTimelineFromRemotionProject(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
  options = {},
) {
  const remotionDir = getRemotionDir(projectRoot, subprojectRelativePath);
  const remotionSrcDir = getRemotionSrcDir(remotionDir);
  if (!fs.existsSync(remotionSrcDir)) {
    throw new Error("E2201: remotion/src directory not found");
  }

  await prepareRemotionForNativeSync(remotionDir);

  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  const subproject = readJsonFile(subprojectPath);
  const imported = await syncTimelineFromRemotion({
    remotionDir,
    remotionSrcDir,
    existingTimeline: subproject.timeline,
  });

  if (options.preserveTracks && subproject.timeline.tracks?.length > 0) {
    imported.timeline.tracks = subproject.timeline.tracks;
  }

  validateTimeline(imported.timeline);
  subproject.timeline = imported.timeline;
  await atomicWriteJson(subprojectPath, subproject);

  return {
    timeline: imported.timeline,
    stats: imported.stats,
  };
}

module.exports = {
  loadTimeline,
  saveTimeline,
  applySampleTimeline,
  syncPreviewManifest,
  refreshRemotionFingerprint,
  generateForSubproject,
  checkRemotionDrift,
  syncTimelineFromRemotion: syncTimelineFromRemotionProject,
  getRemotionSrcDir: getRemotionSrcDirForProject,
};
