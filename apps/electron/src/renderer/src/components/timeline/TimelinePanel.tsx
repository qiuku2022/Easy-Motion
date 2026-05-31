import React from 'react';
import { useTimelineStore } from '../../stores/timelineStore';
import { TimelineControls } from './TimelineControls';
import { TrackRow } from './TrackRow';
import { Playhead } from './Playhead';

export const TimelinePanel: React.FC = () => {
  const timeline = useTimelineStore((s) => s.timeline);
  const currentFrame = useTimelineStore((s) => s.currentFrame);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const selectedTrackId = useTimelineStore((s) => s.selectedTrackId);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  if (!timeline) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#888',
          fontSize: '14px',
        }}
      >
        No timeline loaded
      </div>
    );
  }

  const sortedTracks = [...timeline.tracks].sort((a, b) => a.order - b.order);
  const durationInFrames = timeline.durationInFrames;
  const pixelsPerFrame = 2;
  const timelineWidth = durationInFrames * pixelsPerFrame;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a2e',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <TimelineControls
        currentFrame={currentFrame}
        durationInFrames={durationInFrames}
        isPlaying={isPlaying}
      />
      <div
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', width: timelineWidth, minWidth: '100%', height: '100%' }}>
          <Playhead currentFrame={currentFrame} pixelsPerFrame={pixelsPerFrame} />
          {sortedTracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              durationInFrames={durationInFrames}
              pixelsPerFrame={pixelsPerFrame}
              isSelected={track.id === selectedTrackId}
              selectedClipId={selectedClipId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
