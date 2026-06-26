import { Loader2 } from "lucide-react";
import { memo } from "react";
import { ActionButtons } from "@/components/conversation/ActionButtons";
import { MessageImageThumbnails } from "@/components/conversation/MessageImageThumbnails";
import { MessageMarkdown } from "@/components/conversation/MessageMarkdown";
import { cn } from "@/lib/utils";
import type { AgentStatus, Message } from "@/types/conversation";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
  agentStatus?: AgentStatus;
  onAction?: (action: string, messageId: string) => void;
  actionsDisabled?: boolean;
}

export const MessageItem = memo(function MessageItem({
  message,
  isStreaming = false,
  agentStatus = "idle",
  onAction,
  actionsDisabled,
}: MessageItemProps) {
  const showThinking =
    message.role === "assistant" &&
    isStreaming &&
    !message.content.trim();

  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full",
        isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"
      )}
    >
      <div
        className={cn(
          "min-w-0 overflow-hidden rounded-lg px-3 py-2 text-sm leading-relaxed",
          isUser ? "max-w-[88%]" : "w-full max-w-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : isSystem
              ? "w-auto max-w-full bg-muted/60 text-center text-xs text-muted-foreground"
              : "bg-muted text-foreground"
        )}
      >
        {message.attachedImages?.length ? (
          <MessageImageThumbnails
            paths={message.attachedImages}
            variant={isUser ? "on-primary" : "default"}
            className={message.content.trim() ? "mb-2" : undefined}
          />
        ) : null}

        {showThinking ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            {agentStatus === "generating" ? "正在修改时间线…" : "思考中…"}
          </span>
        ) : isSystem ? (
          <p>{message.content}</p>
        ) : (
          <MessageMarkdown
            content={message.content}
            variant={isUser ? "user" : "assistant"}
          />
        )}

        {message.codeDiff?.timelineSummary || message.codeDiff?.remotionSummary ? (
          <div className="mt-2 space-y-1.5">
            {message.codeDiff.timelineSummary ? (
              <div className="max-w-full overflow-hidden rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  时间线
                </p>
                <MessageMarkdown
                  content={message.codeDiff.timelineSummary}
                  variant="muted"
                />
              </div>
            ) : null}
            {message.codeDiff.remotionSummary ? (
              <div className="max-w-full overflow-hidden rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Remotion 代码
                </p>
                <MessageMarkdown
                  content={message.codeDiff.remotionSummary}
                  variant="muted"
                />
              </div>
            ) : null}
          </div>
        ) : message.codeDiff?.summary ? (
          <div className="mt-2 max-w-full overflow-hidden rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
            <MessageMarkdown content={message.codeDiff.summary} variant="muted" />
          </div>
        ) : null}

        {message.actionButtons?.length && onAction ? (
          <ActionButtons
            buttons={message.actionButtons}
            disabled={actionsDisabled}
            onAction={(action) => onAction(action, message.id)}
          />
        ) : null}
      </div>
    </div>
  );
});
