const fs = require("node:fs");
const path = require("node:path");
const { readJsonFile, atomicWriteJson } = require("./file-service");
const timelineService = require("./timeline-service");
const previewService = require("./preview-service");
const { resolveSrcFilePath } = require("../agent/remotion-sandbox");
const { hashContent } = require("../agent/remotion-context");

const CONVERSATION_VERSION = "1.0";
const AGENT_UNDO_SNAPSHOT_FILE = "agent-undo-snapshot.json";

function getSubprojectDir(projectRoot, subprojectRelativePath = "subprojects/default") {
  return path.join(projectRoot, subprojectRelativePath);
}

const EMPTY_CONVERSATION = {
  version: CONVERSATION_VERSION,
  messages: [],
};

function getConversationFilePath(projectRoot, subprojectRelativePath) {
  return path.join(
    getSubprojectDir(projectRoot, subprojectRelativePath),
    "conversation.json"
  );
}

function getSubprojectJsonPath(projectRoot, subprojectRelativePath) {
  return path.join(
    getSubprojectDir(projectRoot, subprojectRelativePath),
    "subproject.json"
  );
}

function getAgentUndoSnapshotPath(projectRoot, subprojectRelativePath) {
  return path.join(
    getSubprojectDir(projectRoot, subprojectRelativePath),
    AGENT_UNDO_SNAPSHOT_FILE
  );
}

function normalizeConversation(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("E2701: 对话历史文件损坏");
  }

  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  const normalizedMessages = messages.map((message, index) => {
    if (!message || typeof message !== "object") {
      throw new Error("E2701: 对话历史文件损坏");
    }
    const role = message.role;
    if (role !== "user" && role !== "assistant" && role !== "system") {
      throw new Error("E2701: 对话历史文件损坏");
    }
    if (typeof message.content !== "string") {
      throw new Error("E2701: 对话历史文件损坏");
    }

    return {
      id:
        typeof message.id === "string" && message.id
          ? message.id
          : `msg-${index}-${Date.now()}`,
      role,
      content: message.content,
      timestamp:
        typeof message.timestamp === "number" ? message.timestamp : Date.now(),
      ...(Array.isArray(message.attachedImages)
        ? { attachedImages: message.attachedImages }
        : {}),
      ...(message.codeDiff ? { codeDiff: message.codeDiff } : {}),
      ...(Array.isArray(message.actionButtons)
        ? { actionButtons: message.actionButtons }
        : {}),
    };
  });

  return {
    version: CONVERSATION_VERSION,
    messages: normalizedMessages,
    ...(typeof raw.lastAgentTaskId === "string"
      ? { lastAgentTaskId: raw.lastAgentTaskId }
      : {}),
    ...(typeof raw.pendingAgentUndo?.messageId === "string"
      ? { pendingAgentUndo: { messageId: raw.pendingAgentUndo.messageId } }
      : {}),
  };
}

function readConversationFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return normalizeConversation(readJsonFile(filePath));
  } catch (error) {
    if (error.message?.startsWith("E2701")) throw error;
    throw new Error("E2701: 对话历史文件损坏");
  }
}

function loadConversation(projectRoot, subprojectRelativePath = "subprojects/default") {
  const conversationPath = getConversationFilePath(projectRoot, subprojectRelativePath);
  const fromFile = readConversationFile(conversationPath);
  if (fromFile) return fromFile;

  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(subprojectPath)) {
    return { ...EMPTY_CONVERSATION };
  }

  try {
    const subproject = readJsonFile(subprojectPath);
    if (subproject?.conversation) {
      return normalizeConversation(subproject.conversation);
    }
  } catch {
    throw new Error("E2701: 对话历史文件损坏");
  }

  return { ...EMPTY_CONVERSATION };
}

function loadAgentUndoSnapshot(projectRoot, subprojectRelativePath = "subprojects/default") {
  const snapshotPath = getAgentUndoSnapshotPath(projectRoot, subprojectRelativePath);
  if (!fs.existsSync(snapshotPath)) return null;

  try {
    const raw = readJsonFile(snapshotPath);
    const remotionFilesBefore = Array.isArray(raw?.remotionFilesBefore)
      ? raw.remotionFilesBefore
      : [];
    if (typeof raw?.messageId !== "string" || (!raw?.timeline && remotionFilesBefore.length === 0)) {
      return null;
    }
    return {
      messageId: raw.messageId,
      timeline: raw.timeline ?? null,
      remotionFilesBefore,
      savedAt: typeof raw.savedAt === "number" ? raw.savedAt : undefined,
    };
  } catch {
    return null;
  }
}

async function saveAgentUndoSnapshot(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
  { messageId, timeline, remotionFilesBefore }
) {
  const files = Array.isArray(remotionFilesBefore) ? remotionFilesBefore : [];
  if (!messageId || (!timeline && files.length === 0)) {
    throw new Error("E2002: 无效的撤销快照");
  }

  const snapshotPath = getAgentUndoSnapshotPath(projectRoot, subprojectRelativePath);
  await atomicWriteJson(snapshotPath, {
    messageId,
    savedAt: Date.now(),
    timeline,
    remotionFilesBefore: files,
  });

  const conversation = loadConversation(projectRoot, subprojectRelativePath);
  conversation.pendingAgentUndo = { messageId };
  await saveConversation(projectRoot, conversation, subprojectRelativePath);

  return { saved: true, messageId };
}

function restoreRemotionFiles(projectRoot, subprojectRelativePath, snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return { restoredFiles: [] };
  }

  const remotionDir = previewService.getRemotionDir(projectRoot, subprojectRelativePath);
  const srcDir = path.join(remotionDir, "src");
  const restoredFiles = [];

  for (const snapshot of snapshots) {
    const relativePath = snapshot.relativePath;
    if (typeof relativePath !== "string") continue;
    const { absolute, normalized } = resolveSrcFilePath(srcDir, relativePath);
    const existsNow = fs.existsSync(absolute);
    const currentContent = existsNow ? fs.readFileSync(absolute, "utf8") : null;
    const currentHash = hashContent(currentContent);
    if (currentHash !== (snapshot.hashAfter ?? null)) {
      throw new Error(`E2010: Remotion 文件已被后续修改，无法安全撤销: ${normalized}`);
    }
  }

  for (const snapshot of snapshots) {
    const relativePath = snapshot.relativePath;
    if (typeof relativePath !== "string") continue;
    const { absolute, normalized } = resolveSrcFilePath(srcDir, relativePath);
    if (snapshot.existedBefore) {
      fs.mkdirSync(path.dirname(absolute), { recursive: true });
      fs.writeFileSync(absolute, String(snapshot.contentBefore ?? ""), "utf8");
    } else if (fs.existsSync(absolute)) {
      fs.unlinkSync(absolute);
    }
    restoredFiles.push(normalized);
  }

  if (restoredFiles.length > 0) {
    previewService.ensureCustomComponentSupport(remotionDir);
    timelineService.refreshRemotionFingerprint(projectRoot, subprojectRelativePath);
  }

  return { restoredFiles };
}

async function restoreAgentUndoSnapshot(
  projectRoot,
  subprojectRelativePath = "subprojects/default",
  { messageId } = {}
) {
  const snapshot = resolvePendingAgentUndo(projectRoot, subprojectRelativePath);
  if (!snapshot) {
    throw new Error("E2002: 没有可撤销的 AI 修改");
  }
  if (messageId && snapshot.messageId !== messageId) {
    throw new Error("E2002: 撤销快照已过期");
  }

  if (snapshot.timeline) {
    await timelineService.saveTimeline(projectRoot, snapshot.timeline, subprojectRelativePath);
    timelineService.syncPreviewManifest(projectRoot, snapshot.timeline, subprojectRelativePath);
  }
  const remotion = restoreRemotionFiles(
    projectRoot,
    subprojectRelativePath,
    snapshot.remotionFilesBefore
  );
  await clearAgentUndoSnapshot(projectRoot, subprojectRelativePath);
  return {
    restored: true,
    messageId: snapshot.messageId,
    timeline: snapshot.timeline ?? null,
    restoredFiles: remotion.restoredFiles,
    previewReload: remotion.restoredFiles.length > 0,
    timelinePush: Boolean(snapshot.timeline),
  };
}

async function clearAgentUndoSnapshot(
  projectRoot,
  subprojectRelativePath = "subprojects/default"
) {
  const snapshotPath = getAgentUndoSnapshotPath(projectRoot, subprojectRelativePath);
  if (fs.existsSync(snapshotPath)) {
    fs.unlinkSync(snapshotPath);
  }

  const conversation = loadConversation(projectRoot, subprojectRelativePath);
  if (conversation.pendingAgentUndo) {
    delete conversation.pendingAgentUndo;
    await saveConversation(projectRoot, conversation, subprojectRelativePath);
  }

  return { cleared: true };
}

function resolvePendingAgentUndo(projectRoot, subprojectRelativePath) {
  const conversation = loadConversation(projectRoot, subprojectRelativePath);
  const snapshot = loadAgentUndoSnapshot(projectRoot, subprojectRelativePath);
  if (!snapshot) return null;

  const pendingId = conversation.pendingAgentUndo?.messageId;
  if (!pendingId || pendingId !== snapshot.messageId) {
    return null;
  }

  const messageExists = conversation.messages.some((m) => m.id === snapshot.messageId);
  if (!messageExists) {
    return null;
  }

  return snapshot;
}

async function saveConversation(
  projectRoot,
  conversation,
  subprojectRelativePath = "subprojects/default"
) {
  const existing = loadConversation(projectRoot, subprojectRelativePath);
  const normalized = normalizeConversation({
    ...conversation,
    pendingAgentUndo:
      conversation.pendingAgentUndo !== undefined
        ? conversation.pendingAgentUndo
        : existing.pendingAgentUndo,
  });
  const conversationPath = getConversationFilePath(projectRoot, subprojectRelativePath);
  await atomicWriteJson(conversationPath, normalized);

  const subprojectPath = getSubprojectJsonPath(projectRoot, subprojectRelativePath);
  if (fs.existsSync(subprojectPath)) {
    const subproject = readJsonFile(subprojectPath);
    subproject.conversation = {
      messages: normalized.messages,
      ...(normalized.lastAgentTaskId
        ? { lastAgentTaskId: normalized.lastAgentTaskId }
        : {}),
      ...(normalized.pendingAgentUndo
        ? { pendingAgentUndo: normalized.pendingAgentUndo }
        : {}),
    };
    await atomicWriteJson(subprojectPath, subproject);
  }

  return { saved: true, conversation: normalized };
}

async function clearConversation(
  projectRoot,
  subprojectRelativePath = "subprojects/default"
) {
  await clearAgentUndoSnapshot(projectRoot, subprojectRelativePath);
  return saveConversation(projectRoot, { ...EMPTY_CONVERSATION }, subprojectRelativePath);
}

function resolveSubprojectPath(project, options = {}) {
  if (options.subprojectPath) return options.subprojectPath;

  const subprojectId = options.subprojectId;
  if (subprojectId && Array.isArray(project?.subprojects)) {
    const match = project.subprojects.find((item) => item.id === subprojectId);
    if (!match?.path) {
      throw new Error("E2002: 无效的子项目 ID");
    }
    return match.path;
  }

  return project?.subprojects?.[0]?.path ?? "subprojects/default";
}

module.exports = {
  loadConversation,
  saveConversation,
  clearConversation,
  resolveSubprojectPath,
  normalizeConversation,
  loadAgentUndoSnapshot,
  saveAgentUndoSnapshot,
  clearAgentUndoSnapshot,
  restoreAgentUndoSnapshot,
  resolvePendingAgentUndo,
};
