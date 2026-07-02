const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createTimelineTools } = require("../src/main/agent/tools");
const timelineOps = require("../src/main/agent/timeline-ops");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 180,
    width: 1280,
    height: 720,
    tracks: [
      {
        id: "track-chart",
        name: "图表",
        type: "chart",
        order: 0,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-chart",
            type: "chart",
            name: "收入图表",
            startInFrames: 0,
            durationInFrames: 120,
            source: { kind: "data", chartType: "line", title: "旧标题", data: [] },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-animation",
        name: "图表预设",
        type: "animation",
        order: 1,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-preset",
            type: "animation",
            name: "折线图预设",
            startInFrames: 0,
            durationInFrames: 120,
            source: {
              kind: "component",
              component: "RveLineChart",
              props: { primaryColor: "#60a5fa" },
            },
            keyframes: [],
          },
        ],
      },
      {
        id: "track-text",
        name: "文字",
        type: "text",
        order: 2,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-text",
            type: "text",
            name: "说明",
            startInFrames: 0,
            durationInFrames: 60,
            source: { kind: "inline", content: "Hello" },
            keyframes: [],
          },
        ],
      },
    ],
  };
}

function getClip(timeline, clipId) {
  return timelineOps.findClipLocation(timeline.tracks, clipId)?.clip;
}

async function main() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-agent-data-"));
  const sourceCsv = path.join(projectRoot, "revenue.csv");
  fs.writeFileSync(
    sourceCsv,
    "month,revenue\nJan,120\nFeb,180\nMar,not-a-number\nApr,240\n",
    "utf8",
  );

  const ctx = new TimelineContext(buildTimeline(), {
    projectPath: projectRoot,
  });
  const tools = createTimelineTools(ctx);
  const toolNames = tools.map((tool) => tool.name);
  assert(toolNames.includes("importDataFile"), "tools include importDataFile");
  assert(toolNames.includes("mapChartData"), "tools include mapChartData");
  assert(toolNames.includes("bindChartData"), "tools include bindChartData");

  const imported = await ctx.importDataFile({ source: sourceCsv });
  assert(imported.relativePath.startsWith("data/"), "importDataFile stores in project data dir");
  assert(imported.headers.includes("month"), "importDataFile returns headers");
  assert(imported.rowCount === 4, "importDataFile returns row count");
  assert(imported.previewRows.length === 4, "importDataFile returns preview rows");
  assert(fs.existsSync(path.join(projectRoot, imported.relativePath)), "importDataFile copies file");

  const mapped = ctx.mapChartData({
    rows: imported.rows,
    xField: "month",
    yField: "revenue",
  });
  assert(mapped.dataPointCount === 3, "mapChartData drops non numeric rows");
  assert(mapped.droppedRows === 1, "mapChartData reports dropped rows");
  assert(mapped.data[0].label === "Jan", "mapChartData maps label");
  assert(mapped.data[0].value === 120, "mapChartData maps value");

  let bound = await ctx.bindChartData({
    clipId: "clip-chart",
    dataFile: imported.relativePath,
    xField: "month",
    yField: "revenue",
    chartType: "bar",
    title: "收入",
  });
  assert(bound.targetKind === "chart", "bindChartData detects chart clip");
  assert(bound.dataPointCount === 3, "bindChartData maps data points");
  let chartClip = getClip(ctx.timeline, "clip-chart");
  assert(chartClip.source.kind === "data", "bindChartData writes chart source kind");
  assert(chartClip.source.chartType === "bar", "bindChartData writes chart type");
  assert(chartClip.source.title === "收入", "bindChartData writes chart title");
  assert(chartClip.source.data.length === 3, "bindChartData writes chart data");
  assert(chartClip.lastModifiedBy === "ai", "bindChartData marks chart ai modified");

  bound = await ctx.bindChartData({
    clipId: "clip-preset",
    rows: [
      { label: "A", value: 1 },
      { label: "B", value: 2 },
    ],
    xField: "label",
    yField: "value",
    title: "预设数据",
  });
  assert(bound.targetKind === "preset", "bindChartData detects animation preset");
  const presetClip = getClip(ctx.timeline, "clip-preset");
  assert(presetClip.source.props.data.length === 2, "bindChartData writes preset props data");
  assert(presetClip.source.props.xField === "label", "bindChartData writes preset xField");
  assert(presetClip.source.props.yField === "value", "bindChartData writes preset yField");
  assert(presetClip.source.props.title === "预设数据", "bindChartData writes preset title");

  let missingFieldThrown = false;
  try {
    ctx.mapChartData({
      rows: imported.rows,
      xField: "missing",
      yField: "revenue",
    });
  } catch (error) {
    missingFieldThrown = error.message.includes("不存在 X 字段");
  }
  assert(missingFieldThrown, "mapChartData rejects missing xField");

  let wrongTargetThrown = false;
  try {
    await ctx.bindChartData({
      clipId: "clip-text",
      rows: [{ label: "A", value: 1 }],
      xField: "label",
      yField: "value",
    });
  } catch (error) {
    wrongTargetThrown = error.message.includes("不是 chart");
  }
  assert(wrongTargetThrown, "bindChartData rejects non chart targets");

  const sourceCtx = new TimelineContext(buildTimeline(), {
    projectPath: projectRoot,
  });
  bound = await sourceCtx.bindChartData({
    query: "收入图表",
    source: sourceCsv,
    xField: "month",
    yField: "revenue",
  });
  assert(bound.clipId === "clip-chart", "bindChartData can locate target by query");
  assert(bound.dataFile?.startsWith("data/"), "bindChartData source imports data file");

  fs.rmSync(projectRoot, { recursive: true, force: true });
  console.log("test-agent-data-tools: passed");
}

main().catch((error) => {
  console.error("test-agent-data-tools: FAIL", error);
  process.exit(1);
});
