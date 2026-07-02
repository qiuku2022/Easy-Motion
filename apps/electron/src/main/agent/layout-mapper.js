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

function parseSizeValue(value, axisSize, fallback) {
  if (value == null || value === "") return fallback;
  const str = String(value).trim().toLowerCase();
  const pct = str.match(/^(\d+(?:\.\d+)?)%$/);
  if (pct) return Math.max(1, Math.round((axisSize * Number(pct[1])) / 100));
  const num = Number(str.replace(/px$/i, ""));
  if (Number.isFinite(num) && num > 0 && num <= 1) {
    return Math.max(1, Math.round(axisSize * num));
  }
  if (Number.isFinite(num) && num > 0) return Math.round(num);
  return fallback;
}

function resolveSize(size = {}, timeline, elementType) {
  const fallbackWidth =
    elementType === "shape" || elementType === "chart"
      ? Math.round(timeline.width * 0.5)
      : Math.round(timeline.width * 0.32);
  const fallbackHeight =
    elementType === "shape"
      ? Math.round(timeline.height * 0.24)
      : elementType === "chart"
        ? Math.round(timeline.height * 0.38)
        : Math.round(timeline.height * 0.24);
  return {
    width: parseSizeValue(size.width, timeline.width, fallbackWidth),
    height: parseSizeValue(size.height, timeline.height, fallbackHeight),
  };
}

function resolveDuration(timeline, options = {}) {
  const start = Math.max(0, Math.round(Number(options.startInFrames ?? 0)));
  const requested = Math.round(Number(options.durationInFrames ?? timeline.durationInFrames));
  const duration = Number.isFinite(requested) && requested > 0 ? requested : timeline.durationInFrames;
  return { start, duration: Math.max(1, duration) };
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

function normalizeElementType(type) {
  return ["text", "image", "shape", "chart"].includes(type) ? type : "unknown";
}

function resolveShapeSource(element, size, timeline) {
  const shape = element.shape === "circle" || element.style?.shape === "circle" ? "circle" : "rect";
  if (shape === "circle") {
    return {
      kind: "inline",
      shape,
      radius: Math.round(Math.min(size.width, size.height) / 2),
    };
  }
  return {
    kind: "inline",
    shape,
    width: size.width || timeline.width,
    height: size.height || timeline.height,
  };
}

function buildElementOperation(element, timeline, index, options = {}) {
  const type = normalizeElementType(element.type);
  if (type === "unknown") return null;

  const { start, duration } = resolveDuration(timeline, options);
  const position = resolvePosition(element.position, timeline.width, timeline.height);
  const size = resolveSize(element.size, timeline, type);
  const order = typeof element.zIndex === "number" ? element.zIndex : index;
  const content = element.content || element.name || `元素 ${index + 1}`;
  const baseTransform = {
    position,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };

  if (type === "text") {
    return {
      order,
      op: "createClip",
      track: {
        key: `text-${index}`,
        type: "text",
        name: String(content).slice(0, 20),
      },
      args: {
        name: String(content).slice(0, 30),
        startInFrames: start,
        durationInFrames: duration,
        source: { kind: "inline", content: String(content) },
        transform: baseTransform,
        style: {
          fontFamily: element.style?.fontFamily || "Inter, sans-serif",
          fontSize: parseFontSize(element.style?.fontSize),
          color: normalizeHex(element.style?.color),
          textAlign: element.style?.textAlign || "center",
        },
        animations: { in: { type: "fade", durationInFrames: 20 } },
      },
    };
  }

  if (type === "chart") {
    return {
      order,
      op: "createClip",
      track: { key: `chart-${index}`, type: "chart", name: "参考图表" },
      args: {
        name: String(content).slice(0, 30),
        startInFrames: start,
        durationInFrames: duration,
        source: {
          kind: "data",
          chartType: element.chartType === "bar" ? "bar" : "line",
          title: String(content),
          data: Array.isArray(element.data) && element.data.length
            ? element.data
            : [
                { label: "A", value: 40 },
                { label: "B", value: 65 },
                { label: "C", value: 50 },
              ],
        },
        transform: baseTransform,
        style: {
          primaryColor: normalizeHex(element.style?.color || element.style?.primaryColor),
          backgroundColor: normalizeHex(element.style?.backgroundColor || "#111827"),
        },
      },
    };
  }

  const placeholderForImage = type === "image";
  return {
    order,
    op: "createClip",
    track: {
      key: placeholderForImage ? `image-placeholder-${index}` : `shape-${index}`,
      type: "shape",
      name: placeholderForImage ? "图片占位" : String(content).slice(0, 20),
    },
    args: {
      name: placeholderForImage ? String(content || "图片占位").slice(0, 30) : String(content).slice(0, 30),
      startInFrames: start,
      durationInFrames: duration,
      source: resolveShapeSource(element, size, timeline),
      transform: baseTransform,
      style: {
        fillColor: normalizeHex(element.style?.backgroundColor || element.style?.color),
        background: element.style?.background,
        borderRadius: element.style?.borderRadius,
        opacity: placeholderForImage ? 0.5 : undefined,
      },
      animations: { in: { type: "fade", durationInFrames: 15 } },
    },
  };
}

function layoutToPlan(visualAnalysis, timeline, options = {}) {
  const elements = visualAnalysis?.layout?.elements;
  const warnings = [];
  if (!Array.isArray(elements) || elements.length === 0) {
    return {
      operations: [],
      warnings: ["参考图未识别到可落盘元素"],
      needsClarification: false,
    };
  }

  const supported = elements
    .map((element, index) => buildElementOperation(element, timeline, index, options))
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);

  if (elements.length > 12) {
    warnings.push("参考图元素较多，已只保留前 12 个元素用于初版落盘");
  }
  if (supported.length !== elements.length) {
    warnings.push("部分未知元素类型已跳过");
  }

  const operations = [];
  for (const item of supported.slice(0, 12)) {
    operations.push({
      op: "createTrack",
      key: item.track.key,
      args: {
        name: item.track.name,
        type: item.track.type,
      },
    });
    operations.push({
      op: "createClip",
      trackKey: item.track.key,
      args: item.args,
    });
  }

  return {
    operations,
    warnings,
    needsClarification: false,
  };
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
  layoutToPlan,
  resolvePosition,
  resolveSize,
  extractJsonFromText,
  mapElementToToolHint,
};
