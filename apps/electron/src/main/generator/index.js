const fs = require("node:fs");
const path = require("node:path");
const { validateTimeline, fitTimelineDuration } = require("@easymotion/shared");
const { generateRoot } = require("./generate-root");
const { generateMainSequence } = require("./generate-main-sequence");
const { writeTimelineManifest } = require("../importer/timeline-manifest");
const { ensureDir } = require("../services/file-service");
const { assertTsxSecurity } = require("./security-scan");

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  const body =
    typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  fs.writeFileSync(filePath, body, "utf8");
}

function generateRemotionCode({ remotionSrcDir, timeline }) {
  const fitted = fitTimelineDuration(timeline);
  validateTimeline(fitted);

  const rootPath = path.join(remotionSrcDir, "Root.tsx");
  const mainSequencePath = path.join(remotionSrcDir, "components", "MainSequence.tsx");

  const rootCode = generateRoot(fitted);
  const mainSequenceCode = generateMainSequence(fitted);

  assertTsxSecurity(rootCode);
  assertTsxSecurity(mainSequenceCode);

  const previewConfigPath = path.join(remotionSrcDir, "preview-config.json");
  const manifestPath = path.join(remotionSrcDir, "easymotion-timeline.manifest.json");
  const previewConfig = {
    durationInFrames: fitted.durationInFrames,
    fps: fitted.fps,
    width: fitted.width,
    height: fitted.height,
  };

  writeTimelineManifest(remotionSrcDir, fitted, "generator");
  writeFile(rootPath, rootCode);
  writeFile(mainSequencePath, mainSequenceCode);
  writeFile(previewConfigPath, previewConfig);

  return {
    files: [rootPath, mainSequencePath, previewConfigPath, manifestPath],
  };
}

module.exports = {
  generateRemotionCode,
};
