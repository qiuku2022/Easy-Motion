import { frameToPx } from "@/lib/timeline/framePixels";
import type { SnapGuide } from "@/lib/timeline/snapClip";

interface SnapGuidesProps {
  guides: SnapGuide[];
  pxPerFrame: number;
  height: number;
}

export function SnapGuides({ guides, pxPerFrame, height }: SnapGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[45]"
      style={{ width: "100%", height }}
      aria-hidden
    >
      {guides.map((guide) => (
        <div
          key={`${guide.frame}-${guide.label ?? "line"}`}
          className="absolute bottom-0 top-0"
          style={{ left: frameToPx(guide.frame, pxPerFrame) }}
        >
          <div className="h-full w-0 border-l border-dashed border-em-teal" />
          {guide.label && (
            <span className="absolute left-1 top-0 whitespace-nowrap rounded-sm bg-em-teal/20 px-1 py-0.5 font-mono text-[10px] text-em-teal">
              {guide.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
