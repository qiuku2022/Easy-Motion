const timelineOps = require("./timeline-ops");
const { prepareClipUpdates } = require("./clip-updates");
const { placePresetOnTimeline } = require("./place-preset");
const { resolvePreset } = require("./preset-catalog");
const assetService = require("../services/asset-service");

function extractCssGradient(text) {
  const match = String(text ?? "").match(/(?:linear|radial)-gradient\([^)]*\)/i);
  return match?.[0] ?? null;
}

class TimelineContext {
  constructor(timeline, meta = {}) {
    this.timeline = structuredClone(timeline);
    this.meta = meta;
    this.changed = false;
    this.changeLog = [];
  }

  markChanged() {
    this.changed = true;
  }

  logChange(entry) {
    this.changeLog.push(entry);
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

  queryElement(params) {
    return timelineOps.queryElement(this.timeline, params);
  }

  deleteClip(params) {
    const clipId = params.clipId || this.meta.selectedElement?.id;
    if (!clipId) {
      throw new Error("未指定 clipId，且没有选中的片段");
    }

    const result = timelineOps.deleteClip(this.timeline, { clipId });
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
      case "setAnimation":
        return `设置片段 ${entry.clipId} 的${entry.animationType === "out" ? "出场" : "入场"}动画`;
      case "deleteClip":
        return `删除片段 ${entry.clipId}`;
      case "addKeyframe":
        return `为片段 ${entry.clipId} 添加关键帧 ${entry.property} @ 帧 ${entry.frame}`;
      case "importAsset":
        return `导入素材「${entry.name}」(${entry.type})`;
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
