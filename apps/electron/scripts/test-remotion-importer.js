const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  readJsonFile,
  copyDirRecursive,
  removeDirRecursive,
} = require("../src/main/services/file-service");
const { generateRemotionCode } = require("../src/main/generator");
const { importTimelineFromRemotionAst } = require("../src/main/importer/remotion-to-timeline");
const { readTimelineManifest } = require("../src/main/importer/timeline-manifest");
const { syncTimelineFromRemotion } = require("../src/main/importer/sync-from-remotion");

const tmpRoot = path.join(os.tmpdir(), `easymotion-import-${Date.now()}`);
const remotionDir = path.join(tmpRoot, "remotion");
const remotionSrcDir = path.join(remotionDir, "src");
const templateLayers = path.join(
  __dirname,
  "../resources/templates/default-project/subprojects/default/remotion/src/components/layers",
);

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

async function testGeneratorManifestRoundTrip() {
  const timeline = readJsonFile(
    path.join(__dirname, "../../../packages/shared/fixtures/sample-timeline.json"),
  );

  fs.mkdirSync(path.join(remotionSrcDir, "components", "layers"), { recursive: true });
  copyDirRecursive(templateLayers, path.join(remotionSrcDir, "components", "layers"));
  generateRemotionCode({ remotionSrcDir, timeline });

  const manifest = readTimelineManifest(remotionSrcDir);
  if (!manifest?.timeline?.tracks?.length) {
    throw new Error("generator did not write easymotion-timeline.manifest.json");
  }

  const rootCode = fs.readFileSync(path.join(remotionSrcDir, "Root.tsx"), "utf8");
  if (!rootCode.includes("calculateMetadata")) {
    throw new Error("Root.tsx missing calculateMetadata");
  }
  if (!rootCode.includes("easymotion-timeline.manifest.json")) {
    throw new Error("Root.tsx missing manifest import");
  }

  const imported = await syncTimelineFromRemotion({
    remotionDir,
    remotionSrcDir,
    existingTimeline: timeline,
    evaluateComposition: async () => ({
      id: "Main",
      fps: 30,
      width: 1280,
      height: 720,
      durationInFrames: 90,
      defaultProps: { easymotion: manifest },
    }),
  });

  if (imported.stats.syncSource !== "manifest") {
    throw new Error(`expected manifest (fast path), got ${imported.stats.syncSource}`);
  }
  if (!imported.stats.compositionResolved) {
    throw new Error("Root.tsx metadata should resolve without bundle");
  }
  if (imported.stats.bundlerUsed) {
    throw new Error("generator project should not require bundler");
  }
  if (imported.timeline.tracks.length < 2) {
    throw new Error("manifest sync missing tracks");
  }
}

async function testAstFallback() {
  write(
    path.join(remotionSrcDir, "Root.tsx"),
    `import { Composition } from "remotion";
import { MainSequence } from "./components/MainSequence";
export const RemotionRoot = () => (
  <Composition id="Main" component={MainSequence} durationInFrames={90} fps={30} width={1280} height={720} />
);`,
  );
  write(
    path.join(remotionSrcDir, "components", "MainSequence.tsx"),
    `import { AbsoluteFill, Sequence } from "remotion";
import { TextLayer } from "./layers/TextLayer";
export const MainSequence = () => (
  <AbsoluteFill>
    <Sequence from={0} durationInFrames={90}>
      <TextLayer clipId="clip-title" source={{ kind: "inline", content: "Hi" }} transform={{ position: { x: 0, y: 0 }, scale: 1, rotation: 0, opacity: 1 }} style={{}} />
    </Sequence>
  </AbsoluteFill>
);`,
  );
  fs.mkdirSync(path.join(remotionSrcDir, "components", "layers"), { recursive: true });
  copyDirRecursive(templateLayers, path.join(remotionSrcDir, "components", "layers"));

  const ast = importTimelineFromRemotionAst(remotionSrcDir);
  if (!ast.timeline.tracks.length) {
    throw new Error("AST import failed");
  }
  const first = ast.timeline.tracks[0];
  if (first.type !== "group" || !first.children?.length) {
    throw new Error("AST import should produce group tracks with children");
  }
  const textChild = first.children.find((c) => c.type === "text");
  if (!textChild?.clips[0]?.source?.content) {
    throw new Error("AST import missing editable text source");
  }

  const imported = await syncTimelineFromRemotion({
    remotionDir,
    remotionSrcDir,
    evaluateComposition: async () => ({
      id: "Main",
      fps: 30,
      width: 1280,
      height: 720,
      durationInFrames: 90,
    }),
  });

  if (!readTimelineManifest(remotionSrcDir)) {
    throw new Error("AST sync should write manifest for next native sync");
  }
  if (!imported.stats.compositionResolved) {
    throw new Error("composition metadata should resolve");
  }
}

async function testCorruptManifestDurationRepair() {
  const timeline = readJsonFile(
    path.join(__dirname, "../../../packages/shared/fixtures/sample-timeline.json"),
  );
  fs.mkdirSync(path.join(remotionSrcDir, "components", "layers"), { recursive: true });
  copyDirRecursive(templateLayers, path.join(remotionSrcDir, "components", "layers"));
  generateRemotionCode({ remotionSrcDir, timeline });

  const manifestPath = path.join(remotionSrcDir, "easymotion-timeline.manifest.json");
  const manifest = readJsonFile(manifestPath);
  manifest.timeline.fps = 0;
  manifest.timeline.durationInFrames = 0;
  manifest.timeline.width = 0;
  manifest.timeline.height = 0;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const imported = await syncTimelineFromRemotion({
    remotionDir,
    remotionSrcDir,
    existingTimeline: timeline,
    evaluateComposition: async () => {
      throw new Error("bundle should not be called for corrupt manifest repair");
    },
  });

  if (imported.timeline.durationInFrames !== timeline.durationInFrames) {
    throw new Error(
      `corrupt manifest should repair duration, got ${imported.timeline.durationInFrames}`,
    );
  }
  if (imported.timeline.fps !== timeline.fps) {
    throw new Error(`corrupt manifest should repair fps, got ${imported.timeline.fps}`);
  }

  const repaired = readTimelineManifest(remotionSrcDir);
  if (repaired.timeline.durationInFrames !== timeline.durationInFrames) {
    throw new Error("manifest on disk should be repaired after sync");
  }
}

async function testNewsletterTemplateFastSync() {
  const templateSrc = path.join(
    __dirname,
    "../resources/templates/default-project/subprojects/default/remotion/src",
  );
  copyDirRecursive(templateSrc, remotionSrcDir);

  const imported = await syncTimelineFromRemotion({
    remotionDir,
    remotionSrcDir,
    evaluateComposition: async () => {
      throw new Error("bundle should not be called for newsletter template");
    },
  });

  if (imported.stats.bundlerUsed) {
    throw new Error("newsletter template should use AST fast path");
  }
  if (imported.timeline.tracks.length < 1) {
    throw new Error("newsletter template should import groups");
  }
  const hasText = imported.timeline.tracks.some((t) =>
    (t.children ?? []).some((c) => c.type === "text" && c.clips?.length),
  );
  if (!hasText) {
    throw new Error("newsletter template should import editable text tracks");
  }
  if (!imported.stats.compositionResolved) {
    throw new Error("newsletter Root metadata should resolve");
  }
  if (imported.timeline.fps !== 25 || imported.timeline.durationInFrames !== 125) {
    throw new Error("newsletter metadata mismatch");
  }
}

async function run() {
  try {
    await testGeneratorManifestRoundTrip();
    await testAstFallback();
    await testCorruptManifestDurationRepair();
    await testNewsletterTemplateFastSync();
    console.log("test-remotion-importer: ok");
  } finally {
    removeDirRecursive(tmpRoot);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
