import { Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AgentCreationModeToggle } from "@/components/ai/AgentCreationModeToggle";
import { LLMSettingsDialog } from "@/components/ai/LLMSettingsDialog";
import { HSCROLL_HOVER_EVENT } from "@/components/conversation/HorizontalScrollRegion";
import { GenerationProgress } from "@/components/conversation/GenerationProgress";
import { MessageInput } from "@/components/conversation/MessageInput";
import { MessageList } from "@/components/conversation/MessageList";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getActiveConversationStreamRequestId,
  useConversationStore,
} from "@/stores/conversationStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { getEasyMotion } from "@/types/easyMotion";

export function AIAssistantPanel() {
  const messages = useConversationStore((state) => state.messages);
  const inputText = useConversationStore((state) => state.inputText);
  const attachedImages = useConversationStore((state) => state.attachedImages);
  const isStreaming = useConversationStore((state) => state.isStreaming);
  const loadError = useConversationStore((state) => state.loadError);
  const setInputText = useConversationStore((state) => state.setInputText);
  const sendMessage = useConversationStore((state) => state.sendMessage);
  const cancelMessage = useConversationStore((state) => state.cancelMessage);
  const pickAiReferenceImages = useConversationStore(
    (state) => state.pickAiReferenceImages
  );
  const removeImage = useConversationStore((state) => state.removeImage);
  const reorderImages = useConversationStore((state) => state.reorderImages);
  const appendStreamingChunk = useConversationStore(
    (state) => state.appendStreamingChunk
  );
  const setAgentStatusFromMain = useConversationStore(
    (state) => state.setAgentStatusFromMain
  );
  const handleConversationComplete = useConversationStore(
    (state) => state.handleConversationComplete
  );
  const handleConversationError = useConversationStore(
    (state) => state.handleConversationError
  );
  const handleMessageAction = useConversationStore(
    (state) => state.handleMessageAction
  );
  const agentStatus = useConversationStore((state) => state.agentStatus);
  const creationMode = useConversationStore((state) => state.creationMode);
  const setCreationMode = useConversationStore((state) => state.setCreationMode);
  const loadCreationMode = useConversationStore((state) => state.loadCreationMode);
  const streamingMessageId = useConversationStore((state) => state.streamingMessageId);
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [llmConfigured, setLlmConfigured] = useState<boolean | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const hScrollHoverRef = useRef(false);
  const promptedForKeyRef = useRef(false);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (hScrollHoverRef.current) return;
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  const handleChatScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 64;
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      stickToBottomRef.current = true;
    }
  }, [messages]);

  useEffect(() => {
    if (!stickToBottomRef.current && !isStreaming) return;

    const frame = requestAnimationFrame(() => {
      scrollChatToBottom(isStreaming ? "auto" : "smooth");
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isStreaming, agentStatus, scrollChatToBottom]);

  useEffect(() => {
    const content = scrollContentRef.current;
    if (!content) return;

    const observer = new ResizeObserver(() => {
      if (hScrollHoverRef.current) return;
      if (!stickToBottomRef.current && !isStreaming) return;
      scrollChatToBottom("auto");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [isStreaming, scrollChatToBottom]);

  useEffect(() => {
    const onHScrollHover = (event: Event) => {
      const active = Boolean(
        (event as CustomEvent<{ active?: boolean }>).detail?.active
      );
      hScrollHoverRef.current = active;
    };

    document.addEventListener(HSCROLL_HOVER_EVENT, onHScrollHover);
    return () => document.removeEventListener(HSCROLL_HOVER_EVENT, onHScrollHover);
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      if (!(event.target instanceof Element)) return;
      const region = event.target.closest("[data-hscroll-region]");
      if (!(region instanceof HTMLElement)) return;
      if (region.scrollWidth <= region.clientWidth + 1) return;

      event.preventDefault();
    };

    viewport.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => viewport.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const refreshLlmStatus = useCallback(async () => {
    const api = getEasyMotion()?.settings;
    if (!api) {
      setLlmConfigured(false);
      return;
    }

    const result = await api.get({ keys: ["llm"] });
    if (!result.success || !result.data?.llm) {
      setLlmConfigured(false);
      return;
    }

    const configured = Boolean(result.data.llm.apiKeyConfigured);
    setLlmConfigured(configured);

    if (!configured && !promptedForKeyRef.current) {
      promptedForKeyRef.current = true;
      toast.info("尚未配置 LLM API Key", {
        description: "点击右上角齿轮打开设置",
        action: {
          label: "去设置",
          onClick: () => setSettingsOpen(true),
        },
      });
    }
  }, []);

  useEffect(() => {
    void refreshLlmStatus();
    void loadCreationMode();
  }, [refreshLlmStatus, loadCreationMode]);

  useEffect(() => {
    const api = getEasyMotion()?.conversation;
    if (!api) return;

    const unsubChunk = api.onChunk(({ requestId, chunk }) => {
      if (requestId !== getActiveConversationStreamRequestId()) return;
      if (chunk) appendStreamingChunk(chunk);
    });

    const unsubComplete = api.onComplete((payload) => {
      void handleConversationComplete(payload);
    });

    const unsubError = api.onError(({ requestId, message }) => {
      if (requestId !== getActiveConversationStreamRequestId()) return;
      handleConversationError(message);
    });

    const unsubStatus = api.onStatus(({ requestId, status }) => {
      if (requestId !== getActiveConversationStreamRequestId()) return;
      setAgentStatusFromMain(status);
    });

    return () => {
      unsubChunk();
      unsubComplete();
      unsubError();
      unsubStatus();
    };
  }, [
    appendStreamingChunk,
    handleConversationComplete,
    handleConversationError,
    setAgentStatusFromMain,
  ]);

  const onSend = async () => {
    if (llmConfigured === false) {
      toast.error("请先配置 LLM API Key", {
        action: {
          label: "打开设置",
          onClick: () => setSettingsOpen(true),
        },
      });
      return;
    }
    await sendMessage();
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col text-sm">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">AI 助手</span>
          <AgentCreationModeToggle
            value={creationMode}
            disabled={isStreaming}
            onChange={(mode) => void setCreationMode(mode)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="LLM 设置"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
        viewportRef={scrollViewportRef}
        onScroll={handleChatScroll}
      >
        <div
          ref={scrollContentRef}
          className="flex w-full min-w-0 flex-col gap-3 overflow-x-hidden p-3"
        >
          {loadError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {loadError}
            </div>
          )}
          {llmConfigured === false && (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              尚未配置 API Key。点击右上角齿轮，或继续使用开发环境 `.env` 后备。
            </div>
          )}
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            agentStatus={agentStatus}
            streamingMessageId={streamingMessageId}
            selectedClipId={selectedClipId}
            onExampleSelect={setInputText}
            onAction={(action, messageId) => void handleMessageAction(action, messageId)}
            actionsDisabled={isStreaming}
          />
          <GenerationProgress status={agentStatus} isStreaming={isStreaming} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <MessageInput
          value={inputText}
          attachedImages={attachedImages}
          isStreaming={isStreaming}
          placeholder={
            selectedClipId ? "描述如何调整选中片段…" : "描述动画或上传参考图…"
          }
          onChange={setInputText}
          onSend={() => void onSend()}
          onCancel={() => void cancelMessage()}
          onPickImages={() => void pickAiReferenceImages()}
          onRemoveImage={removeImage}
          onReorderImages={reorderImages}
        />
      </div>

      <LLMSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={() => void refreshLlmStatus()}
      />
    </div>
  );
}
