import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { applyKeyframesToClip } from "../lib/apply-keyframes";

export type ChartDataPoint = {
  label: string;
  value: number;
};

type ChartSource = {
  kind?: "inline" | "data";
  chartType?: "line" | "bar";
  title?: string;
  data?: ChartDataPoint[];
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
};

type Transform = {
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  opacity: number;
};

type ChartLayerProps = {
  clipId: string;
  source?: ChartSource;
  transform: Transform;
  style?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    title?: string;
  };
  keyframes?: Parameters<typeof applyKeyframesToClip>[0]["keyframes"];
};

const DEFAULT_DATA: ChartDataPoint[] = [
  { label: "Jan", value: 25 },
  { label: "Feb", value: 40 },
  { label: "Mar", value: 35 },
  { label: "Apr", value: 55 },
  { label: "May", value: 50 },
  { label: "Jun", value: 70 },
];

function resolveChartData(source?: ChartSource): ChartDataPoint[] {
  if (Array.isArray(source?.data) && source.data.length > 0) {
    return source.data.map((d) => ({
      label: String(d.label ?? ""),
      value: Number(d.value) || 0,
    }));
  }
  return DEFAULT_DATA;
}

export const ChartLayer: React.FC<ChartLayerProps> = ({
  source,
  transform,
  style,
  keyframes = [],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const resolved = useMemo(
    () => applyKeyframesToClip({ transform, style, keyframes }, frame, fps),
    [frame, fps, transform, style, keyframes],
  );

  const data = resolveChartData(source);
  const chartType = source?.chartType ?? "line";
  const title = source?.title ?? style?.title ?? "数据图表";
  const primaryColor = source?.primaryColor ?? style?.primaryColor ?? "#14b8a6";
  const secondaryColor = source?.secondaryColor ?? style?.secondaryColor ?? "#f59e0b";
  const backgroundColor = source?.backgroundColor ?? style?.backgroundColor ?? "#111827";

  const chartWidth = 900;
  const chartHeight = 480;
  const padding = 64;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const xScale = (index: number) =>
    padding + (index / Math.max(1, data.length - 1)) * (chartWidth - padding * 2);
  const yScale = (value: number) =>
    chartHeight - padding - (value / maxValue) * (chartHeight - padding * 2);

  const reveal = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: "clamp" });
  const visibleCount = Math.max(1, Math.ceil(data.length * reveal));

  const linePoints = data
    .slice(0, visibleCount)
    .map((d, i) => `${xScale(i)},${yScale(d.value)}`)
    .join(" ");

  return (
    <div
      style={{
        position: "absolute",
        left: resolved.transform.position.x,
        top: resolved.transform.position.y,
        transform: `translate(-50%, -50%) scale(${resolved.transform.scale}) rotate(${resolved.transform.rotation}deg)`,
        opacity: resolved.transform.opacity,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: chartWidth,
          height: chartHeight,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${backgroundColor}, #1f2937)`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          padding: 20,
        }}
      >
        <p
          style={{
            margin: "0 0 12px",
            color: "#f8fafc",
            fontSize: 28,
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {title}
        </p>
        <svg width={chartWidth} height={chartHeight - 40}>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
            return (
              <line
                key={ratio}
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            );
          })}
          {chartType === "line" ? (
            <>
              <polyline
                points={linePoints}
                fill="none"
                stroke={primaryColor}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {data.slice(0, visibleCount).map((d, i) => (
                <circle
                  key={d.label}
                  cx={xScale(i)}
                  cy={yScale(d.value)}
                  r={6}
                  fill={secondaryColor}
                />
              ))}
            </>
          ) : (
            data.slice(0, visibleCount).map((d, i) => {
              const barWidth = ((chartWidth - padding * 2) / data.length) * 0.6;
              const x = xScale(i) - barWidth / 2;
              const y = yScale(d.value);
              const h = chartHeight - padding - y;
              return (
                <rect
                  key={d.label}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={4}
                  fill={primaryColor}
                  opacity={0.9}
                />
              );
            })
          )}
          {data.map((d, i) => (
            <text
              key={`label-${d.label}`}
              x={xScale(i)}
              y={chartHeight - padding + 22}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={14}
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
