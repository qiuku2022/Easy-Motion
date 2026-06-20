/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

import { useCurrentFrame, interpolate } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveQuoteCard(props: RveBaseProps = {}) {
  const text = pText(props, "text", "Design is not just what it looks like. Design is how it works.");
  const subtitle = pText(props, "subtitle", "Steve Jobs");
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();

  const quoteMarkOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const textOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const attributionOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const attributionX = interpolate(frame, [30, 45], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "4rem",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          color: primaryColor,
          fontSize: "6rem",
          fontWeight: 700,
          lineHeight: 1,
          opacity: quoteMarkOpacity,
          fontFamily: "Georgia, serif",
          marginBottom: "1rem",
        }}
      >
        {"\u201C"}
      </span>
      <p
        style={{
          color: "white",
          fontSize: "1.8rem",
          fontWeight: 400,
          lineHeight: 1.6,
          textAlign: "center",
          maxWidth: "700px",
          margin: 0,
          opacity: textOpacity,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
        }}
      >
        {text}
      </p>
      <p
        style={{
          color: "#9ca3af",
          fontSize: "1.1rem",
          fontWeight: 500,
          margin: 0,
          marginTop: "2rem",
          opacity: attributionOpacity,
          transform: `translateX(${attributionX}px)`,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}
