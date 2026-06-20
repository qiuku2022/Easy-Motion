import { type RveBaseProps, pText, pColor } from "./shared";
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

import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export function RveCinematicTitleIntro(props: RveBaseProps = {}) {
  const title = pText(props, "title", "Your Story Begins");
  const subtitle = pText(props, "subtitle", "A Cinematic Experience");
  const primaryColor = pColor(props, "primaryColor", "#4361ee");
  const secondaryColor = pColor(props, "secondaryColor", "#7209b7");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = spring({
    frame,
    fps,
    from: 50,
    to: 0,
    durationInFrames: 40,
    config: {
      damping: 14,
      mass: 0.8,
    },
  });

  const titleOpacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 30,
  });

  const underlineWidth = interpolate(frame, [20, 50], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #111827 0%, #1a1a2e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1
        style={{
          color: "white",
          fontSize: "4rem",
          fontWeight: "bold",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          margin: 0,
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h1>
      <div
        style={{
          width: `${underlineWidth}%`,
          maxWidth: 320,
          height: 4,
          background: "linear-gradient(90deg, #4361ee, #7209b7)",
          borderRadius: 2,
          marginTop: 16,
        }}
      />
      <p
        style={{
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: "1.5rem",
          fontWeight: 300,
          opacity: subtitleOpacity,
          marginTop: 24,
          letterSpacing: "0.1em",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
