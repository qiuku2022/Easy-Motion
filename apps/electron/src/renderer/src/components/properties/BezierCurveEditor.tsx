import { useCallback, useRef } from "react";
import type { KeyframeBezierCp } from "@/types/timeline";
import { DEFAULT_BEZIER_CP } from "@/lib/timeline/keyframeEasing";
import { cn } from "@/lib/utils";

const W = 220;
const H = 120;
const PAD = 16;

interface BezierCurveEditorProps {
  value?: KeyframeBezierCp;
  disabled?: boolean;
  onChange: (cp: KeyframeBezierCp) => void;
}

export function BezierCurveEditor({
  value,
  disabled,
  onChange,
}: BezierCurveEditorProps) {
  const cp = value ?? DEFAULT_BEZIER_CP;
  const dragging = useRef<"p1" | "p2" | null>(null);

  const toSvg = (x: number, y: number) => ({
    left: PAD + x * (W - PAD * 2),
    top: PAD + (1 - y) * (H - PAD * 2),
  });

  const fromClient = useCallback(
    (clientX: number, clientY: number, handle: "p1" | "p2") => {
      const svg = document.getElementById("bezier-editor-svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left - PAD) / (W - PAD * 2)));
      const y = Math.max(
        0,
        Math.min(1, 1 - (clientY - rect.top - PAD) / (H - PAD * 2)),
      );
      if (handle === "p1") {
        onChange({ ...cp, x1: x, y1: y });
      } else {
        onChange({ ...cp, x2: x, y2: y });
      }
    },
    [cp, onChange],
  );

  const startDrag = (handle: "p1" | "p2") => (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragging.current = handle;
    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      fromClient(ev.clientX, ev.clientY, dragging.current);
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const p1 = toSvg(cp.x1, cp.y1);
  const p2 = toSvg(cp.x2, cp.y2);
  const start = toSvg(0, 0);
  const end = toSvg(1, 1);

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">贝塞尔缓动曲线（拖拽控制点）</p>
      <svg
        id="bezier-editor-svg"
        width={W}
        height={H}
        className={cn(
          "rounded border border-border bg-muted/30",
          disabled && "opacity-50",
        )}
      >
        <line x1={start.left} y1={start.top} x2={p1.left} y2={p1.top} stroke="#64748b" strokeWidth={1} strokeDasharray="3 2" />
        <line x1={end.left} y1={end.top} x2={p2.left} y2={p2.top} stroke="#64748b" strokeWidth={1} strokeDasharray="3 2" />
        <path
          d={`M ${start.left} ${start.top} C ${p1.left} ${p1.top}, ${p2.left} ${p2.top}, ${end.left} ${end.top}`}
          fill="none"
          stroke="#2dd4bf"
          strokeWidth={2}
        />
        <circle cx={start.left} cy={start.top} r={4} fill="#94a3b8" />
        <circle cx={end.left} cy={end.top} r={4} fill="#94a3b8" />
        <circle
          cx={p1.left}
          cy={p1.top}
          r={6}
          fill="#fbbf24"
          className={disabled ? "" : "cursor-grab"}
          onPointerDown={startDrag("p1")}
        />
        <circle
          cx={p2.left}
          cy={p2.top}
          r={6}
          fill="#f59e0b"
          className={disabled ? "" : "cursor-grab"}
          onPointerDown={startDrag("p2")}
        />
      </svg>
      <p className="font-mono text-[9px] text-muted-foreground">
        P1 ({cp.x1.toFixed(2)}, {cp.y1.toFixed(2)}) · P2 ({cp.x2.toFixed(2)}, {cp.y2.toFixed(2)})
      </p>
    </div>
  );
}
