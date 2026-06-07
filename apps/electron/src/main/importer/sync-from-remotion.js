const fs = require("node:fs");
const path = require("node:path");
const { fingerprintRemotionSrc } = require("./remotion-fingerprint");
const { evaluateMainComposition } = require("./remotion-composition");
const {
  readTimelineManifest,
  writeTimelineManifest,
  extractTracksFromManifest,
} = require("./timeline-manifest");
const {
  importTimelineFromRemotionAst,
  readCompositionMetaFromRoot,
} = require("./remotion-to-timeline");
const { resolveTimelineMeta, readPreviewConfig } = require("./timeline-meta");

/** 从 selectComposition() 返回值提取 EasyMotion 轨道（经 defaultProps 注入，随 bundle 求值） */
function extractTracksFromComposition(composition) {
  const easymotion = composition?.defaultProps?.easymotion;
  if (!easymotion?.timeline?.tracks?.length) return null;
  return easymotion.timeline.tracks;
}

function shouldBundleForNativeSync(remotionSrcDir) {
  const rootPath = path.join(remotionSrcDir, "Root.tsx");
  if (!fs.existsSync(rootPath)) return false;

  const content = fs.readFileSync(rootPath, "utf8");
  // 生成器项目：轨道已在 manifest，Root 静态引用 manifest，无需 bundle
  if (content.includes("easymotion-timeline.manifest.json")) {
    return false;
  }
  // 仅当存在动态 calculateMetadata 且无法从磁盘 manifest 还原时才 bundle
  return content.includes("calculateMetadata");
}

function mergeTimeline({
  existingTimeline,
  composition,
  manifestTimeline,
  previewConfig,
  tracks,
  fingerprint,
  syncSource,
}) {
  const base = manifestTimeline ?? existingTimeline ?? {};
  const meta = resolveTimelineMeta({
    composition,
    manifestTimeline: base,
    existingTimeline,
    previewConfig,
    tracks,
  });

  return {
    version: base.version ?? "1.0",
    fps: meta.fps,
    durationInFrames: meta.durationInFrames,
    width: meta.width,
    height: meta.height,
    tracks,
    snapGrid: base.snapGrid,
    remotionFingerprint: fingerprint,
    remotionSyncedAt: Date.now(),
    remotionSyncSource: syncSource,
  };
}

function countClips(tracks) {
  return tracks.reduce((sum, track) => {
    if (track.type === "group") {
      return (
        sum +
        (track.children ?? []).reduce((n, child) => n + (child.clips?.length ?? 0), 0)
      );
    }
    return sum + (track.clips?.length ?? 0);
  }, 0);
}

/**
 * 同步优先级（先快后慢）：
 * 1. easymotion-timeline.manifest.json → 磁盘 manifest
 * 2. AST 解析 MainSequence（手写 Remotion / Newsletter 等）
 * 3. Root.tsx 静态解析 Composition 元数据（fps/尺寸/时长）
 * 4. 可选：bundle + selectComposition（仅动态 calculateMetadata 且无 manifest 时）
 */
async function syncTimelineFromRemotion({
  remotionDir,
  remotionSrcDir,
  existingTimeline,
  evaluateComposition = evaluateMainComposition,
}) {
  const { fingerprint } = fingerprintRemotionSrc(remotionSrcDir);
  const manifest = readTimelineManifest(remotionSrcDir);
  const compositionId = manifest?.compositionId ?? "Main";

  let composition = readCompositionMetaFromRoot(remotionSrcDir, compositionId);
  let compositionError = null;
  let bundlerUsed = false;

  let tracks = extractTracksFromManifest(manifest);
  let syncSource = tracks?.length ? "manifest" : null;

  if (!tracks?.length) {
    const astResult = importTimelineFromRemotionAst(remotionSrcDir, existingTimeline);
    tracks = astResult.timeline.tracks;
    if (tracks?.length) {
      syncSource = "ast";
    }
  }

  if (shouldBundleForNativeSync(remotionSrcDir)) {
    bundlerUsed = true;
    try {
      const bundled = await evaluateComposition(remotionDir, { compositionId });
      composition = bundled;
      const nativeTracks = extractTracksFromComposition(bundled);
      if (nativeTracks?.length) {
        tracks = nativeTracks;
        syncSource = "native";
      }
    } catch (error) {
      compositionError = error?.message ?? String(error);
    }
  }

  if (composition && tracks?.length) {
    if (extractTracksFromComposition(composition)) {
      syncSource = "native";
    } else if (syncSource === "manifest") {
      syncSource = bundlerUsed ? "native+manifest" : "manifest";
    } else if (syncSource === "ast") {
      syncSource = bundlerUsed ? "native+ast" : "ast";
    }
  }

  const previewConfig = readPreviewConfig(remotionSrcDir);
  const timeline = mergeTimeline({
    existingTimeline,
    composition,
    manifestTimeline: manifest?.timeline,
    previewConfig,
    tracks: tracks ?? [],
    fingerprint,
    syncSource: syncSource ?? "empty",
  });

  if (tracks?.length) {
    writeTimelineManifest(remotionSrcDir, timeline, syncSource ?? "import");
  }

  return {
    timeline,
    stats: {
      trackCount: timeline.tracks.length,
      clipCount: countClips(timeline.tracks),
      fingerprint,
      syncSource: syncSource ?? "empty",
      compositionResolved: Boolean(composition),
      compositionError,
      bundlerUsed,
      manifestUsed: Boolean(manifest?.timeline?.tracks?.length),
    },
  };
}

module.exports = {
  syncTimelineFromRemotion,
  mergeTimeline,
  shouldBundleForNativeSync,
};
