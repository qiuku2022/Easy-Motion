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

import { random, useCurrentFrame, useVideoConfig } from "remotion";
import { type RveBaseProps, pColor } from "./shared";

export function RveMatrixRain(props: RveBaseProps = {}) {
  const primaryColor = pColor(props, "primaryColor", "#0a1933");
  const secondaryColor = pColor(props, "secondaryColor", "#1e40af");
  const backgroundColor = pColor(props, "backgroundColor", "#ffffff");

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
  const columns = Math.floor(width / 20);
  const drops = Array.from({ length: columns }).map((_, i) => ({
    x: i * 20,
    y: random(i) * height,
    speed: random(i) * 5 + 5,
    char: characters[Math.floor(random(i) * characters.length)],
  }));

  return (
    <div
      style={{
        width,
        height,
        background: "linear-gradient(45deg, #0a1933, #1e40af)",
        position: "relative",
      }}
    >
      {drops.map((drop, i) => {
        const y = (drop.y + frame * drop.speed) % height;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: drop.x,
              top: y,
              color: `rgba(255, 255, 255, ${1 - (y / height) * 0.6})`,
              fontSize: "25px",
              fontFamily: "monospace",
              fontWeight: "bold",
              textShadow: "0 0 8px rgba(59, 130, 246, 0.9)",
            }}
          >
            {characters[Math.floor((frame + i) / 5) % characters.length]}
          </div>
        );
      })}
    </div>
  );
}
