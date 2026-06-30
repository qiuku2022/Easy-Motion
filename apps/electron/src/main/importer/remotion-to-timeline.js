const fs = require("node:fs");
const path = require("node:path");
const { fingerprintRemotionSrc } = require("./remotion-fingerprint");
const { readTimelineManifest } = require("./timeline-manifest");
const {
  isValidTimelineNumber,
  readPreviewConfig,
  deriveDurationFromTracks,
} = require("./timeline-meta");

const LAYER_COMPONENT_MAP = {
  TextLayer: "text",
  ImageLayer: "image",
  ShapeLayer: "shape",
  VideoLayer: "video",
  AudioLayer: "audio",
  ChartLayer: "chart",
  AnimationLayer: "animation",
};

const SKIP_COMPONENTS = new Set([
  "AbsoluteFill",
  "Sequence",
  "Fragment",
  "React",
  "Composition",
]);

function slugify(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase()
    .replace(/^-|-$/g, "");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function resolveImportPath(fromFile, importPath) {
  if (!importPath.startsWith(".")) return null;

  const baseDir = path.dirname(fromFile);
  let resolved = path.join(baseDir, importPath);
  if (fs.existsSync(`${resolved}.tsx`)) return `${resolved}.tsx`;
  if (fs.existsSync(`${resolved}.ts`)) return `${resolved}.ts`;
  if (fs.existsSync(path.join(resolved, "index.tsx"))) {
    return path.join(resolved, "index.tsx");
  }
  return null;
}

function collectImports(content) {
  const imports = new Map();
  const importRegex =
    /import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+["']([^"']+)["']/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const named = match[1];
    const defaultName = match[2];
    const importPath = match[3];

    if (defaultName) {
      imports.set(defaultName, importPath);
      continue;
    }

    if (named) {
      for (const part of named.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const alias = trimmed.includes(" as ")
          ? trimmed.split(" as ")[1].trim()
          : trimmed;
        imports.set(alias, importPath);
      }
    }
  }

  return imports;
}

function collectNumericConstants(remotionSrcDir) {
  const constants = {};

  function scanFile(filePath) {
    const content = readText(filePath);
    const constRegex = /export\s+const\s+(\w+)\s*=\s*(-?\d+)/g;
    let match;
    while ((match = constRegex.exec(content)) !== null) {
      constants[match[1]] = Number(match[2]);
    }
  }

  const root = path.join(remotionSrcDir, "Root.tsx");
  if (fs.existsSync(root)) scanFile(root);

  for (const rel of ["components/tokyo-doc/theme.ts", "theme.ts"]) {
    const filePath = path.join(remotionSrcDir, rel);
    if (fs.existsSync(filePath)) scanFile(filePath);
  }

  return constants;
}

function evalFrameExpression(expression, constants, fallbackDuration) {
  const expr = expression.trim();
  if (/^-?\d+$/.test(expr)) return Number(expr);

  const replaced = expr.replace(/\b([A-Z][A-Z0-9_]*)\b/g, (name) => {
    if (Object.prototype.hasOwnProperty.call(constants, name)) {
      return String(constants[name]);
    }
    if (name === "DURATION" && fallbackDuration != null) {
      return String(fallbackDuration);
    }
    return "0";
  });

  if (!/^[\d\s+\-*/().]+$/.test(replaced)) {
    return 0;
  }

  try {
    return Number(Function(`"use strict"; return (${replaced});`)());
  } catch {
    return 0;
  }
}

function parseCompositionMeta(rootContent, constants) {
  const durationMatch = rootContent.match(/durationInFrames=\{([^}]+)\}/);
  const fpsMatch = rootContent.match(/fps=\{([^}]+)\}/);
  const widthMatch = rootContent.match(/width=\{([^}]+)\}/);
  const heightMatch = rootContent.match(/height=\{([^}]+)\}/);

  const durationInFrames = durationMatch
    ? evalFrameExpression(durationMatch[1], constants)
    : 300;

  return {
    durationInFrames,
    fps: fpsMatch ? evalFrameExpression(fpsMatch[1], constants) : 30,
    width: widthMatch ? evalFrameExpression(widthMatch[1], constants) : 1920,
    height: heightMatch ? evalFrameExpression(heightMatch[1], constants) : 1080,
  };
}

function extractJsxPropObject(content, propName) {
  const marker = `${propName}={`;
  const start = content.indexOf(marker);
  if (start < 0) return null;

  let depth = 0;
  let jsonStart = -1;
  for (let i = start + marker.length - 1; i < content.length; i += 1) {
    const ch = content[i];
    if (ch === "{") {
      if (depth === 0) jsonStart = i + 1;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && jsonStart >= 0) {
        const raw = content.slice(jsonStart, i);
        try {
          return Function(`"use strict"; return (${raw});`)();
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function extractStringProp(content, propName) {
  const match = content.match(new RegExp(`${propName}=["']([^"']+)["']`));
  return match?.[1] ?? null;
}

function parseLayerClip(componentName, blockContent, startInFrames, durationInFrames) {
  const trackType = LAYER_COMPONENT_MAP[componentName] ?? "animation";
  const clipId =
    extractStringProp(blockContent, "clipId") ??
    `clip-import-${slugify(componentName)}-${startInFrames}`;

  const clip = {
    id: clipId,
    type: trackType,
    name: componentName.replace(/Layer$/, ""),
    startInFrames,
    durationInFrames,
    keyframes: [],
  };

  if (trackType === "text") {
    clip.source = extractJsxPropObject(blockContent, "source") ?? {
      kind: "inline",
      content: clip.name,
    };
    clip.style = extractJsxPropObject(blockContent, "style") ?? {};
    clip.transform = extractJsxPropObject(blockContent, "transform") ?? {
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    const inAnimation = extractJsxPropObject(blockContent, "inAnimation");
    const outAnimation = extractJsxPropObject(blockContent, "outAnimation");
    if (inAnimation || outAnimation) {
      clip.animations = { in: inAnimation, out: outAnimation };
    }
    return { trackType, clip };
  }

  if (trackType === "shape" || trackType === "image" || trackType === "video") {
    clip.source = extractJsxPropObject(blockContent, "source");
    clip.style = extractJsxPropObject(blockContent, "style") ?? {};
    clip.transform = extractJsxPropObject(blockContent, "transform") ?? {
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    return { trackType, clip };
  }

  clip.source = {
    kind: "component",
    component: componentName,
  };
  return { trackType: "animation", clip };
}

function parseSequencesInFile(filePath, constants, fallbackDuration) {
  const content = readText(filePath);
  const sequences = [];
  const overlays = [];
  const imports = collectImports(content);
  const relComponent = path
    .relative(path.dirname(filePath), filePath)
    .replace(/\\/g, "/")
    .replace(/\.tsx?$/, "");

  const sequenceRegex =
    /<Sequence\b([^>]*)>([\s\S]*?)<\/Sequence>/g;

  let match;
  while ((match = sequenceRegex.exec(content)) !== null) {
    const attrs = match[1];
    const inner = match[2];
    const fromMatch = attrs.match(/from=\{([^}]+)\}/);
    const durationMatch = attrs.match(/durationInFrames=\{([^}]+)\}/);
    if (!fromMatch || !durationMatch) continue;

    const startInFrames = evalFrameExpression(
      fromMatch[1],
      constants,
      fallbackDuration,
    );
    const durationInFrames = Math.max(
      1,
      evalFrameExpression(durationMatch[1], constants, fallbackDuration),
    );

    const childMatch = inner.match(/<([A-Z][A-Za-z0-9]*)\b([^/>]*)(?:\/>|>)/);
    if (!childMatch) continue;

    const componentName = childMatch[1];
    if (SKIP_COMPONENTS.has(componentName)) continue;

    if (LAYER_COMPONENT_MAP[componentName]) {
      sequences.push(
        parseLayerClip(
          componentName,
          childMatch[0],
          startInFrames,
          durationInFrames,
        ),
      );
      continue;
    }

    sequences.push({
      trackType: "animation",
      clip: {
        id: `clip-import-${slugify(componentName)}-${startInFrames}`,
        type: "animation",
        name: componentName,
        startInFrames,
        durationInFrames,
        source: {
          kind: "component",
          component: `${relComponent}/${componentName}`.replace(/^\.\//, ""),
        },
        keyframes: [],
      },
      componentName,
      importPath: imports.get(componentName) ?? null,
    });
  }

  const overlayRegex = /<([A-Z][A-Za-z0-9]*)\s*\/>/g;
  let overlayMatch;
  while ((overlayMatch = overlayRegex.exec(content)) !== null) {
    const componentName = overlayMatch[1];
    if (SKIP_COMPONENTS.has(componentName)) continue;
    if (LAYER_COMPONENT_MAP[componentName]) continue;
    if (content.includes(`<Sequence`) && content.indexOf(overlayMatch[0]) > -1) {
      const before = content.slice(0, overlayMatch.index);
      const openSeq = (before.match(/<Sequence\b/g) ?? []).length;
      const closeSeq = (before.match(/<\/Sequence>/g) ?? []).length;
      if (openSeq > closeSeq) continue;
    }

    overlays.push({
      trackType: "animation",
      clip: {
        id: `clip-import-${slugify(componentName)}-overlay`,
        type: "animation",
        name: componentName,
        startInFrames: 0,
        durationInFrames: fallbackDuration,
        source: {
          kind: "component",
          component: componentName,
        },
        keyframes: [],
      },
      componentName,
      importPath: imports.get(componentName) ?? null,
    });
  }

  return { sequences, overlays, imports, content };
}

function collectTimelineItems(remotionSrcDir, constants, meta) {
  const mainSequencePath = path.join(
    remotionSrcDir,
    "components",
    "MainSequence.tsx",
  );
  if (!fs.existsSync(mainSequencePath)) {
    throw new Error("E2501: MainSequence.tsx not found");
  }

  const items = [];
  const visited = new Set();

  function visitFile(filePath, depth = 0) {
    const normalized = path.normalize(filePath);
    if (visited.has(normalized) || depth > 6) return;
    visited.add(normalized);

    const { sequences, overlays, imports, content } = parseSequencesInFile(
      normalized,
      constants,
      meta.durationInFrames,
    );

    for (const item of sequences) {
      items.push(item);
    }
    for (const item of overlays) {
      items.push(item);
    }

    const childComponents = new Set();
    const delegateRegex = /<([A-Z][A-Za-z0-9]*)\s*\/>/g;
    let delegateMatch;
    while ((delegateMatch = delegateRegex.exec(content)) !== null) {
      const name = delegateMatch[1];
      if (!SKIP_COMPONENTS.has(name) && !LAYER_COMPONENT_MAP[name]) {
        childComponents.add(name);
      }
    }

    if (sequences.length === 0 && childComponents.size === 1) {
      const [componentName] = [...childComponents];
      const importPath = imports.get(componentName);
      if (importPath) {
        const resolved = resolveImportPath(normalized, importPath);
        if (resolved) visitFile(resolved, depth + 1);
      }
    } else {
      for (const item of sequences) {
        if (!item.importPath) continue;
        const resolved = resolveImportPath(normalized, item.importPath);
        if (resolved) visitFile(resolved, depth + 1);
      }
    }
  }

  visitFile(mainSequencePath, 0);
  return items;
}

/** 按图层名聚合为 group，同图层多类型元素放入 children（对齐时间线编辑.md） */
function buildTracks(items) {
  const groupMap = new Map();

  for (const item of items) {
    const trackType = item.trackType ?? "animation";
    const layerName = item.clip.name || "图层";
    const groupKey = slugify(layerName) || `layer-${groupMap.size}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        id: `track-group-${groupKey}`,
        name: layerName,
        type: "group",
        order: groupMap.size,
        visible: true,
        locked: false,
        muted: false,
        clips: [],
        children: [],
        collapsed: false,
        childByType: new Map(),
      });
    }

    const group = groupMap.get(groupKey);
    if (!group.childByType.has(trackType)) {
      const child = {
        id: `track-import-${groupKey}-${trackType}`,
        name: trackType === "text" ? layerName : `${layerName} (${trackType})`,
        type: trackType,
        order: group.childByType.size,
        visible: true,
        locked: false,
        muted: false,
        clips: [],
      };
      group.childByType.set(trackType, child);
      group.children.push(child);
    }

    group.childByType.get(trackType).clips.push(item.clip);
  }

  return [...groupMap.values()].map((group, index) => {
    const children = group.children.map((child, childIndex) => ({
      ...child,
      order: childIndex,
      clips: child.clips.sort((a, b) => a.startInFrames - b.startInFrames),
    }));
    return {
      id: group.id,
      name: group.name,
      type: group.type,
      order: index,
      visible: group.visible,
      locked: group.locked,
      muted: group.muted,
      clips: [],
      children,
      collapsed: group.collapsed,
    };
  });
}

function readCompositionMetaFromRoot(remotionSrcDir, compositionId = "Main") {
  const rootPath = path.join(remotionSrcDir, "Root.tsx");
  if (!fs.existsSync(rootPath)) return null;

  const rootContent = readText(rootPath);
  const previewConfig = readPreviewConfig(remotionSrcDir);

  // 生成器 Root：durationInFrames={meta.durationInFrames} 无法静态求值，读 manifest / preview-config
  if (rootContent.includes("easymotion-timeline.manifest.json")) {
    const manifest = readTimelineManifest(remotionSrcDir);
    const tl = manifest?.timeline;
    const fps =
      [tl?.fps, previewConfig?.fps].find(isValidTimelineNumber) ?? null;
    const fromTracks = deriveDurationFromTracks(tl?.tracks);
    const durationInFrames =
      [tl?.durationInFrames, previewConfig?.durationInFrames, fromTracks].find(
        isValidTimelineNumber,
      ) ?? null;
    const width =
      [tl?.width, previewConfig?.width].find(isValidTimelineNumber) ?? null;
    const height =
      [tl?.height, previewConfig?.height].find(isValidTimelineNumber) ?? null;

    if (durationInFrames) {
      return {
        id: compositionId,
        fps: fps ?? 30,
        width: width ?? 1920,
        height: height ?? 1080,
        durationInFrames,
      };
    }
  }

  const constants = collectNumericConstants(remotionSrcDir);
  const meta = parseCompositionMeta(rootContent, constants);
  return {
    id: compositionId,
    fps: isValidTimelineNumber(meta.fps) ? meta.fps : (previewConfig?.fps ?? 30),
    width: isValidTimelineNumber(meta.width)
      ? meta.width
      : (previewConfig?.width ?? 1920),
    height: isValidTimelineNumber(meta.height)
      ? meta.height
      : (previewConfig?.height ?? 1080),
    durationInFrames: isValidTimelineNumber(meta.durationInFrames)
      ? meta.durationInFrames
      : (previewConfig?.durationInFrames ?? 300),
  };
}

function importTimelineFromRemotionAst(remotionSrcDir, existingTimeline = null) {
  const rootPath = path.join(remotionSrcDir, "Root.tsx");
  if (!fs.existsSync(rootPath)) {
    throw new Error("E2501: Root.tsx not found");
  }

  const constants = collectNumericConstants(remotionSrcDir);
  const rootContent = readText(rootPath);
  const parsed = parseCompositionMeta(rootContent, constants);
  const previewConfig = readPreviewConfig(remotionSrcDir);
  const items = collectTimelineItems(remotionSrcDir, constants, {
    fps: isValidTimelineNumber(parsed.fps) ? parsed.fps : (previewConfig?.fps ?? 30),
    width: isValidTimelineNumber(parsed.width)
      ? parsed.width
      : (previewConfig?.width ?? 1920),
    height: isValidTimelineNumber(parsed.height)
      ? parsed.height
      : (previewConfig?.height ?? 1080),
    durationInFrames: isValidTimelineNumber(parsed.durationInFrames)
      ? parsed.durationInFrames
      : (previewConfig?.durationInFrames ?? 300),
  });
  const tracks = buildTracks(items);
  const { resolveTimelineMeta } = require("./timeline-meta");
  const meta = resolveTimelineMeta({
    composition: parsed,
    manifestTimeline: null,
    existingTimeline,
    previewConfig,
    tracks,
  });
  const { fingerprint } = fingerprintRemotionSrc(remotionSrcDir);

  return {
    timeline: {
      version: existingTimeline?.version ?? "1.0",
      fps: meta.fps,
      durationInFrames: meta.durationInFrames,
      width: meta.width,
      height: meta.height,
      tracks,
      remotionFingerprint: fingerprint,
      remotionSyncedAt: Date.now(),
      remotionSyncSource: "import",
    },
    stats: {
      trackCount: tracks.length,
      clipCount: tracks.reduce((sum, track) => sum + track.clips.length, 0),
      fingerprint,
    },
  };
}

module.exports = {
  importTimelineFromRemotionAst,
  readCompositionMetaFromRoot,
  fingerprintRemotionSrc,
  parseCompositionMeta,
  collectTimelineItems,
};
