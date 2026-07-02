const {
  validateExportRequest,
  mapFormatToCodec,
  mapQualityToCrf,
  resolveScale,
  estimateRequiredBytes,
} = require("../src/main/services/export-preflight");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  validateExportRequest({
    projectPath: "/tmp/project",
    outputPath: "/tmp/out.mp4",
    format: "mp4",
    resolution: "1080p",
    quality: "medium",
  });

  try {
    validateExportRequest({
      projectPath: "/tmp/project",
      outputPath: "/tmp/out.mp4",
      format: "avi",
      resolution: "1080p",
      quality: "medium",
    });
    throw new Error("expected invalid format");
  } catch (error) {
    assert(String(error.message).includes("E2604"), "invalid format code");
  }

  assert(mapFormatToCodec("mp4") === "h264", "mp4 codec");
  assert(mapFormatToCodec("webm") === "vp8", "webm codec");
  assert(mapQualityToCrf("high") === 18, "high crf");
  assert(resolveScale("1080p", 1080) === 1, "1080p scale");
  assert(Math.abs(resolveScale("720p", 1080) - 2 / 3) < 0.001, "720p scale");

  const bytes = estimateRequiredBytes(
    { width: 1920, height: 1080, durationInFrames: 100 },
    "original",
  );
  assert(bytes > 50 * 1024 * 1024, "disk estimate has headroom");

  const { formatExportError } = require("../src/main/utils/remotion-binaries");
  assert(
    formatExportError("E2600: spawn EFTYPE").includes("Chrome"),
    "friendly EFTYPE message",
  );

  console.log("export preflight tests passed");
}

main();
