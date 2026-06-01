import type { WritableDraft } from 'immer';
import type { Timeline, Clip } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for adding a clip to a track.
 * Stores the trackId and clip data; removes the clip on undo.
 */
export class AddClipCommand implements Command {
  readonly type = 'addClip';

  constructor(private trackId: string, private clipData: Clip) {}

  execute(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.clips.push(this.clipData as WritableDraft<Clip>);
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.clips = track.clips.filter((c) => c.id !== this.clipData.id);
    }
  }
}
