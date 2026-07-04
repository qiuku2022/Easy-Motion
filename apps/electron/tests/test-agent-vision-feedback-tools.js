const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { VisionFeedbackContext } = require("../src/main/agent/vision-feedback-context");
const { createVisionFeedbackTools } = require("../src/main/agent/tools/vision-feedback");
const { verifyFrameAgainstGoal } = require("../src/main/agent/frame-inspector");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline(marker = "initial") {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 120,
    width: 1280,
    height: 720,
    marker,
    tracks: [],
  };
}

function createFakeFrameRenderService() {
  const calls = [];
  const renders = new Map();
  return {
    calls,
    async renderFrame(request) {
      calls.push(request);
      const result = {
        renderId: `render-${calls.length}`,
        frame: request.frame,
        subprojectPath: request.subprojectPath,
        image: {
          relativePath: `.easymotion/agent-frames/render-${calls.length}.png`,
          absolutePath: `D:/Project/subprojects/default/.easymotion/agent-frames/render-${calls.length}.png`,
          mime: "image/png",
          width: 1280,
          height: 720,
          bytes: 12,
          sha256: "a".repeat(64),
        },
        timelineSummary: {
          fps: request.timeline.fps,
          durationInFrames: request.timeline.durationInFrames,
        },
        createdAt: 1710000000000 + calls.length,
      };
      renders.set(result.renderId, result);
      return result;
    },
    getFrameRender(renderId) {
      return renders.get(renderId) ?? null;
    },
  };
}

function createFakeFrameInspector(resultFactory) {
  const calls = [];
  return {
    calls,
    async verifyFrameAgainstGoal(input, options) {
      calls.push({ input, options });
      return resultFactory(input, options, calls.length);
    },
  };
}

function createFakePreviewCaptureService() {
  const seeks = [];
  const captures = [];
  const renders = new Map();
  return {
    seeks,
    captures,
    async seekPreview(input) {
      seeks.push(input);
      return {
        requestId: `seek-${seeks.length}`,
        frame: input.frame,
        completedAt: 1710000001000 + seeks.length,
      };
    },
    async capturePreview(request) {
      captures.push(request);
      const result = {
        renderId: `preview-${captures.length}`,
        frame: request.frame ?? null,
        subprojectPath: request.subprojectPath,
        source: "preview",
        image: {
          relativePath: `.easymotion/agent-frames/preview-${captures.length}.png`,
          absolutePath: `D:/Project/subprojects/default/.easymotion/agent-frames/preview-${captures.length}.png`,
          mime: "image/png",
          width: 640,
          height: 360,
          bytes: 24,
          sha256: "c".repeat(64),
        },
        timelineSummary: {
          fps: request.timeline.fps,
          durationInFrames: request.timeline.durationInFrames,
        },
        createdAt: 1710000002000 + captures.length,
      };
      renders.set(result.renderId, result);
      return result;
    },
    getFrameRender(renderId) {
      return renders.get(renderId) ?? null;
    },
  };
}

async function invokeTool(tools, name, args = {}) {
  const found = tools.find((item) => item.name === name);
  if (!found) throw new Error(`tool not found: ${name}`);
  const raw = await found.invoke(args);
  return JSON.parse(raw);
}

async function testRenderFrameToolHappyPath() {
  const fakeService = createFakeFrameRenderService();
  const timelineCtx = new TimelineContext(buildTimeline("initial"), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    currentFrame: 12,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
  });
  const tools = createVisionFeedbackTools(visionCtx);
  const toolNames = tools.map((item) => item.name);
  assert(toolNames.includes("renderFrame"), "tools include renderFrame");
  assert(
    toolNames.includes("verifyFrameAgainstGoal"),
    "tools include verifyFrameAgainstGoal"
  );

  timelineCtx.timeline = buildTimeline("latest-before-render");
  const defaultFrame = await invokeTool(tools, "renderFrame", {
    reason: "默认使用当前播放头",
  });
  assert(defaultFrame.success, "default render succeeds");
  assert(defaultFrame.data.frame === 12, "default uses currentFrame");
  assert(fakeService.calls[0].timeline.marker === "latest-before-render", "service receives latest timeline");
  assert(fakeService.calls[0].projectPath === "D:/Project", "projectPath passed");
  assert(fakeService.calls[0].subprojectPath === "subprojects/default", "subprojectPath passed");

  const seconds = await invokeTool(tools, "renderFrame", {
    timeSeconds: 1.5,
    scale: 0.5,
    reason: "秒转帧",
  });
  assert(seconds.success, "timeSeconds render succeeds");
  assert(seconds.data.frame === 45, "timeSeconds converts with fps");
  assert(fakeService.calls[1].frame === 45, "converted frame passed to service");
  assert(fakeService.calls[1].scale === 0.5, "scale passed to service");

  const checks = visionCtx.getVisualChecks();
  assert(checks.length === 2, "visual checks record renders");
  assert(checks[0].kind === "renderFrame", "visual check kind recorded");
  assert(checks[0].image.relativePath.includes("render-1.png"), "image summary recorded");
  assert(!checks[0].image.absolutePath, "visual check summary omits absolute path");
}

async function testFramePriorityAndLimit() {
  const fakeService = createFakeFrameRenderService();
  const timelineCtx = new TimelineContext(buildTimeline(), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    currentFrame: 3,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
  });
  const tools = createVisionFeedbackTools(visionCtx);

  const first = await invokeTool(tools, "renderFrame", {
    frame: 7,
    timeSeconds: 2,
  });
  assert(first.success, "frame priority render succeeds");
  assert(first.data.frame === 7, "frame has priority over timeSeconds");
  assert(fakeService.calls[0].frame === 7, "priority frame passed");

  const second = await invokeTool(tools, "renderFrame", { frame: 8 });
  assert(second.success, "second render succeeds");

  const third = await invokeTool(tools, "renderFrame", { frame: 9 });
  assert(!third.success, "third render fails due to limit");
  assert(third.error.includes("上限"), "limit error returned");
  assert(fakeService.calls.length === 2, "service not called after limit");
  assert(visionCtx.getVisualChecks().some((entry) => !entry.success), "failure recorded");
}

async function testMissingProjectReturnsToolFailure() {
  const fakeService = createFakeFrameRenderService();
  const timelineCtx = new TimelineContext(buildTimeline(), {
    currentFrame: 0,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
  });
  const tools = createVisionFeedbackTools(visionCtx);

  const result = await invokeTool(tools, "renderFrame", {});
  assert(!result.success, "missing project returns tool failure");
  assert(result.error.includes("没有打开的项目"), "missing project error returned");
  assert(fakeService.calls.length === 0, "service not called without project");
}

async function testVerifyFrameToolHappyPath() {
  const fakeService = createFakeFrameRenderService();
  const fakeInspector = createFakeFrameInspector((input) => ({
    renderId: input.renderId,
    frame: 12,
    pass: true,
    confidence: 0.91,
    failed: false,
    summary: "标题可见且居中",
    issues: [],
    suggestedToolActions: [],
  }));
  const timelineCtx = new TimelineContext(buildTimeline("verify-latest"), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    currentFrame: 0,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
    frameInspector: fakeInspector,
  });
  const tools = createVisionFeedbackTools(visionCtx);

  const result = await invokeTool(tools, "verifyFrameAgainstGoal", {
    renderId: "render-1",
    goal: "确认标题居中可见",
    checks: ["text", "layout"],
  });
  assert(result.success, "verify tool succeeds");
  assert(result.data.pass === true, "verify pass returned");
  assert(result.data.confidence === 0.91, "confidence returned");
  assert(fakeInspector.calls.length === 1, "fake inspector called");
  assert(
    fakeInspector.calls[0].options.timeline.marker === "verify-latest",
    "inspector receives latest timeline"
  );
  const checks = visionCtx.getVisualChecks();
  assert(checks.length === 1, "verification recorded");
  assert(checks[0].kind === "verifyFrameAgainstGoal", "verification kind recorded");
  assert(checks[0].pass === true, "verification pass recorded");
}

async function testPreviewCaptureTools() {
  const fakeService = createFakeFrameRenderService();
  const fakePreview = createFakePreviewCaptureService();
  const fakeInspector = createFakeFrameInspector((input, options) => {
    const metadata = options.frameRenderService.getFrameRender(input.renderId);
    assert(metadata?.source === "preview", "verify can resolve preview captures");
    return {
      renderId: input.renderId,
      frame: metadata.frame,
      pass: true,
      confidence: 0.88,
      failed: false,
      summary: "实时预览画面符合目标",
      issues: [],
      suggestedToolActions: [],
    };
  });
  const timelineCtx = new TimelineContext(buildTimeline("preview-latest"), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    currentFrame: 9,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
    previewCaptureService: fakePreview,
    frameInspector: fakeInspector,
  });
  const tools = createVisionFeedbackTools(visionCtx);
  const toolNames = tools.map((item) => item.name);
  assert(toolNames.includes("seekPlayhead"), "tools include seekPlayhead");
  assert(toolNames.includes("capturePreview"), "tools include capturePreview");

  const seek = await invokeTool(tools, "seekPlayhead", {
    timeSeconds: 2,
    reason: "跳到两秒处",
  });
  assert(seek.success, "seekPlayhead succeeds");
  assert(fakePreview.seeks[0].frame === 60, "seek converts seconds to frame");

  const capture = await invokeTool(tools, "capturePreview", {
    frame: 18,
    reason: "截取当前预览",
  });
  assert(capture.success, "capturePreview succeeds");
  assert(capture.data.renderId === "preview-1", "capture returns renderId");
  assert(fakePreview.captures[0].timeline.marker === "preview-latest", "capture receives latest timeline");

  const verify = await invokeTool(tools, "verifyFrameAgainstGoal", {
    renderId: "preview-1",
    goal: "确认当前预览画面",
  });
  assert(verify.success, "verify preview capture succeeds");
  assert(verify.data.pass === true, "verify returns pass");

  const checks = visionCtx.getVisualChecks();
  assert(checks.some((entry) => entry.kind === "seekPlayhead"), "seek recorded");
  const captureCheck = checks.find((entry) => entry.kind === "capturePreview");
  assert(captureCheck?.image?.relativePath?.includes("preview-1.png"), "capture recorded");
  assert(!captureCheck.image.absolutePath, "capture visual summary omits absolute path");
}

async function testVerifyFrameToolFailureAndLimit() {
  const fakeService = createFakeFrameRenderService();
  const fakeInspector = createFakeFrameInspector((input, _options, index) => {
    if (input.renderId === "missing") {
      throw new Error("renderId not found: missing");
    }
    return {
      renderId: input.renderId,
      frame: index,
      pass: null,
      confidence: 0,
      failed: true,
      summary: "视觉复核失败，无法自动判断",
      issues: [],
      suggestedToolActions: [],
      error: "bad model output",
    };
  });
  const timelineCtx = new TimelineContext(buildTimeline(), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    currentFrame: 0,
  });
  const visionCtx = new VisionFeedbackContext({
    timelineCtx,
    frameRenderService: fakeService,
    frameInspector: fakeInspector,
  });
  const tools = createVisionFeedbackTools(visionCtx);

  const degraded = await invokeTool(tools, "verifyFrameAgainstGoal", {
    renderId: "render-1",
    goal: "确认画面",
  });
  assert(degraded.success, "degraded verification still returns success");
  assert(degraded.data.failed, "degraded result marked failed");

  const missing = await invokeTool(tools, "verifyFrameAgainstGoal", {
    renderId: "missing",
    goal: "确认画面",
  });
  assert(!missing.success, "missing renderId returns tool failure");
  assert(missing.error.includes("renderId not found"), "missing renderId error");

  const third = await invokeTool(tools, "verifyFrameAgainstGoal", {
    renderId: "render-3",
    goal: "确认画面",
  });
  assert(!third.success, "third verify fails due to limit");
  assert(third.error.includes("上限"), "verify limit error returned");
  assert(fakeInspector.calls.length === 2, "inspector not called after limit");
}

async function testFrameInspectorWithFakeModel() {
  const tmpRoot = path.join(os.tmpdir(), `easymotion-frame-inspector-${Date.now()}`);
  const imagePath = path.join(
    tmpRoot,
    "project",
    "subprojects",
    "default",
    ".easymotion",
    "agent-frames",
    "render-1.png"
  );
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.writeFileSync(imagePath, "fake png bytes");
  const metadata = {
    renderId: "render-1",
    frame: 30,
    image: {
      absolutePath: imagePath,
      relativePath: ".easymotion/agent-frames/render-1.png",
      mime: "image/png",
      width: 1280,
      height: 720,
      bytes: 12,
      sha256: "b".repeat(64),
    },
    timelineSummary: { fps: 30, durationInFrames: 120, width: 1280, height: 720 },
  };
  const fakeFrameRenderService = {
    getFrameRender(renderId) {
      return renderId === "render-1" ? metadata : null;
    },
  };
  const modelCalls = [];
  const fakeModel = {
    async invoke(messages) {
      modelCalls.push(messages);
      const content = messages[0].content;
      assert(Array.isArray(content), "multimodal message content is array");
      assert(
        content.some((block) => block.type === "image_url"),
        "message includes image block"
      );
      return {
        content:
          '{"pass":false,"confidence":0.82,"summary":"颜色不符合","issues":[{"kind":"color","severity":"medium","target":"标题","expected":"白色","observed":"蓝色"}],"suggestedToolActions":[{"tool":"updateClip","reason":"改为白色","paramsHint":{"updates":{"style.color":"#ffffff"}}}]}',
      };
    },
  };

  try {
    const result = await verifyFrameAgainstGoal(
      {
        renderId: "render-1",
        goal: "标题是白色",
        checks: ["color"],
      },
      {
        frameRenderService: fakeFrameRenderService,
        model: fakeModel,
        timeline: buildTimeline(),
      }
    );
    assert(result.pass === false, "inspector parses pass false");
    assert(result.confidence === 0.82, "inspector parses confidence");
    assert(result.issues.length === 1, "inspector parses issues");
    assert(result.suggestedToolActions.length === 1, "inspector parses actions");

    const badModel = {
      async invoke() {
        return { content: "not json" };
      },
    };
    const degraded = await verifyFrameAgainstGoal(
      { renderId: "render-1", goal: "确认画面" },
      { frameRenderService: fakeFrameRenderService, model: badModel }
    );
    assert(degraded.failed, "non-json model output degrades");
    assert(degraded.pass === null, "degraded pass is null");
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

async function main() {
  await testRenderFrameToolHappyPath();
  await testFramePriorityAndLimit();
  await testMissingProjectReturnsToolFailure();
  await testVerifyFrameToolHappyPath();
  await testPreviewCaptureTools();
  await testVerifyFrameToolFailureAndLimit();
  await testFrameInspectorWithFakeModel();
  console.log("test-agent-vision-feedback-tools: passed");
}

main().catch((error) => {
  console.error("test-agent-vision-feedback-tools: FAIL", error);
  process.exit(1);
});
