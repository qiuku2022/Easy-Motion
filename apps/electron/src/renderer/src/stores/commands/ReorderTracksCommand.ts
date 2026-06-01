import type { WritableDraft } from 'immer';
import type { Timeline, Track } from '@easymotion/shared';
import type { Command } from './types';

/**
 * Delta-based command for reordering tracks.
 * Stores only the old and new track ID order arrays.
 */
export class ReorderTracksCommand implements Command {
  readonly type = 'reorderTracks';

  constructor(private oldOrder: string[], private newOrder: string[]) {}

  private applyOrder(timeline: WritableDraft<Timeline>, order: string[]): void {
    const trackMap = new Map(timeline.tracks.map((t) => [t.id, t]));
    const reordered: WritableDraft<Track>[] = [];
    for (const id of order) {
      const track = trackMap.get(id);
      if (track) {
        reordered.push(track);
      }
    }
    const existingIds = new Set(order);
    for (const track of timeline.tracks) {
      if (!existingIds.has(track.id)) {
        reordered.push(track);
      }
    }
    reordered.forEach((track, index) => {
      track.order = index;
    });
    timeline.tracks = reordered;
  }

  execute(timeline: WritableDraft<Timeline>): void {
    this.applyOrder(timeline, this.newOrder);
  }

  undo(timeline: WritableDraft<Timeline>): void {
    this.applyOrder(timeline, this.oldOrder);
  }
}
