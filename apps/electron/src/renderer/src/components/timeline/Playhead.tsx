import React from 'react';

interface PlayheadProps {
  currentFrame: number;
  pixelsPerFrame: number;
}

export const Playhead: React.FC<PlayheadProps> = React.memo(({ currentFrame, pixelsPerFrame }) => {
  const left = currentFrame * pixelsPerFrame;

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: '2px',
        height: '100%',
        backgroundColor: '#ff4444',
        zIndex: 100,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-6px',
          left: '-5px',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid #ff4444',
        }}
      />
    </div>
  );
});

Playhead.displayName = 'Playhead';
