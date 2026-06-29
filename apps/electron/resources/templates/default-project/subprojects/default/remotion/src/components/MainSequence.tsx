import type { ReactNode } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { flattenClipsForPreview } from "../lib/flatten-clips-for-preview";
import { isClipVisibleInPreview } from "../lib/preview-visibility";
import { resolveClipMediaSrc } from "../lib/resolve-clip-media-src";
import { resolvePresetComponent } from "../presets/registry";
import { resolveCustomComponent } from "../presets/custom-registry";
import { GradientBackground } from "./newsletter-design/GradientBackground";
import { NewsletterBackground } from "./newsletter-design/NewsletterBackground";
import { PreviewClipSequence } from "./PreviewClipSequence";
import { ChartLayer } from "./layers/ChartLayer";
import {
  resolveClipTransformLayout,
  shouldWrapClipMotion,
} from "../lib/clip-motion-wrapper";
import { ClipTransformWrapper } from "./layers/ClipTransformWrapper";
import { ImageLayer } from "./layers/ImageLayer";
import { ShapeLayer } from "./layers/ShapeLayer";
import { TextLayer } from "./layers/TextLayer";

export type MainSequenceProps = {
  timeline?: Parameters<typeof PreviewClipSequence>[0]["timeline"];
};

function renderClipContent(
  track: { type: string },
  canvas: { width: number; height: number },
  clip: {
    id: string;
    name?: string;
    source?: {
      kind?: string;
      content?: string;
      component?: string;
      shape?: "rect" | "circle";
      width?: number;
      height?: number;
      radius?: number;
      path?: string;
      publicPath?: string;
      title?: string;
      chartType?: "line" | "bar";
      data?: Array<{ label: string; value: number }>;
    };
    transform?: {
      position: { x: number; y: number };
      scale: number;
      rotation: number;
      opacity: number;
    };
    style?: {
      fontFamily?: string;
      fontSize?: number;
      color?: string;
      textAlign?: "left" | "center" | "right";
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
      background?: string;
      backgroundImage?: string;
      objectFit?: "cover" | "contain" | "fill";
    };
    keyframes?: Array<{
      id: string;
      property: string;
      frame: number;
      value: unknown;
      easing?: string;
      interpolation?: string;
    }>;
    animations?: { in?: { type: string; durationInFrames: number } };
  },
) {
  const defaultTransform = {
    position: { x: 960, y: 540 },
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
  const transform = clip.transform ?? defaultTransform;

  const wrapMotion = (content: ReactNode) => {
    if (!shouldWrapClipMotion(clip, canvas)) return content;
    return (
      <ClipTransformWrapper
        transform={clip.transform ?? defaultTransform}
        keyframes={clip.keyframes}
        inAnimation={clip.animations?.in}
        layout={resolveClipTransformLayout(
          clip.transform,
          clip.keyframes,
          canvas,
        )}
      >
        {content}
      </ClipTransformWrapper>
    );
  };

  if (track.type === "text") {
    return (
      <TextLayer
        clipId={clip.id}
        source={{
          kind: "inline",
          content:
            clip.source?.kind === "inline" && clip.source.content
              ? clip.source.content
              : (clip.name ?? ""),
        }}
        transform={transform}
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 72,
          color: "#ffffff",
          textAlign: "center",
          ...clip.style,
        }}
        keyframes={clip.keyframes}
        inAnimation={clip.animations?.in}
      />
    );
  }

  if (track.type === "image") {
    const mediaPath = resolveClipMediaSrc(clip.source);
    if (!mediaPath) return null;
    return (
      <ImageLayer
        clipId={clip.id}
        src={staticFile(mediaPath)}
        transform={transform}
        style={{
          objectFit: "cover",
          ...clip.style,
        }}
        keyframes={clip.keyframes}
      />
    );
  }

  if (track.type === "shape") {
    return (
      <ShapeLayer
        clipId={clip.id}
        source={{
          kind: "inline",
          shape: clip.source?.shape ?? "rect",
          width: clip.source?.width,
          height: clip.source?.height,
          radius: clip.source?.radius,
        }}
        transform={transform}
        style={clip.style}
        keyframes={clip.keyframes}
      />
    );
  }

  if (track.type === "chart") {
    return (
      <ChartLayer
        clipId={clip.id}
        source={{
          kind: clip.source?.kind === "data" ? "data" : "inline",
          chartType: clip.source?.chartType === "bar" ? "bar" : "line",
          title:
            (typeof clip.source?.title === "string" ? clip.source.title : undefined) ??
            (typeof clip.style?.title === "string" ? clip.style.title : undefined),
          data: Array.isArray(clip.source?.data)
            ? (clip.source.data as Array<{ label: string; value: number }>)
            : undefined,
          primaryColor:
            typeof clip.style?.primaryColor === "string"
              ? clip.style.primaryColor
              : undefined,
          secondaryColor:
            typeof clip.style?.secondaryColor === "string"
              ? clip.style.secondaryColor
              : undefined,
          backgroundColor:
            typeof clip.style?.backgroundColor === "string"
              ? clip.style.backgroundColor
              : undefined,
        }}
        transform={transform}
        style={clip.style}
        keyframes={clip.keyframes}
      />
    );
  }

  if (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    clip.source.component === "NewsletterBackground"
  ) {
    return wrapMotion(<NewsletterBackground style={clip.style} />);
  }

  if (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    clip.source.component === "GradientBackground"
  ) {
    return wrapMotion(<GradientBackground style={clip.style} />);
  }

  if (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    typeof clip.source.component === "string"
  ) {
    const props =
      clip.source.props && typeof clip.source.props === "object"
        ? (clip.source.props as Record<string, unknown>)
        : {};
    const PresetComponent = resolvePresetComponent(clip.source.component);
    if (PresetComponent) {
      return wrapMotion(<PresetComponent {...props} />);
    }
    const CustomComponent = resolveCustomComponent(clip.source.component);
    if (CustomComponent) {
      return wrapMotion(<CustomComponent {...props} />);
    }
  }

  return null;
}

/** Player 通过 inputProps 传入 timeline；所有片段从 JSON 动态渲染（含 AI 新建/修改） */
export const MainSequence: React.FC<MainSequenceProps> = ({ timeline }) => {
  const items = flattenClipsForPreview(timeline);
  const canvas = {
    width: timeline?.width ?? 1920,
    height: timeline?.height ?? 1080,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
      {items.map(({ track, clip }) => {
        if (!isClipVisibleInPreview(clip.id, timeline)) return null;
        const content = renderClipContent(track, canvas, clip);
        if (!content) return null;

        return (
          <PreviewClipSequence
            key={clip.id}
            clipId={clip.id}
            timeline={timeline}
            fallbackFrom={clip.startInFrames ?? 0}
            fallbackDuration={clip.durationInFrames}
          >
            {content}
          </PreviewClipSequence>
        );
      })}
    </AbsoluteFill>
  );
};
