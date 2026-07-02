const timelineOps = require("./timeline-ops");
const { normalizeClipUpdates } = require("./clip-updates");

function includesText(value, query) {
  return String(value ?? "").toLowerCase().includes(String(query ?? "").toLowerCase());
}

function getClipText(clip) {
  const source = clip.source ?? {};
  const props = source.props && typeof source.props === "object" ? source.props : {};
  return [
    source.content,
    source.title,
    props.text,
    props.title,
    props.subtitle,
  ]
    .filter(Boolean)
    .join(" ");
}

function clipOverlapsRange(clip, range) {
  const start = Math.round(Number(range.startInFrames));
  const end = Math.round(Number(range.endInFrames));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error("时间范围无效：startInFrames 必须小于 endInFrames，且均为非负帧号");
  }
  const clipStart = clip.startInFrames;
  const clipEnd = clip.startInFrames + clip.durationInFrames;
  return range.includePartialOverlap === false
    ? clipStart >= start && clipEnd <= end
    : clipStart < end && clipEnd > start;
}

function summarizeMatch(track, clip, parentGroup = null) {
  return {
    clipId: clip.id,
    clipName: clip.name,
    type: clip.type,
    trackId: track.id,
    trackName: track.name,
    parentGroupId: parentGroup?.id ?? null,
    startInFrames: clip.startInFrames,
    durationInFrames: clip.durationInFrames,
    endInFrames: clip.startInFrames + clip.durationInFrames,
  };
}

function matchesSelector(track, clip, selector = {}) {
  if (selector.type && clip.type !== selector.type) return false;
  if (selector.trackId && track.id !== selector.trackId) return false;
  if (selector.trackNameIncludes && !includesText(track.name, selector.trackNameIncludes)) {
    return false;
  }
  if (selector.nameIncludes && !includesText(clip.name, selector.nameIncludes)) return false;
  if (selector.textIncludes && !includesText(getClipText(clip), selector.textIncludes)) {
    return false;
  }
  if (
    selector.sourceComponent &&
    !includesText(clip.source?.component, selector.sourceComponent)
  ) {
    return false;
  }
  if (selector.presetId && clip.source?.presetId !== selector.presetId) return false;
  if (selector.lastModifiedBy && clip.lastModifiedBy !== selector.lastModifiedBy) {
    return false;
  }
  if (selector.timeRange && !clipOverlapsRange(clip, selector.timeRange)) return false;
  return true;
}

function collectMatches(timeline, selector = {}) {
  const matches = [];

  const scanTrack = (track, parentGroup = null) => {
    for (const clip of track.clips ?? []) {
      if (matchesSelector(track, clip, selector)) {
        matches.push({
          track,
          clip,
          parentGroup,
          summary: summarizeMatch(track, clip, parentGroup),
        });
      }
    }
  };

  for (const track of timeline.tracks ?? []) {
    scanTrack(track);
    for (const child of track.children ?? []) {
      scanTrack(child, track);
    }
  }

  matches.sort(
    (a, b) =>
      a.clip.startInFrames - b.clip.startInFrames ||
      a.track.order - b.track.order ||
      a.clip.name.localeCompare(b.clip.name)
  );
  return matches;
}

function normalizeMaxMatches(maxMatches) {
  return Math.max(1, Math.min(Number(maxMatches ?? 20), 100));
}

function buildLimitResult(matches, maxMatches) {
  return {
    matchedCount: matches.length,
    updatedCount: 0,
    deletedCount: 0,
    shiftedCount: 0,
    dryRun: true,
    requiresConfirmation: true,
    reason: `匹配数量 ${matches.length} 超过 maxMatches=${maxMatches}`,
    affectedClips: matches.map((match) => match.summary),
  };
}

function assertMatches(matches) {
  if (matches.length === 0) {
    throw new Error("没有匹配到任何片段");
  }
}

function collectBlockedMatches(matches, { confirmOverwrite }) {
  const locked = matches.filter((match) => match.track.locked);
  const conflicts = confirmOverwrite
    ? []
    : matches.filter((match) => timelineOps.needsUserOverwriteConfirm(match.clip));
  return {
    locked: locked.map((match) => match.summary),
    conflicts: conflicts.map((match) => match.summary),
  };
}

function assertNoBlockedMatches(blocked) {
  if (blocked.locked.length > 0) {
    throw new Error("匹配结果包含锁定轨道上的片段，无法批量修改");
  }
}

function buildConflictResult(matches, blocked, opCountKey) {
  return {
    matchedCount: matches.length,
    [opCountKey]: 0,
    dryRun: true,
    requiresConfirmation: true,
    reason: "匹配结果包含近期用户手动修改的片段，需要确认后才能覆盖",
    affectedClips: matches.map((match) => match.summary),
    conflictClips: blocked.conflicts,
  };
}

function batchUpdateClips(
  timeline,
  { selector = {}, updates = {}, maxMatches, dryRun = false, allowSourceReplace = false, confirmOverwrite = false }
) {
  if (!allowSourceReplace && Object.prototype.hasOwnProperty.call(updates, "source")) {
    throw new Error("批量更新禁止直接替换整个 source；请使用 source.xxx 点路径");
  }
  const prepared = normalizeClipUpdates(updates);
  const fields = Object.keys(prepared);
  if (fields.length === 0) {
    throw new Error("updates 不能为空");
  }

  const limit = normalizeMaxMatches(maxMatches);
  const matches = collectMatches(timeline, selector);
  assertMatches(matches);
  if (matches.length > limit) return buildLimitResult(matches, limit);

  const blocked = collectBlockedMatches(matches, { confirmOverwrite });
  assertNoBlockedMatches(blocked);
  if (blocked.conflicts.length > 0) return buildConflictResult(matches, blocked, "updatedCount");

  if (dryRun) {
    return {
      timeline,
      matchedCount: matches.length,
      updatedCount: 0,
      dryRun: true,
      affectedClips: matches.map((match) => match.summary),
      fields,
    };
  }

  let next = structuredClone(timeline);
  for (const match of matches) {
    const result = timelineOps.updateClip(next, {
      clipId: match.clip.id,
      updates: prepared,
      confirmOverwrite,
    });
    next = result.timeline;
  }

  return {
    timeline: next,
    matchedCount: matches.length,
    updatedCount: matches.length,
    dryRun: false,
    affectedClips: matches.map((match) => match.summary),
    fields,
  };
}

function batchDeleteClips(
  timeline,
  { selector = {}, maxMatches, dryRun = true, confirmDelete = false, confirmOverwrite = false }
) {
  const limit = normalizeMaxMatches(maxMatches);
  const matches = collectMatches(timeline, selector);
  assertMatches(matches);
  if (matches.length > limit) return buildLimitResult(matches, limit);

  const blocked = collectBlockedMatches(matches, { confirmOverwrite });
  assertNoBlockedMatches(blocked);
  if (blocked.conflicts.length > 0) return buildConflictResult(matches, blocked, "deletedCount");

  if (dryRun || (matches.length > 1 && !confirmDelete)) {
    return {
      timeline,
      matchedCount: matches.length,
      deletedCount: 0,
      dryRun: true,
      requiresConfirmation: matches.length > 1 && !confirmDelete,
      reason:
        matches.length > 1 && !confirmDelete
          ? "删除多个片段需要 confirmDelete=true"
          : undefined,
      affectedClips: matches.map((match) => match.summary),
    };
  }

  let next = structuredClone(timeline);
  for (const match of matches) {
    const result = timelineOps.deleteClip(next, {
      clipId: match.clip.id,
      confirmOverwrite,
    });
    next = result.timeline;
  }

  return {
    timeline: next,
    matchedCount: matches.length,
    deletedCount: matches.length,
    dryRun: false,
    affectedClips: matches.map((match) => match.summary),
  };
}

function sortShiftMatches(matches, offsetInFrames) {
  const direction = offsetInFrames >= 0 ? -1 : 1;
  return [...matches].sort((a, b) => {
    if (a.track.id !== b.track.id) return a.track.id.localeCompare(b.track.id);
    return direction * (a.clip.startInFrames - b.clip.startInFrames);
  });
}

function batchShiftClips(
  timeline,
  { selector = {}, offsetInFrames, maxMatches, dryRun = false, extendTimeline = false, confirmOverwrite = false }
) {
  const offset = Math.round(Number(offsetInFrames));
  if (!Number.isFinite(offset) || offset === 0) {
    throw new Error("offsetInFrames 必须是非零帧数");
  }

  const limit = normalizeMaxMatches(maxMatches);
  const matches = collectMatches(timeline, selector);
  assertMatches(matches);
  if (matches.length > limit) return buildLimitResult(matches, limit);

  const blocked = collectBlockedMatches(matches, { confirmOverwrite });
  assertNoBlockedMatches(blocked);
  if (blocked.conflicts.length > 0) return buildConflictResult(matches, blocked, "shiftedCount");

  const invalid = matches.find((match) => match.clip.startInFrames + offset < 0);
  if (invalid) {
    throw new Error(`移动后片段会进入负帧: ${invalid.clip.id}`);
  }

  if (dryRun) {
    return {
      timeline,
      matchedCount: matches.length,
      shiftedCount: 0,
      dryRun: true,
      offsetInFrames: offset,
      affectedClips: matches.map((match) => match.summary),
    };
  }

  let next = structuredClone(timeline);
  let timelineExtended = false;
  for (const match of sortShiftMatches(matches, offset)) {
    const result = timelineOps.moveClip(next, {
      clipId: match.clip.id,
      relativeOffsetInFrames: offset,
      extendTimeline,
      confirmOverwrite,
    });
    next = result.timeline;
    timelineExtended = timelineExtended || result.timelineExtended;
  }

  return {
    timeline: next,
    matchedCount: matches.length,
    shiftedCount: matches.length,
    dryRun: false,
    offsetInFrames: offset,
    timelineExtended,
    affectedClips: matches.map((match) => match.summary),
  };
}

module.exports = {
  collectMatches,
  batchUpdateClips,
  batchDeleteClips,
  batchShiftClips,
};
