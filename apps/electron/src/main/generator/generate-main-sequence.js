const {
  getLayerComponent,
  buildClipProps,
  renderJsxProps,
  isComponentAnimationClip,
  resolveComponentModule,
} = require("./utils");
const { flattenTracksForCompile } = require("./flatten-tracks");

function collectImports(tracks, _durationInFrames) {
  const layerSet = new Set();
  const componentModules = new Map();

  for (const { track, clip } of flattenClipItems(tracks)) {
    if (isComponentAnimationClip(track, clip)) {
      const resolved = resolveComponentModule(clip.source.component);
      componentModules.set(resolved.componentName, resolved.importPath);
      continue;
    }
    if (LAYER_TYPES.has(track.type)) {
      layerSet.add(getLayerComponent(track.type));
    }
  }

  const lines = [];
  for (const layer of [...layerSet].sort()) {
    lines.push(`import { ${layer} } from "./layers/${layer}";`);
  }
  for (const [name, importPath] of [...componentModules.entries()].sort()) {
    lines.push(`import { ${name} } from "${importPath}";`);
  }
  return lines.join("\n");
}

const LAYER_TYPES = new Set(["text", "image", "shape", "video", "audio", "chart"]);

function flattenClipItems(tracks) {
  const items = [];
  for (const track of flattenTracksForCompile(tracks)) {
    for (const clip of track.clips ?? []) {
      items.push({ track, clip });
    }
  }
  return items;
}

function renderComponentClip(track, clip, durationInFrames) {
  const componentName = resolveComponentModule(clip.source.component).componentName;
  const fullDuration =
    clip.startInFrames === 0 && clip.durationInFrames >= durationInFrames;

  if (fullDuration) {
    return `      {/* Track: ${track.name} | Clip: ${clip.name} */}
      <${componentName} />`;
  }

  return `      {/* Track: ${track.name} | Clip: ${clip.name} */}
      <Sequence from={${clip.startInFrames}} durationInFrames={${clip.durationInFrames}}>
        <${componentName} />
      </Sequence>`;
}

function renderLayerClip(track, clip) {
  const component = getLayerComponent(track.type);
  const props = buildClipProps(track, clip);
  const propsLiteral = renderJsxProps(props);

  return `      {/* Track: ${track.name} | Clip: ${clip.name} */}
      <Sequence from={${clip.startInFrames}} durationInFrames={${clip.durationInFrames}}>
        <${component}
${propsLiteral}
        />
      </Sequence>`;
}

function generateMainSequence(timeline) {
  const items = flattenClipItems(timeline.tracks);
  const componentBlocks = [];
  const layerBlocks = [];

  for (const { track, clip } of items) {
    if (isComponentAnimationClip(track, clip)) {
      componentBlocks.push(renderComponentClip(track, clip, timeline.durationInFrames));
      continue;
    }
    if (!LAYER_TYPES.has(track.type)) {
      throw new Error(`unsupported track type for generator: ${track.type}`);
    }
    layerBlocks.push(renderLayerClip(track, clip));
  }

  const clipBlocks = [...componentBlocks, ...layerBlocks].join("\n\n");
  const imports = collectImports(timeline.tracks, timeline.durationInFrames);

  return `import { AbsoluteFill, Sequence, staticFile } from "remotion";
${imports}

export const MainSequence: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#121212" }}>
${clipBlocks || "      {/* empty timeline */}"}
    </AbsoluteFill>
  );
};
`;
}

module.exports = { generateMainSequence };
