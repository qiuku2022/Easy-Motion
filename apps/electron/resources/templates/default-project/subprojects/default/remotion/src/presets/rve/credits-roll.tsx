/**
 * Vendored from reactvideoeditor/remotion-templates (MIT)
 * https://github.com/reactvideoeditor/remotion-templates
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pText, pColor } from "./shared";

export function RveCreditsRoll(props: RveBaseProps = {}) {
  const title = pText(props, "title", "Director");
  const subtitle = pText(props, "subtitle", "Jane Smith");
  const primaryColor = pColor(props, "primaryColor", "#3b82f6");
  const backgroundColor = pColor(props, "backgroundColor", "#111827");

  const frame = useCurrentFrame();
  const { height } = useVideoConfig();

  const credits = [
    { role: title, name: subtitle },
    { role: "Producer", name: "John Doe" },
    { role: "Cinematographer", name: "Emily Chen" },
    { role: "Editor", name: "Michael Park" },
    { role: "Sound Design", name: "Sarah Johnson" },
    { role: "Music", name: "David Kim" },
    { role: "Visual Effects", name: "Lisa Wang" },
    { role: "Colorist", name: "James Brown" },
  ];

  const scrollSpeed = 1.5;
  const translateY = height - frame * scrollSpeed;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: backgroundColor,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          background: `linear-gradient(to bottom, ${backgroundColor}, transparent)`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "80px",
          background: `linear-gradient(to top, ${backgroundColor}, transparent)`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2.5rem",
          transform: `translateY(${translateY}px)`,
          paddingTop: "2rem",
        }}
      >
        {credits.map((credit, i) => (
          <div
            key={i}
            style={{
              textAlign: "center",
            }}
          >
            <p
              style={{
                color: primaryColor,
                fontSize: "0.9rem",
                fontWeight: 500,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                margin: 0,
                marginBottom: "0.4rem",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {credit.role}
            </p>
            <p
              style={{
                color: "white",
                fontSize: "1.5rem",
                fontWeight: 600,
                margin: 0,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {credit.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
