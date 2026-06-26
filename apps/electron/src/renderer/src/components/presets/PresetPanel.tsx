import { useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  BarChart3,
  Clapperboard,
  Image,
  Layers,
  LayoutGrid,
  Search,
  Sparkles,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { presetThumbnailSrc } from "@/lib/presetThumbnail";
import { setPresetDragData } from "@/lib/timeline/presetDrag";
import { usePresetStore } from "@/stores/presetStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { PresetCategoryMeta, PresetDefinition } from "@/types/preset";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="h-3.5 w-3.5" />,
  Layers: <Layers className="h-3.5 w-3.5" />,
  Type: <Type className="h-3.5 w-3.5" />,
  BarChart3: <BarChart3 className="h-3.5 w-3.5" />,
  Clapperboard: <Clapperboard className="h-3.5 w-3.5" />,
  Image: <Image className="h-3.5 w-3.5" />,
  Sparkles: <Sparkles className="h-3.5 w-3.5" />,
  ArrowLeftRight: <ArrowLeftRight className="h-3.5 w-3.5" />,
};

const CATEGORY_ACCENT: Record<string, string> = {
  background: "from-violet-500/20 to-indigo-600/10",
  title: "from-sky-500/20 to-blue-600/10",
  "data-chart": "from-emerald-500/20 to-teal-600/10",
  "intro-outro": "from-amber-500/20 to-orange-600/10",
  "social-media": "from-pink-500/20 to-rose-600/10",
  content: "from-fuchsia-500/20 to-purple-600/10",
  transition: "from-slate-400/20 to-slate-600/10",
};

export function PresetPanel() {
  const categories = usePresetStore((s) => s.categories);
  const activeCategory = usePresetStore((s) => s.activeCategory);
  const searchQuery = usePresetStore((s) => s.searchQuery);
  const presets = usePresetStore((s) => s.presets);
  const setActiveCategory = usePresetStore((s) => s.setActiveCategory);
  const setSearchQuery = usePresetStore((s) => s.setSearchQuery);
  const openApplyDialog = usePresetStore((s) => s.openApplyDialog);
  const applyDialogOpen = usePresetStore((s) => s.applyDialogOpen);
  const pendingPreset = usePresetStore((s) => s.pendingPreset);
  const closeApplyDialog = usePresetStore((s) => s.closeApplyDialog);
  const placePresetAtPlayhead = useTimelineStore((s) => s.placePresetAtPlayhead);

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return presets.filter((preset) => {
      if (activeCategory !== "all" && preset.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        preset.name.toLowerCase().includes(q) ||
        preset.description.toLowerCase().includes(q) ||
        preset.id.toLowerCase().includes(q)
      );
    });
  }, [presets, activeCategory, searchQuery]);

  const applyPreset = useCallback(
    (preset: PresetDefinition) => {
      const ok = placePresetAtPlayhead(preset.id);
      if (ok) {
        toast.success(`已添加预设：${preset.name}`);
      }
    },
    [placePresetAtPlayhead],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索预设…"
          className="h-8 pl-8 text-xs"
          aria-label="搜索预设"
        />
      </div>

      <div className="scrollbar-theme -mx-1 shrink-0 flex gap-1 overflow-x-auto overflow-y-hidden px-1 pb-1">
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            meta={cat}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
          />
        ))}
      </div>

      <p className="shrink-0 text-[10px] text-muted-foreground">
        单击查看 · 双击应用到播放头 · 拖到时间线放置
      </p>

      <div className="scrollbar-theme -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredPresets.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            该分类下没有匹配的预设
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-1">
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onSingleClick={() => openApplyDialog(preset)}
                onDoubleClick={() => applyPreset(preset)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={applyDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeApplyDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingPreset?.name}</DialogTitle>
            <DialogDescription>{pendingPreset?.description}</DialogDescription>
          </DialogHeader>
          {pendingPreset && (
            <PresetPreviewThumb preset={pendingPreset} className="h-28 w-full" />
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeApplyDialog}>
              取消
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (pendingPreset) {
                  applyPreset(pendingPreset);
                  closeApplyDialog();
                }
              }}
            >
              应用到播放头
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryChip({
  meta,
  active,
  onClick,
}: {
  meta: PresetCategoryMeta;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-7 shrink-0 gap-1 px-2 text-[11px]",
        active && "border-border bg-accent text-accent-foreground",
      )}
      onClick={onClick}
    >
      {CATEGORY_ICONS[meta.icon]}
      {meta.label}
    </Button>
  );
}

function PresetPreviewThumb({
  preset,
  className,
  dragImageRef,
}: {
  preset: PresetDefinition;
  className?: string;
  dragImageRef?: React.Ref<HTMLDivElement>;
}) {
  const src = presetThumbnailSrc(preset.thumbnail);
  if (src) {
    return (
      <div
        ref={dragImageRef}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-preview-canvas",
          className,
        )}
      >
        <img
          src={src}
          alt=""
          className="max-h-full max-w-full object-contain object-center"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    );
  }

  const accent =
    CATEGORY_ACCENT[preset.category] ?? "from-muted/40 to-muted/20";
  return (
    <div
      ref={dragImageRef}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-gradient-to-br",
        accent,
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <span className="text-center text-[10px] font-medium leading-tight text-foreground/80">
          {preset.name}
        </span>
      </div>
    </div>
  );
}

function PresetCard({
  preset,
  onSingleClick,
  onDoubleClick,
}: {
  preset: PresetDefinition;
  onSingleClick: () => void;
  onDoubleClick: () => void;
}) {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const dragImageRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      onSingleClick();
      clickTimer.current = null;
    }, 220);
  };

  const handleDoubleClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    onDoubleClick();
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setPresetDragData(e.dataTransfer, preset, dragImageRef.current);
  };

  const handleDragEnd = () => {
    suppressClickRef.current = true;
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group flex cursor-grab flex-col gap-1.5 rounded-lg border border-border bg-card p-1.5 text-left",
        "transition-colors duration-150 ease-out hover:border-ring/40 hover:bg-accent active:cursor-grabbing",
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={`${preset.description}（拖到时间线放置）`}
    >
      <PresetPreviewThumb
        preset={preset}
        className="aspect-video w-full"
        dragImageRef={dragImageRef}
      />
      <span className="truncate px-0.5 text-[11px] font-medium text-foreground">
        {preset.name}
      </span>
    </button>
  );
}
