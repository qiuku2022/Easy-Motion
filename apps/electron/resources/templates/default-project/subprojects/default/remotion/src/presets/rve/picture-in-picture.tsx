/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

import { useCurrentFrame, spring, useVideoConfig } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RvePictureInPicture(props: RveBaseProps = {}) {
  const title = pText(props, "title", "Main Content");
  const subtitle = pText(props, "subtitle", "Speaker");
  const primaryColor = pColor(props, "primaryColor", "#4361ee");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pipScale = spring({
    frame: Math.max(frame - 15, 0),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: backgroundColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, #1e293b, ${backgroundColor})`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <span
          style={{
            color: "#6b7280",
            fontSize: "1.8rem",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          width: "180px",
          height: "130px",
          background: "linear-gradient(135deg, #4361ee, #3b82f6)",
          borderRadius: "10px",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${pipScale})`,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "0.9rem",
            fontWeight: 600,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}
