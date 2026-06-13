import { AbsoluteFill } from "remotion";
import { TextLayer } from "./layers/TextLayer";
import { NewsletterBackground } from "./newsletter-design/NewsletterBackground";
import { PreviewClipSequence } from "./PreviewClipSequence";

export type MainSequenceProps = {
  timeline?: Parameters<typeof PreviewClipSequence>[0]["timeline"];
};

/** Player 通过 inputProps 传入 timeline；未传入时回退 fallback 时长（导出渲染） */
export const MainSequence: React.FC<MainSequenceProps> = ({ timeline }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
      <PreviewClipSequence
        clipId="clip-newsletter-bg"
        timeline={timeline}
        fallbackFrom={0}
        fallbackDuration={125}
      >
        <NewsletterBackground />
      </PreviewClipSequence>
      <PreviewClipSequence
        clipId="clip-title-main"
        timeline={timeline}
        fallbackFrom={0}
        fallbackDuration={125}
      >
        <TextLayer
          clipId="clip-title-main"
          source={{ kind: "inline", content: "this week in\ndesign" }}
          transform={{
            position: { x: 420, y: 520 },
            scale: 1,
            rotation: 0,
            opacity: 1,
          }}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 96,
            color: "#0A0A0A",
            textAlign: "left",
          }}
          inAnimation={{ type: "fade", durationInFrames: 20 }}
        />
      </PreviewClipSequence>
    </AbsoluteFill>
  );
};
