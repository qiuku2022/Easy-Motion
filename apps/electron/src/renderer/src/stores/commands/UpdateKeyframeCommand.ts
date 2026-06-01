import type { WritableDraft } from 'immer';
import type { Timeline, Keyframe } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for updating a keyframe.
 * Stores the clipId, keyframeId, and the old/new keyframe objects.
 */
export class UpdateKeyframeCommand implements Command {
  readonly type = 'updateKeyframe';

  constructor(
    private clipId: string,
    private keyframeId: string,
    private oldKeyframe: Keyframe,
    private newKeyframe: Keyframe
  ) {}

  execute(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clip = track.clips.find((c) => c.id === this.clipId);
      if (clip) {
        const index = clip.keyframes.findIndex((k) => k.id === this.keyframeId);
        if (index !== -1) {
          clip.keyframes[index] = this.newKeyframe as WritableDraft<Keyframe>;
        }
        return;
      }
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    for (const track of timeline.tracks) {
      const clip = track.clips.find((c) => c.id === this.clipId);
      if (clip) {
        const index = clip.keyframes.findIndex((k) => k.id === this.keyframeId);
        if (index !== -1) {
          clip.keyframes[index] = this.oldKeyframe as WritableDraft<Keyframe>;
        }
        return;
      }
    }
  }
}
