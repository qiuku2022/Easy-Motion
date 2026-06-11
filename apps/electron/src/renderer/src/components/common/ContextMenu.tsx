import {
  ContextMenu as ShadcnContextMenu,
  ContextMenuContent,
  ContextMenuItem as ShadcnContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export interface ContextMenuItem {
  id: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface ContextMenuWrapperProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  onOpen?: () => void;
}

/** 包裹式右键菜单（Radix ContextMenu） */
export function ContextMenuWrapper({
  items,
  children,
  onOpen,
}: ContextMenuWrapperProps) {
  return (
    <ShadcnContextMenu
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        className="z-[90] min-w-[10rem]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {items.map((item) => (
          <ShadcnContextMenuItem
            key={item.id}
            disabled={item.disabled}
            variant={item.danger ? "destructive" : "default"}
            className="text-xs"
            onSelect={() => {
              if (item.disabled) return;
              item.onClick();
            }}
          >
            {item.label}
          </ShadcnContextMenuItem>
        ))}
      </ContextMenuContent>
    </ShadcnContextMenu>
  );
}
