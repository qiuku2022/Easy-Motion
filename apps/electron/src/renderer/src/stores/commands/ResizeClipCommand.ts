import type { WritableDraft } from 'immer';
import type { Timeline } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for resizing a clip.
 * Stores only the clipId and frame/duration changes.
 */
export class ResizeClipCommand implements Command {
  readonly type = 'resizeClip';

  constructor(
    private clipId: string,
    private oldStartFrame: number,
    private newStartFrame: number,
    private oldDuration: number,
    private newDuration: number
  ) {}

  execute(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clip = track.clips.find((c) => c.id === this.clipId);
      if (clip) {
        clip.startInFrames = this.newStartFrame;
        clip.durationInFrames = this.newDuration;
        return;
      }
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clip = track.clips.find((c) => c.id === this.clipId);
      if (clip) {
        clip.startInFrames = this.oldStartFrame;
        clip.durationInFrames = this.oldDuration;
        return;
      }
    }
  }
}
