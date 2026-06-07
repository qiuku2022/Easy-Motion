import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { ClipPropertyFields } from "@/components/properties/ClipPropertyFields";
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
import { cn } from "@/lib/utils";
import { useTimelineStore } from "@/stores/timelineStore";
import type { Clip, Timeline, Track, TrackType } from "@/types/timeline";

const inputClass =
  "w-full rounded-md border border-em-border bg-em-surface px-2.5 py-1.5 text-sm text-em-text placeholder:text-em-muted focus:border-em-teal focus:outline-none focus:ring-1 focus:ring-em-teal disabled:cursor-not-allowed disabled:opacity-50";

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
      <p className="text-sm text-em-muted">
        点击时间线上的文字片段即可直接编辑。按 Esc 取消选择。
      </p>
    );
  }

  const { layerTrack, contentClip, contentTrack, contentType } = resolved;
  const disabled = layerTrack.locked;

  if (contentClip && contentType === "text" && contentTrack) {
    return (
      <TextEditorPanel
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
          <p className="text-sm font-medium text-em-text">
            {layerTrack.name} · {TRACK_TYPE_LABELS[contentType as TrackType]}
          </p>
          <button
            type="button"
            title="取消选择 (Esc)"
            className="cursor-pointer rounded-md p-1.5 text-em-muted hover:bg-em-surface hover:text-em-text"
            onClick={() => clearSelection()}
          >
            <X className="h-4 w-4" />
          </button>
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
        <p className="font-medium text-em-text">{layerTrack.name}</p>
        <button
          type="button"
          title="取消选择 (Esc)"
          className="cursor-pointer rounded-md p-1.5 text-em-muted hover:bg-em-surface hover:text-em-text"
          onClick={() => clearSelection()}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-em-muted">
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
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [clip.id, saved]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-em-text">{layerName}</p>
          <p className="text-xs text-em-muted">直接改字，自动写入时间线</p>
        </div>
        <button
          type="button"
          title="取消选择 (Esc)"
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-em-muted transition-colors hover:bg-em-surface hover:text-em-text"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        ref={textRef}
        className={cn(inputClass, "min-h-[120px] resize-y leading-relaxed")}
        value={draft}
        disabled={disabled}
        placeholder="输入文字…"
        onChange={(e) => {
          setDraft(e.target.value);
          onPatch({ source: { kind: "inline", content: e.target.value } });
        }}
      />

      <details className="text-xs text-em-muted">
        <summary className="cursor-pointer select-none text-em-text">更多样式</summary>
        <div className="mt-2 space-y-2 border-t border-em-border pt-2">
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

      <p className="text-[11px] text-em-muted">
        改字后约 1 秒自动更新预览（需已启动预览）。Esc 或 × 可退出。
      </p>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <button
        type="button"
        disabled={disabled}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
        删除片段
      </button>
    </div>
  );
}
