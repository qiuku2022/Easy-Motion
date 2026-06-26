import { useMemo } from "react";
import { Clock, Star } from "lucide-react";
import {
  favoriteAssets,
  recentAssets,
  useAssetStore,
} from "@/stores/assetStore";
import { AssetCard } from "./AssetCard";

export function QuickAssetPanel() {
  const assets = useAssetStore((s) => s.assets);

  const favorites = useMemo(() => favoriteAssets(assets), [assets]);
  const recent = useMemo(() => recentAssets(assets), [assets]);

  if (assets.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        暂无素材。在左侧素材库导入后，拖到时间线会自动加入「最近使用」。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Star className="h-3.5 w-3.5 text-amber-400" />
          收藏
        </h3>
        {favorites.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            点击素材旁的星标即可收藏，便于快速访问。
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {favorites.map((asset) => (
              <AssetCard key={asset.id} asset={asset} compact showMeta={false} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Clock className="h-3.5 w-3.5 text-em-teal" />
          最近使用
        </h3>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            将素材拖到时间线后，会出现在这里。
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recent.map((asset) => (
              <AssetCard key={asset.id} asset={asset} compact />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
