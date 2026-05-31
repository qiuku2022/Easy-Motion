import React from 'react';
import type { Clip } from '@easymotion/shared';

interface ClipBlockProps {
  clip: Clip;
  pixelsPerFrame: number;
  isSelected: boolean;
  onClick: () => void;
}

const typeColors: Record<string, string> = {
  text: '#4a90d9',
  image: '#5cb85c',
  video: '#d9534f',
  audio: '#f0ad4e',
  shape: '#9b59b6',
  chart: '#1abc9c',
  animation: '#e67e22',
  group: '#95a5a6',
};

export const ClipBlock: React.FC<ClipBlockProps> = React.memo(
  ({ clip, pixelsPerFrame, isSelected, onClick }) => {
    const left = clip.startInFrames * pixelsPerFrame;
    const width = clip.durationInFrames * pixelsPerFrame;
    const color = typeColors[clip.type] ?? '#777';

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        style={{
          position: 'absolute',
          left,
          top: '4px',
          height: '32px',
          width: Math.max(width, 4),
          backgroundColor: color,
          borderRadius: '4px',
          border: isSelected ? '2px solid #fff' : '2px solid transparent',
          opacity: 0.9,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '6px',
          paddingRight: '6px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: '#fff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {clip.name}
        </span>
      </div>
    );
  }
);

ClipBlock.displayName = 'ClipBlock';
