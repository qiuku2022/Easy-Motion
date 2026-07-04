const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  registerPreviewFrameBounds,
  requestPreviewSeek,
  resolvePreviewSeek,
  capturePreview,
  getFrameRender,
} = require("../src/main/services/preview-capture-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createFakeWebContents() {
  const sent = [];
  const captures = [];
  return {
    id: Math.floor(Math.random() * 100000),
    sent,
    captures,
    isDestroyed: () => false,
    send(channel, payload) {
      sent.push({ channel, payload });
    },
    async capturePage(rect) {
      captures.push(rect);
      return {
        getSize: () => ({ width: rect.width, height: rect.height }),
        toPNG: () => Buffer.from("fake preview png"),
      };
    },
  };
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 120,
    width: 1280,
    height: 720,
    tracks: [],
  };
}

async function testSeekRequestAck() {
  const webContents = createFakeWebContents();
  const promise = requestPreviewSeek(
    webContents,
    { frame: 42 },
    { requestId: "seek-test", timeoutMs: 1000 }
  );
  assert(webContents.sent[0].channel === "renderer:preview:seek-requested", "seek request sent");
  assert(webContents.sent[0].payload.frame === 42, "seek frame sent");

  const resolved = resolvePreviewSeek(webContents, {
    requestId: "seek-test",
    frame: 42,
  });
  assert(resolved.resolved, "seek ack resolved");
  const result = await promise;
  assert(result.frame === 42, "seek promise resolves frame");
}

async function testCapturePreview() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-preview-capture-"));
  const projectPath = path.join(root, "project");
  const subprojectPath = path.join("subprojects", "default");
  fs.mkdirSync(path.join(projectPath, subprojectPath), { recursive: true });

  const webContents = createFakeWebContents();
  registerPreviewFrameBounds(webContents, {
    rect: { x: 10.2, y: 20.7, width: 640.4, height: 360.4 },
    devicePixelRatio: 1,
  });

  let seekFrame = null;
  try {
    const result = await capturePreview(
      {
        webContents,
        projectPath,
        subprojectPath,
        timeline: buildTimeline(),
        frame: 15,
        reason: "单测截图",
      },
      {
        captureId: "preview-test",
        requestPreviewSeek: async (_webContents, input) => {
          seekFrame = input.frame;
          return { frame: input.frame };
        },
        settleMs: 0,
      }
    );

    assert(seekFrame === 15, "capture seeks requested frame");
    assert(webContents.captures[0].x === 10, "capture rect x rounded");
    assert(webContents.captures[0].height === 360, "capture rect height rounded");
    assert(result.renderId === "preview-test", "capture id returned");
    assert(result.source === "preview", "capture source marked");
    assert(result.image.bytes > 0, "image bytes recorded");
    assert(result.image.relativePath === ".easymotion/agent-frames/preview-test.png", "relative path recorded");
    assert(getFrameRender("preview-test")?.image.sha256 === result.image.sha256, "metadata cached");

    const metadataPath = path.join(
      projectPath,
      subprojectPath,
      ".easymotion",
      "agent-frames",
      "preview-test.json"
    );
    assert(fs.existsSync(metadataPath), "metadata file written");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main() {
  await testSeekRequestAck();
  await testCapturePreview();
  console.log("test-preview-capture-service: passed");
}

main().catch((error) => {
  console.error("test-preview-capture-service: FAIL", error);
  process.exit(1);
});
