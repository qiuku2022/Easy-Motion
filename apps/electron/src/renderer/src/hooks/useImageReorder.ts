import { useCallback, useRef, useState, type RefObject } from "react";

export interface ImageReorderPreview {
  imageId: string;
  insertIndex: number;
}

function reorderImageIds(
  imageIds: string[],
  imageId: string,
  insertBeforeIndex: number
): string[] {
  const from = imageIds.indexOf(imageId);
  if (from < 0) return imageIds;

  const next = [...imageIds];
  next.splice(from, 1);

  let to = insertBeforeIndex;
  if (from < to) to -= 1;
  to = Math.min(next.length, Math.max(0, to));
  next.splice(to, 0, imageId);
  return next;
}

export function useImageReorder(
  imageIds: string[],
  containerRef: RefObject<HTMLElement | null>,
  onReorder: (imageIds: string[]) => void
) {
  const [preview, setPreview] = useState<ImageReorderPreview | null>(null);
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const computeInsertIndex = useCallback(
    (clientX: number): number => {
      const el = containerRef.current;
      if (!el) return 0;

      const items = [...el.querySelectorAll<HTMLElement>("[data-image-reorder-id]")];
      if (items.length === 0) return 0;

      let insertIndex = items.length;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i]!.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        if (clientX < mid) {
          insertIndex = i;
          break;
        }
      }
      return insertIndex;
    },
    [containerRef]
  );

  const startReorder = useCallback(
    (event: React.PointerEvent, imageId: string) => {
      if (event.button !== 0 || imageIds.length < 2) return;
      if ((event.target as HTMLElement).closest("button")) return;

      event.preventDefault();
      event.stopPropagation();

      const startIndex = imageIds.indexOf(imageId);
      if (startIndex < 0) return;

      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);
      setPreview({ imageId, insertIndex: startIndex });

      const onMove = (ev: PointerEvent) => {
        setPreview({
          imageId,
          insertIndex: computeInsertIndex(ev.clientX),
        });
      };

      const onUp = (ev: PointerEvent) => {
        try {
          target.releasePointerCapture(ev.pointerId);
        } catch {
          /* pointer already released */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);

        const insertIndex = computeInsertIndex(ev.clientX);
        setPreview(null);

        const next = reorderImageIds(imageIds, imageId, insertIndex);
        if (next.join("|") !== imageIds.join("|")) {
          onReorderRef.current(next);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [imageIds, computeInsertIndex]
  );

  return { preview, startReorder };
}
