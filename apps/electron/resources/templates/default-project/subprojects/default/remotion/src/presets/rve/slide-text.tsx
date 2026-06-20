/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

/**
 * Free Remotion Template Component
 * ---------------------------------
 * This template is free to use in your projects!
 * Credit appreciated but not required.
 *
 * Created by the team at https://www.reactvideoeditor.com
 *
 * Happy coding and building amazing videos! 🎉
 */

import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveSlideText(props: RveBaseProps = {}) {
  const text = pText(props, "text", "Sliding Text!");
  const primaryColor = pColor(props, "primaryColor", "#ffffff");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30,
  });

  const slideX = spring({
    frame,
    fps,
    from: 200,
    to: 0,
    durationInFrames: 30,
    config: {
      damping: 12,
      mass: 0.5,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(-50%, -50%) translateX(${slideX}px)`,
        width: "100%",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          opacity,
          color: "white",
          fontSize: "4rem",
          fontWeight: "bold",
        }}
      >
        {text}
      </h1>
    </div>
  );
}
