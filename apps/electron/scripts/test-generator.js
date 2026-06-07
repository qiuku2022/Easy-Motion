const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  readJsonFile,
  copyDirRecursive,
  removeDirRecursive,
} = require("../src/main/services/file-service");
const { generateRemotionCode } = require("../src/main/generator");

const tmpRoot = path.join(os.tmpdir(), `easymotion-gen-${Date.now()}`);
const remotionSrcDir = path.join(tmpRoot, "remotion", "src");
const templateLayers = path.join(
  __dirname,
  "../resources/templates/default-project/subprojects/default/remotion/src/components/layers"
);

async function run() {
  const timeline = readJsonFile(
    path.join(__dirname, "../../../packages/shared/fixtures/sample-timeline.json")
  );

  fs.mkdirSync(path.join(remotionSrcDir, "components", "layers"), { recursive: true });
  copyDirRecursive(templateLayers, path.join(remotionSrcDir, "components", "layers"));

  const result = generateRemotionCode({ remotionSrcDir, timeline });
  const rootCode = fs.readFileSync(path.join(remotionSrcDir, "Root.tsx"), "utf8");
  const mainCode = fs.readFileSync(
    path.join(remotionSrcDir, "components", "MainSequence.tsx"),
    "utf8"
  );

  if (!rootCode.includes("easymotion-timeline.manifest.json")) {
    throw new Error("Root.tsx missing manifest import");
  }
  if (!rootCode.includes("calculateMetadata")) {
    throw new Error("Root.tsx missing calculateMetadata");
  }
  if (!mainCode.includes("TextLayer")) {
    throw new Error("MainSequence missing TextLayer");
  }
  if (!mainCode.includes("ShapeLayer")) {
    throw new Error("MainSequence missing ShapeLayer");
  }
  if (!mainCode.includes("Hello EasyMotion")) {
    throw new Error("MainSequence missing text content");
  }

  const config = JSON.parse(
    fs.readFileSync(path.join(remotionSrcDir, "preview-config.json"), "utf8")
  );
  if (config.durationInFrames !== 90) {
    throw new Error("preview-config duration mismatch");
  }
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(remotionSrcDir, "easymotion-timeline.manifest.json"),
      "utf8",
    ),
  );
  if (manifest.timeline.durationInFrames !== 90) {
    throw new Error("manifest duration mismatch");
  }
  if (result.files.length !== 4) {
    throw new Error("generator output file count mismatch");
  }

  removeDirRecursive(tmpRoot);
  console.log("[PASS] generator");
}

run().catch((err) => {
  console.error("[FAIL] generator", err);
  process.exit(1);
});
