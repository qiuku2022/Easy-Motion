import type { WritableDraft } from 'immer';
import type { Timeline, Track } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for adding a track.
 * Stores the trackId and track data; removes the track on undo.
 */
export class AddTrackCommand implements Command {
  readonly type = 'addTrack';

  constructor(private trackId: string, private trackData: Track) {}

  execute(timeline: WritableDraft<Timeline>): void {
    timeline.tracks.push(this.trackData as WritableDraft<Track>);
  }

  undo(timeline: WritableDraft<Timeline>): void {
    timeline.tracks = timeline.tracks.filter((t) => t.id !== this.trackId);
  }
}
