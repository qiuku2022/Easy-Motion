import { Button } from "@/components/ui/button";
import type { ActionButton } from "@/types/conversation";

interface ActionButtonsProps {
  buttons: ActionButton[];
  onAction: (action: string) => void;
  disabled?: boolean;
}

export function ActionButtons({ buttons, onAction, disabled }: ActionButtonsProps) {
  if (!buttons.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {buttons.map((button) => {
        const isPrimaryAction =
          button.action === "apply" ||
          button.label.includes("应用") ||
          button.label.includes("采纳");

        return (
          <Button
            key={button.id}
            type="button"
            variant={isPrimaryAction ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            disabled={disabled}
            onClick={() => onAction(button.action)}
          >
            {button.label}
          </Button>
        );
      })}
    </div>
  );
}
