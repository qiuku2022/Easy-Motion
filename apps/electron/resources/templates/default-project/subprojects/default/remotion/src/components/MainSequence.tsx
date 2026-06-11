import { AbsoluteFill, Sequence } from "remotion";
import { TextLayer } from "./layers/TextLayer";
import { NewsletterBackground } from "./newsletter-design/NewsletterBackground";
import { isClipVisibleInPreview } from "../lib/preview-visibility";

export type MainSequenceProps = {
  timeline?: Parameters<typeof isClipVisibleInPreview>[1];
};

/** Player 通过 inputProps 传入 timeline；未传入时全部图层可见（导出渲染） */
export const MainSequence: React.FC<MainSequenceProps> = ({ timeline }) => {

  return (
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
      {isClipVisibleInPreview("clip-newsletter-bg", timeline) && (
        <NewsletterBackground />
      )}
      {isClipVisibleInPreview("clip-title-main", timeline) && (
        <Sequence from={0} durationInFrames={125}>
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
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
