import type { WritableDraft } from 'immer';
import type { Timeline, Track } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for removing a track.
 * Stores the full track data; restores the track on undo.
 */
export class RemoveTrackCommand implements Command {
  readonly type = 'removeTrack';

  constructor(private trackId: string, private trackData: Track) {}

  execute(timeline: WritableDraft<Timeline>): void {
    timeline.tracks = timeline.tracks.filter((t) => t.id !== this.trackId);
  }

  undo(timeline: WritableDraft<Timeline>): void {
    timeline.tracks.push(this.trackData as WritableDraft<Track>);
  }
}
