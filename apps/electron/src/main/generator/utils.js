function escapeJsxString(value) {
  return JSON.stringify(value);
}

function renderJsxProp(key, value) {
  if (value && typeof value === "object" && value.__staticFile) {
    return `${key}={staticFile(${JSON.stringify(value.__staticFile)})}`;
  }
  return `${key}={${JSON.stringify(value)}}`;
}

function renderJsxProps(props) {
  return Object.entries(props)
    .map(([key, value]) => `          ${renderJsxProp(key, value)}`)
    .join("\n");
}

const path = require("node:path");

const LAYER_COMPONENT_MAP = {
  text: "TextLayer",
  image: "ImageLayer",
  shape: "ShapeLayer",
  video: "VideoLayer",
  audio: "AudioLayer",
  chart: "ChartLayer",
};

/** 时间线 animation 片段引用的手写 Remotion 组件 */
const COMPONENT_MODULE_MAP = {
  NewsletterBackground: "./newsletter-design/NewsletterBackground",
  GradientBackground: "./newsletter-design/GradientBackground",
};

let PRESET_COMPONENT_REGISTRY = {};
try {
  PRESET_COMPONENT_REGISTRY = require(
    path.join(__dirname, "../../../resources/presets/component-registry.json"),
  );
} catch {
  /* preset bundle optional during partial checkout */
}

function isComponentAnimationClip(track, clip) {
  return (
    track.type === "animation" &&
    clip.source?.kind === "component" &&
    typeof clip.source.component === "string" &&
    clip.source.component.length > 0
  );
}

function resolveComponentModule(componentRef) {
  const baseName = componentRef.includes("/")
    ? componentRef.split("/").pop()
    : componentRef;
  if (PRESET_COMPONENT_REGISTRY[baseName]) {
    return {
      componentName: baseName,
      importPath: PRESET_COMPONENT_REGISTRY[baseName].importPath,
    };
  }
  if (COMPONENT_MODULE_MAP[baseName]) {
    return { componentName: baseName, importPath: COMPONENT_MODULE_MAP[baseName] };
  }
  if (baseName.endsWith("Layer")) {
    return { componentName: baseName, importPath: `./layers/${baseName}` };
  }
  return {
    componentName: baseName,
    importPath: `./newsletter-design/${baseName}`,
  };
}

function getLayerComponent(trackType) {
  const component = LAYER_COMPONENT_MAP[trackType];
  if (!component) {
    throw new Error(`unsupported track type for generator: ${trackType}`);
  }
  return component;
}

function buildClipProps(track, clip) {
  const base = {
    clipId: clip.id,
    transform: clip.transform,
    keyframes: clip.keyframes ?? [],
    inAnimation: clip.animations?.in,
    outAnimation: clip.animations?.out,
  };

  if (track.type === "text") {
    return {
      ...base,
      source: clip.source,
      style: clip.style,
    };
  }

  if (track.type === "image" || track.type === "video") {
    const publicPath =
      clip.source?.kind === "asset"
        ? clip.source.publicPath
        : (clip.source?.path ?? "");
    return {
      ...base,
      src: publicPath ? { __staticFile: publicPath } : "",
      style: clip.style ?? {},
    };
  }

  if (track.type === "audio") {
    const publicPath =
      clip.source?.kind === "asset"
        ? clip.source.publicPath
        : (clip.source?.path ?? "");
    return {
      ...base,
      src: publicPath ? { __staticFile: publicPath } : "",
    };
  }

  if (track.type === "shape") {
    return {
      ...base,
      source: clip.source,
      style: clip.style ?? {},
    };
  }

  if (track.type === "chart") {
    return {
      ...base,
      source: clip.source,
      style: clip.style ?? {},
    };
  }

  throw new Error(`clip type not supported: ${track.type}`);
}

module.exports = {
  escapeJsxString,
  renderJsxProps,
  renderJsxProp,
  getLayerComponent,
  buildClipProps,
  isComponentAnimationClip,
  resolveComponentModule,
};
