import { Composition } from "remotion";
import { PresetThumbnailComposition } from "./ThumbnailComposition";

export const ThumbnailRoot: React.FC = () => {
  return (
    <Composition
      id="PresetThumbnail"
      component={PresetThumbnailComposition}
      durationInFrames={45}
      fps={15}
      width={320}
      height={180}
      defaultProps={{ component: "RvePoppingText" }}
    />
  );
};
