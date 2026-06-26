import { useEffect, useState } from "react";
import { Film, Image, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetMediaType, ProjectAsset } from "@/types/asset";
import { getEasyMotion } from "@/types/easyMotion";

const TYPE_ICONS: Record<AssetMediaType, React.ReactNode> = {
  image: <Image className="h-5 w-5" />,
  video: <Film className="h-5 w-5" />,
  audio: <Music className="h-5 w-5" />,
};

interface AssetThumbnailProps {
  asset: ProjectAsset;
  className?: string;
  iconClassName?: string;
}

export function AssetThumbnail({
  asset,
  className,
  iconClassName,
}: AssetThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);

    const api = getEasyMotion();
    if (!api?.asset?.readThumbnail) {
      setFailed(true);
      return;
    }

    void api.asset.readThumbnail({ assetId: asset.id }).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.dataUrl) {
        setSrc(res.data.dataUrl);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/60",
        className,
      )}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className={cn("text-em-teal/80", iconClassName)}>
          {TYPE_ICONS[asset.type]}
        </span>
      )}
    </div>
  );
}
