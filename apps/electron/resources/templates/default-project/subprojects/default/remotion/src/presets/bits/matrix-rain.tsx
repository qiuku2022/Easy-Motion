/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/animated-text/MatrixRain.tsx
 */

import React from 'react';
import { MatrixRain } from 'remotion-bits';

const defaultProps = {
  fontSize: 30,
  color: '#00FF41',
  speed: 1,
  density: 1,
  streamLength: 15,
};

export function BitsMatrixRain(incoming: Record<string, unknown> = {}) {
  const props = { ...defaultProps, ...incoming };
  return (
  <MatrixRain
    fontSize={props.fontSize}
    color={props.color}
    speed={props.speed}
    density={props.density}
    streamLength={props.streamLength}
  />
);
}
