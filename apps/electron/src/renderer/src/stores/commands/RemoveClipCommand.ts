import type { WritableDraft } from 'immer';
import type { Timeline, Clip } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for removing a clip from a track.
 * Stores the trackId and full clip data; restores the clip on undo.
 */
export class RemoveClipCommand implements Command {
  readonly type = 'removeClip';

  constructor(private trackId: string, private clipData: Clip) {}

  execute(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.clips = track.clips.filter((c) => c.id !== this.clipData.id);
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.clips.push(this.clipData as WritableDraft<Clip>);
    }
  }
}
