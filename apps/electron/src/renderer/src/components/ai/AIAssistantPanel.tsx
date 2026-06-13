import { Bot, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LlmMessage } from "@/types/easyMotion";
import { getEasyMotion } from "@/types/easyMotion";

type ChatMessage = LlmMessage & { id: string };

function createMessage(role: LlmMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export function AIAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const api = getEasyMotion()?.llm;
    if (!api) return;

    const unsubscribe = api.onChunk(({ requestId, chunk, isDone }) => {
      if (requestId !== activeRequestRef.current) return;

      if (chunk) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (!last || last.role !== "assistant") {
            next.push(createMessage("assistant", chunk));
            return next;
          }
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }

      if (isDone) {
        activeRequestRef.current = null;
        setIsStreaming(false);
      }
    });

    return unsubscribe;
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const api = getEasyMotion()?.llm;
    if (!api) {
      toast.error("AI 服务不可用", {
        description: "请重启应用后重试",
      });
      return;
    }

    const userMessage = createMessage("user", text);
    const history = [...messages, userMessage].map(({ role, content }) => ({
      role,
      content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const requestId = crypto.randomUUID();
    activeRequestRef.current = requestId;
    setMessages((prev) => [...prev, createMessage("assistant", "")]);

    const result = await api.stream({ requestId, messages: history });
    if (!result.success) {
      activeRequestRef.current = null;
      setIsStreaming(false);
      setMessages((prev) => prev.filter((m) => m.role !== "assistant" || m.content));
      toast.error("发送失败", {
        description: result.error?.message ?? "未知错误",
      });
      return;
    }
  }, [input, isStreaming, messages]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col text-sm">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Bot className="h-8 w-8 text-muted-foreground/70" aria-hidden />
              <p>向 AI 描述你的动画…</p>
              <p className="text-xs text-muted-foreground/80">
                例如：创建一个标题写着 Hello
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground"
                )}
              >
                {message.content ||
                  (message.role === "assistant" && isStreaming ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      思考中…
                    </span>
                  ) : null)}
              </div>
            ))
          )}
          <div ref={scrollAnchorRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="描述你的动画..."
            className="flex-1"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            aria-label="发送"
            disabled={isStreaming || !input.trim()}
            onClick={() => void sendMessage()}
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
