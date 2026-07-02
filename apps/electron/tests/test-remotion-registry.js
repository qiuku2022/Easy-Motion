const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { RemotionContext } = require("../src/main/agent/remotion-context");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const {
  buildRegistryContent,
  listRegisteredComponents,
  listCustomComponents,
  upsertRegistryEntry,
  registerCustomComponent,
  unregisterCustomComponent,
} = require("../src/main/agent/remotion-registry");
const { fingerprintRemotionSrc } = require("../src/main/importer/remotion-fingerprint");
const { ensureCustomComponentSupport } = require("../src/main/services/preview-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const VALID_TSX = `import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export type RedBgProps = { color?: string };

export const RedBg: React.FC<RedBgProps> = ({ color = "#ff0000" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
};
`;

const BLUE_TSX = VALID_TSX.replace("RedBg", "BlueBg").replace("#ff0000", "#0000ff");

function createFixtureRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-remotion-registry-"));
  const projectPath = path.join(tmpRoot, "Demo.em");
  const subprojectPath = "subprojects/default";
  const remotionDir = path.join(projectPath, subprojectPath, "remotion");
  const srcDir = path.join(remotionDir, "src");

  fs.mkdirSync(path.join(srcDir, "components", "custom"), { recursive: true });
  fs.mkdirSync(path.join(srcDir, "presets"), { recursive: true });
  fs.writeFileSync(
    path.join(remotionDir, "package.json"),
    JSON.stringify({ dependencies: { remotion: "4.0.269", react: "^18.3.1" } }, null, 2),
    "utf8"
  );
  fs.writeFileSync(
    path.join(srcDir, "components", "MainSequence.tsx"),
    'import { flattenClipsForPreview } from "../lib/x";\nexport const MainSequence = () => null;\n',
    "utf8"
  );

  return { tmpRoot, projectPath, subprojectPath, remotionDir, srcDir };
}

function main() {
  const { tmpRoot, projectPath, subprojectPath, remotionDir, srcDir } = createFixtureRoot();

  const empty = buildRegistryContent([]);
  assert(empty.includes("CUSTOM_COMPONENT_MAP"), "empty registry map");
  assert(!empty.includes("import {"), "empty registry has no imports");

  const one = buildRegistryContent(["RedBg"]);
  assert(one.includes('import { RedBg } from "../components/custom/RedBg"'), "registry import");
  assert(one.includes("RedBg,"), "registry map entry");

  const listed = listRegisteredComponents(one);
  assert(listed.join(",") === "RedBg", "listRegisteredComponents");

  const upserted = upsertRegistryEntry(srcDir, "RedBg");
  fs.writeFileSync(path.join(srcDir, "presets/custom-registry.ts"), upserted, "utf8");
  const upserted2 = upsertRegistryEntry(srcDir, "BlueBg");
  assert(listRegisteredComponents(upserted2).join(",") === "BlueBg,RedBg", "upsert adds second");

  const timeline = {
    version: "1.0",
    fps: 30,
    durationInFrames: 90,
    width: 1280,
    height: 720,
    tracks: [],
  };
  const timelineCtx = new TimelineContext(JSON.parse(JSON.stringify(timeline)), {
    subprojectName: "默认",
    projectPath,
    subprojectPath,
    currentFrame: 0,
  });
  const remotionCtx = new RemotionContext({ projectPath, subprojectPath });

  const result = registerCustomComponent(remotionCtx, timelineCtx, {
    componentName: "RedBg",
    content: VALID_TSX,
    parameters: { color: "#ff0000" },
    applyToTimeline: true,
  });
  assert(result.clipId, "registerCustomComponent clipId");
  assert(fs.existsSync(path.join(srcDir, "components/custom/RedBg.tsx")), "tsx written");
  const registry = fs.readFileSync(path.join(srcDir, "presets/custom-registry.ts"), "utf8");
  assert(registry.includes("RedBg"), "registry contains RedBg");
  assert(timelineCtx.changed, "timeline changed");
  assert(remotionCtx.changed, "remotion changed");
  const animationTrack = timelineCtx.timeline.tracks.find((t) => t.type === "animation");
  assert(animationTrack, "animation track created");
  assert(animationTrack.clips.length === 1, "clip on animation track");
  assert(animationTrack.clips[0].source.component === "RedBg", "clip component name");

  registerCustomComponent(remotionCtx, timelineCtx, {
    componentName: "BlueBg",
    content: BLUE_TSX,
    applyToTimeline: false,
  });
  const registry2 = fs.readFileSync(path.join(srcDir, "presets/custom-registry.ts"), "utf8");
  assert(registry2.includes("BlueBg"), "second component in registry");
  assert(registry2.includes("RedBg"), "first component retained");

  const listedCustom = listCustomComponents(remotionCtx, timelineCtx, {
    includeTimelineUsage: true,
  });
  const redListed = listedCustom.components.find((item) => item.componentName === "RedBg");
  assert(redListed?.clipUsages?.length === 1, "listCustomComponents includes usage");
  assert(redListed.fileExists, "listCustomComponents reports file exists");

  let usageThrown = false;
  try {
    unregisterCustomComponent(remotionCtx, timelineCtx, {
      componentName: "RedBg",
    });
  } catch (error) {
    usageThrown = error.message.includes("仍被 1 个时间线片段引用");
  }
  assert(usageThrown, "unregisterCustomComponent rejects existing usages");

  let confirmThrown = false;
  try {
    unregisterCustomComponent(remotionCtx, timelineCtx, {
      componentName: "RedBg",
      removeTimelineClips: true,
    });
  } catch (error) {
    confirmThrown = error.message.includes("confirmDeleteUsages");
  }
  assert(confirmThrown, "unregisterCustomComponent requires delete confirmation");

  const blueRemoved = unregisterCustomComponent(remotionCtx, timelineCtx, {
    componentName: "BlueBg",
  });
  assert(blueRemoved.removedFromRegistry, "unregisterCustomComponent removes unused registry entry");
  assert(!blueRemoved.deletedFile, "unregisterCustomComponent keeps file by default");

  const redRemoved = unregisterCustomComponent(remotionCtx, timelineCtx, {
    componentName: "RedBg",
    removeTimelineClips: true,
    confirmDeleteUsages: true,
    deleteFile: true,
  });
  assert(redRemoved.removedFromRegistry, "unregisterCustomComponent removes registry entry");
  assert(redRemoved.deletedFile, "unregisterCustomComponent deletes TSX file");
  assert(redRemoved.removedClipIds.length === 1, "unregisterCustomComponent removes timeline clips");
  assert(!fs.existsSync(path.join(srcDir, "components/custom/RedBg.tsx")), "RedBg file deleted");
  assert(
    !timelineCtx.timeline.tracks.some((track) =>
      (track.clips ?? []).some((clip) => clip.source?.component === "RedBg")
    ),
    "RedBg timeline clip deleted"
  );

  const beforeFp = fingerprintRemotionSrc(srcDir).fingerprint;
  fs.writeFileSync(
    path.join(srcDir, "components/custom/Noise.tsx"),
    "export const Noise = () => null;\n",
    "utf8"
  );
  const afterFp = fingerprintRemotionSrc(srcDir).fingerprint;
  assert(beforeFp === afterFp, "custom/ files excluded from fingerprint");

  const patched = ensureCustomComponentSupport(remotionDir);
  assert(patched, "ensureCustomComponentSupport updates legacy project");
  const mainSeq = fs.readFileSync(path.join(srcDir, "components/MainSequence.tsx"), "utf8");
  assert(mainSeq.includes("resolveCustomComponent"), "MainSequence patched");

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log("test-remotion-registry: passed");
}

main();
