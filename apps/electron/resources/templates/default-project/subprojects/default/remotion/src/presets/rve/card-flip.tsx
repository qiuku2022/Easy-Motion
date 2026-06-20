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

export function RveCardFlip(props: RveBaseProps = {}) {
  const text = pText(props, "text", "Remotion 👋");
  const subtitle = pText(props, "subtitle", "Back");
  const primaryColor = pColor(props, "primaryColor", "#1e3a8a");
  const secondaryColor = pColor(props, "secondaryColor", "#3b82f6");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rotation = spring({
    frame,
    fps,
    from: 0,
    to: 360,
    config: {
      damping: 15,
      mass: 0.5,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        perspective: "1000px",
      }}
    >
      <div
        style={{
          width: "300px",
          height: "400px",
          transform: `translate(-50%, -50%) rotateY(${rotation}deg)`,
          transformStyle: "preserve-3d",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            background: "linear-gradient(45deg, #1e3a8a, #3b82f6)",
            borderRadius: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "white",
          }}
        >
          {text}
        </div>
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            background: "linear-gradient(45deg, #1e3a8a, #3b82f6)",
            borderRadius: "20px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "2rem",
            fontWeight: "bold",
            color: "white",
            transform: "rotateY(180deg)",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
