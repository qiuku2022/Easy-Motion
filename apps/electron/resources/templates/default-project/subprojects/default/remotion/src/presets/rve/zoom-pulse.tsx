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

export function RveZoomPulse(props: RveBaseProps = {}) {
  const imageUrl = resolvePresetImageSrc(
    pImage(props, "imageUrl", RVE_DEFAULT_SAMPLE_IMAGE_PATH),
  );
  const maxScale = pNum(props, "value", 1.1);
  const backgroundColor = pColor(props, "backgroundColor", "#000000");
  const duration = 4;
  const minScale = 1;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cycleFrames = Math.max(1, Math.round(duration * fps));
  const cycle = frame % cycleFrames;
  const scale = interpolate(
    cycle,
    [0, cycleFrames / 2, cycleFrames],
    [minScale, maxScale, minScale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: backgroundColor, overflow: "hidden" }}>
      <Img
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
}
