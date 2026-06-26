import { useCallback, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatAssetDimensions,
  formatAssetDuration,
  formatAssetExtension,
  formatAssetSize,
} from "@/lib/assetFormat";
import { cn } from "@/lib/utils";
import { setAssetDragData } from "@/lib/timeline/assetDrag";
import { useAssetStore } from "@/stores/assetStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { ProjectAsset } from "@/types/asset";
import { AssetHoverPreview } from "./AssetHoverPreview";
import { AssetThumbnail } from "./AssetThumbnail";

interface AssetCardProps {
  asset: ProjectAsset;
  compact?: boolean;
  showMeta?: boolean;
  showFavorite?: boolean;
}

export function AssetCard({
  asset,
  compact = false,
  showMeta = true,
  showFavorite = true,
}: AssetCardProps) {
  const toggleFavorite = useAssetStore((s) => s.toggleFavorite);
  const fps = useTimelineStore((s) => s.timeline?.fps ?? 30);
  const rowRef = useRef<HTMLLIElement>(null);
  const [hovering, setHovering] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovering(true), 800);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovering(false);
  }, []);

  return (
    <li
      ref={rowRef}
      draggable
      onDragStart={(e) => setAssetDragData(e.dataTransfer, asset)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group relative flex cursor-grab items-center gap-2 rounded-md border border-border bg-card text-xs text-foreground",
        "transition-colors duration-150 ease-out hover:border-em-teal/40 hover:bg-accent active:cursor-grabbing",
        compact ? "px-2 py-1.5" : "px-2 py-2",
      )}
      title="拖到时间线创建片段"
    >
      <AssetThumbnail
        asset={asset}
        className={compact ? "h-9 w-9" : "h-12 w-12"}
        iconClassName={compact ? "h-4 w-4" : "h-5 w-5"}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{asset.name}</p>
        {showMeta && (
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {formatAssetExtension(asset.name)}
            {asset.type !== "audio" && asset.width
              ? ` · ${formatAssetDimensions(asset.width, asset.height)}`
              : ""}
            {asset.type !== "image"
              ? ` · ${formatAssetDuration(asset.durationInFrames, fps)}`
              : ""}
            {asset.sizeBytes ? ` · ${formatAssetSize(asset.sizeBytes)}` : ""}
          </p>
        )}
      </div>

      {showFavorite && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100",
            asset.isFavorite && "opacity-100",
          )}
          aria-label={asset.isFavorite ? "取消收藏" : "收藏"}
          onClick={(e) => {
            e.stopPropagation();
            void toggleFavorite(asset.id);
          }}
        >
          <Star
            className={cn(
              "h-3.5 w-3.5",
              asset.isFavorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </Button>
      )}

      {hovering && rowRef.current && (
        <AssetHoverPreview asset={asset} anchor={rowRef.current} />
      )}
    </li>
  );
}
