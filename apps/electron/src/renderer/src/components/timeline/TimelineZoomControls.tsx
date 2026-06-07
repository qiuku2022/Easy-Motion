import { Magnet, Maximize2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_PX_PER_FRAME,
  MIN_PX_PER_FRAME,
} from "@/lib/timeline/framePixels";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { useUiStore } from "@/stores/uiStore";
import { useTimelineStore } from "@/stores/timelineStore";

const RULER_SCALES = [
  { id: "fit", label: "适配" },
  { id: "1s", label: "1s" },
  { id: "5s", label: "5s" },
  { id: "10s", label: "10s" },
] as const;

export function TimelineZoomControls() {
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnapEnabled = useUiStore((s) => s.toggleSnapEnabled);
  const pxPerFrame = useUiStore((s) => s.pxPerFrame);
  const setPxPerFrame = useUiStore((s) => s.setPxPerFrame);
  const requestTimelineFit = useUiStore((s) => s.requestTimelineFit);
  const timeline = useTimelineStore((s) => s.timeline);

  const fps = timeline?.fps ?? 30;

  const onScaleChange = (value: string) => {
    if (value === "fit") {
      requestTimelineFit();
      return;
    }
    const seconds = value === "1s" ? 1 : value === "5s" ? 5 : 10;
    const targetPxPerSecond = 80;
    setPxPerFrame(targetPxPerSecond / seconds / fps);
  };

  const sliderValue =
    ((pxPerFrame - MIN_PX_PER_FRAME) / (MAX_PX_PER_FRAME - MIN_PX_PER_FRAME)) *
    100;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        title={
          snapEnabled
            ? `吸附（开启）· ${PR_SHORTCUTS.snapToggle}`
            : `吸附（关闭）· ${PR_SHORTCUTS.snapToggle}`
        }
        onClick={toggleSnapEnabled}
        className={cn(
          "cursor-pointer rounded-sm p-1.5 transition-colors duration-150 ease-out hover:bg-em-elevated",
          snapEnabled ? "text-em-teal" : "text-em-muted",
        )}
      >
        <Magnet className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="循环播放"
        className="cursor-pointer rounded-sm p-1.5 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text"
      >
        <Repeat className="h-4 w-4" />
      </button>

      <div className="mx-1 flex items-center gap-1.5">
        <button
          type="button"
          title={`适配窗口 · ${PR_SHORTCUTS.fitTimeline}`}
          onClick={requestTimelineFit}
          className="cursor-pointer rounded-sm p-1 text-em-muted transition-colors duration-150 ease-out hover:bg-em-elevated hover:text-em-text"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          aria-label="时间线缩放"
          onChange={(e) => {
            const t = Number(e.target.value) / 100;
            setPxPerFrame(
              MIN_PX_PER_FRAME + t * (MAX_PX_PER_FRAME - MIN_PX_PER_FRAME),
            );
          }}
          className="h-1 w-20 cursor-pointer accent-em-teal"
        />
      </div>

      <select
        className="cursor-pointer rounded-sm border border-em-border bg-em-surface px-1.5 py-0.5 font-mono text-xs text-em-text"
        defaultValue="1s"
        aria-label="时间标尺刻度"
        onChange={(e) => onScaleChange(e.target.value)}
      >
        {RULER_SCALES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
