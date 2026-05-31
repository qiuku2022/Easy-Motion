import { Composition } from 'remotion';
import { MainSequence } from './components/MainSequence';

export const Root: React.FC = () => {
  return (
    <Composition
      id="MainSequence"
      component={MainSequence}
      durationInFrames={{{durationInFrames}}}
      fps={{{fps}}}
      width={{{width}}}
      height={{{height}}}
      defaultProps={{}}
    />
  );
};
