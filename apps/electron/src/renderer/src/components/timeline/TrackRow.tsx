import React from 'react';
import type { Track } from '@easymotion/shared';
import { useTimelineStore } from '../../stores/timelineStore';
import { ClipBlock } from './ClipBlock';

interface TrackRowProps {
  track: Track;
  durationInFrames: number;
  pixelsPerFrame: number;
  isSelected: boolean;
  selectedClipId: string | null;
}

export const TrackRow: React.FC<TrackRowProps> = React.memo(
  ({ track, pixelsPerFrame, isSelected, selectedClipId }) => {
    const selectTrack = useTimelineStore((s) => s.selectTrack);
    const selectClip = useTimelineStore((s) => s.selectClip);

    const handleTrackClick = () => {
      selectTrack(track.id);
    };

    return (
      <div
        onClick={handleTrackClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '40px',
          borderBottom: '1px solid #2a2a4e',
          backgroundColor: isSelected ? '#2a2a5e' : '#1e1e3a',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '120px',
            minWidth: '120px',
            paddingLeft: '12px',
            fontSize: '12px',
            color: track.visible ? '#fff' : '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{track.visible ? '👁' : '🚫'}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {track.name}
          </span>
        </div>
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          {track.clips.map((clip) => (
            <ClipBlock
              key={clip.id}
              clip={clip}
              pixelsPerFrame={pixelsPerFrame}
              isSelected={clip.id === selectedClipId}
              onClick={() => selectClip(clip.id)}
            />
          ))}
        </div>
      </div>
    );
  }
);

TrackRow.displayName = 'TrackRow';
