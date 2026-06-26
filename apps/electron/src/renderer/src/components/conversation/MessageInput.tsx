import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { ImagePlus, Sparkles, Square } from "lucide-react";
import { ImageAttachment } from "@/components/conversation/ImageAttachment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AttachedImage } from "@/types/conversation";

/** 与 Tailwind `max-h-32` 一致 */
const TEXTAREA_MAX_HEIGHT_PX = 128;

interface MessageInputProps {
  value: string;
  attachedImages: AttachedImage[];
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxImages?: number;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onPickImages: () => void;
  onRemoveImage: (imageId: string) => void;
  onReorderImages?: (imageIds: string[]) => void;
}

export function MessageInput({
  value,
  attachedImages,
  isStreaming,
  disabled,
  placeholder,
  maxImages = 3,
  onChange,
  onSend,
  onCancel,
  onPickImages,
  onRemoveImage,
  onReorderImages,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canAttach = attachedImages.length < maxImages;
  const inputDisabled = disabled || isStreaming;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isStreaming && value.trim()) {
        onSend();
      }
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-muted/20 p-2",
        "focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20"
      )}
    >
      {attachedImages.length > 0 && (
        <div className="mb-2 border-b border-border/50 pb-2">
          <ImageAttachment
            images={attachedImages}
            disabled={inputDisabled}
            onRemove={onRemoveImage}
            onReorder={onReorderImages}
          />
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="添加参考图"
          title={canAttach ? `添加参考图（最多 ${maxImages} 张）` : "已达参考图上限"}
          disabled={inputDisabled || !canAttach}
          onClick={onPickImages}
        >
          <ImagePlus className="size-4" />
        </Button>

        <Textarea
          ref={textareaRef}
          placeholder={placeholder ?? "描述动画或上传参考图..."}
          className="field-sizing-fixed scrollbar-hidden min-h-9 max-h-32 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:ring-0"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={inputDisabled}
        />

        <Button
          type="button"
          size="icon"
          className="size-9 shrink-0"
          aria-label={isStreaming ? "取消" : "发送"}
          disabled={!isStreaming && !value.trim()}
          onClick={() => void (isStreaming ? onCancel() : onSend())}
        >
          {isStreaming ? (
            <Square className="size-4" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
