import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Film, Music } from "lucide-react";
import type { ProjectAsset } from "@/types/asset";
import { getEasyMotion } from "@/types/easyMotion";

interface AssetHoverPreviewProps {
  asset: ProjectAsset;
  anchor: HTMLElement;
}

export function AssetHoverPreview({ asset, anchor }: AssetHoverPreviewProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const update = () => setRect(anchor.getBoundingClientRect());
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor]);

  useEffect(() => {
    let cancelled = false;
    const api = getEasyMotion();
    if (!api?.asset?.readThumbnail) return;

    void api.asset.readThumbnail({ assetId: asset.id }).then((res) => {
      if (!cancelled && res.success && res.data?.dataUrl) {
        setSrc(res.data.dataUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  if (!rect) return null;

  const left = Math.min(rect.right + 8, window.innerWidth - 220);
  const top = Math.max(8, Math.min(rect.top, window.innerHeight - 180));

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
      style={{ left, top }}
    >
      {asset.type === "image" && src ? (
        <img src={src} alt="" className="max-h-40 w-full object-contain bg-black/40" />
      ) : asset.type === "video" && src ? (
        <div className="relative bg-black/60">
          <img src={src} alt="" className="max-h-40 w-full object-contain" />
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            <Film className="mr-0.5 inline h-3 w-3" />
            视频
          </span>
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-muted/40 text-muted-foreground">
          <Music className="h-8 w-8" />
          <span className="ml-2 text-xs">音频素材</span>
        </div>
      )}
      <p className="truncate px-2 py-1.5 text-xs text-foreground">{asset.name}</p>
    </div>,
    document.body,
  );
}
