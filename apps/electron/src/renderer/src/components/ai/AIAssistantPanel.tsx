import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AIAssistantPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col text-sm">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Bot className="h-8 w-8 text-muted-foreground/70" aria-hidden />
            <p>向 AI 描述你的动画…</p>
            <p className="text-xs text-muted-foreground/80">
              例如：创建一个标题写着 Hello
            </p>
          </div>
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="描述你的动画..."
            className="flex-1"
          />
          <Button
            type="button"
            size="icon"
            className="shrink-0"
            aria-label="发送"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
