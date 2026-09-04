import { Composition } from "remotion";
import { MainSequence } from "./components/MainSequence";
import { CinematicTechShowcase } from "./components/custom/CinematicTechShowcase";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Main"
        component={MainSequence}
        durationInFrames={125}
        fps={25}
        width={1920}
        height={1080}
      />
      <Composition
        id="CinematicTechShowcase"
        component={CinematicTechShowcase}
        durationInFrames={375}
        fps={25}
        width={1920}
        height={1080}
      />
    </>
  );
};
