const path = require("node:path");
const { readJsonFile } = require("../src/main/services/file-service");
const { validateTimeline } = require("@easymotion/shared");

const samplePath = path.join(
  __dirname,
  "../../../packages/shared/fixtures/sample-timeline.json"
);

try {
  const timeline = readJsonFile(samplePath);
  validateTimeline(timeline);
  console.log("[PASS] timeline-schema");
} catch (err) {
  console.error("[FAIL] timeline-schema", err);
  process.exit(1);
}
