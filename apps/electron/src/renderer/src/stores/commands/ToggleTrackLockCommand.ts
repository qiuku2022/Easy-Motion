import type { WritableDraft } from 'immer';
import type { Timeline } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for toggling track lock state.
 * Stores the trackId and the old/new lock values.
 */
export class ToggleTrackLockCommand implements Command {
  readonly type = 'toggleTrackLock';

  constructor(
    private trackId: string,
    private oldValue: boolean,
    private newValue: boolean
  ) {}

  execute(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.locked = this.newValue;
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.locked = this.oldValue;
    }
  }
}
