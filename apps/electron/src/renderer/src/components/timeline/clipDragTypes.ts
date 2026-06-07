export type ClipDragMode = "move" | "resize-left" | "resize-right";

export interface ClipDragPreview {
  clipId: string;
  sourceTrackId: string;
  targetTrackId: string;
  startInFrames: number;
  durationInFrames: number;
  mode: ClipDragMode;
}
