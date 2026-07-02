const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createTimelineTools } = require("../src/main/agent/tools");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 300,
    width: 1280,
    height: 720,
    tracks: [
      {
        id: "track-text",
        name: "文字",
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
            name: "标题",
            startInFrames: 0,
            durationInFrames: 120,
            source: { kind: "inline", content: "Hello" },
            keyframes: [],
          },
        ],
      },
    ],
  };
}

function createFakeExportService() {
  const calls = [];
  let active = null;
  return {
    calls,
    getActiveExport() {
      return active;
    },
    setActive(value) {
      active = value;
    },
    async startVideoExport(request) {
      calls.push(request);
      active = { exportId: "exp-test", kind: "video" };
      return { exportId: "exp-test" };
    },
    async cancelExport(exportId) {
      if (!active || active.exportId !== exportId) {
        throw new Error("E2602: export task not found or already finished");
      }
      active = null;
      return { cancelled: true };
    },
  };
}

async function main() {
  const fakeExportService = createFakeExportService();
  const ctx = new TimelineContext(buildTimeline(), {
    projectPath: "D:/Project",
    subprojectPath: "subprojects/default",
    exportService: fakeExportService,
  });
  const toolNames = createTimelineTools(ctx).map((tool) => tool.name);
  assert(toolNames.includes("getWorkArea"), "tools include getWorkArea");
  assert(toolNames.includes("setWorkArea"), "tools include setWorkArea");
  assert(toolNames.includes("exportVideo"), "tools include exportVideo");
  assert(toolNames.includes("getExportStatus"), "tools include getExportStatus");
  assert(toolNames.includes("cancelExport"), "tools include cancelExport");

  let workArea = ctx.getWorkArea();
  assert(workArea.workArea === null, "getWorkArea returns null custom area");
  assert(workArea.exportRange.inFrame === 0, "getWorkArea default export starts at 0");
  assert(workArea.exportRange.outFrame === 119, "getWorkArea default export ends at content end");

  workArea = ctx.setWorkArea({ inFrame: 90, outFrame: 239 });
  assert(ctx.changed, "setWorkArea marks timeline changed");
  assert(ctx.timeline.workArea.inFrame === 90, "setWorkArea writes inFrame");
  assert(ctx.timeline.workArea.outFrame === 239, "setWorkArea writes outFrame");
  assert(workArea.exportRange.frameCount === 30, "export range caps to content end");

  let invalidThrown = false;
  try {
    ctx.setWorkArea({ inFrame: 200, outFrame: 200 });
  } catch (error) {
    invalidThrown = error.message.includes("Work Area 无效");
  }
  assert(invalidThrown, "setWorkArea rejects invalid frame range");

  workArea = ctx.setWorkArea({ clear: true });
  assert(workArea.workArea === null, "setWorkArea clear removes work area");
  assert(!ctx.timeline.workArea, "setWorkArea clear deletes timeline workArea");

  let missingPathThrown = false;
  try {
    await ctx.exportVideo({ format: "mp4" });
  } catch (error) {
    missingPathThrown = error.message.includes("outputPath");
  }
  assert(missingPathThrown, "exportVideo rejects missing outputPath");
  assert(fakeExportService.calls.length === 0, "exportVideo missing path does not start export");

  const started = await ctx.exportVideo({
    outputPath: "D:/Temp/demo.mp4",
    format: "mp4",
    resolution: "720p",
    quality: "high",
  });
  assert(started.exportId === "exp-test", "exportVideo returns export id");
  assert(started.outputPath === "D:/Temp/demo.mp4", "exportVideo returns output path");
  assert(fakeExportService.calls.length === 1, "exportVideo calls service once");
  assert(fakeExportService.calls[0].projectPath === "D:/Project", "exportVideo passes project path");
  assert(fakeExportService.calls[0].resolution === "720p", "exportVideo passes resolution");

  let status = ctx.getExportStatus();
  assert(status.active && status.exportId === "exp-test", "getExportStatus returns active export");

  let activeThrown = false;
  try {
    await ctx.exportVideo({ outputPath: "D:/Temp/other.mp4" });
  } catch (error) {
    activeThrown = error.message.includes("已有导出任务");
  }
  assert(activeThrown, "exportVideo rejects active export");

  const cancelled = await ctx.cancelExport({});
  assert(cancelled.cancelled, "cancelExport cancels active export");
  assert(cancelled.exportId === "exp-test", "cancelExport uses active export id");
  status = ctx.getExportStatus();
  assert(!status.active, "getExportStatus returns inactive after cancel");

  let missingCancelThrown = false;
  try {
    await ctx.cancelExport({});
  } catch (error) {
    missingCancelThrown = error.message.includes("没有可取消");
  }
  assert(missingCancelThrown, "cancelExport rejects without active export");

  const noProjectCtx = new TimelineContext(buildTimeline(), {
    exportService: fakeExportService,
  });
  let noProjectThrown = false;
  try {
    await noProjectCtx.exportVideo({ outputPath: "D:/Temp/demo.mp4" });
  } catch (error) {
    noProjectThrown = error.message.includes("没有打开的项目");
  }
  assert(noProjectThrown, "exportVideo requires open project");

  console.log("test-agent-export-tools: passed");
}

main().catch((error) => {
  console.error("test-agent-export-tools: FAIL", error);
  process.exit(1);
});
