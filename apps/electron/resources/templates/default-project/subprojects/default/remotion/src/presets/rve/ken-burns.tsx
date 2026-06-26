/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * Adapted for Remotion/Vite (frame-based pan/zoom).
 */

import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type RveBaseProps, pImage, pNum, pColor, RVE_DEFAULT_SAMPLE_IMAGE_PATH, resolvePresetImageSrc } from "./shared";

export function RveKenBurns(props: RveBaseProps = {}) {
  const imageUrl = resolvePresetImageSrc(
    pImage(props, "imageUrl", RVE_DEFAULT_SAMPLE_IMAGE_PATH),
  );
  const scale = pNum(props, "value", 1.5);
  const backgroundColor = pColor(props, "backgroundColor", "#000000");
  const duration = 20;
  const translateX = -50;
  const translateY = -30;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(duration * fps));
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentScale = interpolate(progress, [0, 1], [1, scale]);
  const tx = interpolate(progress, [0, 1], [0, translateX]);
  const ty = interpolate(progress, [0, 1], [0, translateY]);

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor, overflow: "hidden" }}>
      <Img
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${currentScale}) translate(${tx}px, ${ty}px)`,
        }}
      />
    </AbsoluteFill>
  );
}
