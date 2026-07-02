const fs = require("node:fs");
const path = require("node:path");
const { ensureTimelineFitsClip } = require("@easymotion/shared");
const {
  clearWorkArea,
  resolveExportFrameRange,
  resolveWorkAreaDisplayRange,
} = require("@easymotion/shared");
const timelineOps = require("./timeline-ops");
const { prepareClipUpdates } = require("./clip-updates");
const { placePresetOnTimeline } = require("./place-preset");
const { resolvePreset } = require("./preset-catalog");
const batchOps = require("./batch-ops");
const sceneTemplates = require("./scene-templates");
const { layoutToPlan } = require("./layout-mapper");
const assetService = require("../services/asset-service");
const dataService = require("../services/data-service");
const exportService = require("../services/export-service");

function extractCssGradient(text) {
  const match = String(text ?? "").match(/(?:linear|radial)-gradient\([^)]*\)/i);
  return match?.[0] ?? null;
}

function summarizeAsset(asset) {
  return {
    id: asset.id,
    name: asset.name,
    originalName: asset.originalName,
    type: asset.type,
    path: asset.path,
    publicPath: asset.publicPath,
    durationInFrames: asset.durationInFrames,
    width: asset.width,
    height: asset.height,
    usageCount: asset.usageCount ?? 0,
    lastUsedAt: asset.lastUsedAt,
    isFavorite: Boolean(asset.isFavorite),
    importedAt: asset.importedAt,
  };
}

function filterAssets(assets, params = {}) {
  let result = assets.filter((asset) => {
    if (params.type && asset.type !== params.type) return false;
    if (params.favoriteOnly && !asset.isFavorite) return false;
    if (params.query) {
      const query = String(params.query).toLowerCase();
      const haystack = [
        asset.name,
        asset.originalName,
        asset.path,
        asset.publicPath,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  if (params.recentOnly) {
    result = [...result].sort(
      (a, b) =>
        (b.lastUsedAt ?? b.importedAt ?? 0) - (a.lastUsedAt ?? a.importedAt ?? 0)
    );
  }

  return result;
}

function resolveProjectFile(projectPath, source) {
  const value = String(source ?? "").trim();
  if (!value) throw new Error("文件路径不能为空");
  if (path.isAbsolute(value) && fs.existsSync(value)) return value;
  const absolute = path.join(projectPath, value.replace(/\//g, path.sep));
  if (fs.existsSync(absolute)) return absolute;
  throw new Error(`文件不存在: ${value}`);
}

function validateDataFields(rows, xField, yField) {
  if (!xField || !yField) {
    throw new Error("必须指定 xField 和 yField");
  }
  const sample = rows.find((row) => row && typeof row === "object");
  if (!sample) {
    throw new Error("数据为空，无法绑定图表");
  }
  if (!(xField in sample)) {
    throw new Error(`数据中不存在 X 字段: ${xField}`);
  }
  if (!(yField in sample)) {
    throw new Error(`数据中不存在 Y 字段: ${yField}`);
  }
}

class TimelineContext {
  constructor(timeline, meta = {}) {
    this.baseTimeline = structuredClone(timeline);
    this.timeline = structuredClone(timeline);
    this.meta = meta;
    this.changed = false;
    this.changeLog = [];
    this.toolErrors = [];
  }

  markChanged() {
    this.changed = true;
  }

  logChange(entry) {
    this.changeLog.push(entry);
  }

  recordToolError(error, meta = {}) {
    this.toolErrors.push({
      message: error?.message || String(error),
      toolName: meta.toolName ?? null,
      input: meta.input ?? null,
    });
  }

  rollback(reason) {
    this.timeline = structuredClone(this.baseTimeline);
    this.changed = false;
    this.changeLog = [];
    this.logChange({ op: "rollback", reason });
  }

  createTrack(params) {
    const result = timelineOps.createTrack(this.timeline, params);
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({ op: "createTrack", trackId: result.track.id, name: result.track.name });
    return result.track;
  }

  createClip(params) {
    const track = timelineOps.findTrackById(this.timeline.tracks, params.trackId);
    let clipParams = params;

    if (track?.type === "shape") {
      const style = { ...(params.style ?? {}) };
      if (!style.background && !style.backgroundImage) {
        const gradient = extractCssGradient(this.meta.userInput);
        if (gradient) {
          style.background = gradient;
          clipParams = { ...params, style };
        }
      }
    }

    const result = timelineOps.createClip(this.timeline, clipParams);
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({ op: "createClip", clipId: result.clip.id, name: result.clip.name });
    return result.clip;
  }

  setAnimation(params) {
    const result = timelineOps.setAnimation(this.timeline, {
      ...params,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "setAnimation",
      clipId: params.clipId,
      animationType: params.animationType,
    });
    return result;
  }

  updateClip(params) {
    const located = timelineOps.findClipLocation(this.timeline.tracks, params.clipId);
    if (!located) {
      throw new Error(`片段不存在: ${params.clipId}`);
    }

    let updates = { ...(params.updates ?? {}) };
    const clip = located.clip;
    const isBackgroundLike =
      clip.type === "shape" ||
      (clip.type === "animation" &&
        /background/i.test(clip.source?.component ?? ""));

    if (isBackgroundLike) {
      const style = { ...(updates.style ?? {}) };
      let styleTouched = false;

      if (!style.background && !style.backgroundImage && !style.fillColor) {
        const gradient = extractCssGradient(this.meta.userInput);
        if (gradient) {
          style.background = gradient;
          styleTouched = true;
        }
      }

      if (styleTouched) {
        updates = { ...updates, style };
      }
    }

    const prepared = prepareClipUpdates(clip, {
      userInput: this.meta.userInput,
      updates,
      selectedClipId: this.meta.selectedElement?.id,
      clipId: params.clipId,
    });

    const result = timelineOps.updateClip(this.timeline, {
      ...params,
      updates: prepared,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "updateClip",
      clipId: params.clipId,
      fields: Object.keys(updates ?? {}),
    });
    return result;
  }

  moveClip(params) {
    const clipId = params.clipId || this.meta.selectedElement?.id;
    if (!clipId) {
      throw new Error("未指定 clipId，且没有选中的片段");
    }

    const result = timelineOps.moveClip(this.timeline, {
      ...params,
      clipId,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "moveClip",
      clipId,
      fromTrackId: result.from.trackId,
      toTrackId: result.to.trackId,
      fromStartInFrames: result.from.startInFrames,
      toStartInFrames: result.to.startInFrames,
      timelineExtended: result.timelineExtended,
    });
    return result;
  }

  updateTimelineSettings(params) {
    const result = timelineOps.updateTimelineSettings(this.timeline, params);
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "updateTimelineSettings",
      before: result.before,
      after: result.after,
      scaledPositions: result.scaledPositions,
      fittedDuration: result.fittedDuration,
    });
    return result;
  }

  queryElement(params) {
    return timelineOps.queryElement(this.timeline, params);
  }

  listTimeline(params = {}) {
    return timelineOps.summarizeTimeline(this.timeline, params);
  }

  getClipDetail(params) {
    return timelineOps.getClipDetail(this.timeline, params);
  }

  queryTimelineRange(params) {
    return timelineOps.queryTimelineRange(this.timeline, params);
  }

  deleteClip(params) {
    const clipId = params.clipId || this.meta.selectedElement?.id;
    if (!clipId) {
      throw new Error("未指定 clipId，且没有选中的片段");
    }

    const result = timelineOps.deleteClip(this.timeline, {
      clipId,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({ op: "deleteClip", clipId });
    return result;
  }

  addKeyframe(params) {
    const clipId = params.clipId || this.meta.selectedElement?.id;
    if (!clipId) {
      throw new Error("未指定 clipId，且没有选中的片段");
    }

    const result = timelineOps.addKeyframe(this.timeline, {
      ...params,
      clipId,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "addKeyframe",
      clipId,
      property: params.property,
      frame: params.frame,
    });
    return result;
  }

  async importAsset(params) {
    const projectPath = this.meta.projectPath;
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法导入素材");
    }

    const asset = await assetService.importAssetSource(
      projectPath,
      params,
      {
        subprojectPath: this.meta.subprojectPath,
        fps: this.timeline.fps,
      }
    );

    this.logChange({
      op: "importAsset",
      assetId: asset.id,
      name: asset.name,
      type: asset.type,
    });

    return asset;
  }

  listAssets(params = {}) {
    const projectPath = this.meta.projectPath;
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法读取素材库");
    }

    const limit = Math.max(1, Math.min(Number(params.limit ?? 20), 100));
    const filtered = filterAssets(assetService.listAssets(projectPath), params);
    return {
      assets: filtered.slice(0, limit).map(summarizeAsset),
      count: filtered.length,
      truncated: filtered.length > limit,
    };
  }

  async placeAsset(params = {}) {
    const projectPath = this.meta.projectPath;
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法放置素材");
    }

    let asset = null;
    if (params.assetId) {
      asset = assetService.getAssetById(projectPath, params.assetId);
      if (!asset) {
        throw new Error(`素材不存在: ${params.assetId}`);
      }
    } else if (params.query) {
      const matches = filterAssets(assetService.listAssets(projectPath), {
        query: params.query,
        type: params.type,
      });
      if (matches.length === 0) {
        throw new Error(`未找到匹配素材: ${params.query}`);
      }
      if (matches.length > 1) {
        const names = matches
          .slice(0, 5)
          .map((item) => `${item.id}:${item.name ?? item.originalName}`)
          .join("、");
        throw new Error(`匹配到多个素材，请指定 assetId：${names}`);
      }
      asset = matches[0];
    } else {
      throw new Error("必须指定 assetId 或 query");
    }

    const startInFrames =
      typeof params.startInFrames === "number"
        ? params.startInFrames
        : Number(this.meta.currentFrame ?? 0);
    const result = timelineOps.placeAsset(this.timeline, asset, {
      ...params,
      startInFrames,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "placeAsset",
      assetId: asset.id,
      clipId: result.clipId,
      trackId: result.trackId,
      name: asset.name ?? asset.originalName,
      type: asset.type,
      createdTrack: result.createdTrack,
      timelineExtended: result.timelineExtended,
    });

    await assetService.recordAssetUsage(projectPath, asset.id);
    return result;
  }

  async importDataFile(params = {}) {
    const projectPath = this.meta.projectPath;
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法导入数据文件");
    }

    const sourcePath = resolveProjectFile(projectPath, params.source);
    const imported = await dataService.importDataFileToProject(projectPath, sourcePath);
    this.logChange({
      op: "importDataFile",
      dataFile: imported.relativePath,
      rowCount: imported.rows.length,
    });
    return {
      relativePath: imported.relativePath,
      headers: imported.headers,
      rowCount: imported.rows.length,
      previewRows: imported.previewRows,
      rows: imported.rows,
    };
  }

  mapChartData(params = {}) {
    const rows = Array.isArray(params.rows) ? params.rows : [];
    validateDataFields(rows, params.xField, params.yField);
    const data = dataService.mapRowsToChartData(rows, params.xField, params.yField);
    return {
      data,
      rowCount: rows.length,
      dataPointCount: data.length,
      droppedRows: rows.length - data.length,
    };
  }

  async resolveChartRows(params = {}) {
    const projectPath = this.meta.projectPath;
    if (Array.isArray(params.rows)) {
      return { rows: params.rows, dataFile: params.dataFile ?? null };
    }
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法读取数据文件");
    }
    if (params.source) {
      const imported = await this.importDataFile({ source: params.source });
      return { rows: imported.rows, dataFile: imported.relativePath };
    }
    if (params.dataFile) {
      const absolute = resolveProjectFile(projectPath, params.dataFile);
      const parsed = dataService.parseDataFile(absolute);
      return { rows: parsed.rows, dataFile: params.dataFile };
    }
    throw new Error("必须提供 rows、dataFile 或 source");
  }

  resolveChartClipId(params = {}) {
    if (params.clipId) return params.clipId;
    if (params.query) {
      const result = timelineOps.queryElement(this.timeline, {
        query: params.query,
        type: "clip",
      });
      if (!result.bestMatch) {
        throw new Error(`未找到图表片段: ${params.query}`);
      }
      return result.bestMatch;
    }
    const selected = this.meta.selectedElement;
    if (selected?.type === "clip" && selected.id) return selected.id;
    throw new Error("必须指定 clipId、query，或选中一个图表片段");
  }

  async bindChartData(params = {}) {
    const clipId = this.resolveChartClipId(params);
    const located = timelineOps.findClipLocation(this.timeline.tracks, clipId);
    if (!located) {
      throw new Error(`片段不存在: ${clipId}`);
    }

    const { rows, dataFile } = await this.resolveChartRows(params);
    validateDataFields(rows, params.xField, params.yField);
    const data = dataService.mapRowsToChartData(rows, params.xField, params.yField);
    if (data.length === 0) {
      throw new Error("映射后的图表数据为空");
    }

    const clip = located.clip;
    let updates;
    let targetKind;
    if (clip.type === "chart") {
      targetKind = "chart";
      updates = {
        source: {
          kind: "data",
          chartType: params.chartType ?? clip.source?.chartType ?? "line",
          data,
          xField: params.xField,
          yField: params.yField,
          dataFile,
          title: params.title ?? clip.source?.title ?? clip.name,
        },
      };
    } else if (clip.type === "animation") {
      targetKind = "preset";
      updates = {
        "source.props.data": data,
        "source.props.xField": params.xField,
        "source.props.yField": params.yField,
        "source.props.dataFile": dataFile,
      };
      if (params.chartType) updates["source.props.chartType"] = params.chartType;
      if (params.title) updates["source.props.title"] = params.title;
    } else {
      throw new Error("目标片段不是 chart 轨道或图表预设片段");
    }

    const result = timelineOps.updateClip(this.timeline, {
      clipId,
      updates,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "bindChartData",
      clipId,
      targetKind,
      dataFile,
      rowCount: rows.length,
      dataPointCount: data.length,
      xField: params.xField,
      yField: params.yField,
    });

    return {
      clipId,
      targetKind,
      rowCount: rows.length,
      dataPointCount: data.length,
      droppedRows: rows.length - data.length,
      xField: params.xField,
      yField: params.yField,
      dataFile,
    };
  }

  batchUpdateClips(params = {}) {
    const result = batchOps.batchUpdateClips(this.timeline, {
      ...params,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    if (!result.dryRun && result.timeline) {
      this.timeline = result.timeline;
      this.markChanged();
      this.logChange({
        op: "batchUpdateClips",
        matchedCount: result.matchedCount,
        updatedCount: result.updatedCount,
        fields: result.fields,
      });
    }
    return withoutTimeline(result);
  }

  batchDeleteClips(params = {}) {
    const result = batchOps.batchDeleteClips(this.timeline, {
      ...params,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    if (!result.dryRun && result.timeline) {
      this.timeline = result.timeline;
      this.markChanged();
      this.logChange({
        op: "batchDeleteClips",
        matchedCount: result.matchedCount,
        deletedCount: result.deletedCount,
      });
    }
    return withoutTimeline(result);
  }

  batchShiftClips(params = {}) {
    const result = batchOps.batchShiftClips(this.timeline, {
      ...params,
      confirmOverwrite: this.meta.confirmOverwrite,
    });
    if (!result.dryRun && result.timeline) {
      this.timeline = result.timeline;
      this.markChanged();
      this.logChange({
        op: "batchShiftClips",
        matchedCount: result.matchedCount,
        shiftedCount: result.shiftedCount,
        offsetInFrames: result.offsetInFrames,
      });
    }
    return withoutTimeline(result);
  }

  applySceneTemplate(params = {}) {
    const result = sceneTemplates.applySceneTemplate(this.timeline, params, {
      projectPath: this.meta.projectPath,
    });
    if (!result.dryRun && result.timeline) {
      this.timeline = result.timeline;
      this.markChanged();
      this.logChange({
        op: "applySceneTemplate",
        templateId: result.templateId,
        createdClipCount: result.createdClips?.length ?? 0,
        createdTrackCount: result.createdTracks?.length ?? 0,
      });
    }
    return withoutTimeline(result);
  }

  applyVisualLayout(params = {}) {
    const plan =
      params.layoutPlan ??
      (params.visualAnalysis
        ? layoutToPlan(params.visualAnalysis, this.timeline, {
            startInFrames: params.startInFrames,
            durationInFrames: params.durationInFrames,
          })
        : this.meta.layoutPlan);

    if (!plan?.operations?.length) {
      throw new Error("没有可执行的视觉布局计划");
    }

    const dryRun = params.dryRun === true;
    const publicResult = {
      dryRun,
      operationCount: plan.operations.length,
      warnings: plan.warnings ?? [],
      needsClarification: Boolean(plan.needsClarification),
      operations: plan.operations,
    };
    if (dryRun) return publicResult;
    if (plan.needsClarification) {
      return {
        ...publicResult,
        dryRun: true,
        reason: "视觉布局计划需要澄清，未修改时间线",
      };
    }

    const executed = executeLayoutOperations(this.timeline, plan.operations);
    this.timeline = executed.timeline;
    this.markChanged();
    this.logChange({
      op: "applyVisualLayout",
      createdTrackCount: executed.createdTracks.length,
      createdClipCount: executed.createdClips.length,
    });

    return {
      ...publicResult,
      createdTracks: executed.createdTracks,
      createdClips: executed.createdClips,
    };
  }

  getWorkArea() {
    const display = resolveWorkAreaDisplayRange(this.timeline);
    const exportRange = resolveExportFrameRange(this.timeline);
    return {
      workArea: this.timeline.workArea ?? null,
      display,
      exportRange,
    };
  }

  setWorkArea(params = {}) {
    if (params.clear) {
      this.timeline = clearWorkArea(this.timeline);
      this.markChanged();
      this.logChange({ op: "setWorkArea", cleared: true });
      return this.getWorkArea();
    }

    const inFrame = Math.round(Number(params.inFrame));
    const outFrame = Math.round(Number(params.outFrame));
    const maxFrame = Math.max(0, Number(this.timeline.durationInFrames) - 1);
    if (
      !Number.isFinite(inFrame) ||
      !Number.isFinite(outFrame) ||
      inFrame < 0 ||
      outFrame < 0 ||
      inFrame >= outFrame ||
      outFrame > maxFrame
    ) {
      throw new Error(`Work Area 无效：需要 0 <= inFrame < outFrame <= ${maxFrame}`);
    }

    this.timeline = {
      ...this.timeline,
      workArea: { inFrame, outFrame },
    };
    this.markChanged();
    this.logChange({ op: "setWorkArea", inFrame, outFrame });
    return this.getWorkArea();
  }

  async exportVideo(params = {}) {
    const projectPath = this.meta.projectPath;
    if (!projectPath) {
      throw new Error("当前没有打开的项目，无法导出视频");
    }
    if (!params.outputPath) {
      throw new Error("导出视频需要明确 outputPath，不能由 Agent 猜测保存位置");
    }

    const service = this.meta.exportService ?? exportService;
    const active = service.getActiveExport?.();
    if (active) {
      throw new Error(`已有导出任务正在进行: ${active.exportId}`);
    }

    const request = {
      projectPath,
      subprojectPath: this.meta.subprojectPath,
      outputPath: params.outputPath,
      format: params.format ?? "mp4",
      resolution: params.resolution ?? "original",
      quality: params.quality ?? "medium",
    };
    const started = await service.startVideoExport(request);
    return {
      exportId: started.exportId,
      outputPath: request.outputPath,
      format: request.format,
      resolution: request.resolution,
      quality: request.quality,
      workArea: this.timeline.workArea ?? null,
    };
  }

  getExportStatus() {
    const service = this.meta.exportService ?? exportService;
    const active = service.getActiveExport?.();
    return active
      ? { active: true, exportId: active.exportId, kind: active.kind }
      : { active: false, exportId: null, kind: null };
  }

  async cancelExport(params = {}) {
    const service = this.meta.exportService ?? exportService;
    const active = service.getActiveExport?.();
    const exportId = params.exportId ?? active?.exportId;
    if (!exportId) {
      throw new Error("当前没有可取消的导出任务");
    }
    const result = await service.cancelExport(exportId);
    return { exportId, ...result };
  }

  applyPreset(params) {
    const preset = resolvePreset({
      presetId: params.presetId,
      presetName: params.presetName,
    });

    const startInFrames =
      typeof params.startInFrames === "number"
        ? params.startInFrames
        : Number(this.meta.currentFrame ?? 0);

    const result = placePresetOnTimeline(this.timeline, preset, {
      startInFrames,
      trackId: params.trackId,
      parameters: params.parameters,
    });

    this.timeline = result.timeline;
    this.markChanged();
    this.logChange({
      op: "applyPreset",
      clipId: result.clipId,
      presetId: preset.id,
      name: preset.name,
    });
    return {
      clipId: result.clipId,
      trackId: result.trackId,
      presetId: preset.id,
      name: preset.name,
    };
  }
}

function withoutTimeline(result) {
  const rest = { ...result };
  delete rest.timeline;
  return rest;
}

function executeLayoutOperations(timeline, operations = []) {
  let next = structuredClone(timeline);
  const trackIds = new Map();
  const createdTracks = [];
  const createdClips = [];

  for (const operation of operations) {
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
      if (!trackId) {
        throw new Error(`视觉布局计划无效：未找到轨道 ${operation.trackKey}`);
      }
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

function formatChangeSummary(changeLog) {
  if (!changeLog?.length) return "";

  const lines = changeLog.map((entry) => {
    switch (entry.op) {
      case "createTrack":
        return `创建轨道「${entry.name}」`;
      case "createClip":
        return `创建片段「${entry.name}」`;
      case "updateClip":
        return `更新片段 ${entry.clipId}：${(entry.fields ?? []).join("、") || "属性"}`;
      case "moveClip":
        return `移动片段 ${entry.clipId}：${entry.fromStartInFrames} → ${entry.toStartInFrames} 帧`;
      case "updateTimelineSettings":
        return `更新时间线设置：${entry.before.width}×${entry.before.height}/${entry.before.fps}fps/${entry.before.durationInFrames}帧 → ${entry.after.width}×${entry.after.height}/${entry.after.fps}fps/${entry.after.durationInFrames}帧`;
      case "setAnimation":
        return `设置片段 ${entry.clipId} 的${entry.animationType === "out" ? "出场" : "入场"}动画`;
      case "deleteClip":
        return `删除片段 ${entry.clipId}`;
      case "addKeyframe":
        return `为片段 ${entry.clipId} 添加关键帧 ${entry.property} @ 帧 ${entry.frame}`;
      case "importAsset":
        return `导入素材「${entry.name}」(${entry.type})`;
      case "placeAsset":
        return `放置素材「${entry.name}」到时间线`;
      case "importDataFile":
        return `导入数据文件 ${entry.dataFile}（${entry.rowCount} 行）`;
      case "bindChartData":
        return `绑定 ${entry.rowCount} 行数据到片段 ${entry.clipId}`;
      case "batchUpdateClips":
        return `批量更新 ${entry.updatedCount} 个片段：${(entry.fields ?? []).join("、") || "属性"}`;
      case "batchDeleteClips":
        return `批量删除 ${entry.deletedCount} 个片段`;
      case "batchShiftClips":
        return `批量移动 ${entry.shiftedCount} 个片段 ${entry.offsetInFrames} 帧`;
      case "applySceneTemplate":
        return `应用场景模板 ${entry.templateId}：创建 ${entry.createdTrackCount} 条轨道、${entry.createdClipCount} 个片段`;
      case "applyVisualLayout":
        return `应用参考图布局：创建 ${entry.createdTrackCount} 条轨道、${entry.createdClipCount} 个片段`;
      case "setWorkArea":
        return entry.cleared
          ? "清空导出 Work Area"
          : `设置导出 Work Area：${entry.inFrame} → ${entry.outFrame} 帧`;
      case "applyPreset":
        return `应用预设「${entry.name}」`;
      case "registerCustomComponent":
        return `将组件 ${entry.componentName} 添加到时间线`;
      default:
        return entry.op;
    }
  });

  return lines.join("\n");
}

module.exports = { TimelineContext, formatChangeSummary, extractCssGradient };
