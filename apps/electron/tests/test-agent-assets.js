const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createTimelineTools } = require("../src/main/agent/tools");
const assetService = require("../src/main/services/asset-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeManifest(projectRoot, assets) {
  const manifestPath = path.join(projectRoot, "assets", "manifest.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ version: 1, assets }, null, 2),
    "utf8",
  );
}

function buildAsset(id, overrides = {}) {
  return {
    id,
    name: `${id}.png`,
    originalName: `${id}.png`,
    type: "image",
    mimeType: "image/png",
    path: `assets/image/${id}.png`,
    publicPath: `/assets/image/${id}.png`,
    contentHash: id,
    sizeBytes: 12,
    width: 640,
    height: 360,
    durationInFrames: 90,
    isFavorite: false,
    usageCount: 0,
    importedAt: 1000,
    isDeleted: false,
    ...overrides,
  };
}

function buildTimeline() {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 120,
    width: 1280,
    height: 720,
    tracks: [],
  };
}

function findClip(timeline, clipId) {
  for (const track of timeline.tracks) {
    for (const clip of track.clips ?? []) {
      if (clip.id === clipId) return { track, clip };
    }
  }
  return null;
}

async function main() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-agent-assets-"));
  writeManifest(projectRoot, [
    buildAsset("logo", { name: "logo.png", isFavorite: true }),
    buildAsset("product", { name: "product.png" }),
    buildAsset("intro-video", {
      name: "intro.mp4",
      originalName: "intro.mp4",
      type: "video",
      mimeType: "video/mp4",
      path: "assets/video/intro-video.mp4",
      publicPath: "/assets/video/intro-video.mp4",
      durationInFrames: 150,
    }),
    buildAsset("deleted", { name: "deleted.png", isDeleted: true }),
  ]);

  const ctx = new TimelineContext(buildTimeline(), {
    projectPath: projectRoot,
    currentFrame: 12,
  });
  const tools = createTimelineTools(ctx);
  const toolNames = tools.map((tool) => tool.name);
  assert(toolNames.includes("listAssets"), "tools include listAssets");
  assert(toolNames.includes("placeAsset"), "tools include placeAsset");

  const listed = ctx.listAssets();
  assert(listed.count === 3, "listAssets excludes deleted assets");
  assert(listed.assets[0].id === "logo", "listAssets returns summarized assets");

  const images = ctx.listAssets({ type: "image" });
  assert(images.count === 2, "listAssets filters type");

  const favorites = ctx.listAssets({ favoriteOnly: true });
  assert(favorites.count === 1 && favorites.assets[0].id === "logo", "listAssets filters favorites");

  const queried = ctx.listAssets({ query: "prod" });
  assert(queried.count === 1 && queried.assets[0].id === "product", "listAssets filters query");

  let placed = await ctx.placeAsset({ assetId: "logo" });
  assert(placed.createdTrack, "placeAsset creates image track");
  assert(placed.startInFrames === 12, "placeAsset defaults to currentFrame");
  let located = findClip(ctx.timeline, placed.clipId);
  assert(located.track.type === "image", "placeAsset creates image clip on image track");
  assert(located.clip.source.assetId === "logo", "placeAsset writes asset source");
  assert(located.clip.style.objectFit === "contain", "placeAsset defaults objectFit contain");
  assert(located.clip.lastModifiedBy === "ai", "placeAsset marks ai modified");

  const usedLogo = assetService.getAssetById(projectRoot, "logo");
  assert(usedLogo.usageCount === 1, "placeAsset records usage");

  placed = await ctx.placeAsset({
    assetId: "product",
    startInFrames: 102,
    durationInFrames: 30,
    extendTimeline: true,
    position: { x: 100, y: 200 },
    scale: 0.5,
    objectFit: "cover",
  });
  assert(!placed.createdTrack, "placeAsset reuses existing image track");
  assert(placed.timelineExtended, "placeAsset can extend timeline");
  assert(ctx.timeline.durationInFrames === 132, "placeAsset extends timeline duration");
  located = findClip(ctx.timeline, placed.clipId);
  assert(located.clip.transform.position.x === 100, "placeAsset applies x position");
  assert(located.clip.transform.position.y === 200, "placeAsset applies y position");
  assert(located.clip.transform.scale === 0.5, "placeAsset applies scale");
  assert(located.clip.style.objectFit === "cover", "placeAsset applies objectFit");

  const videoCtx = new TimelineContext(buildTimeline(), {
    projectPath: projectRoot,
  });
  placed = await videoCtx.placeAsset({
    query: "intro",
    type: "video",
    startInFrames: 0,
    extendTimeline: true,
  });
  located = findClip(videoCtx.timeline, placed.clipId);
  assert(located.track.type === "video", "placeAsset query can place video");
  assert(placed.durationInFrames === 150, "placeAsset uses asset duration");

  let multipleThrown = false;
  try {
    await videoCtx.placeAsset({ query: ".png" });
  } catch (error) {
    multipleThrown = error.message.includes("匹配到多个素材");
  }
  assert(multipleThrown, "placeAsset asks for assetId when query has multiple matches");

  let missingThrown = false;
  try {
    await videoCtx.placeAsset({ assetId: "missing" });
  } catch (error) {
    missingThrown = error.message.includes("素材不存在");
  }
  assert(missingThrown, "placeAsset rejects missing asset");

  const lockedCtx = new TimelineContext(
    {
      ...buildTimeline(),
      tracks: [
        {
          id: "locked-image",
          name: "锁定图片",
          type: "image",
          order: 0,
          visible: true,
          locked: true,
          muted: false,
          solo: false,
          clips: [],
        },
      ],
    },
    { projectPath: projectRoot },
  );
  let lockedThrown = false;
  try {
    await lockedCtx.placeAsset({ assetId: "logo", trackId: "locked-image" });
  } catch (error) {
    lockedThrown = error.message.includes("锁定");
  }
  assert(lockedThrown, "placeAsset rejects locked target track");

  const overlapCtx = new TimelineContext(
    {
      ...buildTimeline(),
      tracks: [
        {
          id: "image-track",
          name: "图片",
          type: "image",
          order: 0,
          visible: true,
          locked: false,
          muted: false,
          solo: false,
          clips: [
            {
              id: "existing",
              type: "image",
              name: "已有图片",
              startInFrames: 0,
              durationInFrames: 60,
              source: { kind: "asset", assetId: "existing" },
              keyframes: [],
            },
          ],
        },
      ],
    },
    { projectPath: projectRoot },
  );
  let overlapThrown = false;
  try {
    await overlapCtx.placeAsset({ assetId: "logo", startInFrames: 30 });
  } catch (error) {
    overlapThrown = error.message.includes("重叠");
  }
  assert(overlapThrown, "placeAsset rejects overlapping clip");

  fs.rmSync(projectRoot, { recursive: true, force: true });
  console.log("test-agent-assets: passed");
}

main().catch((error) => {
  console.error("test-agent-assets: FAIL", error);
  process.exit(1);
});
