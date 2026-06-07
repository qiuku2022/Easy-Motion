import { Composition } from "remotion";
import { MainSequence } from "./components/MainSequence";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={MainSequence}
      durationInFrames={125}
      fps={25}
      width={1920}
      height={1080}
    />
  );
};
