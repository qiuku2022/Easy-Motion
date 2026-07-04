const frameRenderService = require("../services/frame-render-service");
const frameInspector = require("./frame-inspector");

const DEFAULT_RENDER_LIMIT = 2;
const DEFAULT_VERIFY_LIMIT = 2;

class VisionFeedbackContext {
  constructor(options = {}) {
    this.timelineCtx = options.timelineCtx ?? null;
    this.getTimeline = options.getTimeline ?? (() => this.timelineCtx?.timeline);
    this.projectPath = options.projectPath ?? this.timelineCtx?.meta?.projectPath ?? null;
    this.subprojectPath =
      options.subprojectPath ??
      this.timelineCtx?.meta?.subprojectPath ??
      "subprojects/default";
    this.currentFrame =
      options.currentFrame ?? this.timelineCtx?.meta?.currentFrame ?? 0;
    this.frameRenderService = options.frameRenderService ?? frameRenderService;
    this.previewCaptureService = options.previewCaptureService ?? null;
    this.frameInspector = options.frameInspector ?? frameInspector;
    this.renderLimit = options.renderLimit ?? DEFAULT_RENDER_LIMIT;
    this.verifyLimit = options.verifyLimit ?? DEFAULT_VERIFY_LIMIT;
    this.renderCount = 0;
    this.verifyCount = 0;
    this.visualChecks = [];
  }

  getCurrentTimeline() {
    const timeline = this.getTimeline?.();
    if (!timeline) {
      throw new Error("当前时间线不可用，无法渲帧");
    }
    return timeline;
  }

  getTimelineFps() {
    const fps = Number(this.getCurrentTimeline().fps);
    return Number.isFinite(fps) && fps > 0 ? fps : 30;
  }

  resolveFrame(input = {}) {
    if (input.frame !== undefined && input.frame !== null) {
      return input.frame;
    }
    if (input.timeSeconds !== undefined && input.timeSeconds !== null) {
      return Math.round(Number(input.timeSeconds) * this.getTimelineFps());
    }
    return this.currentFrame ?? 0;
  }

  assertCanRender() {
    if (!this.projectPath) {
      throw new Error("没有打开的项目，无法渲帧");
    }
    if (this.renderCount >= this.renderLimit) {
      throw new Error(`本轮渲帧次数已达上限（${this.renderLimit} 次）`);
    }
  }

  assertCanPreviewCapture() {
    if (!this.projectPath) {
      throw new Error("没有打开的项目，无法截图预览");
    }
    if (!this.previewCaptureService?.capturePreview) {
      throw new Error("实时预览截图不可用");
    }
    if (this.renderCount >= this.renderLimit) {
      throw new Error(`本轮视觉截图次数已达上限（${this.renderLimit} 次）`);
    }
  }

  assertCanSeekPreview() {
    if (!this.previewCaptureService?.seekPreview) {
      throw new Error("实时预览 seek 不可用");
    }
  }

  assertCanVerify() {
    if (this.verifyCount >= this.verifyLimit) {
      throw new Error(`本轮视觉复核次数已达上限（${this.verifyLimit} 次）`);
    }
  }

  recordRender(result, input = {}) {
    const entry = {
      kind: "renderFrame",
      success: true,
      renderId: result.renderId,
      frame: result.frame,
      reason: input.reason ?? null,
      image: result.image
        ? {
            relativePath: result.image.relativePath,
            mime: result.image.mime,
            width: result.image.width,
            height: result.image.height,
            bytes: result.image.bytes,
            sha256: result.image.sha256,
          }
        : null,
      createdAt: result.createdAt ?? Date.now(),
    };
    this.visualChecks.push(entry);
    return entry;
  }

  recordSeek(result, input = {}) {
    const entry = {
      kind: "seekPlayhead",
      success: true,
      frame: result.frame ?? input.frame ?? null,
      reason: input.reason ?? null,
      createdAt: result.completedAt ?? Date.now(),
    };
    this.visualChecks.push(entry);
    return entry;
  }

  recordPreviewCapture(result, input = {}) {
    const entry = {
      kind: "capturePreview",
      success: true,
      renderId: result.renderId,
      frame: result.frame ?? null,
      reason: input.reason ?? null,
      image: result.image
        ? {
            relativePath: result.image.relativePath,
            mime: result.image.mime,
            width: result.image.width,
            height: result.image.height,
            bytes: result.image.bytes,
            sha256: result.image.sha256,
          }
        : null,
      createdAt: result.createdAt ?? Date.now(),
    };
    this.visualChecks.push(entry);
    return entry;
  }

  recordFailure(kind, error, input = {}) {
    const entry = {
      kind,
      success: false,
      error: error?.message || String(error),
      reason: input.reason ?? null,
      createdAt: Date.now(),
    };
    this.visualChecks.push(entry);
    return entry;
  }

  recordVerification(result, input = {}) {
    const entry = {
      kind: "verifyFrameAgainstGoal",
      success: !result.failed,
      renderId: result.renderId ?? input.renderId,
      frame: result.frame ?? null,
      goal: input.goal ?? null,
      pass: result.pass ?? null,
      confidence: result.confidence ?? 0,
      summary: result.summary ?? "",
      issues: Array.isArray(result.issues) ? result.issues : [],
      suggestedToolActions: Array.isArray(result.suggestedToolActions)
        ? result.suggestedToolActions
        : [],
      error: result.error ?? null,
      createdAt: Date.now(),
    };
    this.visualChecks.push(entry);
    return entry;
  }

  getVisualChecks() {
    return this.visualChecks.map((entry) => ({ ...entry }));
  }

  async renderFrame(input = {}) {
    this.assertCanRender();
    this.renderCount += 1;
    const frame = this.resolveFrame(input);
    const timeline = structuredClone(this.getCurrentTimeline());
    const result = await this.frameRenderService.renderFrame({
      projectPath: this.projectPath,
      subprojectPath: this.subprojectPath,
      timeline,
      frame,
      scale: input.scale,
      reason: input.reason,
    });
    this.recordRender(result, input);
    return result;
  }

  async seekPlayhead(input = {}) {
    this.assertCanSeekPreview();
    const frame = this.resolveFrame(input);
    const result = await this.previewCaptureService.seekPreview({
      frame,
      reason: input.reason,
    });
    this.currentFrame = result.frame ?? frame;
    this.recordSeek(result, { ...input, frame });
    return result;
  }

  async capturePreview(input = {}) {
    this.assertCanPreviewCapture();
    this.renderCount += 1;
    const frame =
      input.frame !== undefined ||
      input.timeSeconds !== undefined
        ? this.resolveFrame(input)
        : undefined;
    const timeline = structuredClone(this.getCurrentTimeline());
    const result = await this.previewCaptureService.capturePreview({
      projectPath: this.projectPath,
      subprojectPath: this.subprojectPath,
      timeline,
      frame,
      settleMs: input.settleMs,
      reason: input.reason,
    });
    if (result.frame !== null && result.frame !== undefined) {
      this.currentFrame = result.frame;
    }
    this.recordPreviewCapture(result, { ...input, frame });
    return result;
  }

  createFrameLookupService() {
    return {
      getFrameRender: (renderId) =>
        this.frameRenderService.getFrameRender?.(renderId) ??
        this.previewCaptureService?.getFrameRender?.(renderId) ??
        null,
    };
  }

  async verifyFrameAgainstGoal(input = {}) {
    this.assertCanVerify();
    this.verifyCount += 1;
    const result = await this.frameInspector.verifyFrameAgainstGoal(input, {
      projectPath: this.projectPath,
      timeline: structuredClone(this.getCurrentTimeline()),
      frameRenderService: this.createFrameLookupService(),
    });
    this.recordVerification(result, input);
    return result;
  }
}

module.exports = {
  VisionFeedbackContext,
  DEFAULT_RENDER_LIMIT,
  DEFAULT_VERIFY_LIMIT,
};
