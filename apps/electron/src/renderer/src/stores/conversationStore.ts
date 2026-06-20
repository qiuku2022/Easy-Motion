import { create } from "zustand";
import { toast } from "sonner";
import { debounce } from "@/lib/debounce";
import { describeConversationError } from "@/lib/conversationError";
import { eventBus } from "@/lib/eventBus";
import { findClipById } from "@/lib/timeline/findClipById";
import { clipNeedsOverwriteConfirm } from "@/lib/timeline/userEditConflict";
import { getEasyMotion } from "@/types/easyMotion";
import { useTimelineStore } from "@/stores/timelineStore";
import {
  createMessage,
  DEFAULT_SUBPROJECT_PATH,
  type AgentStatus,
  type AgentTask,
  type AttachedImage,
  type Conversation,
  type Message,
} from "@/types/conversation";
import type { Timeline } from "@/types/timeline";

interface ConversationState {
  conversation: Conversation | null;
  messages: Message[];
  subprojectPath: string;
  agentStatus: AgentStatus;
  currentTask: AgentTask | null;
  taskHistory: AgentTask[];
  streamingMessageId: string | null;
  inputText: string;
  attachedImages: AttachedImage[];
  isInputDisabled: boolean;
  isStreaming: boolean;
  isLoading: boolean;
  loadError: string | null;
  lastAgentUndoSnapshot: Timeline | null;
  lastAgentUndoMessageId: string | null;

  loadConversation: (subprojectPath?: string) => Promise<void>;
  saveConversation: () => Promise<boolean>;
  clearConversation: () => Promise<boolean>;
  setInputText: (text: string) => void;
  setInputDisabled: (disabled: boolean) => void;
  attachImage: (image: AttachedImage) => void;
  removeImage: (imageId: string) => void;
  reorderImages: (imageIds: string[]) => void;
  pickAiReferenceImages: () => Promise<void>;
  sendMessage: (text?: string) => Promise<void>;
  appendStreamingChunk: (chunk: string) => void;
  finalizeStreamingMessage: () => void;
  handleStreamDone: () => void;
  setAgentStatusFromMain: (status: string) => void;
  handleConversationComplete: (payload: {
    requestId: string;
    timelineUpdated?: boolean;
    timeline?: Timeline;
    previewReload?: boolean;
    timelinePush?: boolean;
    subprojectPath?: string;
    changeSummary?: string;
    changeLog?: unknown[];
    cancelled?: boolean;
    simplifiedMode?: boolean;
    systemNotice?: string;
  }) => Promise<void>;
  handleConversationError: (message: string) => void;
  handleMessageAction: (action: string, messageId: string) => Promise<void>;
  handleConversationCancelled: () => void;
  cancelMessage: () => Promise<void>;
  undoLastAgentChange: () => Promise<void>;
  resetForProjectClose: () => void;
}

const debouncedSave = debounce(() => {
  void useConversationStore.getState().saveConversation();
}, 500);

let activeStreamRequestId: string | null = null;

function mapMainAgentStatus(status: string): AgentStatus {
  switch (status) {
    case "parsing":
      return "parsing";
    case "analyzing":
      return "analyzing";
    case "generating":
    case "executing":
      return "generating";
    case "failed":
      return "error";
    case "completed":
      return "idle";
    default:
      return "idle";
  }
}

function toConversationPayload(state: ConversationState): Conversation {
  return {
    version: "1.0",
    messages: state.messages,
    ...(state.conversation?.lastAgentTaskId
      ? { lastAgentTaskId: state.conversation.lastAgentTaskId }
      : {}),
    ...(state.lastAgentUndoMessageId && state.lastAgentUndoSnapshot
      ? { pendingAgentUndo: { messageId: state.lastAgentUndoMessageId } }
      : {}),
  };
}

function reconcileUndoButtons(
  messages: Message[],
  undoMessageId: string | null
): Message[] {
  return messages.map((message) => {
    const hasUndo = message.actionButtons?.some((button) => button.action === "undo-agent");
    if (!hasUndo) return message;
    if (undoMessageId && message.id === undoMessageId) return message;
    return {
      ...message,
      actionButtons: message.actionButtons?.filter(
        (button) => button.action !== "undo-agent"
      ),
    };
  });
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversation: null,
  messages: [],
  subprojectPath: DEFAULT_SUBPROJECT_PATH,
  agentStatus: "idle",
  currentTask: null,
  taskHistory: [],
  streamingMessageId: null,
  inputText: "",
  attachedImages: [],
  isInputDisabled: false,
  isStreaming: false,
  isLoading: false,
  loadError: null,
  lastAgentUndoSnapshot: null,
  lastAgentUndoMessageId: null,

  loadConversation: async (subprojectPath = DEFAULT_SUBPROJECT_PATH) => {
    const api = getEasyMotion()?.conversation;
    if (!api) {
      set({ loadError: "对话 API 不可用" });
      return;
    }

    set({ isLoading: true, loadError: null });
    const result = await api.load({ subprojectPath });
    set({ isLoading: false });

    if (!result.success || !result.data?.conversation) {
      const message = result.error?.message ?? "加载对话失败";
      set({ loadError: message, messages: [], conversation: null });
      if (message.includes("E2701")) {
        toast.error("对话历史损坏", { description: message });
      }
      return;
    }

    const { conversation, pendingAgentUndo } = result.data;
    const undoMessageId = pendingAgentUndo?.messageId ?? null;
    const messages = reconcileUndoButtons(conversation.messages ?? [], undoMessageId);

    set({
      conversation,
      messages,
      subprojectPath: result.data.subprojectPath ?? subprojectPath,
      loadError: null,
      streamingMessageId: null,
      isStreaming: false,
      agentStatus: "idle",
      inputText: "",
      attachedImages: [],
      lastAgentUndoSnapshot: pendingAgentUndo?.timeline ?? null,
      lastAgentUndoMessageId: undoMessageId,
    });
  },

  saveConversation: async () => {
    const api = getEasyMotion()?.conversation;
    if (!api) return false;

    const { subprojectPath } = get();
    const result = await api.save({
      subprojectPath,
      conversation: toConversationPayload(get()),
    });

    if (!result.success) {
      toast.error("保存对话失败", {
        description: result.error?.message,
      });
      return false;
    }

    if (result.data?.conversation) {
      set({ conversation: result.data.conversation });
    }
    return true;
  },

  clearConversation: async () => {
    const api = getEasyMotion()?.conversation;
    if (!api) return false;

    const { subprojectPath } = get();
    const result = await api.clear({ subprojectPath });
    if (!result.success) {
      toast.error("清空对话失败", {
        description: result.error?.message,
      });
      return false;
    }

    set({
      conversation: result.data?.conversation ?? { version: "1.0", messages: [] },
      messages: [],
      streamingMessageId: null,
      isStreaming: false,
      agentStatus: "idle",
      lastAgentUndoSnapshot: null,
      lastAgentUndoMessageId: null,
    });
    return true;
  },

  setInputText: (inputText) => set({ inputText }),
  setInputDisabled: (isInputDisabled) => set({ isInputDisabled }),

  attachImage: (image) =>
    set((state) => ({
      attachedImages: [...state.attachedImages, image],
    })),

  removeImage: (imageId) =>
    set((state) => ({
      attachedImages: state.attachedImages.filter((item) => item.id !== imageId),
    })),

  reorderImages: (imageIds) =>
    set((state) => {
      const map = new Map(state.attachedImages.map((item) => [item.id, item]));
      return {
        attachedImages: imageIds
          .map((id) => map.get(id))
          .filter((item): item is AttachedImage => Boolean(item)),
      };
    }),

  pickAiReferenceImages: async () => {
    const api = getEasyMotion()?.conversation;
    if (!api?.pickAiRefs) {
      toast.error("参考图 API 不可用");
      return;
    }

    const remaining = 3 - get().attachedImages.length;
    if (remaining <= 0) {
      toast.info("最多添加 3 张参考图");
      return;
    }

    const result = await api.pickAiRefs({ subprojectPath: get().subprojectPath });
    if (!result.success) {
      toast.error("添加参考图失败", { description: result.error?.message });
      return;
    }

    const imported = result.data?.images ?? [];
    if (!imported.length) return;

    set((state) => ({
      attachedImages: [
        ...state.attachedImages,
        ...imported.slice(0, remaining).map((item) => ({
          id: item.id,
          path: item.path,
          relativePath: item.relativePath,
          name: item.name,
          previewUrl: item.previewUrl,
        })),
      ],
    }));
  },

  sendMessage: async (text) => {
    const content = (text ?? get().inputText).trim();
    if (!content || get().isStreaming || get().isInputDisabled) return;

    const conversationApi = getEasyMotion()?.conversation;
    if (!conversationApi?.send) {
      toast.error("对话 Agent 不可用", {
        description: "E2700: 消息发送失败（conversation API 未就绪）",
      });
      return;
    }

    const timelineState = useTimelineStore.getState();
    const selectedClipId = timelineState.selectedClipId;
    let confirmOverwrite = false;

    if (selectedClipId && timelineState.timeline) {
      const selectedClip = findClipById(timelineState.timeline, selectedClipId);
      if (clipNeedsOverwriteConfirm(selectedClip)) {
        const proceed = window.confirm(
          "您最近手动调整了选中的片段。是否允许 AI 覆盖这些修改？"
        );
        if (!proceed) return;
        confirmOverwrite = true;
      }
    }

    const undoSnapshot = timelineState.timeline
      ? structuredClone(timelineState.timeline)
      : null;

    const { attachedImages } = get();
    const imagePathsForMessage = attachedImages.map(
      (img) => img.relativePath ?? img.path
    );

    const userMessage = createMessage("user", content, {
      ...(imagePathsForMessage.length
        ? { attachedImages: imagePathsForMessage }
        : {}),
    });
    const assistantMessage = createMessage("assistant", "");
    const history = [...get().messages, userMessage]
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map(({ role, content: body }) => ({
        role: role as "user" | "assistant",
        content: body,
      }));

    set((state) => ({
      messages: [...state.messages, userMessage, assistantMessage],
      inputText: "",
      attachedImages: [],
      isStreaming: true,
      isInputDisabled: true,
      agentStatus: "parsing",
      streamingMessageId: assistantMessage.id,
      lastAgentUndoSnapshot: undoSnapshot,
      lastAgentUndoMessageId: assistantMessage.id,
    }));

    const requestId = crypto.randomUUID();
    setActiveConversationStreamRequestId(requestId);

    const { subprojectPath } = get();
    const result = await conversationApi.send({
      requestId,
      message: content,
      messages: history,
      subprojectPath,
      selectedClipId,
      currentFrame: timelineState.currentFrame,
      confirmOverwrite,
      attachedImages,
    });

    if (!result.success) {
      setActiveConversationStreamRequestId(null);
      set((state) => ({
        messages: state.messages.filter((message) => message.id !== assistantMessage.id),
        isStreaming: false,
        isInputDisabled: false,
        agentStatus: "error",
        streamingMessageId: null,
        lastAgentUndoSnapshot: null,
        lastAgentUndoMessageId: null,
      }));
      const { title, description } = describeConversationError(
        result.error?.message ?? "E2700: 消息发送失败",
      );
      toast.error(title, { description });
    }
  },

  appendStreamingChunk: (chunk) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId || !chunk) return;

    set((state) => ({
      messages: state.messages.map((message) =>
        message.id === streamingMessageId
          ? { ...message, content: message.content + chunk }
          : message
      ),
    }));
  },

  finalizeStreamingMessage: () => {
    set({
      isStreaming: false,
      isInputDisabled: false,
      agentStatus: "idle",
      streamingMessageId: null,
    });
    debouncedSave();
  },

  handleStreamDone: () => {
    setActiveConversationStreamRequestId(null);
    get().finalizeStreamingMessage();
  },

  setAgentStatusFromMain: (status) => {
    set({ agentStatus: mapMainAgentStatus(status) });
  },

  handleConversationComplete: async ({
    requestId,
    timelineUpdated,
    timeline,
    previewReload,
    subprojectPath,
    changeSummary,
    changeLog,
    cancelled,
    simplifiedMode,
    systemNotice,
  }) => {
    const activeId = getActiveConversationStreamRequestId();
    if (activeId !== null && requestId !== activeId) return;

    if (cancelled) {
      get().handleConversationCancelled();
      return;
    }

    const { streamingMessageId } = get();

    if (systemNotice && streamingMessageId) {
      const systemMessage = createMessage("system", systemNotice);
      set((state) => {
        const idx = state.messages.findIndex((m) => m.id === streamingMessageId);
        if (idx < 0) return state;
        const messages = [...state.messages];
        messages.splice(idx, 0, systemMessage);
        return { messages };
      });
    }

    if (streamingMessageId && (changeSummary || timelineUpdated)) {
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === streamingMessageId
            ? {
                ...message,
                ...(changeSummary
                  ? {
                      codeDiff: {
                        summary: changeSummary,
                        operations: changeLog,
                      },
                    }
                  : {}),
                ...(timelineUpdated
                  ? {
                      actionButtons: [
                        {
                          id: "undo-agent",
                          label: "撤销此次 AI 修改",
                          action: "undo-agent",
                        },
                      ],
                    }
                  : {}),
              }
            : message
        ),
      }));
    }

    if (timelineUpdated) {
      const nextSubprojectPath = subprojectPath ?? get().subprojectPath;
      eventBus.emit("conversation.diffReady", {
        subprojectPath: nextSubprojectPath,
        diff: changeLog ?? null,
        timeline: timeline ?? null,
        previewReload: previewReload ?? false,
      });

      const { lastAgentUndoSnapshot, lastAgentUndoMessageId } = get();
      if (lastAgentUndoSnapshot && lastAgentUndoMessageId) {
        const api = getEasyMotion()?.conversation;
        if (api?.saveAgentUndo) {
          const saved = await api.saveAgentUndo({
            subprojectPath: nextSubprojectPath,
            messageId: lastAgentUndoMessageId,
            timeline: lastAgentUndoSnapshot,
          });
          if (!saved.success) {
            toast.error("撤销快照保存失败", {
              description: saved.error?.message,
            });
          }
        }
      }
    } else {
      set({
        lastAgentUndoSnapshot: null,
        lastAgentUndoMessageId: null,
      });
      if (systemNotice) {
        toast.warning(systemNotice);
      }
    }

    if (activeId !== null) {
      get().handleStreamDone();
      debouncedSave();
    }
  },

  handleConversationError: (message) => {
    setActiveConversationStreamRequestId(null);
    set({
      isStreaming: false,
      isInputDisabled: false,
      agentStatus: "error",
      streamingMessageId: null,
      lastAgentUndoSnapshot: null,
      lastAgentUndoMessageId: null,
    });
    const { title, description } = describeConversationError(message);
    toast.error(title, { description });
  },

  handleConversationCancelled: () => {
    setActiveConversationStreamRequestId(null);
    set((state) => {
      const streamingId = state.streamingMessageId;
      let messages = state.messages;
      if (streamingId) {
        const streaming = messages.find((m) => m.id === streamingId);
        if (!streaming?.content.trim()) {
          messages = messages.filter((m) => m.id !== streamingId);
        }
      }
      return {
        messages,
        isStreaming: false,
        isInputDisabled: false,
        agentStatus: "idle",
        streamingMessageId: null,
        lastAgentUndoSnapshot: null,
        lastAgentUndoMessageId: null,
      };
    });
    toast.info("已取消 AI 生成");
  },

  cancelMessage: async () => {
    const requestId = getActiveConversationStreamRequestId();
    if (!requestId || !get().isStreaming) return;
    const api = getEasyMotion()?.conversation;
    if (!api?.cancel) return;
    await api.cancel({ requestId });
  },

  handleMessageAction: async (action, messageId) => {
    if (action !== "undo-agent") return;

    let { lastAgentUndoSnapshot, lastAgentUndoMessageId } = get();

    if (lastAgentUndoMessageId !== messageId) {
      toast.error("无法撤销", { description: "该修改已过期或已被撤销" });
      return;
    }

    if (!lastAgentUndoSnapshot) {
      const api = getEasyMotion()?.conversation;
      const reloaded = await api?.load({ subprojectPath: get().subprojectPath });
      const pending = reloaded?.data?.pendingAgentUndo;
      if (pending?.timeline && pending.messageId === messageId) {
        lastAgentUndoSnapshot = pending.timeline;
        set({
          lastAgentUndoSnapshot: pending.timeline,
          lastAgentUndoMessageId: pending.messageId,
        });
      }
    }

    if (!lastAgentUndoSnapshot) {
      toast.error("没有可撤销的修改", {
        description: "撤销快照可能已损坏或已被清除",
      });
      return;
    }

    await get().undoLastAgentChange();
  },

  undoLastAgentChange: async () => {
    const { lastAgentUndoSnapshot, lastAgentUndoMessageId, subprojectPath } = get();
    if (!lastAgentUndoSnapshot) {
      toast.error("没有可撤销的修改");
      return;
    }

    const api = getEasyMotion()?.timeline;
    if (!api?.save) {
      toast.error("时间线 API 不可用");
      return;
    }

    const res = await api.save({ timeline: lastAgentUndoSnapshot, subprojectPath });
    if (!res.success) {
      toast.error("撤销失败", { description: res.error?.message });
      return;
    }

    await useTimelineStore.getState().loadTimeline({
      skipAutoSync: true,
      subprojectPath,
    });
    useTimelineStore.setState((state) => ({
      previewTimelineNonce: state.previewTimelineNonce + 1,
    }));

    const conversationApi = getEasyMotion()?.conversation;
    if (conversationApi?.clearAgentUndo) {
      await conversationApi.clearAgentUndo({ subprojectPath });
    }

    set((state) => ({
      lastAgentUndoSnapshot: null,
      lastAgentUndoMessageId: null,
      messages: state.messages.map((message) =>
        message.id === lastAgentUndoMessageId
          ? { ...message, actionButtons: undefined }
          : message
      ),
      conversation: state.conversation
        ? { ...state.conversation, pendingAgentUndo: undefined }
        : state.conversation,
    }));

    toast.success("已撤销 AI 修改");
    debouncedSave();
  },

  resetForProjectClose: () => {
    debouncedSave.cancel();
    setActiveConversationStreamRequestId(null);
    set({
      conversation: null,
      messages: [],
      subprojectPath: DEFAULT_SUBPROJECT_PATH,
      agentStatus: "idle",
      currentTask: null,
      taskHistory: [],
      streamingMessageId: null,
      inputText: "",
      attachedImages: [],
      isInputDisabled: false,
      isStreaming: false,
      isLoading: false,
      loadError: null,
      lastAgentUndoSnapshot: null,
      lastAgentUndoMessageId: null,
    });
  },
}));

export function getActiveConversationStreamRequestId() {
  return activeStreamRequestId;
}

export function setActiveConversationStreamRequestId(requestId: string | null) {
  activeStreamRequestId = requestId;
}
