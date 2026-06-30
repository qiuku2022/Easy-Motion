import { useState } from "react";
import { Check, ChevronDown, Magnet, Maximize2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  MAX_PX_PER_FRAME,
  MIN_PX_PER_FRAME,
} from "@/lib/timeline/framePixels";
import { PR_SHORTCUTS } from "@/lib/premiereShortcuts";
import { useTimelineToolbarMenu } from "@/hooks/useTimelineToolbarMenu";
import {
  TimelineMenuItem,
  TimelineMenuPanel,
  TIMELINE_MENU_TRIGGER_OPEN_CLASS,
} from "@/lib/timeline/toolbar-menu";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useUiStore } from "@/stores/uiStore";
import { useTimelineStore } from "@/stores/timelineStore";

const RULER_SCALES = [
  { id: "fit", label: "适配" },
  { id: "1s", label: "1s" },
  { id: "5s", label: "5s" },
  { id: "10s", label: "10s" },
] as const;

type RulerScaleId = (typeof RULER_SCALES)[number]["id"];

function ZoomIconButton({
  label,
  children,
  active,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8",
            active ? "text-foreground" : "text-muted-foreground",
          )}
          aria-pressed={active}
          onClick={onClick}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function TimelineZoomControls() {
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnapEnabled = useUiStore((s) => s.toggleSnapEnabled);
  const loopEnabled = usePlaybackStore((s) => s.loopEnabled);
  const toggleLoopEnabled = usePlaybackStore((s) => s.toggleLoopEnabled);
  const pxPerFrame = useUiStore((s) => s.pxPerFrame);
  const setPxPerFrame = useUiStore((s) => s.setPxPerFrame);
  const requestTimelineFit = useUiStore((s) => s.requestTimelineFit);
  const timeline = useTimelineStore((s) => s.timeline);
  const [rulerScale, setRulerScale] = useState<RulerScaleId>("fit");
  const { open: scaleMenuOpen, toggle: toggleScaleMenu, close: closeScaleMenu, rootRef: scaleMenuRef } =
    useTimelineToolbarMenu();

  const fps = timeline?.fps ?? 30;

  const onScaleChange = (value: RulerScaleId) => {
    setRulerScale(value);
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
      <ZoomIconButton
        label={
          snapEnabled
            ? `吸附（开启）· ${PR_SHORTCUTS.snapToggle}`
            : `吸附（关闭）· ${PR_SHORTCUTS.snapToggle}`
        }
        active={snapEnabled}
        onClick={toggleSnapEnabled}
      >
        <Magnet className="h-4 w-4" />
      </ZoomIconButton>
      <ZoomIconButton
        label={loopEnabled ? "循环播放（开启）" : "循环播放（关闭）"}
        active={loopEnabled}
        onClick={toggleLoopEnabled}
      >
        <Repeat className="h-4 w-4" />
      </ZoomIconButton>

      <div className="mx-1 flex items-center gap-1.5">
        <ZoomIconButton
          label={`适配窗口 · ${PR_SHORTCUTS.fitTimeline}`}
          onClick={requestTimelineFit}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </ZoomIconButton>
        <Slider
          className="w-20"
          min={0}
          max={100}
          step={1}
          value={[sliderValue]}
          aria-label="时间线缩放"
          onValueChange={([t]) => {
            setPxPerFrame(
              MIN_PX_PER_FRAME + t * (MAX_PX_PER_FRAME - MIN_PX_PER_FRAME),
            );
          }}
        />
      </div>

      <div ref={scaleMenuRef} className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 w-[4.5rem] gap-1 font-mono text-xs",
            scaleMenuOpen && TIMELINE_MENU_TRIGGER_OPEN_CLASS,
          )}
          aria-label="时间标尺刻度"
          aria-expanded={scaleMenuOpen}
          aria-haspopup="menu"
          onClick={toggleScaleMenu}
        >
          {RULER_SCALES.find((s) => s.id === rulerScale)?.label}
          <ChevronDown
            className={cn(
              "h-3 w-3 opacity-60 transition-transform",
              scaleMenuOpen && "rotate-180",
            )}
          />
        </Button>

        {scaleMenuOpen && (
          <TimelineMenuPanel className="min-w-[4.5rem] w-[4.5rem]">
            {RULER_SCALES.map((s) => (
              <TimelineMenuItem
                key={s.id}
                className="justify-between"
                onClick={() => {
                  onScaleChange(s.id);
                  closeScaleMenu();
                }}
              >
                {s.label}
                {rulerScale === s.id ? (
                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <span className="size-3.5" aria-hidden />
                )}
              </TimelineMenuItem>
            ))}
          </TimelineMenuPanel>
        )}
      </div>
    </div>
  );
}
