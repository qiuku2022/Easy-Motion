import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import { GradientBackground } from "./GradientBackground";
import { COLORS, FONT_SANS, FONT_SCRIPT } from "./theme";

function MetaLabel({
  children,
  style,
  delay
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 22, stiffness: 120 }
  });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const y = interpolate(enter, [0, 1], [-12, 0]);

  return (
    <div
      style={{
        ...style,
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: FONT_SANS,
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: COLORS.black
      }}
    >
      {children}
    </div>
  );
}

function RevealWord({
  children,
  delay,
  style
}: {
  children: React.ReactNode;
  delay: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 90 }
  });
  const clip = interpolate(progress, [0, 1], [100, 0]);
  const opacity = interpolate(progress, [0, 0.4, 1], [0, 0.6, 1]);
  const blur = interpolate(progress, [0, 1], [8, 0]);

  return (
    <div
      style={{
        overflow: "hidden",
        display: "inline-block",
        verticalAlign: "bottom"
      }}
    >
      <div
        style={{
          ...style,
          opacity,
          filter: `blur(${blur}px)`,
          transform: `translateY(${clip * 0.4}px)`,
          clipPath: `inset(0 0 ${clip}% 0)`
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const NewsletterCover: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scriptEnter = spring({
    frame: frame - 12,
    fps,
    config: { damping: 18, stiffness: 70 }
  });
  const scriptOpacity = interpolate(scriptEnter, [0, 1], [0, 1]);
  const scriptX = interpolate(scriptEnter, [0, 1], [30, 0]);
  const scriptRotate = interpolate(scriptEnter, [0, 1], [6, -2]);

  const designScale = spring({
    frame: frame - 38,
    fps,
    config: { damping: 16, stiffness: 85 }
  });
  const designLetterSpace = interpolate(
    frame,
    [38, 58],
    [0.08, -0.02],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic)
    }
  );

  const footerEnter = spring({
    frame: frame - 72,
    fps,
    config: { damping: 22, stiffness: 100 }
  });
  const footerOpacity = interpolate(footerEnter, [0, 1], [0, 1]);
  const footerX = interpolate(footerEnter, [0, 1], [24, 0]);

  const lineWidth = interpolate(frame, [55, 85], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad)
  });

  return (
    <AbsoluteFill>
      <GradientBackground />

      <AbsoluteFill style={{ padding: "56px 72px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}
        >
          <MetaLabel delay={4}>Newsletter</MetaLabel>
          <MetaLabel delay={8} style={{ letterSpacing: "0.12em" }}>
            //011
          </MetaLabel>
          <MetaLabel delay={12}>29-08-2025</MetaLabel>
        </div>

        <div
          style={{
            position: "absolute",
            left: 120,
            top: "50%",
            transform: "translateY(-52%)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "nowrap",
              gap: 0,
              lineHeight: 0.95
            }}
          >
            <span
              style={{
                fontFamily: FONT_SCRIPT,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 148,
                color: COLORS.black,
                opacity: scriptOpacity,
                transform: `translateX(${scriptX}px) rotate(${scriptRotate}deg)`,
                display: "inline-block",
                marginRight: -8,
                letterSpacing: "-0.02em"
              }}
            >
              this
            </span>

            <RevealWord
              delay={26}
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: 108,
                color: COLORS.black,
                letterSpacing: "-0.03em"
              }}
            >
              week in
            </RevealWord>
          </div>

          <div style={{ marginTop: -8, overflow: "hidden" }}>
            <div
              style={{
                fontFamily: FONT_SANS,
                fontWeight: 700,
                fontSize: 168,
                color: COLORS.black,
                letterSpacing: `${designLetterSpace}em`,
                transform: `scale(${interpolate(designScale, [0, 1], [0.92, 1])})`,
                transformOrigin: "left center",
                opacity: interpolate(designScale, [0, 1], [0, 1]),
                filter: `blur(${interpolate(designScale, [0, 1], [6, 0])}px)`
              }}
            >
              design
            </div>
          </div>

          <div
            style={{
              marginTop: 28,
              height: 2,
              width: `${lineWidth * 2.4}px`,
              maxWidth: 420,
              backgroundColor: COLORS.black,
              opacity: 0.15
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            right: 72,
            bottom: 56,
            opacity: footerOpacity,
            transform: `translateX(${footerX}px)`,
            fontFamily: FONT_SANS,
            fontSize: 15,
            fontWeight: 400,
            color: COLORS.black,
            letterSpacing: "0.02em",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <span>Recent design news and much more</span>
          <span style={{ fontSize: 18, transform: "rotate(-45deg)" }}>↘</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          opacity: 0.04,
          mixBlendMode: "multiply",
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
              <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' seed='${frame % 50}'/></filter>
              <rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/>
            </svg>`
          )}")`,
          backgroundSize: "200px 200px"
        }}
      />
    </AbsoluteFill>
  );
};
