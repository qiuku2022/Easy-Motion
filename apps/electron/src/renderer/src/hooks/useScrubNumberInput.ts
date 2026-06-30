import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  SCRUB_THRESHOLD_PX,
  applyScrubDelta,
  clampScrubNumber,
  formatScrubNumber,
  parseScrubStartValue,
} from "@/lib/scrubNumber";

interface UseScrubNumberInputOptions {
  value: string;
  onChange: (value: string) => void;
  onScrub?: (value: string) => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onScrubbingChange?: (scrubbing: boolean) => void;
}

export function useScrubNumberInput({
  value,
  onChange,
  onScrub,
  onCommit,
  min,
  max,
  step = 1,
  disabled,
  inputRef,
  onScrubbingChange,
}: UseScrubNumberInputOptions) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startValue: number;
    scrubbing: boolean;
  } | null>(null);

  const emitValue = useCallback(
    (next: number) => {
      const clamped = clampScrubNumber(next, min, max);
      const formatted = formatScrubNumber(clamped, step);
      onChange(formatted);
      onScrub?.(formatted);
    },
    [max, min, onChange, onScrub, step],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return;

      const startValue = parseScrubStartValue(value);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startValue,
        scrubbing: false,
      };

      const onPointerMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || moveEvent.pointerId !== drag.pointerId) return;

        const dx = moveEvent.clientX - drag.startX;
        if (!drag.scrubbing) {
          if (Math.abs(dx) < SCRUB_THRESHOLD_PX) return;
          drag.scrubbing = true;
          onScrubbingChange?.(true);
          inputRef?.current?.blur();
          document.body.style.cursor = "ew-resize";
          document.body.style.userSelect = "none";
        }

        moveEvent.preventDefault();
        const next = applyScrubDelta(drag.startValue, dx, step, {
          shift: moveEvent.shiftKey,
          alt: moveEvent.altKey,
        });
        emitValue(next);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || upEvent.pointerId !== drag.pointerId) return;

        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        if (drag.scrubbing) {
          onCommit?.();
        }

        if (drag.scrubbing) {
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
          onScrubbingChange?.(false);
        }

        dragRef.current = null;
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [disabled, emitValue, inputRef, onCommit, onScrubbingChange, step, value],
  );

  return { onPointerDown };
}
