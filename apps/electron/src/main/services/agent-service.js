const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { runAgent } = require("../agent");
const { formatChangeSummary } = require("../agent/timeline-context");
const { findClipLocation } = require("../agent/timeline-ops");
const { AgentState } = require("../agent/state");
const timelineService = require("./timeline-service");
const projectService = require("./project-service");
const previewService = require("./preview-service");
const conversationService = require("./conversation-service");
const { formatConversationSendError } = require("./conversation-errors");

const activeRequests = new Map();

function send(webContents, channel, payload) {
  if (webContents.isDestroyed()) return;
  webContents.send(channel, payload);
}

function sendStatus(webContents, requestId, status) {
  send(webContents, "renderer:conversation:status", { requestId, status });
}

function sendChunk(webContents, requestId, chunk, isDone = false) {
  send(webContents, "renderer:conversation:chunk", { requestId, chunk, isDone });
}

function sendComplete(webContents, requestId, data) {
  send(webContents, "renderer:conversation:complete", { requestId, ...data });
}

function sendError(webContents, requestId, message) {
  send(webContents, "renderer:conversation:error", { requestId, message });
}

function resolveContext(payload) {
  const current = projectService.getCurrentProject();
  const projectPath = payload?.projectPath ?? current?.path;
  if (!projectPath || !current?.data) {
    throw new Error("E2105: no open project");
  }

  const subprojectPath = conversationService.resolveSubprojectPath(
    current.data,
    payload
  );

  const subprojectJsonPath = require("node:path").join(
    projectPath,
    subprojectPath,
    "subproject.json"
  );
  const { readJsonFile } = require("./file-service");
  const subproject = readJsonFile(subprojectJsonPath);

  return {
    projectPath,
    subprojectPath,
    subprojectName: subproject.name ?? "默认片段",
    timeline: timelineService.loadTimeline(projectPath, subprojectPath),
  };
}

function isTimelineDrivenPreview(remotionDir) {
  const mainSeqPath = path.join(remotionDir, "src", "components", "MainSequence.tsx");
  if (!fs.existsSync(mainSeqPath)) return false;
  const content = fs.readFileSync(mainSeqPath, "utf8");
  return content.includes("flattenClipsForPreview");
}

function applyAgentTimelinePreview(ctx, timeline) {
  const remotionDir = previewService.getRemotionDir(
    ctx.projectPath,
    ctx.subprojectPath
  );
  const drift = timelineService.checkRemotionDrift(
    ctx.projectPath,
    ctx.subprojectPath
  );
  const timelineDriven =
    drift.hasCustomRemotionCode || isTimelineDrivenPreview(remotionDir);

  let previewReload = false;

  if (!timelineDriven) {
    timelineService.generateForSubproject(ctx.projectPath, ctx.subprojectPath);
    previewService.ensurePreviewEntry(remotionDir);
    previewReload = true;
  }

  const patched = previewService.ensurePreviewSoloSupport(remotionDir);
  const syncResult = timelineService.syncPreviewManifest(
    ctx.projectPath,
    timeline,
    ctx.subprojectPath
  );

  return {
    previewReload: previewReload || patched,
    // 时间线 JSON 驱动预览时必须推送 TIMELINE_UPDATE，仅靠 iframe 重载不够
    timelinePush: timelineDriven || isTimelineDrivenPreview(remotionDir),
    timeline: syncResult.timeline ?? timeline,
  };
}

function resolveSelectedElement(timeline, selectedClipId) {
  if (!selectedClipId) return null;
  const located = findClipLocation(timeline.tracks, selectedClipId);
  if (!located) return null;
  return {
    type: "clip",
    id: selectedClipId,
    clip: located.clip,
  };
}

function resolveAttachedImagePaths(attachedImages = []) {
  if (!Array.isArray(attachedImages)) return [];
  return attachedImages
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.path || item?.relativePath || null;
    })
    .filter(Boolean);
}

function startConversationSend(webContents, payload) {
  const requestId = payload?.requestId || randomUUID();
  const input = String(payload?.message ?? payload?.input ?? "").trim();
  const history = Array.isArray(payload?.messages) ? payload.messages : [];

  if (!input) {
    throw new Error("E2002: 消息不能为空");
  }

  const controller = new AbortController();
  activeRequests.set(requestId, controller);

  void (async () => {
    try {
      sendStatus(webContents, requestId, AgentState.PARSING);
      const ctx = resolveContext(payload);
      const selectedElement = resolveSelectedElement(
        ctx.timeline,
        payload?.selectedClipId
      );

      const result = await runAgent({
        timeline: ctx.timeline,
        subprojectName: ctx.subprojectName,
        projectPath: ctx.projectPath,
        subprojectPath: ctx.subprojectPath,
        input,
        history,
        selectedElement,
        confirmOverwrite: Boolean(payload?.confirmOverwrite),
        currentFrame:
          typeof payload?.currentFrame === "number" ? payload.currentFrame : 0,
        imagePaths: resolveAttachedImagePaths(payload?.attachedImages),
        signal: controller.signal,
        onStatus: (status) => sendStatus(webContents, requestId, status),
        onChunk: (chunk) => sendChunk(webContents, requestId, chunk, false),
      });

      if (controller.signal.aborted) {
        return;
      }

      let previewReload = false;
      let timelinePush = false;
      let timeline = result.timeline;

      if (result.timelineChanged) {
        sendStatus(webContents, requestId, AgentState.EXECUTING);
        await timelineService.saveTimeline(
          ctx.projectPath,
          timeline,
          ctx.subprojectPath
        );

        if (controller.signal.aborted) {
          return;
        }

        const previewPlan = applyAgentTimelinePreview(ctx, timeline);
        previewReload = previewPlan.previewReload;
        timelinePush = previewPlan.timelinePush;
        timeline = previewPlan.timeline ?? timeline;
      }

      sendChunk(webContents, requestId, "", true);
      sendComplete(webContents, requestId, {
        reply: result.reply,
        timelineUpdated: result.timelineChanged,
        timeline: result.timelineChanged ? timeline : undefined,
        previewReload,
        timelinePush,
        subprojectPath: ctx.subprojectPath,
        changeSummary: formatChangeSummary(result.changeLog),
        changeLog: result.changeLog,
        simplifiedMode: Boolean(result.simplifiedMode),
        systemNotice: result.systemNotice ?? undefined,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        sendChunk(webContents, requestId, "", true);
        sendComplete(webContents, requestId, { cancelled: true });
        sendStatus(webContents, requestId, AgentState.IDLE);
        return;
      }
      const normalized = formatConversationSendError(error);
      const message = normalized.message;
      sendChunk(webContents, requestId, `\n\n[错误] ${message}`, true);
      sendError(webContents, requestId, message);
      sendStatus(webContents, requestId, AgentState.FAILED);
    } finally {
      activeRequests.delete(requestId);
    }
  })();

  return { requestId };
}

function cancelConversationSend(requestId) {
  const controller = activeRequests.get(requestId);
  if (!controller) return { cancelled: false };
  controller.abort();
  return { cancelled: true };
}

module.exports = {
  startConversationSend,
  cancelConversationSend,
};
