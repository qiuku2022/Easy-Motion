import { useCallback, useEffect, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Trash2, X } from "lucide-react";
import { z } from "zod";
import { ClipPropertyFields } from "@/components/properties/ClipPropertyFields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { debounce } from "@/lib/debounce";
import { resolveEditableClipType } from "@/lib/timeline/clipPropertySchema";
import type { ClipPatch } from "@/lib/timeline/mutations";
import { TRACK_TYPE_LABELS } from "@/lib/timeline/trackLabels";
import {
  collectLayerElements,
  findLayerTrackForClip,
  findTrackById,
  pickDefaultContentElement,
} from "@/lib/timeline/trackTree";
import { useTimelineStore } from "@/stores/timelineStore";
import type { Clip, Track, TrackType } from "@/types/timeline";

const textContentSchema = z.object({
  content: z.string(),
});

function usePropertyTarget() {
  const timeline = useTimelineStore((s) => s.timeline);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);
  const selectedTrackId = useTimelineStore((s) => s.selectedTrackId);

  return useMemo(() => {
    if (!timeline) return null;

    let layerTrack: Track | null = null;
    if (selectedTrackId) {
      layerTrack =
        timeline.tracks.find(
          (t) =>
            t.id === selectedTrackId ||
            t.children?.some((c) => c.id === selectedTrackId),
        ) ?? findTrackById(timeline, selectedTrackId);
    }

    let contentClip: Clip | null = null;
    let contentTrack: Track | null = null;

    if (selectedClipId) {
      const located = findLayerTrackForClip(timeline, selectedClipId);
      if (located) {
        layerTrack = located.layerTrack;
        contentClip = located.clip;
        contentTrack = located.clipTrack;
      }
    }

    if (!layerTrack) return null;

    if (!contentClip) {
      const fallback = pickDefaultContentElement(collectLayerElements(layerTrack));
      if (fallback) {
        contentClip = fallback.clip;
        contentTrack = fallback.track;
      }
    }

    const contentType =
      contentClip && contentTrack
        ? resolveEditableClipType(contentClip, contentTrack.type)
        : null;

    return {
      timeline,
      layerTrack,
      contentClip,
      contentTrack,
      contentType,
    };
  }, [timeline, selectedClipId, selectedTrackId]);
}

export function PropertiesPanel() {
  const resolved = usePropertyTarget();
  const clearSelection = useTimelineStore((s) => s.clearSelection);
  const updateClip = useTimelineStore((s) => s.updateClip);
  const deleteSelectedClip = useTimelineStore((s) => s.deleteSelectedClip);
  const error = useTimelineStore((s) => s.error);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const debouncedPatch = useMemo(
    () =>
      debounce((clipId: string, patch: ClipPatch) => {
        updateClip(clipId, patch);
      }, 400),
    [updateClip],
  );

  useEffect(() => () => debouncedPatch.cancel(), [debouncedPatch]);

  const onPatch = useCallback(
    (clipId: string, patch: ClipPatch) => {
      const isTextContent =
        patch.source && "content" in patch.source && patch.source.content !== undefined;
      if (isTextContent) debouncedPatch(clipId, patch);
      else {
        debouncedPatch.cancel();
        updateClip(clipId, patch);
      }
    },
    [debouncedPatch, updateClip],
  );

  useEffect(() => {
    if (resolved?.contentType === "text") {
      textRef.current?.focus();
      textRef.current?.select();
    }
  }, [resolved?.contentClip?.id, resolved?.contentType]);

  if (!resolved) {
    return (
      <p className="text-sm text-muted-foreground">
        点击时间线上的文字片段即可直接编辑。按 Esc 取消选择。
      </p>
    );
  }

  const { layerTrack, contentClip, contentTrack, contentType } = resolved;
  const disabled = layerTrack.locked;

  if (contentClip && contentType === "text" && contentTrack) {
    return (
      <TextEditorPanel
        key={contentClip.id}
        layerName={layerTrack.name}
        clip={contentClip}
        disabled={disabled}
        textRef={textRef}
        error={error}
        onPatch={(patch) => onPatch(contentClip.id, patch)}
        onClear={() => clearSelection()}
        onDelete={() => deleteSelectedClip()}
      />
    );
  }

  if (contentClip && contentType && contentTrack) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">
            {layerTrack.name} · {TRACK_TYPE_LABELS[contentType as TrackType]}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="取消选择 (Esc)"
            onClick={() => clearSelection()}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">取消选择</span>
          </Button>
        </div>
        <ClipPropertyFields
          clipType={contentType}
          clip={contentClip}
          disabled={disabled}
          onPatch={(patch) => onPatch(contentClip.id, patch)}
          mode="quick"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{layerTrack.name}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="取消选择 (Esc)"
          onClick={() => clearSelection()}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">取消选择</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {layerTrack.type === "group"
          ? "此图层没有可编辑的文字。展开分组，点击「主标题」文字条，或新建文字轨道。"
          : "此图层暂无可编辑内容。请添加文字片段，或从素材库拖入。"}
      </p>
    </div>
  );
}

function TextEditorPanel({
  layerName,
  clip,
  disabled,
  textRef,
  error,
  onPatch,
  onClear,
  onDelete,
}: {
  layerName: string;
  clip: Clip;
  disabled: boolean;
  textRef: React.RefObject<HTMLTextAreaElement>;
  error: string | null;
  onPatch: (patch: ClipPatch) => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const saved = String(clip.source?.content ?? "");

  const form = useForm<z.infer<typeof textContentSchema>>({
    resolver: zodResolver(textContentSchema),
    defaultValues: { content: saved },
  });

  useEffect(() => {
    form.reset({ content: String(clip.source?.content ?? "") });
  }, [clip.id, clip.source?.content, form]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{layerName}</p>
          <p className="text-xs text-muted-foreground">直接改字，自动写入时间线</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          title="取消选择 (Esc)"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">取消选择</span>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()}>
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      (
                        textRef as React.MutableRefObject<HTMLTextAreaElement | null>
                      ).current = el;
                    }}
                    className="min-h-[120px] resize-y text-sm leading-relaxed"
                    disabled={disabled}
                    placeholder="输入文字…"
                    onChange={(e) => {
                      field.onChange(e);
                      onPatch({ source: { kind: "inline", content: e.target.value } });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none text-foreground">更多样式</summary>
        <div className="mt-2 space-y-2 border-t border-border pt-2">
          <ClipPropertyFields
            clipType="text"
            clip={clip}
            disabled={disabled}
            onPatch={onPatch}
            mode="quick"
            excludePaths={["source.content"]}
          />
        </div>
      </details>

      <p className="text-[11px] text-muted-foreground">
        改字后约 1 秒自动更新预览（需已启动预览）。Esc 或 × 可退出。
      </p>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled}
            className="w-full gap-2 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            删除片段
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除片段？</AlertDialogTitle>
            <AlertDialogDescription>
              将从时间线移除「{clip.name || "未命名片段"}」。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
