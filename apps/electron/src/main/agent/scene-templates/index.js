const fs = require("node:fs");
const path = require("node:path");
const { ensureTimelineFitsClip } = require("@easymotion/shared");
const timelineOps = require("../timeline-ops");
const assetService = require("../../services/asset-service");
const dataService = require("../../services/data-service");

const TEMPLATE_IDS = ["product-intro", "data-report", "social-short"];

const ASPECT_SETTINGS = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

function frameSeconds(timeline, seconds) {
  return Math.max(1, Math.round(timeline.fps * seconds));
}

function clampSceneDuration(timeline, params, fallbackSeconds) {
  return Math.max(
    frameSeconds(timeline, 3),
    Math.round(Number(params.durationInFrames ?? frameSeconds(timeline, fallbackSeconds)))
  );
}

function resolveStart(params) {
  const start = Math.round(Number(params.startInFrames ?? 0));
  if (!Number.isFinite(start) || start < 0) {
    throw new Error("startInFrames 必须是非负整数");
  }
  return start;
}

function resolveColor(value, fallback) {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(text) ? text : fallback;
}

function makeGradient(primary, secondary) {
  return `linear-gradient(135deg, ${primary}, ${secondary})`;
}

function addTrack(operations, key, type, name) {
  operations.push({
    op: "createTrack",
    key,
    args: { name, type },
  });
}

function addClip(operations, trackKey, args) {
  operations.push({
    op: "createClip",
    trackKey,
    args,
  });
}

function resolveAsset(projectPath, assetId) {
  if (!assetId) return null;
  if (!projectPath) {
    throw new Error(`需要打开项目才能解析素材: ${assetId}`);
  }
  const asset = assetService.getAssetById(projectPath, assetId);
  if (!asset) {
    throw new Error(`素材不存在: ${assetId}`);
  }
  return asset;
}

function assetSource(asset) {
  return {
    kind: "asset",
    assetId: asset.id,
    publicPath: asset.publicPath,
    path: asset.path,
  };
}

function resolveProjectFile(projectPath, relativeOrAbsolute) {
  const value = String(relativeOrAbsolute ?? "").trim();
  if (!value) throw new Error("数据文件路径不能为空");
  if (path.isAbsolute(value) && fs.existsSync(value)) return value;
  const absolute = path.join(projectPath, value.replace(/\//g, path.sep));
  if (fs.existsSync(absolute)) return absolute;
  throw new Error(`数据文件不存在: ${value}`);
}

function resolveChartData(params, projectPath) {
  if (Array.isArray(params.chartData)) {
    return { data: params.chartData, dataFile: params.dataFile ?? null };
  }

  const rows = Array.isArray(params.rows)
    ? params.rows
    : params.dataFile && projectPath
      ? dataService.parseDataFile(resolveProjectFile(projectPath, params.dataFile)).rows
      : null;

  if (!rows) {
    return {
      needsInput: true,
      requiredInputs: ["chartData 或 rows，使用 dataFile 时还需 xField/yField"],
    };
  }
  if (!params.xField || !params.yField) {
    return {
      needsInput: true,
      requiredInputs: ["xField", "yField"],
    };
  }

  const data = dataService.mapRowsToChartData(rows, params.xField, params.yField);
  if (data.length === 0) {
    return {
      needsInput: true,
      requiredInputs: ["可映射为数值的 yField 数据"],
    };
  }
  return { data, dataFile: params.dataFile ?? null };
}

function textStyle({ fontSize, color, fontWeight = 700, align = "center" }) {
  return {
    fontFamily: "Inter, sans-serif",
    fontSize,
    color,
    fontWeight,
    textAlign: align,
  };
}

function defaultTextTransform(canvas, y, scale = 1) {
  return {
    position: { x: canvas.width / 2, y },
    scale,
    rotation: 0,
    opacity: 1,
  };
}

function buildProductIntro(timeline, params, options) {
  const productName = String(params.productName ?? "").trim();
  if (!productName) {
    return { needsInput: true, requiredInputs: ["productName"] };
  }

  const start = resolveStart(params);
  const duration = clampSceneDuration(timeline, params, 15);
  const primary = resolveColor(params.brandColor, "#2563eb");
  const secondary = resolveColor(params.secondaryColor, "#38bdf8");
  const logo = resolveAsset(options.projectPath, params.logoAssetId);
  const productImage = resolveAsset(options.projectPath, params.productImageAssetId);
  const canvas = { width: timeline.width, height: timeline.height };
  const operations = [];

  addTrack(operations, "bg", "shape", "产品介绍背景");
  addTrack(operations, "title", "text", "产品标题");
  addTrack(operations, "subtitle", "text", "产品标语");
  addTrack(operations, "cta", "text", "行动号召");
  if (logo || productImage) addTrack(operations, "image", "image", "产品素材");

  addClip(operations, "bg", {
    name: "品牌渐变背景",
    startInFrames: start,
    durationInFrames: duration,
    source: { kind: "inline", shape: "rect", width: canvas.width, height: canvas.height },
    transform: defaultTextTransform(canvas, canvas.height / 2),
    style: { background: makeGradient(primary, secondary) },
  });

  addClip(operations, "title", {
    name: "产品名",
    startInFrames: start,
    durationInFrames: duration,
    source: { kind: "inline", content: productName },
    transform: defaultTextTransform(canvas, canvas.height * 0.62),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.075), color: "#ffffff" }),
    animations: { in: { type: "fade", durationInFrames: frameSeconds(timeline, 0.6) } },
  });

  if (params.tagline) {
    addClip(operations, "subtitle", {
      name: "产品标语",
      startInFrames: start + frameSeconds(timeline, 1.2),
      durationInFrames: Math.max(frameSeconds(timeline, 3), duration - frameSeconds(timeline, 2)),
      source: { kind: "inline", content: String(params.tagline) },
      transform: defaultTextTransform(canvas, canvas.height * 0.47),
      style: textStyle({ fontSize: Math.round(canvas.width * 0.032), color: "#e0f2fe", fontWeight: 500 }),
      animations: { in: { type: "slide-up", durationInFrames: frameSeconds(timeline, 0.5) } },
    });
  }

  const mediaAsset = productImage ?? logo;
  if (mediaAsset) {
    addClip(operations, "image", {
      name: mediaAsset.name ?? "产品素材",
      startInFrames: start + frameSeconds(timeline, 2),
      durationInFrames: Math.max(frameSeconds(timeline, 3), duration - frameSeconds(timeline, 4)),
      source: assetSource(mediaAsset),
      transform: {
        position: { x: canvas.width / 2, y: canvas.height * 0.32 },
        scale: 0.72,
        rotation: 0,
        opacity: 1,
      },
      style: { objectFit: "contain" },
    });
  }

  addClip(operations, "cta", {
    name: "结尾 CTA",
    startInFrames: start + Math.max(0, duration - frameSeconds(timeline, 3)),
    durationInFrames: Math.min(frameSeconds(timeline, 3), duration),
    source: { kind: "inline", content: String(params.callToAction ?? "立即开始") },
    transform: defaultTextTransform(canvas, canvas.height * 0.16),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.03), color: "#ffffff", fontWeight: 600 }),
    animations: { in: { type: "fade", durationInFrames: frameSeconds(timeline, 0.4) } },
  });

  return { operations, estimatedDurationInFrames: duration };
}

function buildDataReport(timeline, params, options) {
  const title = String(params.title ?? "").trim();
  if (!title) {
    return { needsInput: true, requiredInputs: ["title"] };
  }

  const chart = resolveChartData(params, options.projectPath);
  if (chart.needsInput) return chart;

  const start = resolveStart(params);
  const duration = clampSceneDuration(timeline, params, 12);
  const primary = resolveColor(params.brandColor, "#0f766e");
  const canvas = { width: timeline.width, height: timeline.height };
  const operations = [];
  const titleDuration = Math.min(frameSeconds(timeline, 3), Math.round(duration * 0.25));
  const outroDuration = Math.min(frameSeconds(timeline, 3), Math.round(duration * 0.25));
  const chartStart = start + titleDuration;
  const chartDuration = Math.max(frameSeconds(timeline, 3), duration - titleDuration - outroDuration);

  addTrack(operations, "bg", "shape", "数据汇报背景");
  addTrack(operations, "title", "text", "汇报标题");
  addTrack(operations, "chart", "chart", "数据图表");
  addTrack(operations, "insight", "text", "关键洞察");

  addClip(operations, "bg", {
    name: "数据汇报背景",
    startInFrames: start,
    durationInFrames: duration,
    source: { kind: "inline", shape: "rect", width: canvas.width, height: canvas.height },
    transform: defaultTextTransform(canvas, canvas.height / 2),
    style: { fillColor: "#07111f" },
  });
  addClip(operations, "title", {
    name: "汇报标题",
    startInFrames: start,
    durationInFrames: titleDuration,
    source: { kind: "inline", content: title },
    transform: defaultTextTransform(canvas, canvas.height * 0.7),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.055), color: "#f8fafc" }),
    animations: { in: { type: "fade", durationInFrames: frameSeconds(timeline, 0.5) } },
  });
  if (params.subtitle) {
    addClip(operations, "title", {
      name: "汇报副标题",
      startInFrames: start + frameSeconds(timeline, 0.8),
      durationInFrames: Math.max(1, titleDuration - frameSeconds(timeline, 0.8)),
      source: { kind: "inline", content: String(params.subtitle) },
      transform: defaultTextTransform(canvas, canvas.height * 0.58),
      style: textStyle({ fontSize: Math.round(canvas.width * 0.026), color: "#94a3b8", fontWeight: 500 }),
    });
  }
  addClip(operations, "chart", {
    name: "数据图表",
    startInFrames: chartStart,
    durationInFrames: chartDuration,
    source: {
      kind: "data",
      chartType: params.chartType ?? "bar",
      data: chart.data,
      xField: params.xField,
      yField: params.yField,
      dataFile: chart.dataFile,
      title,
    },
    transform: defaultTextTransform(canvas, canvas.height * 0.48),
    style: { primaryColor: primary },
    animations: { in: { type: "scale-up", durationInFrames: frameSeconds(timeline, 0.5) } },
  });
  addClip(operations, "insight", {
    name: "关键洞察",
    startInFrames: start + duration - outroDuration,
    durationInFrames: outroDuration,
    source: { kind: "inline", content: String(params.insightText ?? "关键指标表现稳定增长") },
    transform: defaultTextTransform(canvas, canvas.height * 0.18),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.03), color: "#d1fae5", fontWeight: 600 }),
    animations: { in: { type: "fade", durationInFrames: frameSeconds(timeline, 0.4) } },
  });

  return { operations, estimatedDurationInFrames: duration };
}

function buildSocialShort(timeline, params) {
  const hook = String(params.hook ?? "").trim();
  if (!hook) {
    return { needsInput: true, requiredInputs: ["hook"] };
  }
  const points = Array.isArray(params.points) ? params.points.filter(Boolean).slice(0, 4) : [];
  if (points.length === 0) {
    return { needsInput: true, requiredInputs: ["points"] };
  }

  const start = resolveStart(params);
  const duration = clampSceneDuration(timeline, params, 10);
  const aspect = params.aspectRatio ?? "9:16";
  const settings = ASPECT_SETTINGS[aspect];
  const canvas = settings
    ? { width: settings.width, height: settings.height }
    : { width: timeline.width, height: timeline.height };
  const primary = resolveColor(params.brandColor, "#f97316");
  const operations = [];
  const hookDuration = Math.min(frameSeconds(timeline, 2), Math.round(duration * 0.25));
  const endingDuration = Math.min(frameSeconds(timeline, 2), Math.round(duration * 0.2));
  const pointsStart = start + hookDuration;
  const pointDuration = Math.max(1, Math.floor((duration - hookDuration - endingDuration) / points.length));

  if (settings && (settings.width !== timeline.width || settings.height !== timeline.height)) {
    operations.push({
      op: "updateTimelineSettings",
      args: {
        width: settings.width,
        height: settings.height,
        durationInFrames: Math.max(timeline.durationInFrames, start + duration),
        fitExistingClips: true,
      },
    });
  }

  addTrack(operations, "bg", "shape", "短视频背景");
  addTrack(operations, "hook", "text", "开场 Hook");
  addTrack(operations, "points", "text", "要点");
  addTrack(operations, "ending", "text", "结尾");

  addClip(operations, "bg", {
    name: "短视频背景",
    startInFrames: start,
    durationInFrames: duration,
    source: { kind: "inline", shape: "rect", width: canvas.width, height: canvas.height },
    transform: defaultTextTransform(canvas, canvas.height / 2),
    style: { background: makeGradient("#111827", primary) },
  });
  addClip(operations, "hook", {
    name: "开场 Hook",
    startInFrames: start,
    durationInFrames: hookDuration,
    source: { kind: "inline", content: hook },
    transform: defaultTextTransform(canvas, canvas.height * 0.68),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.078), color: "#ffffff" }),
    animations: { in: { type: "scale-up", durationInFrames: frameSeconds(timeline, 0.4) } },
  });

  points.forEach((point, index) => {
    addClip(operations, "points", {
      name: `要点 ${index + 1}`,
      startInFrames: pointsStart + index * pointDuration,
      durationInFrames: pointDuration,
      source: { kind: "inline", content: `${index + 1}. ${point}` },
      transform: defaultTextTransform(canvas, canvas.height * (0.58 - index * 0.1)),
      style: textStyle({ fontSize: Math.round(canvas.width * 0.052), color: "#fff7ed", fontWeight: 600 }),
      animations: { in: { type: "slide-up", durationInFrames: frameSeconds(timeline, 0.35) } },
    });
  });

  addClip(operations, "ending", {
    name: "短视频结尾",
    startInFrames: start + duration - endingDuration,
    durationInFrames: endingDuration,
    source: { kind: "inline", content: String(params.ending ?? "关注获取更多") },
    transform: defaultTextTransform(canvas, canvas.height * 0.2),
    style: textStyle({ fontSize: Math.round(canvas.width * 0.05), color: "#ffffff", fontWeight: 700 }),
    animations: { in: { type: "fade", durationInFrames: frameSeconds(timeline, 0.3) } },
  });

  return { operations, estimatedDurationInFrames: duration };
}

function buildPlan(timeline, params = {}, options = {}) {
  const templateId = params.templateId;
  const templateParams = params.parameters ?? {};
  if (!TEMPLATE_IDS.includes(templateId)) {
    throw new Error(`未知场景模板: ${templateId}`);
  }

  if (templateId === "product-intro") {
    return buildProductIntro(timeline, { ...templateParams, ...params }, options);
  }
  if (templateId === "data-report") {
    return buildDataReport(timeline, { ...templateParams, ...params }, options);
  }
  return buildSocialShort(timeline, { ...templateParams, ...params }, options);
}

function executeOperations(timeline, operations) {
  let next = structuredClone(timeline);
  const trackIds = new Map();
  const createdTracks = [];
  const createdClips = [];

  for (const operation of operations) {
    if (operation.op === "updateTimelineSettings") {
      const result = timelineOps.updateTimelineSettings(next, operation.args);
      next = result.timeline;
      continue;
    }

    if (operation.op === "createTrack") {
      const result = timelineOps.createTrack(next, operation.args);
      next = result.timeline;
      trackIds.set(operation.key, result.track.id);
      createdTracks.push({
        trackId: result.track.id,
        name: result.track.name,
        type: result.track.type,
      });
      continue;
    }

    if (operation.op === "createClip") {
      const trackId = trackIds.get(operation.trackKey);
      if (!trackId) throw new Error(`模板内部错误：未找到轨道 ${operation.trackKey}`);
      const args = { ...operation.args, trackId };
      next = ensureTimelineFitsClip(next, args.startInFrames, args.durationInFrames);
      const result = timelineOps.createClip(next, args);
      next = result.timeline;
      createdClips.push({
        clipId: result.clip.id,
        name: result.clip.name,
        type: result.clip.type,
        trackId,
        startInFrames: result.clip.startInFrames,
        durationInFrames: result.clip.durationInFrames,
      });
    }
  }

  return { timeline: next, createdTracks, createdClips };
}

function publicOperations(operations) {
  return operations.map((operation) => {
    if (operation.op === "createClip") {
      return {
        op: operation.op,
        trackKey: operation.trackKey,
        name: operation.args.name,
        startInFrames: operation.args.startInFrames,
        durationInFrames: operation.args.durationInFrames,
        typeHint: operation.args.source?.kind ?? operation.args.source?.shape ?? "clip",
      };
    }
    return operation;
  });
}

function applySceneTemplate(timeline, params = {}, options = {}) {
  const plan = buildPlan(timeline, params, options);
  if (plan.needsInput) {
    return {
      templateId: params.templateId,
      dryRun: true,
      needsInput: true,
      requiredInputs: plan.requiredInputs ?? [],
      operations: [],
      estimatedDurationInFrames: plan.estimatedDurationInFrames ?? 0,
    };
  }

  const operations = plan.operations ?? [];
  if (params.dryRun) {
    return {
      templateId: params.templateId,
      dryRun: true,
      needsInput: false,
      operations: publicOperations(operations),
      operationCount: operations.length,
      estimatedDurationInFrames: plan.estimatedDurationInFrames,
    };
  }

  const executed = executeOperations(timeline, operations);
  return {
    templateId: params.templateId,
    dryRun: false,
    needsInput: false,
    timeline: executed.timeline,
    operations: publicOperations(operations),
    operationCount: operations.length,
    estimatedDurationInFrames: plan.estimatedDurationInFrames,
    createdTracks: executed.createdTracks,
    createdClips: executed.createdClips,
  };
}

module.exports = {
  TEMPLATE_IDS,
  applySceneTemplate,
  buildPlan,
};
