import { AIAssistantPanel } from "@/components/ai/AIAssistantPanel";

export function AiPanel() {
  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-border bg-background">
      <AIAssistantPanel />
    </aside>
  );
}
