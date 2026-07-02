const { randomUUID } = require("node:crypto");
const { validateTimeline } = require("@easymotion/shared");
const { needsUserOverwriteConfirm } = require("./conflict");

const VALID_KEYFRAME_EASING = [
  "linear",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "spring",
];
const VALID_KEYFRAME_INTERPOLATION = ["linear", "bezier", "hold"];

function newId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function findTrackById(tracks, trackId) {
  for (const track of tracks) {
    if (track.id === trackId) return track;
    if (track.children) {
      for (const child of track.children) {
        if (child.id === trackId) return child;
      }
    }
  }
  return null;
}

function findClipLocation(tracks, clipId) {
  for (const track of tracks) {
    for (const clip of track.clips ?? []) {
      if (clip.id === clipId) {
        return { track, clip };
      }
    }
    if (track.children) {
      for (const child of track.children) {
        for (const clip of child.clips ?? []) {
          if (clip.id === clipId) {
            return { track: child, clip, parentGroup: track };
          }
        }
      }
    }
  }
  return null;
}

function patchTrack(timeline, trackId, updater) {
  let found = false;

  const tracks = timeline.tracks.map((track) => {
    if (track.id === trackId) {
      found = true;
      return updater(track);
    }
    if (!track.children?.length) return track;

    let childChanged = false;
    const children = track.children.map((child) => {
      if (child.id !== trackId) return child;
      childChanged = true;
      found = true;
      return updater(child);
    });
    return childChanged ? { ...track, children } : track;
  });

  if (!found) {
    throw new Error(`轨道不存在: ${trackId}`);
  }

  const next = { ...timeline, tracks };
  validateTimeline(next);
  return next;
}

function getClipRange(clip) {
  return {
    start: clip.startInFrames,
    end: clip.startInFrames + clip.durationInFrames,
  };
}

function hasOverlapOnTrack(track, candidateRange, excludeClipId = null) {
  return (track.clips ?? []).some((clip) => {
    if (excludeClipId && clip.id === excludeClipId) return false;
    const range = getClipRange(clip);
    return candidateRange.start < range.end && candidateRange.end > range.start;
  });
}

function getMaxClipEnd(tracks = []) {
  let max = 0;
  for (const track of tracks) {
    for (const clip of track.clips ?? []) {
      max = Math.max(max, clip.startInFrames + clip.durationInFrames);
    }
    if (track.children?.length) {
      max = Math.max(max, getMaxClipEnd(track.children));
    }
  }
  return max;
}

function assetTrackType(assetType) {
  if (assetType === "image") return "image";
  if (assetType === "video") return "video";
  if (assetType === "audio") return "audio";
  throw new Error(`不支持的素材类型: ${assetType}`);
}

function defaultTrackName(type) {
  const names = {
    image: "图片",
    video: "视频",
    audio: "音频",
  };
  return names[type] ?? type;
}

function findFirstTrackByType(tracks, type) {
  for (const track of tracks) {
    if (track.type === type && !track.locked) return track;
    for (const child of track.children ?? []) {
      if (child.type === type && !child.locked) return child;
    }
  }
  return null;
}

function createTrack(timeline, { name, type, order }) {
  const maxOrder = timeline.tracks.reduce((max, track) => Math.max(max, track.order), -1);
  const track = {
    id: newId("track"),
    name,
    type,
    order: typeof order === "number" ? order : maxOrder + 1,
    visible: true,
    locked: false,
    muted: false,
    clips: [],
  };

  if (type === "group") {
    track.children = [];
    track.collapsed = false;
  }

  const tracks = [...timeline.tracks, track]
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  const next = { ...timeline, tracks };
  validateTimeline(next);
  return { timeline: next, track };
}

function createClip(timeline, params) {
  const {
    trackId,
    name,
    startInFrames,
    durationInFrames,
    source,
    transform,
    style,
    animations,
  } = params;

  const target = findTrackById(timeline.tracks, trackId);
  if (!target) {
    throw new Error(`轨道不存在: ${trackId}`);
  }
  if (target.type === "group") {
    throw new Error("不能在 group 轨道上直接创建片段，请使用子轨道");
  }
  if (target.locked) {
    throw new Error("轨道已锁定");
  }

  const start = Math.max(0, Math.min(startInFrames, timeline.durationInFrames - 1));
  const duration = Math.max(
    1,
    Math.min(durationInFrames, timeline.durationInFrames - start)
  );

  const clip = {
    id: newId("clip"),
    type: target.type,
    name,
    startInFrames: start,
    durationInFrames: duration,
    source:
      source ??
      (target.type === "shape"
        ? {
            kind: "inline",
            shape: "rect",
            width: timeline.width,
            height: timeline.height,
          }
        : { kind: "inline", content: name }),
    transform: transform ?? {
      position: { x: timeline.width / 2, y: timeline.height / 2 },
      scale: 1,
      rotation: 0,
      opacity: 1,
    },
    style: style ?? {},
    keyframes: [],
    ...(animations ? { animations } : {}),
  };

  const next = patchTrack(timeline, trackId, (track) => ({
    ...track,
    clips: [...(track.clips ?? []), clip],
  }));

  return { timeline: next, clip };
}

function setAnimation(timeline, { clipId, animationType, config, confirmOverwrite = false }) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }

  if (needsUserOverwriteConfirm(located.clip) && !confirmOverwrite) {
    throw new Error("E2010: 您手动调整了此片段，需要确认后才能覆盖");
  }

  const key = animationType === "out" ? "out" : "in";
  const next = patchTrack(timeline, located.track.id, (track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId) return clip;
      return markClipAiModified({
        ...clip,
        animations: {
          ...(clip.animations ?? {}),
          [key]: config,
        },
      });
    }),
  }));

  return { timeline: next, clipId };
}

function scoreMatch(text, query) {
  const hay = String(text ?? "").toLowerCase();
  const needle = String(query ?? "").toLowerCase().trim();
  if (!needle) return 0;
  if (hay === needle) return 1;
  if (hay.includes(needle)) return 0.85;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const hits = tokens.filter((token) => hay.includes(token)).length;
  return hits / tokens.length;
}

function queryElement(timeline, { query, type }) {
  const matches = [];

  const pushMatch = (item) => {
    matches.push(item);
  };

  for (const track of timeline.tracks) {
    if (type === "track") {
      const confidence = scoreMatch(track.name, query);
      if (confidence > 0.2) {
        pushMatch({
          id: track.id,
          name: track.name,
          type: track.type,
          confidence,
        });
      }
    }

    const scanClips = (ownerTrack, parentTrack = null) => {
      if (type !== "clip") return;
      for (const clip of ownerTrack.clips ?? []) {
        const content = clip.source?.content ?? "";
        const component = clip.source?.component ?? "";
        const confidence = Math.max(
          scoreMatch(clip.name, query),
          scoreMatch(content, query),
          scoreMatch(ownerTrack.name, query),
          scoreMatch(component, query),
          parentTrack ? scoreMatch(parentTrack.name, query) : 0
        );
        if (confidence > 0.2) {
          pushMatch({
            id: clip.id,
            name: clip.name,
            type: clip.type,
            confidence,
          });
        }
      }
    };

    scanClips(track);
    for (const child of track.children ?? []) {
      if (type === "track") {
        const confidence = scoreMatch(child.name, query);
        if (confidence > 0.2) {
          pushMatch({
            id: child.id,
            name: child.name,
            type: child.type,
            confidence,
          });
        }
      }
      scanClips(child, track);
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return {
    matches,
    bestMatch: matches[0]?.id ?? null,
  };
}

function countClipsInTracks(tracks = []) {
  let count = 0;
  for (const track of tracks) {
    count += track.clips?.length ?? 0;
    if (track.children?.length) {
      count += countClipsInTracks(track.children);
    }
  }
  return count;
}

function summarizeSource(clip) {
  const source = clip.source ?? {};
  if (source.content) {
    return `text:"${String(source.content).slice(0, 80)}"`;
  }
  if (source.kind === "asset" || source.assetId || source.path || source.publicPath) {
    return `asset:${clip.type} ${source.assetId ?? source.path ?? source.publicPath ?? ""}`.trim();
  }
  if (source.kind === "data" || Array.isArray(source.data)) {
    const rows = Array.isArray(source.data) ? source.data.length : 0;
    const fields = [source.xField, source.yField].filter(Boolean).join("/");
    return `data:${rows} rows${fields ? ` fields=${fields}` : ""}`;
  }
  if (source.component) {
    return `component:${source.component}`;
  }
  if (source.shape) {
    return `shape:${source.shape}`;
  }
  return source.kind ? `kind:${source.kind}` : clip.type;
}

function summarizeClip(clip, { includeKeyframes = false, includeStyles = false } = {}) {
  const source = clip.source ?? {};
  const summary = {
    id: clip.id,
    name: clip.name,
    type: clip.type,
    startInFrames: clip.startInFrames,
    durationInFrames: clip.durationInFrames,
    endInFrames: clip.startInFrames + clip.durationInFrames,
    sourceSummary: summarizeSource(clip),
    lastModifiedBy: clip.lastModifiedBy,
    lastModifiedAt: clip.lastModifiedAt,
  };

  if (source.content) summary.text = source.content;
  if (source.component) summary.component = source.component;
  if (source.assetId) summary.assetId = source.assetId;
  if (includeStyles && clip.style) summary.style = clip.style;
  if (includeKeyframes) {
    summary.keyframes = clip.keyframes ?? [];
  } else if (clip.keyframes?.length) {
    summary.keyframeCount = clip.keyframes.length;
  }

  return summary;
}

function summarizeTrack(track, options = {}, parentGroupId = null) {
  const maxClipsPerTrack = Math.max(0, Number(options.maxClipsPerTrack ?? 20));
  const clips = track.clips ?? [];
  const clipped = clips.slice(0, maxClipsPerTrack);
  const summary = {
    id: track.id,
    name: track.name,
    type: track.type,
    order: track.order,
    visible: track.visible,
    locked: track.locked,
    muted: track.muted,
    solo: track.solo,
    parentGroupId,
    clipCount: clips.length,
    clipsTruncated: clipped.length < clips.length,
  };

  if (options.includeClips !== false) {
    summary.clips = clipped.map((clip) => summarizeClip(clip, options));
  }

  return summary;
}

function summarizeTimeline(timeline, options = {}) {
  const maxTracks = Math.max(1, Number(options.maxTracks ?? 50));
  const tracks = [];
  let truncated = false;

  const pushTrack = (track, parentGroupId = null) => {
    if (tracks.length >= maxTracks) {
      truncated = true;
      return;
    }
    tracks.push(summarizeTrack(track, options, parentGroupId));
    for (const child of track.children ?? []) {
      pushTrack(child, track.id);
    }
  };

  for (const track of timeline.tracks ?? []) {
    pushTrack(track);
  }

  return {
    timeline: {
      version: timeline.version,
      width: timeline.width,
      height: timeline.height,
      fps: timeline.fps,
      durationInFrames: timeline.durationInFrames,
      trackCount: tracks.length,
      clipCount: countClipsInTracks(timeline.tracks),
    },
    tracks,
    truncated,
  };
}

function getClipDetail(timeline, { clipId }) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }

  return {
    clip: structuredClone(located.clip),
    track: {
      id: located.track.id,
      name: located.track.name,
      type: located.track.type,
      locked: located.track.locked,
      parentGroupId: located.parentGroup?.id ?? null,
    },
  };
}

function queryTimelineRange(
  timeline,
  { startInFrames, endInFrames, type, trackId, includePartialOverlap = true }
) {
  const start = Math.round(Number(startInFrames));
  const end = Math.round(Number(endInFrames));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error("时间范围无效：startInFrames 必须小于 endInFrames，且均为非负帧号");
  }

  const matches = [];
  const scanTrack = (track, parentGroup = null) => {
    if (trackId && track.id !== trackId) return;
    for (const clip of track.clips ?? []) {
      if (type && clip.type !== type) continue;
      const clipStart = clip.startInFrames;
      const clipEnd = clip.startInFrames + clip.durationInFrames;
      const overlaps = includePartialOverlap
        ? clipStart < end && clipEnd > start
        : clipStart >= start && clipEnd <= end;
      if (!overlaps) continue;
      matches.push({
        clipId: clip.id,
        trackId: track.id,
        trackName: track.name,
        parentGroupId: parentGroup?.id ?? null,
        clipName: clip.name,
        type: clip.type,
        startInFrames: clipStart,
        durationInFrames: clip.durationInFrames,
        endInFrames: clipEnd,
        sourceSummary: summarizeSource(clip),
      });
    }
  };

  for (const track of timeline.tracks ?? []) {
    scanTrack(track);
    for (const child of track.children ?? []) {
      scanTrack(child, track);
    }
  }

  matches.sort((a, b) => a.startInFrames - b.startInFrames || a.trackName.localeCompare(b.trackName));
  return { matches, count: matches.length };
}

function applyClipUpdates(clip, updates) {
  const next = structuredClone(clip);
  for (const [path, value] of Object.entries(updates)) {
    if (!path.includes(".")) {
      next[path] = value;
      continue;
    }
    const parts = path.split(".");
    let cursor = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== "object") {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return next;
}

function markClipAiModified(clip) {
  return {
    ...clip,
    lastModifiedBy: "ai",
    lastModifiedAt: Date.now(),
  };
}

function updateClip(timeline, { clipId, updates, confirmOverwrite = false }) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }

  if (needsUserOverwriteConfirm(located.clip) && !confirmOverwrite) {
    throw new Error("E2010: 您手动调整了此片段，需要确认后才能覆盖");
  }

  const next = patchTrack(timeline, located.track.id, (track) => ({
    ...track,
    clips: track.clips.map((clip) =>
      clip.id === clipId
        ? markClipAiModified(applyClipUpdates(clip, updates))
        : clip
    ),
  }));

  return { timeline: next, clipId };
}

function moveClip(
  timeline,
  {
    clipId,
    targetTrackId,
    startInFrames,
    relativeOffsetInFrames,
    extendTimeline = false,
    confirmOverwrite = false,
  }
) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }
  if (located.track.locked) {
    throw new Error("源轨道已锁定");
  }
  if (needsUserOverwriteConfirm(located.clip) && !confirmOverwrite) {
    throw new Error("E2010: 您手动调整了此片段，需要确认后才能移动");
  }

  const targetId = targetTrackId || located.track.id;
  const targetTrack = findTrackById(timeline.tracks, targetId);
  if (!targetTrack) {
    throw new Error(`目标轨道不存在: ${targetId}`);
  }
  if (targetTrack.type === "group") {
    throw new Error("不能将片段移动到 group 轨道头部，请选择子轨道");
  }
  if (targetTrack.locked) {
    throw new Error("目标轨道已锁定");
  }
  if (targetTrack.type !== located.clip.type) {
    throw new Error("目标轨道类型与片段类型不匹配");
  }

  const hasRelative = typeof relativeOffsetInFrames === "number";
  const hasAbsolute = typeof startInFrames === "number";
  if (hasRelative === hasAbsolute) {
    throw new Error("必须且只能指定 startInFrames 或 relativeOffsetInFrames 之一");
  }

  const nextStart = Math.round(
    hasRelative
      ? located.clip.startInFrames + relativeOffsetInFrames
      : startInFrames
  );
  if (!Number.isFinite(nextStart) || nextStart < 0) {
    throw new Error("移动后的起始帧必须是非负整数");
  }

  let nextDuration = timeline.durationInFrames;
  const nextEnd = nextStart + located.clip.durationInFrames;
  if (nextEnd > nextDuration) {
    if (!extendTimeline) {
      throw new Error("移动后片段会超出时间线总时长；如需扩展请设置 extendTimeline=true");
    }
    nextDuration = nextEnd;
  }

  const candidateRange = { start: nextStart, end: nextEnd };
  if (hasOverlapOnTrack(targetTrack, candidateRange, clipId)) {
    throw new Error("移动后会与目标轨道其它片段重叠");
  }

  const movedClip = markClipAiModified({
    ...located.clip,
    startInFrames: nextStart,
  });

  let nextTimeline = { ...timeline, durationInFrames: nextDuration };
  if (located.track.id === targetId) {
    nextTimeline = patchTrack(nextTimeline, located.track.id, (track) => ({
      ...track,
      clips: track.clips.map((clip) => (clip.id === clipId ? movedClip : clip)),
    }));
  } else {
    nextTimeline = patchTrack(nextTimeline, located.track.id, (track) => ({
      ...track,
      clips: track.clips.filter((clip) => clip.id !== clipId),
    }));
    nextTimeline = patchTrack(nextTimeline, targetId, (track) => ({
      ...track,
      clips: [...(track.clips ?? []), movedClip],
    }));
  }

  validateTimeline(nextTimeline);
  return {
    timeline: nextTimeline,
    clipId,
    from: {
      trackId: located.track.id,
      startInFrames: located.clip.startInFrames,
    },
    to: {
      trackId: targetId,
      startInFrames: nextStart,
    },
    durationInFrames: located.clip.durationInFrames,
    timelineExtended: nextDuration !== timeline.durationInFrames,
  };
}

function deleteClip(timeline, { clipId, confirmOverwrite = false }) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }
  if (located.track.locked) {
    throw new Error("轨道已锁定");
  }
  if (needsUserOverwriteConfirm(located.clip) && !confirmOverwrite) {
    throw new Error("E2010: 您手动调整了此片段，需要确认后才能删除");
  }

  const next = patchTrack(timeline, located.track.id, (track) => ({
    ...track,
    clips: track.clips.filter((clip) => clip.id !== clipId),
  }));

  return { timeline: next, clipId, trackId: located.track.id };
}

function scaleClipForTimeline(clip, { scaleX, scaleY }) {
  const next = structuredClone(clip);
  if (next.transform?.position) {
    next.transform = {
      ...next.transform,
      position: {
        ...next.transform.position,
        x:
          typeof next.transform.position.x === "number"
            ? Math.round(next.transform.position.x * scaleX)
            : next.transform.position.x,
        y:
          typeof next.transform.position.y === "number"
            ? Math.round(next.transform.position.y * scaleY)
            : next.transform.position.y,
      },
    };
  }
  if (next.source) {
    next.source = { ...next.source };
    if (typeof next.source.width === "number") {
      next.source.width = Math.round(next.source.width * scaleX);
    }
    if (typeof next.source.height === "number") {
      next.source.height = Math.round(next.source.height * scaleY);
    }
    if (typeof next.source.radius === "number") {
      next.source.radius = Math.round(next.source.radius * Math.min(scaleX, scaleY));
    }
  }
  return next;
}

function scaleTracksForTimeline(tracks, scale) {
  return tracks.map((track) => ({
    ...track,
    clips: (track.clips ?? []).map((clip) => scaleClipForTimeline(clip, scale)),
    ...(track.children?.length
      ? { children: scaleTracksForTimeline(track.children, scale) }
      : {}),
  }));
}

function updateTimelineSettings(
  timeline,
  {
    width,
    height,
    fps,
    durationInFrames,
    fitExistingClips = false,
    scalePositions = false,
  }
) {
  const before = {
    width: timeline.width,
    height: timeline.height,
    fps: timeline.fps,
    durationInFrames: timeline.durationInFrames,
  };

  const next = { ...timeline };
  if (width !== undefined) {
    const value = Math.round(Number(width));
    if (!Number.isFinite(value) || value <= 0) throw new Error("width 必须是正整数");
    next.width = value;
  }
  if (height !== undefined) {
    const value = Math.round(Number(height));
    if (!Number.isFinite(value) || value <= 0) throw new Error("height 必须是正整数");
    next.height = value;
  }
  if (fps !== undefined) {
    const value = Math.round(Number(fps));
    if (!Number.isFinite(value) || value < 1 || value > 120) {
      throw new Error("fps 必须是 1 到 120 之间的整数");
    }
    next.fps = value;
  }

  let fittedDuration = false;
  if (durationInFrames !== undefined) {
    let value = Math.round(Number(durationInFrames));
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("durationInFrames 必须是正整数");
    }
    const maxClipEnd = getMaxClipEnd(timeline.tracks);
    if (value < maxClipEnd) {
      if (!fitExistingClips) {
        throw new Error(`总时长会截断已有片段；至少需要 ${maxClipEnd} 帧`);
      }
      value = maxClipEnd;
      fittedDuration = true;
    }
    next.durationInFrames = value;
  }

  let scaledPositions = false;
  if (scalePositions && (next.width !== timeline.width || next.height !== timeline.height)) {
    next.tracks = scaleTracksForTimeline(next.tracks ?? [], {
      scaleX: next.width / timeline.width,
      scaleY: next.height / timeline.height,
    });
    scaledPositions = true;
  }

  validateTimeline(next);
  return {
    timeline: next,
    before,
    after: {
      width: next.width,
      height: next.height,
      fps: next.fps,
      durationInFrames: next.durationInFrames,
    },
    scaledPositions,
    fittedDuration,
  };
}

function placeAsset(timeline, asset, params = {}) {
  const trackType = assetTrackType(asset.type);
  let nextTimeline = timeline;
  let targetTrack = null;
  let createdTrack = false;

  if (params.trackId) {
    targetTrack = findTrackById(nextTimeline.tracks, params.trackId);
    if (!targetTrack) throw new Error(`目标轨道不存在: ${params.trackId}`);
    if (targetTrack.type === "group") throw new Error("不能将素材放到 group 轨道头部");
    if (targetTrack.locked) throw new Error("目标轨道已锁定");
    if (targetTrack.type !== trackType) {
      throw new Error(`素材类型 ${asset.type} 不能放到 ${targetTrack.type} 轨道`);
    }
  } else {
    targetTrack = findFirstTrackByType(nextTimeline.tracks, trackType);
  }

  if (!targetTrack) {
    const created = createTrack(nextTimeline, {
      name: defaultTrackName(trackType),
      type: trackType,
    });
    nextTimeline = created.timeline;
    targetTrack = created.track;
    createdTrack = true;
  }

  const startInFrames =
    typeof params.startInFrames === "number"
      ? Math.round(params.startInFrames)
      : 0;
  if (!Number.isFinite(startInFrames) || startInFrames < 0) {
    throw new Error("素材起始帧必须是非负整数");
  }

  const fallbackDuration = trackType === "image" ? nextTimeline.fps * 3 : nextTimeline.fps * 5;
  const durationInFrames = Math.max(
    1,
    Math.round(
      typeof params.durationInFrames === "number"
        ? params.durationInFrames
        : asset.durationInFrames || fallbackDuration
    )
  );
  const endInFrames = startInFrames + durationInFrames;
  let timelineExtended = false;
  if (endInFrames > nextTimeline.durationInFrames) {
    if (!params.extendTimeline) {
      throw new Error("素材片段会超出时间线总时长；如需扩展请设置 extendTimeline=true");
    }
    nextTimeline = { ...nextTimeline, durationInFrames: endInFrames };
    timelineExtended = true;
  }

  targetTrack = findTrackById(nextTimeline.tracks, targetTrack.id);
  if (hasOverlapOnTrack(targetTrack, { start: startInFrames, end: endInFrames })) {
    throw new Error("素材片段会与目标轨道其它片段重叠");
  }

  const transform = {
    position: {
      x:
        typeof params.position?.x === "number"
          ? params.position.x
          : nextTimeline.width / 2,
      y:
        typeof params.position?.y === "number"
          ? params.position.y
          : nextTimeline.height / 2,
    },
    scale: typeof params.scale === "number" ? params.scale : 1,
    rotation: 0,
    opacity: 1,
  };

  const clip = {
    id: newId("clip"),
    type: trackType,
    name: asset.name ?? asset.originalName ?? defaultTrackName(trackType),
    startInFrames,
    durationInFrames,
    lastModifiedBy: "ai",
    lastModifiedAt: Date.now(),
    source: {
      kind: "asset",
      assetId: asset.id,
      publicPath: asset.publicPath,
      path: asset.path,
    },
    transform,
    style:
      trackType === "image" || trackType === "video"
        ? { objectFit: params.objectFit ?? "contain" }
        : {},
    keyframes: [],
  };

  nextTimeline = patchTrack(nextTimeline, targetTrack.id, (track) => ({
    ...track,
    clips: [...(track.clips ?? []), clip],
  }));

  return {
    timeline: nextTimeline,
    assetId: asset.id,
    clipId: clip.id,
    trackId: targetTrack.id,
    startInFrames,
    durationInFrames,
    createdTrack,
    timelineExtended,
  };
}

function addKeyframe(
  timeline,
  { clipId, property, frame, value, easing = "linear", interpolation = "linear", confirmOverwrite = false }
) {
  const located = findClipLocation(timeline.tracks, clipId);
  if (!located) {
    throw new Error(`片段不存在: ${clipId}`);
  }
  if (located.track.locked) {
    throw new Error("轨道已锁定");
  }
  if (needsUserOverwriteConfirm(located.clip) && !confirmOverwrite) {
    throw new Error("E2010: 您手动调整了此片段，需要确认后才能覆盖");
  }

  const prop = String(property ?? "").trim();
  if (!prop) {
    throw new Error("property 不能为空");
  }
  if (!VALID_KEYFRAME_EASING.includes(easing)) {
    throw new Error(`不支持的 easing: ${easing}`);
  }
  if (!VALID_KEYFRAME_INTERPOLATION.includes(interpolation)) {
    throw new Error(`不支持的 interpolation: ${interpolation}`);
  }

  const frameNumber = Math.round(frame);
  if (!Number.isFinite(frameNumber) || frameNumber < 0) {
    throw new Error("frame 必须是非负整数");
  }
  if (frameNumber >= located.clip.durationInFrames) {
    throw new Error("关键帧 frame 必须小于片段 durationInFrames");
  }

  const keyframe = {
    id: newId("kf"),
    property: prop,
    frame: frameNumber,
    value,
    easing,
    interpolation,
  };

  const next = patchTrack(timeline, located.track.id, (track) => ({
    ...track,
    clips: track.clips.map((clip) => {
      if (clip.id !== clipId) return clip;
      const keyframes = [...(clip.keyframes ?? [])];
      const existingIndex = keyframes.findIndex(
        (item) => item.property === prop && item.frame === frameNumber
      );
      if (existingIndex >= 0) {
        keyframes[existingIndex] = { ...keyframes[existingIndex], ...keyframe, id: keyframes[existingIndex].id };
      } else {
        keyframes.push(keyframe);
      }
      keyframes.sort((a, b) => a.frame - b.frame || a.property.localeCompare(b.property));
      return markClipAiModified({
        ...clip,
        keyframes,
      });
    }),
  }));

  return { timeline: next, clipId, keyframeId: keyframe.id };
}

function collectClipIds(timeline) {
  const ids = new Set();
  const walk = (tracks) => {
    for (const track of tracks) {
      for (const clip of track.clips ?? []) {
        ids.add(clip.id);
      }
      if (track.children?.length) walk(track.children);
    }
  };
  walk(timeline.tracks ?? []);
  return ids;
}

module.exports = {
  createTrack,
  createClip,
  updateClip,
  moveClip,
  deleteClip,
  addKeyframe,
  setAnimation,
  queryElement,
  summarizeTimeline,
  getClipDetail,
  queryTimelineRange,
  updateTimelineSettings,
  placeAsset,
  findTrackById,
  findClipLocation,
  collectClipIds,
  needsUserOverwriteConfirm,
  markClipAiModified,
};
