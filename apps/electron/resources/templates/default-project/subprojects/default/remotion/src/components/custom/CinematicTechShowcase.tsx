import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type CinematicTechShowcaseProps = {
  badgeText?: string;
  title?: string;
  subtitle?: string;
  promptText?: string;
  primaryColor?: string;
  accentColor?: string;
  secondaryColor?: string;
  durationInFrames?: number;
};

// 预定义环境星尘粒子分布
const PARTICLES = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: ((i * 137.5 + 23) % 100) / 100,
  y: ((i * 223.7 + 61) % 100) / 100,
  size: 1.5 + (i % 5) * 0.8,
  baseOpacity: 0.15 + (i % 7) * 0.1,
  speed: 0.2 + (i % 4) * 0.25,
  phase: (i * 0.8) % (Math.PI * 2),
}));

export const CinematicTechShowcase: React.FC<CinematicTechShowcaseProps> = ({
  badgeText = "✦ EASYMOTION 2.0 • NEXT-GEN MOTION ENGINE",
  title = "THE FUTURE OF MOTION IS CODE",
  subtitle = "用对话编排多维空间，让每一帧动效皆具电影质感",
  promptText = "Create a cinematic 3D cyber product launch video with glowing telemetry and isometric cards...",
  primaryColor = "#6366f1", // 靛蓝
  accentColor = "#06b6d4",  // 青蓝
  secondaryColor = "#ec4899", // 霓虹粉
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ==========================================
  // 全局摄像机景深推进与动态环境光
  // ==========================================
  const cameraZoom = interpolate(frame, [0, 150, 300, 375], [1, 1.04, 1.07, 1.12], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const ambientPulse = Math.sin((frame / fps) * 1.6);
  const meshGlowOpacity = interpolate(frame, [0, 35], [0, 0.85], {
    extrapolateRight: "clamp",
  });

  // ==========================================
  // Act I: 徽章与动力学大标题 (Frames 0 ~ 95)
  // ==========================================
  const badgeSpring = spring({
    frame: frame - 6,
    fps,
    config: { mass: 0.8, damping: 14, stiffness: 120 },
  });
  const badgeY = interpolate(badgeSpring, [0, 1], [-40, 0]);
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);

  // 标题拆词逐个飞入
  const words = useMemo(() => title.split(" "), [title]);

  const titleExitProgress = interpolate(frame, [88, 115], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const titleExitY = interpolate(titleExitProgress, [0, 1], [0, -70]);
  const titleExitOpacity = interpolate(titleExitProgress, [0, 1], [1, 0]);
  const titleExitBlur = interpolate(titleExitProgress, [0, 1], [0, 16]);

  // ==========================================
  // Act II: 3D 等轴测产品主展台 (Frames 75 ~ 260)
  // ==========================================
  const stageEnterSpring = spring({
    frame: frame - 78,
    fps,
    config: { mass: 1.1, damping: 16, stiffness: 85 },
  });

  const stageRotateX = interpolate(stageEnterSpring, [0, 1], [32, 14]);
  const stageRotateY = interpolate(stageEnterSpring, [0, 1], [-30, -10]);
  const stageRotateZ = interpolate(stageEnterSpring, [0, 1], [15, 3]);
  const stageScale = interpolate(stageEnterSpring, [0, 1], [0.72, 1]);
  const stageTranslateY = interpolate(stageEnterSpring, [0, 1], [260, 0]);
  const stageOpacity = interpolate(stageEnterSpring, [0, 0.4, 1], [0, 0.8, 1]);

  // 3D 展台持续悬浮微动
  const floatBobbing = Math.sin(frame * 0.06) * 7;
  const floatTilt = Math.cos(frame * 0.04) * 0.8;

  // 模拟打字机进度
  const typingStartFrame = 95;
  const typingChars = Math.min(
    promptText.length,
    Math.max(0, Math.floor((frame - typingStartFrame) * 0.95))
  );
  const typedString = promptText.slice(0, typingChars);
  const cursorBlink = Math.floor(frame / 12) % 2 === 0;

  // 节点流水线发光脉冲连线动画
  const streamOffset = (frame * 3.5) % 120;

  // 仪表盘动态计数器
  const fpsCounter = interpolate(frame, [110, 170], [24, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const renderProgress = interpolate(frame, [115, 210], [0, 99.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ==========================================
  // Act III: 空间微视差伴星悬浮卡片 (Frames 170 ~ 290)
  // ==========================================
  const satLeftSpring = spring({
    frame: frame - 170,
    fps,
    config: { mass: 0.9, damping: 15, stiffness: 95 },
  });
  const satRightSpring = spring({
    frame: frame - 188,
    fps,
    config: { mass: 0.9, damping: 15, stiffness: 95 },
  });

  // ==========================================
  // Act IV: 终局能量冲击与行动号召 (Frames 275 ~ 375)
  // ==========================================
  const climaxProgress = interpolate(frame, [270, 310], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // 冲击波光环
  const ring1Scale = interpolate(frame, [285, 345], [0.3, 2.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ring1Opacity = interpolate(frame, [285, 310, 345], [0, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ring2Scale = interpolate(frame, [300, 360], [0.3, 2.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const ring2Opacity = interpolate(frame, [300, 325, 360], [0, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finaleSpring = spring({
    frame: frame - 295,
    fps,
    config: { mass: 1, damping: 16, stiffness: 100 },
  });

  // 边框流光扫射角度 (Border Beam)
  const borderBeamAngle = (frame * 4) % 360;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#060812",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#ffffff",
        perspective: 1400,
      }}
    >
      {/* ========================================================
          1. 电影级多重空间光影背景层 (Ambient Light Field)
      ======================================================== */}
      <AbsoluteFill
        style={{
          transform: `scale(${cameraZoom})`,
          transformOrigin: "center center",
        }}
      >
        {/* 动态径向暗角与极光晕染 */}
        <div
          style={{
            position: "absolute",
            width: "120%",
            height: "120%",
            left: "-10%",
            top: "-10%",
            background: `
              radial-gradient(ellipse 65% 55% at 50% 25%, ${primaryColor}40 0%, transparent 68%),
              radial-gradient(ellipse 55% 45% at 80% 65%, ${accentColor}30 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 20% 75%, ${secondaryColor}25 0%, transparent 55%),
              #060812
            `,
            opacity: meshGlowOpacity,
            filter: `blur(${65 + ambientPulse * 15}px)`,
          }}
        />

        {/* 3D 透视地平线网格 (Horizon Perspective Grid) */}
        <div
          style={{
            position: "absolute",
            width: "200%",
            height: "100%",
            left: "-50%",
            bottom: "-15%",
            transform: "perspective(500px) rotateX(72deg)",
            transformOrigin: "bottom center",
            backgroundImage: `
              linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: `center ${frame * 1.5}px`,
            maskImage:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 85%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 85%)",
          }}
        />

        {/* 悬浮微动星尘粒子 */}
        {PARTICLES.map((p) => {
          const particleY = (p.y * height - frame * p.speed * 1.4) % height;
          const currentY = particleY < 0 ? particleY + height : particleY;
          const currentX = p.x * width + Math.sin(frame * 0.03 + p.phase) * 18;
          const pOpacity =
            p.baseOpacity + Math.sin(frame * 0.06 + p.phase) * 0.15;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: currentX,
                top: currentY,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                backgroundColor: p.id % 2 === 0 ? accentColor : "#ffffff",
                opacity: Math.max(0, pOpacity),
                boxShadow: `0 0 ${p.size * 3}px ${accentColor}`,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* ========================================================
          2. Act I: 动力学大标题与前导徽章 (Kinetic Title & Pill)
      ======================================================== */}
      {frame < 120 && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
            transform: `translateY(${titleExitY}px)`,
            opacity: titleExitOpacity,
            filter: `blur(${titleExitBlur}px)`,
          }}
        >
          {/* 玻璃拟态状态胶囊 */}
          <div
            style={{
              opacity: badgeOpacity,
              transform: `translateY(${badgeY}px)`,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: `0 0 20px ${primaryColor}30, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
              marginBottom: 36,
            }}
          >
            {/* 雷达状态呼吸点 */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: "#f1f5f9",
                textTransform: "uppercase",
              }}
            >
              {badgeText}
            </span>
          </div>

          {/* 错峰动力学大标题 */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0 22px",
              maxWidth: 1400,
              textAlign: "center",
              lineHeight: 1.08,
            }}
          >
            {words.map((word, wordIdx) => {
              const wordSpring = spring({
                frame: frame - (16 + wordIdx * 7),
                fps,
                config: { mass: 0.9, damping: 14, stiffness: 110 },
              });

              const wordY = interpolate(wordSpring, [0, 1], [60, 0]);
              const wordClip = interpolate(wordSpring, [0, 1], [100, 0]);
              const wordOpacity = interpolate(wordSpring, [0, 1], [0, 1]);
              const wordBlur = interpolate(wordSpring, [0, 1], [12, 0]);

              const isHighlight = wordIdx % 2 === 1;

              return (
                <div
                  key={wordIdx}
                  style={{
                    overflow: "hidden",
                    display: "inline-block",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 84,
                      fontWeight: 900,
                      letterSpacing: "-0.035em",
                      opacity: wordOpacity,
                      filter: `blur(${wordBlur}px)`,
                      transform: `translateY(${wordY}px)`,
                      clipPath: `inset(0 0 ${wordClip}% 0)`,
                      background: isHighlight
                        ? `linear-gradient(135deg, #ffffff 15%, ${accentColor} 60%, ${primaryColor} 100%)`
                        : "linear-gradient(180deg, #ffffff 40%, #cbd5e1 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: isHighlight
                        ? `0 10px 40px ${accentColor}50`
                        : "0 10px 30px rgba(0,0,0,0.6)",
                    }}
                  >
                    {word}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 细腻副标题 */}
          {(() => {
            const subSpring = spring({
              frame: frame - 48,
              fps,
              config: { mass: 1, damping: 18, stiffness: 85 },
            });
            const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);
            const subY = interpolate(subSpring, [0, 1], [24, 0]);

            return (
              <p
                style={{
                  marginTop: 28,
                  fontSize: 24,
                  fontWeight: 400,
                  letterSpacing: "0.02em",
                  color: "#94a3b8",
                  maxWidth: 820,
                  textAlign: "center",
                  lineHeight: 1.5,
                  opacity: subOpacity,
                  transform: `translateY(${subY}px)`,
                }}
              >
                {subtitle}
              </p>
            );
          })()}
        </AbsoluteFill>
      )}

      {/* ========================================================
          3. Act II & III: 3D 等轴测产品主控制台 (3D Isometric Stage)
      ======================================================== */}
      {frame >= 72 && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            opacity: interpolate(climaxProgress, [0, 1], [1, 0.15]),
            transform: `scale(${interpolate(climaxProgress, [0, 1], [1, 1.25])})`,
          }}
        >
          <div
            style={{
              width: 1240,
              height: 720,
              borderRadius: 24,
              background: "rgba(13, 17, 29, 0.88)",
              backdropFilter: "blur(32px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow: `
                0 40px 100px -20px rgba(0, 0, 0, 0.85),
                0 0 60px -10px ${primaryColor}35,
                inset 0 1px 0 rgba(255, 255, 255, 0.25)
              `,
              transform: `
                translateY(${stageTranslateY + floatBobbing}px)
                scale(${stageScale})
                rotateX(${stageRotateX + floatTilt}deg)
                rotateY(${stageRotateY}deg)
                rotateZ(${stageRotateZ}deg)
              `,
              transformStyle: "preserve-3d",
              opacity: stageOpacity,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* 顶部镜面反光掠影 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
                pointerEvents: "none",
              }}
            />

            {/* 顶栏 (macOS Window Chrome) */}
            <div
              style={{
                height: 54,
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#ef4444" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#eab308" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#10b981" }} />
                <span style={{ marginLeft: 16, fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                  EasyMotion Studio • Timeline Engine v2.0
                </span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}40`,
                    fontWeight: 600,
                  }}
                >
                  60 FPS REMOTION ENGINE
                </span>
              </div>
            </div>

            {/* 主台内部栅格布局 */}
            <div
              style={{
                flex: 1,
                padding: 24,
                display: "grid",
                gridTemplateColumns: "360px 1fr",
                gridTemplateRows: "1fr 200px",
                gap: 20,
              }}
            >
              {/* 左侧：遥测与系统指标 (Telemetry Gauge) */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em" }}>
                    REAL-TIME METRICS
                  </div>
                  <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 44, fontWeight: 800, color: "#ffffff" }}>
                      {Math.round(fpsCounter)}
                    </span>
                    <span style={{ fontSize: 16, color: accentColor, fontWeight: 700 }}>
                      FPS TARGET
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Deterministic GPU WebGL Pipeline
                  </div>
                </div>

                {/* 圆形渐变进度环 */}
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative", width: 72, height: 72 }}>
                    <svg width="72" height="72" viewBox="0 0 72 72">
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="6"
                        fill="none"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r="30"
                        stroke={accentColor}
                        strokeWidth="6"
                        fill="none"
                        strokeDasharray={188.4}
                        strokeDashoffset={188.4 * (1 - renderProgress / 100)}
                        strokeLinecap="round"
                        transform="rotate(-90 36 36)"
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(renderProgress)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Timeline Render</div>
                    <div style={{ fontSize: 12, color: "#10b981" }}>● Frame Sync Active</div>
                  </div>
                </div>

                {/* 音频/律动动态均衡波形 */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
                  {Array.from({ length: 24 }).map((_, barIdx) => {
                    const barHeight =
                      10 + Math.abs(Math.sin((frame * 0.15) + barIdx * 0.45) * 36);
                    return (
                      <div
                        key={barIdx}
                        style={{
                          flex: 1,
                          height: barHeight,
                          borderRadius: 2,
                          background: `linear-gradient(to top, ${primaryColor}, ${accentColor})`,
                          opacity: 0.85,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 右侧主区：交互式 AI 提示词与动态节点管线 (Pipeline & Command) */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* 模拟智能打字机输入框 */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.4)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    border: `1px solid ${accentColor}50`,
                    boxShadow: `0 0 25px ${accentColor}20`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: primaryColor,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      AI PROMPT
                    </div>
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      Natural Language to Remotion AST
                    </span>
                  </div>
                  <div style={{ fontSize: 16, color: "#f8fafc", lineHeight: 1.5, minHeight: 48 }}>
                    <span>{typedString}</span>
                    {cursorBlink && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 2,
                          height: 18,
                          backgroundColor: accentColor,
                          marginLeft: 4,
                          verticalAlign: "middle",
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* 动态四节点 SVG 神经连线图 */}
                <div style={{ position: "relative", height: 160, marginTop: 16 }}>
                  <svg
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
                        <stop offset="50%" stopColor={accentColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.4" />
                      </linearGradient>
                    </defs>

                    {/* 节点贝塞尔连线 */}
                    <path
                      d="M 60,80 C 180,80 200,40 320,40 C 440,40 460,110 580,110 C 660,110 680,80 720,80"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="3"
                      fill="none"
                    />
                    <path
                      d="M 60,80 C 180,80 200,40 320,40 C 440,40 460,110 580,110 C 660,110 680,80 720,80"
                      stroke="url(#beamGrad)"
                      strokeWidth="3.5"
                      strokeDasharray="40 80"
                      strokeDashoffset={-streamOffset}
                      fill="none"
                    />
                  </svg>

                  {/* 四大核心节点徽标 */}
                  {[
                    { label: "PROMPT", x: 60, y: 80, color: primaryColor },
                    { label: "LLM AGENT", x: 320, y: 40, color: accentColor },
                    { label: "CURVE OPS", x: 580, y: 110, color: secondaryColor },
                    { label: "4K RENDER", x: 720, y: 80, color: "#10b981" },
                  ].map((node, nIdx) => (
                    <div
                      key={nIdx}
                      style={{
                        position: "absolute",
                        left: node.x,
                        top: node.y,
                        transform: "translate(-50%, -50%)",
                        padding: "8px 14px",
                        borderRadius: 8,
                        background: "rgba(15, 23, 42, 0.95)",
                        border: `1px solid ${node.color}`,
                        boxShadow: `0 0 16px ${node.color}50`,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: node.color,
                        }}
                      />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>
                        {node.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 底部全宽：迷你时间线多轨道监视器 (Timeline Preview Track) */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                    MULTI-TRACK CHOREOGRAPHY
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    FRAME {(frame % 375).toString().padStart(3, "0")} / 375
                  </span>
                </div>

                {/* 轨道模拟器 */}
                <div style={{ position: "relative", marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { name: "Scene 3D", width: "85%", color: primaryColor, left: "5%" },
                    { name: "Typography", width: "60%", color: accentColor, left: "20%" },
                    { name: "Audio FX", width: "90%", color: secondaryColor, left: "2%" },
                  ].map((tr, trIdx) => (
                    <div
                      key={trIdx}
                      style={{
                        height: 26,
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.04)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: tr.left,
                          width: tr.width,
                          height: "100%",
                          borderRadius: 6,
                          background: `linear-gradient(90deg, ${tr.color}50, ${tr.color}80)`,
                          border: `1px solid ${tr.color}`,
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: 12,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {tr.name}
                      </div>
                    </div>
                  ))}

                  {/* 扫行动态播放头 */}
                  <div
                    style={{
                      position: "absolute",
                      top: -4,
                      bottom: -4,
                      left: `${((frame % 150) / 150) * 96 + 2}%`,
                      width: 2,
                      backgroundColor: "#ffffff",
                      boxShadow: "0 0 10px #ffffff",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ========================================================
          4. Act III: 空间微视差伴星悬浮卡片 (Satellite Cards)
      ======================================================== */}
      {frame >= 170 && frame < 310 && (
        <>
          {/* 左侧悬浮卫星卡片 (3D 浮凸于主展台前方 Z+100) */}
          <div
            style={{
              position: "absolute",
              left: 140,
              top: 260,
              width: 320,
              padding: 24,
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(24px)",
              border: `1px solid ${accentColor}60`,
              boxShadow: `0 25px 60px rgba(0,0,0,0.7), 0 0 35px ${accentColor}30`,
              transform: `
                translateZ(100px)
                scale(${interpolate(satLeftSpring, [0, 1], [0.6, 1])})
                rotateX(8deg)
                rotateY(-12deg)
                translateY(${Math.sin(frame * 0.08) * 10}px)
              `,
              opacity: interpolate(satLeftSpring, [0, 1], [0, 1]),
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${accentColor}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: accentColor,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                ⚡
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Zero-Latency Sync</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Remotion Native Player</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.4, margin: 0 }}>
              毫秒级时间轴同步，精准捕捉每一帧弹性曲线变换。
            </p>
          </div>

          {/* 右侧悬浮卫星卡片 (3D 浮凸于主展台前方 Z+140) */}
          <div
            style={{
              position: "absolute",
              right: 140,
              bottom: 220,
              width: 320,
              padding: 24,
              borderRadius: 20,
              background: "rgba(15, 23, 42, 0.88)",
              backdropFilter: "blur(24px)",
              border: `1px solid ${secondaryColor}60`,
              boxShadow: `0 25px 60px rgba(0,0,0,0.7), 0 0 35px ${secondaryColor}30`,
              transform: `
                translateZ(140px)
                scale(${interpolate(satRightSpring, [0, 1], [0.6, 1])})
                rotateX(10deg)
                rotateY(8deg)
                translateY(${Math.cos(frame * 0.08) * 10}px)
              `,
              opacity: interpolate(satRightSpring, [0, 1], [0, 1]),
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `${secondaryColor}25`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: secondaryColor,
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                ✦
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Code-Driven Motion</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>React + Remotion AST</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.4, margin: 0 }}>
              告别死板模板，以对话生成无限自由的动态视效。
            </p>
          </div>
        </>
      )}

      {/* ========================================================
          5. Act IV: 终局能量冲击与品牌号召 (Climax & Finale)
      ======================================================== */}
      {frame >= 280 && (
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {/* 扩散能量冲击波 1 */}
          <div
            style={{
              position: "absolute",
              width: 600,
              height: 600,
              borderRadius: "50%",
              border: `2px solid ${accentColor}`,
              transform: `scale(${ring1Scale})`,
              opacity: ring1Opacity,
              boxShadow: `0 0 40px ${accentColor}`,
            }}
          />

          {/* 扩散能量冲击波 2 */}
          <div
            style={{
              position: "absolute",
              width: 600,
              height: 600,
              borderRadius: "50%",
              border: `2px solid ${secondaryColor}`,
              transform: `scale(${ring2Scale})`,
              opacity: ring2Opacity,
              boxShadow: `0 0 50px ${secondaryColor}`,
            }}
          />

          {/* 终局定格核心内容 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transform: `scale(${interpolate(finaleSpring, [0, 1], [0.8, 1])})`,
              opacity: interpolate(finaleSpring, [0, 1], [0, 1]),
            }}
          >
            {/* 品牌三维发光晶体徽标 */}
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                boxShadow: `0 0 60px ${accentColor}80`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 28,
                transform: `rotate(${Math.sin(frame * 0.05) * 8}deg)`,
              }}
            >
              <span style={{ fontSize: 48, fontWeight: 900, color: "#ffffff" }}>
                EM
              </span>
            </div>

            {/* 终极标语 */}
            <h1
              style={{
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                margin: 0,
                background: "linear-gradient(180deg, #ffffff 40%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textAlign: "center",
              }}
            >
              EasyMotion • 重新定义动画创作
            </h1>

            <p
              style={{
                fontSize: 22,
                color: "#94a3b8",
                marginTop: 16,
                marginBottom: 36,
                letterSpacing: "0.04em",
              }}
            >
              复杂、惊艳、随心所欲。即刻开启你的下一部电影级视效。
            </p>

            {/* 动态边框流光按钮 (Action Button with Border Beam) */}
            <div
              style={{
                position: "relative",
                padding: "16px 42px",
                borderRadius: 999,
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 30px ${primaryColor}40`,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* 旋转流光束 */}
              <div
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: 999,
                  background: `conic-gradient(from ${borderBeamAngle}deg, transparent 60%, ${accentColor} 85%, #ffffff 100%)`,
                  mask: "radial-gradient(ellipse at center, transparent 65%, black 66%)",
                  WebkitMask: "radial-gradient(ellipse at center, transparent 65%, black 66%)",
                  pointerEvents: "none",
                }}
              />
              <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "0.04em" }}>
                START CREATING NOW
              </span>
              <span style={{ fontSize: 20, color: accentColor }}>➔</span>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
