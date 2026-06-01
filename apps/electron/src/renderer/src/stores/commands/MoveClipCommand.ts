import type { WritableDraft } from 'immer';
import type { Timeline } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for moving a clip between tracks.
 * Stores only the clipId, track IDs, and start frame changes.
 */
export class MoveClipCommand implements Command {
  readonly type = 'moveClip';

  constructor(
    private clipId: string,
    private oldTrackId: string,
    private newTrackId: string,
    private oldStartFrame: number,
    private newStartFrame: number
  ) {}

  execute(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clipIndex = track.clips.findIndex((c) => c.id === this.clipId);
      if (clipIndex !== -1) {
        const clip = track.clips[clipIndex];
        track.clips.splice(clipIndex, 1);
        const targetTrack = timeline.tracks.find((t) => t.id === this.newTrackId);
        if (targetTrack) {
          clip.startInFrames = this.newStartFrame;
          targetTrack.clips.push(clip);
        }
        return;
      }
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clipIndex = track.clips.findIndex((c) => c.id === this.clipId);
      if (clipIndex !== -1) {
        const clip = track.clips[clipIndex];
        track.clips.splice(clipIndex, 1);
        const oldTrack = timeline.tracks.find((t) => t.id === this.oldTrackId);
        if (oldTrack) {
          clip.startInFrames = this.oldStartFrame;
          oldTrack.clips.push(clip);
        }
        return;
      }
    }
  }
}
