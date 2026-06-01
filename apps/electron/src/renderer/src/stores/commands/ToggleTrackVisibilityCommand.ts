import type { WritableDraft } from 'immer';
import type { Timeline } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for toggling track visibility.
 * Stores the trackId and the old/new visibility values.
 */
export class ToggleTrackVisibilityCommand implements Command {
  readonly type = 'toggleTrackVisibility';

  constructor(
    private trackId: string,
    private oldValue: boolean,
    private newValue: boolean
  ) {}

  execute(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.visible = this.newValue;
    }
  }

  undo(timeline: WritableDraft<Timeline>): void {
    const track = timeline.tracks.find((t) => t.id === this.trackId);
    if (track) {
      track.visible = this.oldValue;
    }
  }
}
