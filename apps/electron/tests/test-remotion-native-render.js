const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  DEFAULT_COMPOSITION_ID,
  assertRemotionEntry,
  bundleRemotionProject,
  selectMainComposition,
  removeNativeBundleDir,
} = require("../src/main/services/remotion-native-render");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

async function main() {
  const tmpRoot = path.join(os.tmpdir(), `easymotion-native-render-${Date.now()}`);
  const remotionDir = path.join(tmpRoot, "remotion");
  const bundleDir = path.join(remotionDir, ".easymotion", "bundle-test");

  try {
    write(path.join(remotionDir, "src", "remotion-entry.tsx"), "export {};\n");
    assert(
      assertRemotionEntry(remotionDir).endsWith(path.join("src", "remotion-entry.tsx")),
      "assertRemotionEntry returns entry path"
    );

    const bundleCalls = [];
    const serveUrl = await bundleRemotionProject({
      remotionDir,
      bundleDir,
      enableCaching: false,
      bundle: async (args) => {
        bundleCalls.push(args);
        write(path.join(args.outDir, "asset.js"), "bundle");
        return "serve://test";
      },
    });

    assert(serveUrl === "serve://test", "bundle returns serve url");
    assert(bundleCalls.length === 1, "bundle called once");
    assert(bundleCalls[0].rootDir === remotionDir, "bundle rootDir is remotionDir");
    assert(bundleCalls[0].outDir === bundleDir, "bundle outDir is bundleDir");
    assert(bundleCalls[0].enableCaching === false, "bundle caching flag is passed");

    const selectCalls = [];
    const composition = await selectMainComposition({
      remotionDir,
      serveUrl,
      inputProps: { timeline: { fps: 30 } },
      browserExecutable: "chrome-test",
      binariesDirectory: "bin-test",
      selectComposition: async (args) => {
        selectCalls.push(args);
        return { id: args.id, fps: 30, width: 1280, height: 720, durationInFrames: 90 };
      },
    });

    assert(composition.id === DEFAULT_COMPOSITION_ID, "default composition id used");
    assert(selectCalls[0].browserExecutable === "chrome-test", "browser path passed");
    assert(selectCalls[0].binariesDirectory === "bin-test", "binaries path passed");
    assert(selectCalls[0].inputProps.timeline.fps === 30, "inputProps passed");

    await removeNativeBundleDir(bundleDir);
    assert(!fs.existsSync(bundleDir), "bundle dir removed");

    console.log("test-remotion-native-render: passed");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("test-remotion-native-render: FAIL", error);
  process.exit(1);
});
