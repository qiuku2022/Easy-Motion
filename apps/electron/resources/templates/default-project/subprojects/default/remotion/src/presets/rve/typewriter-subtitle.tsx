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

import { interpolate, useCurrentFrame } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveTypewriterSubtitle(props: RveBaseProps = {}) {
  const text = pText(props, "text", "I like typing...");
  const primaryColor = pColor(props, "primaryColor", "#60a5fa");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();

  const visibleCharacters = Math.floor(
    interpolate(frame, [0, 45], [0, text.length], {
      extrapolateRight: "clamp",
    })
  );

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      {text
        .slice(0, visibleCharacters)
        .split("")
        .map((char, index) => {
          const hue = 210 + (index * 40) / text.length;
          const isGlitching = frame % 30 === 0 && Math.random() > 0.7;

          return (
            <span
              key={index}
              style={{
                display: "inline-block",
                fontFamily: "'Courier New', monospace",
                fontSize: "3rem",
                fontWeight: "bold",
                color: `white`,

                transition: "all 0.05s ease-out",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      <span
        style={{
          fontSize: "3rem",
          color: primaryColor,
          opacity: frame % 15 < 7 ? 1 : 0,

          marginLeft: "0.2rem",
          verticalAlign: "middle",
        }}
      >
        ▌
      </span>
    </div>
  );
}
