import { useRef } from "react";
import { AiRefThumbnail } from "@/components/conversation/AiRefThumbnail";
import { useImageReorder } from "@/hooks/useImageReorder";
import { cn } from "@/lib/utils";
import type { AttachedImage } from "@/types/conversation";

interface ImageAttachmentProps {
  images: AttachedImage[];
  disabled?: boolean;
  onRemove: (imageId: string) => void;
  onReorder?: (imageIds: string[]) => void;
  className?: string;
}

export function ImageAttachment({
  images,
  disabled,
  onRemove,
  onReorder,
  className,
}: ImageAttachmentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageIds = images.map((image) => image.id);
  const reorderable = Boolean(onReorder) && images.length > 1 && !disabled;
  const { preview, startReorder } = useImageReorder(
    imageIds,
    containerRef,
    onReorder ?? (() => {})
  );

  if (!images.length) return null;

  return (
    <div
      ref={containerRef}
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      title={reorderable ? "拖拽缩略图可调整顺序" : undefined}
    >
      {images.map((image, index) => {
        const isDragging = preview?.imageId === image.id;
        const showInsertBefore =
          preview && preview.insertIndex === index && preview.imageId !== image.id;

        return (
          <div key={image.id} className="relative flex items-center">
            {showInsertBefore ? (
              <span
                className="absolute -left-1 z-10 h-8 w-0.5 rounded-full bg-primary"
                aria-hidden
              />
            ) : null}
            <div
              data-image-reorder-id={image.id}
              onPointerDown={
                reorderable ? (event) => startReorder(event, image.id) : undefined
              }
              className={cn(
                reorderable && "cursor-grab touch-none active:cursor-grabbing",
                isDragging && "z-20 opacity-70 ring-2 ring-primary/50"
              )}
            >
              <AiRefThumbnail
                image={image}
                disabled={disabled}
                onRemove={() => onRemove(image.id)}
              />
            </div>
          </div>
        );
      })}
      {preview && preview.insertIndex >= images.length ? (
        <span className="h-8 w-0.5 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </div>
  );
}
