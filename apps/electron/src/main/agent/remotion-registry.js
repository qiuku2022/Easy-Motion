const fs = require("node:fs");
const path = require("node:path");
const { resolveAnimationTrack } = require("./place-preset");
const { createClip, needsUserOverwriteConfirm } = require("./timeline-ops");

const CUSTOM_REGISTRY_REL = "presets/custom-registry.ts";
const COMPONENT_DIR = "components/custom";

const EMPTY_REGISTRY = `import type { FC } from "react";

/** Agent-maintained custom component registry. Do not edit MainSequence.tsx manually. */
export const CUSTOM_COMPONENT_MAP: Record<string, FC> = {};

export function resolveCustomComponent(name: string): FC | undefined {
  return CUSTOM_COMPONENT_MAP[name];
}
`;

function assertValidComponentName(name) {
  const value = String(name ?? "").trim();
  if (!/^[A-Z][A-Za-z0-9]*$/.test(value)) {
    throw new Error(`E2415: 无效组件名 ${name}（须 PascalCase）`);
  }
  return value;
}

function componentRelativePath(componentName) {
  return `${COMPONENT_DIR}/${componentName}.tsx`;
}

function listRegisteredComponents(registryContent) {
  const names = new Set();
  const importRe =
    /import\s*\{\s*(\w+)\s*\}\s*from\s*"\.\.\/components\/custom\/\w+"/g;
  let match = importRe.exec(registryContent);
  while (match) {
    names.add(match[1]);
    match = importRe.exec(registryContent);
  }

  const mapMatch = registryContent.match(
    /CUSTOM_COMPONENT_MAP[^=]*=\s*\{([^}]*)\}/s
  );
  if (mapMatch) {
    for (const line of mapMatch[1].split("\n")) {
      const key = line.trim().replace(/,$/, "").trim();
      if (/^[A-Za-z]\w*$/.test(key)) {
        names.add(key);
      }
    }
  }

  return [...names].sort();
}

function buildRegistryContent(componentNames) {
  const names = [...new Set(componentNames)].sort();
  const imports = names
    .map((name) => `import { ${name} } from "../components/custom/${name}";`)
    .join("\n");
  const mapBody = names.map((name) => `  ${name},`).join("\n");

  return `import type { FC } from "react";

/** Agent-maintained custom component registry. Do not edit MainSequence.tsx manually. */
${imports ? `${imports}\n\n` : ""}export const CUSTOM_COMPONENT_MAP: Record<string, FC> = {
${mapBody}
};

export function resolveCustomComponent(name: string): FC | undefined {
  return CUSTOM_COMPONENT_MAP[name];
}
`;
}

function readRegistryContent(srcDir) {
  const absolute = path.join(srcDir, CUSTOM_REGISTRY_REL);
  if (!fs.existsSync(absolute)) {
    return EMPTY_REGISTRY;
  }
  return fs.readFileSync(absolute, "utf8");
}

function collectComponentUsages(timeline, componentName) {
  const usages = [];
  const scanTrack = (track, parentGroup = null) => {
    for (const clip of track.clips ?? []) {
      if (clip.source?.component !== componentName) continue;
      usages.push({
        clipId: clip.id,
        trackId: track.id,
        trackName: track.name,
        parentGroupId: parentGroup?.id ?? null,
        startInFrames: clip.startInFrames,
        durationInFrames: clip.durationInFrames,
        trackLocked: Boolean(track.locked),
        needsOverwriteConfirm: needsUserOverwriteConfirm(clip),
      });
    }
  };

  for (const track of timeline?.tracks ?? []) {
    scanTrack(track);
    for (const child of track.children ?? []) {
      scanTrack(child, track);
    }
  }
  return usages;
}

function upsertRegistryEntry(srcDir, componentName) {
  const current = readRegistryContent(srcDir);
  const names = listRegisteredComponents(current);
  if (!names.includes(componentName)) {
    names.push(componentName);
  }
  return buildRegistryContent(names);
}

function listCustomComponents(remotionCtx, timelineCtx, params = {}) {
  const registryContent = readRegistryContent(remotionCtx.srcDir);
  const names = listRegisteredComponents(registryContent);
  return {
    components: names.map((componentName) => {
      const relativePath = componentRelativePath(componentName);
      const filePath = path.join(remotionCtx.srcDir, relativePath);
      return {
        componentName,
        path: relativePath,
        registered: true,
        fileExists: fs.existsSync(filePath),
        ...(params.includeTimelineUsage && timelineCtx
          ? { clipUsages: collectComponentUsages(timelineCtx.timeline, componentName) }
          : {}),
      };
    }),
    count: names.length,
  };
}

function applyCustomComponentToTimeline(timelineCtx, params) {
  const componentName = assertValidComponentName(params.componentName);
  const durationInFrames =
    typeof params.durationInFrames === "number"
      ? params.durationInFrames
      : timelineCtx.timeline.durationInFrames;

  const { timeline: withTrack, trackId } = resolveAnimationTrack(
    timelineCtx.timeline,
    params.trackId
  );

  const startInFrames = Math.max(
    0,
    Math.min(
      typeof params.startInFrames === "number"
        ? params.startInFrames
        : Number(timelineCtx.meta.currentFrame ?? 0),
      withTrack.durationInFrames - 1
    )
  );

  const clipDuration = Math.max(
    1,
    Math.min(durationInFrames, withTrack.durationInFrames - startInFrames)
  );

  const source = {
    kind: "component",
    component: componentName,
  };
  const parameters = params.parameters;
  if (parameters && typeof parameters === "object" && Object.keys(parameters).length > 0) {
    source.props = parameters;
  }

  const result = createClip(withTrack, {
    trackId,
    name: componentName,
    startInFrames,
    durationInFrames: clipDuration,
    source,
  });

  timelineCtx.timeline = result.timeline;
  timelineCtx.markChanged();

  return {
    clipId: result.clip.id,
    trackId,
  };
}

function registerCustomComponent(remotionCtx, timelineCtx, params) {
  const componentName = assertValidComponentName(params.componentName);
  const relativePath = componentRelativePath(componentName);
  const applyToTimeline = params.applyToTimeline !== false;

  remotionCtx.writeFile(relativePath, params.content, {
    reason: `register ${componentName}`,
  });

  const registryContent = upsertRegistryEntry(remotionCtx.srcDir, componentName);
  remotionCtx.writeFile(CUSTOM_REGISTRY_REL, registryContent, {
    reason: `register ${componentName} in custom-registry`,
  });

  let timelineResult = null;
  if (applyToTimeline && timelineCtx) {
    timelineResult = applyCustomComponentToTimeline(timelineCtx, {
      componentName,
      parameters: params.parameters,
      startInFrames: params.startInFrames,
      durationInFrames: params.durationInFrames,
      trackId: params.trackId,
    });
    timelineCtx.logChange({
      op: "registerCustomComponent",
      componentName,
      clipId: timelineResult.clipId,
    });
  }

  remotionCtx.logChange({
    op: "registerCustomComponent",
    componentName,
    path: relativePath,
    clipId: timelineResult?.clipId ?? null,
    appliedToTimeline: applyToTimeline,
  });

  return {
    path: relativePath,
    componentName,
    clipId: timelineResult?.clipId ?? null,
    trackId: timelineResult?.trackId ?? null,
  };
}

function unregisterCustomComponent(remotionCtx, timelineCtx, params = {}) {
  const componentName = assertValidComponentName(params.componentName);
  const relativePath = componentRelativePath(componentName);
  const registryContent = readRegistryContent(remotionCtx.srcDir);
  const names = listRegisteredComponents(registryContent);
  const registered = names.includes(componentName);
  const filePath = path.join(remotionCtx.srcDir, relativePath);
  const fileExists = fs.existsSync(filePath);
  const usages = timelineCtx
    ? collectComponentUsages(timelineCtx.timeline, componentName)
    : [];

  if (!registered && !fileExists && usages.length === 0) {
    throw new Error(`自定义组件不存在: ${componentName}`);
  }
  if (usages.length > 0 && params.removeTimelineClips !== true) {
    throw new Error(
      `组件 ${componentName} 仍被 ${usages.length} 个时间线片段引用；请先设置 removeTimelineClips=true`
    );
  }
  if (
    usages.length > 0 &&
    params.removeTimelineClips === true &&
    params.confirmDeleteUsages !== true
  ) {
    throw new Error("删除引用该组件的时间线片段需要 confirmDeleteUsages=true");
  }
  if (params.removeTimelineClips && usages.some((usage) => usage.trackLocked)) {
    throw new Error("引用该组件的片段位于锁定轨道，无法删除");
  }
  if (
    params.removeTimelineClips &&
    !timelineCtx?.meta?.confirmOverwrite &&
    usages.some((usage) => usage.needsOverwriteConfirm)
  ) {
    throw new Error("E2010: 有引用片段近期被用户手动修改，需要确认后才能删除");
  }

  let removedFromRegistry = false;
  if (registered) {
    const nextNames = names.filter((name) => name !== componentName);
    remotionCtx.writeFile(CUSTOM_REGISTRY_REL, buildRegistryContent(nextNames), {
      reason: `unregister ${componentName} from custom-registry`,
    });
    removedFromRegistry = true;
  }

  let deletedFile = false;
  if (params.deleteFile) {
    deletedFile = remotionCtx.deleteFile(relativePath, {
      reason: `delete custom component ${componentName}`,
    }).deleted;
  }

  const removedClipIds = [];
  if (params.removeTimelineClips && timelineCtx) {
    for (const usage of usages) {
      timelineCtx.deleteClip({ clipId: usage.clipId });
      removedClipIds.push(usage.clipId);
    }
  }

  remotionCtx.logChange({
    op: "unregisterCustomComponent",
    componentName,
    path: relativePath,
    removedFromRegistry,
    deletedFile,
    removedClipIds,
  });

  return {
    componentName,
    path: relativePath,
    removedFromRegistry,
    deletedFile,
    removedClipIds,
    usageCount: usages.length,
  };
}

module.exports = {
  CUSTOM_REGISTRY_REL,
  EMPTY_REGISTRY,
  assertValidComponentName,
  componentRelativePath,
  listRegisteredComponents,
  buildRegistryContent,
  readRegistryContent,
  collectComponentUsages,
  upsertRegistryEntry,
  listCustomComponents,
  applyCustomComponentToTimeline,
  registerCustomComponent,
  unregisterCustomComponent,
};
