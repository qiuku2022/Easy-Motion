import { useCallback, useRef } from "react";
import { FileUp, Film, Image, Loader2, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { setAssetDragData } from "@/lib/timeline/assetDrag";
import { useAssetStore } from "@/stores/assetStore";
import type { AssetMediaType, ProjectAsset } from "@/types/asset";

const TYPE_ICONS: Record<AssetMediaType, React.ReactNode> = {
  image: <Image className="h-4 w-4" />,
  video: <Film className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
};

export function AssetsPanel() {
  const assets = useAssetStore((s) => s.assets);
  const isLoading = useAssetStore((s) => s.isLoading);
  const isImporting = useAssetStore((s) => s.isImporting);
  const error = useAssetStore((s) => s.error);
  const pickAndImport = useAssetStore((s) => s.pickAndImport);
  const importFilePaths = useAssetStore((s) => s.importFilePaths);
  const clearError = useAssetStore((s) => s.clearError);
  const dropRef = useRef<HTMLDivElement>(null);

  const importFromFileList = useCallback(
    async (files: FileList | File[]) => {
      const paths: string[] = [];
      for (const file of files) {
        const withPath = file as File & { path?: string };
        if (withPath.path) paths.push(withPath.path);
      }
      if (paths.length === 0) return;
      clearError();
      await importFilePaths(paths);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
        className="rounded-md border border-dashed border-em-border bg-em-surface/50 p-4 text-center"
      >
        <p className="text-xs text-em-muted">拖拽文件到此处导入</p>
        <button
          type="button"
          disabled={isImporting}
          onClick={() => {
            clearError();
            void pickAndImport();
          }}
          className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-em-border bg-em-elevated px-3 py-1.5 text-xs text-em-text transition-colors duration-150 ease-out hover:bg-em-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          选择文件…
        </button>
      </div>

      {error && (
        <p className="text-xs text-em-error" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-em-muted">加载素材…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-em-muted">暂无素材。导入后可拖到时间线。</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto">
          {assets.map((asset) => (
            <AssetRow key={asset.id} asset={asset} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AssetRow({ asset }: { asset: ProjectAsset }) {
  return (
    <li
      draggable
      onDragStart={(e) => {
        setAssetDragData(e.dataTransfer, asset);
      }}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-em-border bg-em-surface px-2 py-2 text-xs text-em-text",
        "transition-colors duration-150 ease-out hover:border-em-teal/40 hover:bg-em-elevated active:cursor-grabbing",
      )}
      title="拖到时间线创建片段"
    >
      <span className="text-em-teal">{TYPE_ICONS[asset.type]}</span>
      <span className="min-w-0 flex-1 truncate">{asset.name}</span>
      <span className="shrink-0 font-mono text-[10px] uppercase text-em-muted">
        {asset.type}
      </span>
    </li>
  );
}
