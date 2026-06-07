function generateRoot(timeline) {
  return `import { Composition } from "remotion";
import { MainSequence } from "./components/MainSequence";
import timelineManifest from "./easymotion-timeline.manifest.json";

const meta = timelineManifest.timeline;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={MainSequence}
      durationInFrames={meta.durationInFrames}
      fps={meta.fps}
      width={meta.width}
      height={meta.height}
      defaultProps={{
        easymotion: timelineManifest,
      }}
      calculateMetadata={async () => ({
        durationInFrames: meta.durationInFrames,
        fps: meta.fps,
        width: meta.width,
        height: meta.height,
      })}
    />
  );
};
`;
}

module.exports = { generateRoot };
