const { TimelineContext } = require("./timeline-context");

const SIMPLIFIED_NOTICE =
  "已切换至简化生成模式：网络或 LLM 异常时，将使用预设模板创建基础文字动画。您可以通过对话继续调整。";

function findFirstTextTrack(timeline) {
  for (const track of timeline.tracks ?? []) {
    if (track.type === "text" && track.visible !== false) return track;
    for (const child of track.children ?? []) {
      if (child.type === "text" && child.visible !== false) return child;
    }
  }
  return null;
}

function extractTextFromInput(input) {
  const text = String(input ?? "").trim();
  if (!text) return "Hello";

  const quoted = text.match(/[「『"']([^」』"']+)[」』"']/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();

  const labeled = text.match(
    /(?:写着|写成|标题|文字|内容)(?:[是为：:]?\s*)([^\s，。！？,.!?]{1,40})/i
  );
  if (labeled?.[1]?.trim()) return labeled[1].trim();

  const english = text.match(/\b([A-Za-z][A-Za-z0-9\s]{0,30})\b/);
  if (english?.[1]?.trim()) return english[1].trim();

  return "Hello";
}

/**
 * LLM 失败后的简化模式：createTrack(text) + createClip(Hello)。
 */
function runSimplifiedFallback({ timeline, subprojectName = "默认片段", input = "" }) {
  const ctx = new TimelineContext(timeline, { subprojectName });
  const content = extractTextFromInput(input);

  let track = findFirstTextTrack(ctx.timeline);
  if (!track) {
    track = ctx.createTrack({ name: "文字", type: "text" });
  }

  const duration = Math.min(60, Math.max(1, ctx.timeline.durationInFrames));
  const cx = Math.round(ctx.timeline.width / 2);
  const cy = Math.round(ctx.timeline.height / 2);

  ctx.createClip({
    trackId: track.id,
    name: content,
    startInFrames: 0,
    durationInFrames: duration,
    source: { kind: "inline", content },
    transform: {
      position: { x: cx, y: cy },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: 72,
      color: "#ffffff",
      textAlign: "center",
    },
    animations: {
      in: { type: "fade", durationInFrames: Math.min(20, duration) },
    },
  });

  return {
    reply: `已使用简化模式创建文字「${content}」。${SIMPLIFIED_NOTICE}`,
    timeline: ctx.timeline,
    timelineChanged: ctx.changed,
    changeLog: ctx.changeLog,
    simplifiedMode: true,
    systemNotice: SIMPLIFIED_NOTICE,
  };
}

module.exports = {
  runSimplifiedFallback,
  extractTextFromInput,
  findFirstTextTrack,
  SIMPLIFIED_NOTICE,
};
