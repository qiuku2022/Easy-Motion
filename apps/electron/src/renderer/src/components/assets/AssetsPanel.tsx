import { useCallback, useEffect, useMemo, useRef } from "react";
import { FileUp, Film, Image, Loader2, Music, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  filterAssets,
  groupAssetsByType,
  useAssetStore,
} from "@/stores/assetStore";
import type { AssetMediaType, AssetTypeFilter } from "@/types/asset";
import { AssetCard } from "./AssetCard";
import { DuplicateImportDialog } from "./DuplicateImportDialog";

const TYPE_FILTERS: {
  id: AssetTypeFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "all", label: "全部", icon: null },
  { id: "image", label: "图片", icon: <Image className="h-3 w-3" /> },
  { id: "video", label: "视频", icon: <Film className="h-3 w-3" /> },
  { id: "audio", label: "音频", icon: <Music className="h-3 w-3" /> },
];

const TYPE_LABELS: Record<AssetMediaType, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
};

export function AssetsPanel() {
  const assets = useAssetStore((s) => s.assets);
  const isLoading = useAssetStore((s) => s.isLoading);
  const isImporting = useAssetStore((s) => s.isImporting);
  const error = useAssetStore((s) => s.error);
  const searchQuery = useAssetStore((s) => s.searchQuery);
  const typeFilter = useAssetStore((s) => s.typeFilter);
  const setSearchQuery = useAssetStore((s) => s.setSearchQuery);
  const setTypeFilter = useAssetStore((s) => s.setTypeFilter);
  const pickAndImport = useAssetStore((s) => s.pickAndImport);
  const importFilePaths = useAssetStore((s) => s.importFilePaths);
  const clearError = useAssetStore((s) => s.clearError);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      toast.error("素材导入失败", { description: error });
    }
  }, [error]);

  const filtered = useMemo(
    () => filterAssets(assets, searchQuery, typeFilter),
    [assets, searchQuery, typeFilter],
  );

  const grouped = useMemo(() => groupAssetsByType(filtered), [filtered]);

  const importFromFileList = useCallback(
    async (files: FileList | File[]) => {
      const paths: string[] = [];
      for (const file of files) {
        const withPath = file as File & { path?: string };
        if (withPath.path) paths.push(withPath.path);
      }
      if (paths.length === 0) return;
      clearError();
      const result = await importFilePaths(paths);
      if (result === "ok") {
        toast.success(`已导入 ${paths.length} 个文件`);
      }
    },
    [clearError, importFilePaths],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) {
        void importFromFileList(e.dataTransfer.files);
      }
    },
    [importFromFileList],
  );

  const showGrouped = typeFilter === "all" && !searchQuery.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索素材…"
          className="h-8 pl-8 text-xs"
          aria-label="搜索素材"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {TYPE_FILTERS.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            size="sm"
            variant={typeFilter === chip.id ? "default" : "outline"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setTypeFilter(chip.id)}
          >
            {chip.icon}
            {chip.label}
          </Button>
        ))}
      </div>

      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
        className="rounded-md border border-dashed border-border bg-card/50 p-3 text-center"
      >
        <p className="text-xs text-muted-foreground">拖拽文件到此处导入</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isImporting}
          className="mt-2 gap-1.5 text-xs"
          onClick={() => {
            clearError();
            void pickAndImport().then((result) => {
              if (result === "ok") toast.success("素材已导入");
            });
          }}
        >
          {isImporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          选择文件…
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">加载素材…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无素材。导入后可拖到时间线。</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">没有匹配的素材。</p>
      ) : showGrouped ? (
        <div className="flex flex-col gap-4">
          {(["image", "video", "audio"] as AssetMediaType[]).map((type) => {
            const items = grouped[type];
            if (!items.length) return null;
            return (
              <section key={type}>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {TYPE_LABELS[type]} ({items.length})
                </h3>
                <ul className="flex flex-col gap-1">
                  {items.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </ul>
      )}

      <DuplicateImportDialog />
    </div>
  );
}
