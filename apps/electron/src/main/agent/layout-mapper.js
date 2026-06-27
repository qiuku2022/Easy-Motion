function parsePercentOrKeyword(value, axisSize, keywordMap) {
  if (value == null || value === "") return axisSize / 2;
  const str = String(value).trim().toLowerCase();

  if (keywordMap[str] != null) return keywordMap[str];

  const pct = str.match(/^(\d+(?:\.\d+)?)%$/);
  if (pct) return Math.round((axisSize * Number(pct[1])) / 100);

  const num = Number(str);
  if (!Number.isNaN(num) && num >= 0 && num <= 1) {
    return Math.round(axisSize * num);
  }
  if (!Number.isNaN(num)) return Math.round(num);

  return axisSize / 2;
}

function parseTimelineY(value, height) {
  if (value == null || value === "") return Math.round(height / 2);
  const str = String(value).trim().toLowerCase();

  const keywordMap = {
    top: Math.round(height * 0.8),
    center: Math.round(height / 2),
    bottom: Math.round(height * 0.2),
  };
  if (keywordMap[str] != null) return keywordMap[str];

  const pct = str.match(/^(\d+(?:\.\d+)?)%$/);
  if (pct) return Math.round((height * Number(pct[1])) / 100);

  const num = Number(str);
  if (!Number.isNaN(num) && num >= 0 && num <= 1) {
    return Math.round(height * num);
  }
  if (!Number.isNaN(num)) return Math.round(num);

  return Math.round(height / 2);
}

function resolvePosition(position = {}, width, height) {
  const x = parsePercentOrKeyword(position.x, width, {
    left: Math.round(width * 0.2),
    center: Math.round(width / 2),
    right: Math.round(width * 0.8),
  });
  const y = parseTimelineY(position.y, height);
  return { x, y };
}

function normalizeHex(color) {
  if (!color || color === "unknown") return "#ffffff";
  const str = String(color).trim();
  if (/^#[0-9a-f]{3,8}$/i.test(str)) return str;
  return "#ffffff";
}

function parseFontSize(value) {
  const num = Number(String(value ?? "").replace(/px$/i, ""));
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 72;
}

function mapElementToToolHint(element, timeline, index) {
  const trackType =
    element.type === "text"
      ? "text"
      : element.type === "image"
        ? "image"
        : element.type === "shape"
          ? "shape"
          : "text";

  const position = resolvePosition(element.position, timeline.width, timeline.height);
  const fontSize = parseFontSize(element.style?.fontSize);
  const color = normalizeHex(element.style?.color);
  const content = element.content || element.name || `元素 ${index + 1}`;
  const duration = Math.min(90, Math.max(30, timeline.durationInFrames));

  const hint = {
    order: typeof element.zIndex === "number" ? element.zIndex : index,
    createTrack: { name: content.slice(0, 20), type: trackType },
    createClip: {
      name: content.slice(0, 30),
      startInFrames: 0,
      durationInFrames: duration,
      transform: { position, scale: 1, rotation: 0, opacity: 1 },
      animations: { in: { type: "fade", durationInFrames: 20 } },
    },
  };

  if (trackType === "text") {
    hint.createClip.source = { kind: "inline", content };
    hint.createClip.style = {
      fontFamily: element.style?.fontFamily || "Inter, sans-serif",
      fontSize,
      color,
      textAlign: "center",
    };
  }

  return hint;
}

function layoutToToolHints(visualAnalysis, timeline) {
  const elements = visualAnalysis?.layout?.elements;
  if (!Array.isArray(elements) || !elements.length) return [];

  return elements
    .filter((el) => el && el.type !== "unknown")
    .map((el, index) => mapElementToToolHint(el, timeline, index))
    .sort((a, b) => a.order - b.order);
}

function extractJsonFromText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

module.exports = {
  layoutToToolHints,
  resolvePosition,
  extractJsonFromText,
  mapElementToToolHint,
};
