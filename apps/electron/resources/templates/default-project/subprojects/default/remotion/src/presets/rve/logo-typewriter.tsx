/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveLogoTypewriter(props: RveBaseProps = {}) {
  const title = pText(props, "title", "ACME STUDIO");
  const primaryColor = pColor(props, "primaryColor", "#4361ee");
  const secondaryColor = pColor(props, "secondaryColor", "#7209b7");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const displayedSource = title;

  // Icon appears first via spring scale
  const iconScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 150, mass: 0.6 },
  });

  // Typewriter starts after icon settles
  const typeStart = 15;
  const charsPerFrame = 0.15;
  const charsVisible = Math.min(
    Math.floor(Math.max(0, frame - typeStart) * charsPerFrame),
    displayedSource.length
  );
  const displayedText = displayedSource.slice(0, charsVisible);

  // Blinking cursor
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showCursor = frame > typeStart && (charsVisible < displayedSource.length || cursorVisible);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: backgroundColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Icon */}
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4361ee, #7209b7)",
            transform: `scale(${iconScale})`,
            flexShrink: 0,
          }}
        />
        {/* Typewriter text */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              color: "white",
              fontSize: "2rem",
              fontWeight: "bold",
              fontFamily: "Inter, sans-serif",
              letterSpacing: "0.08em",
              whiteSpace: "pre",
            }}
          >
            {displayedText}
          </span>
          {showCursor && (
            <span
              style={{
                color: "#3b82f6",
                fontSize: "2rem",
                fontWeight: "bold",
                fontFamily: "Inter, sans-serif",
                marginLeft: "2px",
              }}
            >
              |
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
