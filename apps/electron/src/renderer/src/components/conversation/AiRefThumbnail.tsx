import * as React from "react";
import { ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEasyMotion } from "@/types/easyMotion";
import type { AttachedImage } from "@/types/conversation";

export type AiRefImageSource = Pick<
  AttachedImage,
  "path" | "relativePath" | "name" | "previewUrl"
>;

interface AiRefThumbnailProps {
  image: AiRefImageSource;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "on-primary";
}

export function AiRefThumbnail({
  image,
  onRemove,
  disabled,
  className,
  variant = "default",
}: AiRefThumbnailProps) {
  const [src, setSrc] = React.useState<string | null>(image.previewUrl ?? null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (image.previewUrl) {
      setSrc(image.previewUrl);
      setFailed(false);
      return;
    }

    let cancelled = false;
    const api = getEasyMotion()?.conversation;
    if (!api?.readAiRefPreview) return;

    void api
      .readAiRefPreview({ path: image.path, relativePath: image.relativePath })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.dataUrl) {
          setSrc(res.data.dataUrl);
          setFailed(false);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [image.path, image.previewUrl, image.relativePath]);

  return (
    <div
      className={cn(
        "group relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted/50",
        variant === "on-primary" ? "border-primary-foreground/25" : "border-border/80",
        className
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={image.name ?? "参考图"}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-0.5 text-muted-foreground">
          <ImageIcon className="size-3.5" />
          {failed && <span className="text-[9px]">失败</span>}
        </div>
      )}
      {onRemove && !disabled && (
        <button
          type="button"
          className="absolute inset-0 flex items-start justify-end bg-black/0 p-0.5 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100"
          aria-label="移除参考图"
          onClick={onRemove}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
            <X className="size-2.5" />
          </span>
        </button>
      )}
    </div>
  );
}
