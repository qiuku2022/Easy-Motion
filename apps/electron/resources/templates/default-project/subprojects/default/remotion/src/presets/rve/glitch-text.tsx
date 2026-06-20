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

import { useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveGlitchText(props: RveBaseProps = {}) {
  const text = pText(props, "text", "GLITCH");
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const secondaryColor = pColor(props, "secondaryColor", "#f72585");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glitchIntensity = Math.sin(frame / 10) * 10;
  const rgbOffset = Math.sin(frame / 5) * 5;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: "5rem",
        fontWeight: "bold",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          position: "absolute",
          color: "cyan",
          transform: `translate(${rgbOffset}px, ${glitchIntensity}px)`,
          mixBlendMode: "screen",
        }}
      >
        {text}
      </div>
      <div
        style={{
          position: "absolute",
          color: "magenta",
          transform: `translate(${-rgbOffset}px, ${-glitchIntensity}px)`,
          mixBlendMode: "screen",
        }}
      >
        {text}
      </div>
      <div style={{ color: "white", opacity: 0.8 }}>{text}</div>
    </div>
  );
}
