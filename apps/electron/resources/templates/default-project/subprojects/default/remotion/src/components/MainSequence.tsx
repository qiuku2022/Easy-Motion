import { AbsoluteFill, staticFile } from "remotion";
import { flattenClipsForPreview } from "../lib/flatten-clips-for-preview";
import { isClipVisibleInPreview } from "../lib/preview-visibility";
import { resolveClipMediaSrc } from "../lib/resolve-clip-media-src";
import { resolvePresetComponent } from "../presets/registry";
import { resolveCustomComponent } from "../presets/custom-registry";
import { GradientBackground } from "./newsletter-design/GradientBackground";
import { NewsletterBackground } from "./newsletter-design/NewsletterBackground";
import { PreviewClipSequence } from "./PreviewClipSequence";
import { ImageLayer } from "./layers/ImageLayer";
import { ShapeLayer } from "./layers/ShapeLayer";
import { TextLayer } from "./layers/TextLayer";

export type MainSequenceProps = {
  timeline?: Parameters<typeof PreviewClipSequence>[0]["timeline"];
};

function renderClipContent(
  track: { type: string },
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
    animations?: { in?: { type: string; durationInFrames: number } };
  },
) {
  const transform =
    clip.transform ?? {
      position: { x: 960, y: 540 },
      scale: 1,
      rotation: 0,
      opacity: 1,
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
      />
    );
  }

  if (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    clip.source.component === "NewsletterBackground"
  ) {
    return <NewsletterBackground style={clip.style} />;
  }

  if (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    clip.source.component === "GradientBackground"
  ) {
    return <GradientBackground style={clip.style} />;
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
      return <PresetComponent {...props} />;
    }
    const CustomComponent = resolveCustomComponent(clip.source.component);
    if (CustomComponent) {
      return <CustomComponent {...props} />;
    }
  }

  return null;
}

/** Player 通过 inputProps 传入 timeline；所有片段从 JSON 动态渲染（含 AI 新建/修改） */
export const MainSequence: React.FC<MainSequenceProps> = ({ timeline }) => {
  const items = flattenClipsForPreview(timeline);

  return (
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
      {items.map(({ track, clip }) => {
        if (!isClipVisibleInPreview(clip.id, timeline)) return null;
        const content = renderClipContent(track, clip);
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
