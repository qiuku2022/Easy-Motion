import { Bot } from "lucide-react";
import { MessageItem } from "@/components/conversation/MessageItem";
import { Button } from "@/components/ui/button";
import type { AgentStatus, Message } from "@/types/conversation";

const EXAMPLE_PROMPTS = [
  "创建一个标题写着 Hello",
  "按参考图布局生成标题和副标题",
  "字体大一点",
];

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  agentStatus: AgentStatus;
  streamingMessageId: string | null;
  selectedClipId: string | null;
  onExampleSelect: (text: string) => void;
  onAction?: (action: string, messageId: string) => void;
  actionsDisabled?: boolean;
}

export function MessageList({
  messages,
  isStreaming,
  agentStatus,
  streamingMessageId,
  selectedClipId,
  onExampleSelect,
  onAction,
  actionsDisabled,
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
        <Bot className="h-8 w-8 text-muted-foreground/70" aria-hidden />
        <p>向 AI 描述你的动画…</p>
        <p className="text-xs text-muted-foreground/80">
          可上传参考图，并描述布局与风格
        </p>
        <div className="mt-1 flex flex-col gap-1.5">
          {EXAMPLE_PROMPTS.map((example) => (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-normal text-foreground/80 hover:bg-muted/60"
              onClick={() => onExampleSelect(example)}
            >
              {example}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {selectedClipId && (
        <div className="min-w-0 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground break-words">
          已选中片段，可直接说「字体大一点」等微调指令
        </div>
      )}
      {messages.map((message) => {
        const isActiveStream =
          isStreaming && message.id === streamingMessageId;

        return (
          <MessageItem
            key={message.id}
            message={message}
            isStreaming={isActiveStream}
            agentStatus={isActiveStream ? agentStatus : "idle"}
            onAction={onAction}
            actionsDisabled={actionsDisabled}
          />
        );
      })}
    </div>
  );
}
