import { Composition } from "remotion";
import { PresetThumbnailComposition } from "./ThumbnailComposition";

export const ThumbnailRoot: React.FC = () => {
  return (
    <Composition
      id="PresetThumbnail"
      component={PresetThumbnailComposition}
      durationInFrames={90}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ component: "RvePoppingText" }}
    />
  );
};
