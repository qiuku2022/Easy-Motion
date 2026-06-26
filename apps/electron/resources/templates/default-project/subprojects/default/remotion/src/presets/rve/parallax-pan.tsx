/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * Adapted for Remotion/Vite (no next/image or CSS keyframes).
 */

import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { type RveBaseProps, pImage, pNum, pColor, RVE_DEFAULT_SAMPLE_IMAGE_PATH, resolvePresetImageSrc } from "./shared";

export function RveParallaxPan(props: RveBaseProps = {}) {
  const imageUrl = resolvePresetImageSrc(
    pImage(props, "imageUrl", RVE_DEFAULT_SAMPLE_IMAGE_PATH),
  );
  const scale = pNum(props, "value", 1.2);
  const backgroundColor = pColor(props, "backgroundColor", "#000000");
  const duration = 15;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(duration * fps));
  const progress = interpolate(frame % durationInFrames, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let translateX = 0;
  let translateY = 0;
  const pan = 20;
  translateX = interpolate(progress, [0, 1], [0, -pan]);

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor, overflow: "hidden" }}>
      <Img
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${translateX}%, ${translateY}%) scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
}
