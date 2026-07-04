const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const {
  renderFrame,
  getFrameRender,
  getActiveFrameRender,
  cleanupFrameRenders,
} = require("../src/main/services/frame-render-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildTimeline(label = "memory") {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 120,
    width: 1280,
    height: 720,
    marker: label,
    tracks: [
      {
        id: "track-text",
        name: "Text",
        type: "text",
        order: 0,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-title",
            type: "text",
            name: "Title",
            startInFrames: 0,
            durationInFrames: 30,
            source: { kind: "inline", content: "Hello M11" },
            keyframes: [],
          },
        ],
      },
    ],
  };
}

function createProjectFixture() {
  const tmpRoot = path.join(os.tmpdir(), `easymotion-frame-render-${Date.now()}`);
  const projectPath = path.join(tmpRoot, "project");
  const subprojectPath = "subprojects/default";
  const subprojectDir = path.join(projectPath, subprojectPath);
  const remotionSrcDir = path.join(subprojectDir, "remotion", "src");
  write(path.join(remotionSrcDir, "remotion-entry.tsx"), "export {};\n");
  write(
    path.join(remotionSrcDir, "easymotion-timeline.manifest.json"),
    `${JSON.stringify({ version: "1.0", timeline: buildTimeline("old") }, null, 2)}\n`
  );
  write(
    path.join(remotionSrcDir, "preview-config.json"),
    `${JSON.stringify({ durationInFrames: 999, fps: 24, width: 1, height: 1 }, null, 2)}\n`
  );
  write(
    path.join(subprojectDir, "subproject.json"),
    `${JSON.stringify({ timeline: buildTimeline("disk") }, null, 2)}\n`
  );
  return { tmpRoot, projectPath, subprojectPath, subprojectDir, remotionSrcDir };
}

function createFakeNativeRender(events = {}) {
  const calls = {
    bundle: [],
    selectComposition: [],
    renderStill: [],
  };
  return {
    calls,
    nativeRender: {
      bundle: async (args) => {
        calls.bundle.push(args);
        events.onBundle?.();
        write(path.join(args.outDir, "bundle.js"), "bundle");
        return "serve://frame-test";
      },
      selectComposition: async (args) => {
        calls.selectComposition.push(args);
        return {
          id: args.id,
          fps: 30,
          width: 1280,
          height: 720,
          durationInFrames: 120,
        };
      },
      renderStill: async (args) => {
        calls.renderStill.push(args);
        await events.onRenderStill?.(args);
        write(args.output, "fake png bytes");
      },
    },
  };
}

function baseOptions(fakeNative, extra = {}) {
  return {
    renderId: extra.renderId ?? "frame-test",
    prepareRemotionForNativeSync: async () => {},
    ensureFrameRenderRuntimeSupport: () => {},
    nativeRender: fakeNative.nativeRender,
    nativeRuntime: { browserExecutable: null, binariesDirectory: null },
    timelineService: {
      loadTimeline() {
        throw new Error("loadTimeline should not be called");
      },
    },
    exportService: {
      getActiveExport() {
        return null;
      },
    },
    ...extra,
  };
}

async function testRenderUsesMemoryTimelineAndRestoresFiles() {
  const fixture = createProjectFixture();
  const fakeNative = createFakeNativeRender({
    onBundle: () => {
      const manifest = readJson(
        path.join(fixture.remotionSrcDir, "easymotion-timeline.manifest.json")
      );
      assert(manifest.updatedBy === "agent-frame-render", "manifest updatedBy set");
      assert(manifest.timeline.marker === "memory", "manifest uses memory timeline");
      const config = readJson(path.join(fixture.remotionSrcDir, "preview-config.json"));
      assert(config.durationInFrames === 150, "preview config uses fitted timeline");
    },
  });

  try {
    const beforeManifest = fs.readFileSync(
      path.join(fixture.remotionSrcDir, "easymotion-timeline.manifest.json"),
      "utf8"
    );
    const beforeConfig = fs.readFileSync(
      path.join(fixture.remotionSrcDir, "preview-config.json"),
      "utf8"
    );
    const beforeSubproject = fs.readFileSync(
      path.join(fixture.subprojectDir, "subproject.json"),
      "utf8"
    );

    const result = await renderFrame(
      {
        projectPath: fixture.projectPath,
        subprojectPath: fixture.subprojectPath,
        timeline: buildTimeline("memory"),
        frame: 10,
        scale: 0.5,
      },
      baseOptions(fakeNative)
    );

    assert(result.renderId === "frame-test", "renderId returned");
    assert(result.frame === 10, "frame returned");
    assert(result.image.relativePath === ".easymotion/agent-frames/frame-test.png", "relative path");
    assert(result.image.bytes > 0, "image bytes recorded");
    assert(result.image.sha256.length === 64, "sha256 recorded");
    assert(result.image.width === 640, "scaled width recorded");
    assert(result.image.height === 360, "scaled height recorded");
    assert(fs.existsSync(result.image.absolutePath), "image file written");
    assert(getFrameRender("frame-test").renderId === "frame-test", "metadata indexed");
    assert(fakeNative.calls.bundle.length === 1, "bundle called");
    assert(fakeNative.calls.selectComposition[0].inputProps.timeline.marker === "memory", "select uses memory timeline");
    assert(fakeNative.calls.renderStill[0].inputProps.timeline.marker === "memory", "renderStill uses memory timeline");
    assert(fakeNative.calls.renderStill[0].frame === 10, "renderStill frame passed");
    assert(
      fs.readFileSync(
        path.join(fixture.remotionSrcDir, "easymotion-timeline.manifest.json"),
        "utf8"
      ) === beforeManifest,
      "manifest restored"
    );
    assert(
      fs.readFileSync(path.join(fixture.remotionSrcDir, "preview-config.json"), "utf8") ===
        beforeConfig,
      "preview config restored"
    );
    assert(
      fs.readFileSync(path.join(fixture.subprojectDir, "subproject.json"), "utf8") ===
        beforeSubproject,
      "subproject.json not touched"
    );
    assert(!getActiveFrameRender(), "active render cleared");
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

async function testValidationAndConflicts() {
  const fixture = createProjectFixture();
  const fakeNative = createFakeNativeRender();
  try {
    let invalidFrameThrown = false;
    try {
      await renderFrame(
        {
          projectPath: fixture.projectPath,
          subprojectPath: fixture.subprojectPath,
          timeline: buildTimeline(),
          frame: 999,
        },
        baseOptions(fakeNative, { renderId: "invalid-frame" })
      );
    } catch (error) {
      invalidFrameThrown = error.message.includes("E2604");
    }
    assert(invalidFrameThrown, "invalid frame rejected");

    let invalidScaleThrown = false;
    try {
      await renderFrame(
        {
          projectPath: fixture.projectPath,
          subprojectPath: fixture.subprojectPath,
          timeline: buildTimeline(),
          frame: 0,
          scale: 0.25,
        },
        baseOptions(fakeNative, { renderId: "invalid-scale" })
      );
    } catch (error) {
      invalidScaleThrown = error.message.includes("scale");
    }
    assert(invalidScaleThrown, "invalid scale rejected");

    let exportConflictThrown = false;
    try {
      await renderFrame(
        {
          projectPath: fixture.projectPath,
          subprojectPath: fixture.subprojectPath,
          timeline: buildTimeline(),
          frame: 0,
        },
        baseOptions(fakeNative, {
          renderId: "export-conflict",
          exportService: {
            getActiveExport() {
              return { exportId: "exp-test", kind: "video" };
            },
          },
        })
      );
    } catch (error) {
      exportConflictThrown = error.message.includes("export is in progress");
    }
    assert(exportConflictThrown, "active export rejected");
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

async function testActiveRenderLock() {
  const fixture = createProjectFixture();
  let releaseRender = null;
  let markRenderStarted = null;
  const renderStarted = new Promise((resolve) => {
    markRenderStarted = resolve;
  });
  const fakeNative = createFakeNativeRender({
    onRenderStill: () => {
      markRenderStarted();
      return new Promise((resolve) => {
        releaseRender = resolve;
      });
    },
  });

  try {
    const first = renderFrame(
      {
        projectPath: fixture.projectPath,
        subprojectPath: fixture.subprojectPath,
        timeline: buildTimeline(),
        frame: 0,
      },
      baseOptions(fakeNative, { renderId: "lock-first" })
    );

    await renderStarted;

    let lockedThrown = false;
    try {
      await renderFrame(
        {
          projectPath: fixture.projectPath,
          subprojectPath: fixture.subprojectPath,
          timeline: buildTimeline(),
          frame: 0,
        },
        baseOptions(fakeNative, { renderId: "lock-second" })
      );
    } catch (error) {
      lockedThrown = error.message.includes("another frame render");
    }
    assert(lockedThrown, "second render rejected while active");
    releaseRender();
    await first;
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

async function testCleanupFrameRenders() {
  const fixture = createProjectFixture();
  try {
    const framesDir = path.join(
      fixture.subprojectDir,
      ".easymotion",
      "agent-frames"
    );
    write(path.join(framesDir, "old.png"), "old");
    write(path.join(framesDir, "old.json"), "{}");
    write(path.join(framesDir, "new.png"), "new");
    write(path.join(framesDir, "new.json"), "{}");
    const oldTime = new Date(Date.now() - 10_000);
    fs.utimesSync(path.join(framesDir, "old.png"), oldTime, oldTime);
    fs.utimesSync(path.join(framesDir, "new.png"), new Date(), new Date());

    const result = await cleanupFrameRenders(
      fixture.projectPath,
      fixture.subprojectPath,
      { maxFiles: 1, maxBytes: 1024 * 1024 }
    );
    assert(result.deleted === 1, "one old render deleted");
    assert(!fs.existsSync(path.join(framesDir, "old.png")), "old png removed");
    assert(!fs.existsSync(path.join(framesDir, "old.json")), "old metadata removed");
    assert(fs.existsSync(path.join(framesDir, "new.png")), "new png retained");
  } finally {
    fs.rmSync(fixture.tmpRoot, { recursive: true, force: true });
  }
}

async function main() {
  await testRenderUsesMemoryTimelineAndRestoresFiles();
  await testValidationAndConflicts();
  await testActiveRenderLock();
  await testCleanupFrameRenders();
  console.log("test-frame-render-service: passed");
}

main().catch((error) => {
  console.error("test-frame-render-service: FAIL", error);
  process.exit(1);
});
