/**
 * Agent eval 确定性验证： replay docs/agent-eval/tasks.json 中的 golden path，
 * 不调用 LLM。live 任务跳过（见 test-agent-live.js）。
 *
 * Usage:
 *   node scripts/test-agent-eval.js
 *   node scripts/test-agent-eval.js --task eval-05
 */
const fs = require("node:fs");
const path = require("node:path");
const { validateTimeline } = require("@easymotion/shared");
const timelineOps = require("../src/main/agent/timeline-ops");
const { placePresetOnTimeline } = require("../src/main/agent/place-preset");
const { getPresetById, searchPresets } = require("../src/main/agent/preset-catalog");
const { needsUserOverwriteConfirm } = require("../src/main/agent/conflict");
const { runSimplifiedFallback } = require("../src/main/agent/fallback-templates");

const TASKS_PATH = path.join(__dirname, "../../../docs/agent-eval/tasks.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getByPath(obj, dotPath) {
  return String(dotPath)
    .split(".")
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function resolveArgs(args, vars) {
  if (args == null) return args;
  if (typeof args === "string" && args.startsWith("$")) {
    return vars[args.slice(1)];
  }
  if (Array.isArray(args)) {
    return args.map((item) => resolveArgs(item, vars));
  }
  if (typeof args === "object") {
    const out = {};
    for (const [key, value] of Object.entries(args)) {
      out[key] = resolveArgs(value, vars);
    }
    return out;
  }
  return args;
}

function allClips(timeline) {
  const clips = [];
  for (const track of timeline.tracks ?? []) {
    for (const clip of track.clips ?? []) {
      clips.push({ track, clip });
    }
  }
  return clips;
}

function findClip(timeline, clipId) {
  if (clipId) {
    const located = timelineOps.findClipLocation(timeline.tracks, clipId);
    return located?.clip ?? null;
  }
  const first = allClips(timeline)[0];
  return first?.clip ?? null;
}

function runStep(timeline, step, vars) {
  const args = resolveArgs(step.args ?? {}, vars);

  switch (step.op) {
    case "createTrack": {
      const result = timelineOps.createTrack(timeline, args);
      if (step.saveAs) vars[step.saveAs] = result.track.id;
      return result.timeline;
    }
    case "createClip": {
      const result = timelineOps.createClip(timeline, args);
      if (step.saveAs) vars[step.saveAs] = result.clip.id;
      return result.timeline;
    }
    case "updateClip": {
      const result = timelineOps.updateClip(timeline, args);
      return result.timeline;
    }
    case "deleteClip": {
      const result = timelineOps.deleteClip(timeline, args);
      return result.timeline;
    }
    case "addKeyframe": {
      const result = timelineOps.addKeyframe(timeline, args);
      return result.timeline;
    }
    case "setAnimation": {
      const result = timelineOps.setAnimation(timeline, args);
      return result.timeline;
    }
    case "applyPreset": {
      const preset = getPresetById(args.presetId);
      if (!preset) throw new Error(`preset not found: ${args.presetId}`);
      const result = placePresetOnTimeline(timeline, preset, {
        startInFrames: args.startInFrames,
        parameters: args.parameters,
      });
      if (step.saveAs) vars[step.saveAs] = result.clipId;
      return result.timeline;
    }
    case "searchPresets": {
      const result = searchPresets(args);
      if (step.saveAs) vars[step.saveAs] = result;
      return timeline;
    }
    case "checkConflict": {
      const located = timelineOps.findClipLocation(timeline.tracks, args.clipId);
      const clip = located?.clip
        ? { ...located.clip, lastModifiedAt: Date.now() }
        : null;
      if (step.saveAs) vars[step.saveAs] = needsUserOverwriteConfirm(clip);
      return timeline;
    }
    case "runFallback": {
      const result = runSimplifiedFallback({ timeline, input: args.input });
      if (step.saveAs) vars[step.saveAs] = result;
      return result.timeline ?? timeline;
    }
    default:
      throw new Error(`unknown op: ${step.op}`);
  }
}

function runAssertions(timeline, assertions, vars, meta) {
  for (const rule of assertions) {
    const resolvedRule =
      typeof rule.clipId === "string" && rule.clipId.startsWith("$")
        ? { ...rule, clipId: vars[rule.clipId.slice(1)] }
        : rule;
    switch (resolvedRule.type) {
      case "trackCount": {
        const count = timeline.tracks?.length ?? 0;
        if (resolvedRule.equals != null) assert(count === resolvedRule.equals, `${meta.id}: trackCount`);
        if (resolvedRule.min != null) assert(count >= resolvedRule.min, `${meta.id}: trackCount min`);
        break;
      }
      case "clipCount": {
        assert(allClips(timeline).length === resolvedRule.equals, `${meta.id}: clipCount`);
        break;
      }
      case "hasTrackType": {
        const found = (timeline.tracks ?? []).some((t) => t.type === resolvedRule.trackType);
        assert(found, `${meta.id}: missing track type ${resolvedRule.trackType}`);
        break;
      }
      case "clipTextContent": {
        const clip = findClip(timeline, resolvedRule.clipId);
        assert(clip?.source?.content === resolvedRule.equals, `${meta.id}: clipTextContent`);
        break;
      }
      case "clipStyle": {
        const clip = findClip(timeline, resolvedRule.clipId);
        const value = getByPath(clip?.style ?? {}, resolvedRule.path);
        if (resolvedRule.equals != null) assert(value === resolvedRule.equals, `${meta.id}: clipStyle ${resolvedRule.path}`);
        if (resolvedRule.includes != null) assert(String(value).includes(resolvedRule.includes), `${meta.id}: clipStyle includes`);
        break;
      }
      case "clipProperty": {
        const clip = findClip(timeline, resolvedRule.clipId);
        const value = getByPath(clip, resolvedRule.path);
        assert(value === resolvedRule.equals, `${meta.id}: clipProperty ${resolvedRule.path}`);
        break;
      }
      case "clipSource": {
        const clip = findClip(timeline, resolvedRule.clipId);
        const value = getByPath(clip?.source ?? {}, resolvedRule.path);
        assert(value === resolvedRule.equals, `${meta.id}: clipSource ${resolvedRule.path}`);
        break;
      }
      case "clipAnimationIn": {
        const clip = findClip(timeline, resolvedRule.clipId);
        assert(clip?.animations?.in?.type === resolvedRule.animationType, `${meta.id}: clipAnimationIn`);
        break;
      }
      case "clipStartFrame": {
        const clip = findClip(timeline, resolvedRule.clipId);
        assert(clip?.startInFrames === resolvedRule.equals, `${meta.id}: clipStartFrame`);
        break;
      }
      case "keyframeCount": {
        const clip = findClip(timeline, resolvedRule.clipId);
        const count = (clip?.keyframes ?? []).filter((kf) => kf.property === resolvedRule.property).length;
        if (resolvedRule.min != null) assert(count >= resolvedRule.min, `${meta.id}: keyframeCount`);
        if (resolvedRule.equals != null) assert(count === resolvedRule.equals, `${meta.id}: keyframeCount`);
        break;
      }
      case "timelineValid": {
        let valid = false;
        try {
          validateTimeline(timeline);
          valid = true;
        } catch {
          valid = false;
        }
        assert(valid === resolvedRule.equals, `${meta.id}: timelineValid`);
        break;
      }
      case "presetSearchMinCount": {
        const list = vars[resolvedRule.var] ?? [];
        assert(list.length >= resolvedRule.min, `${meta.id}: presetSearchMinCount`);
        break;
      }
      case "presetSearchHasId": {
        const list = vars[resolvedRule.var] ?? [];
        assert(list.some((item) => item.id === resolvedRule.presetId), `${meta.id}: presetSearchHasId`);
        break;
      }
      case "varEquals": {
        assert(vars[resolvedRule.var] === resolvedRule.equals, `${meta.id}: varEquals ${resolvedRule.var}`);
        break;
      }
      case "varProperty": {
        const value = getByPath(vars[resolvedRule.var], resolvedRule.path);
        assert(value === resolvedRule.equals, `${meta.id}: varProperty ${resolvedRule.path}`);
        break;
      }
      case "timelineChanged":
        // live-only; skipped in deterministic runner
        break;
      default:
        throw new Error(`${meta.id}: unknown assertion type ${resolvedRule.type}`);
    }
  }
}

function runTask(task, baseTimeline) {
  if (task.mode === "live") {
    console.log(`  skip ${task.id} (live — run via test-agent-live.js)`);
    return;
  }

  let timeline = deepClone(task.initialTimeline ?? baseTimeline);
  const vars = {};

  for (const step of task.steps ?? []) {
    timeline = runStep(timeline, step, vars);
  }

  runAssertions(timeline, task.assertions ?? [], vars, task);
  console.log(`  pass ${task.id}: ${task.name}`);
}

function main() {
  const filterArg = process.argv.find((arg) => arg.startsWith("--task="));
  const filterId = filterArg?.split("=")[1] ?? (process.argv[2] === "--task" ? process.argv[3] : null);

  const bundle = JSON.parse(fs.readFileSync(TASKS_PATH, "utf8"));
  let tasks = bundle.tasks ?? [];
  if (filterId) {
    tasks = tasks.filter((task) => task.id === filterId);
    assert(tasks.length === 1, `task not found: ${filterId}`);
  }

  const deterministic = tasks.filter((t) => t.mode !== "live");
  const live = tasks.filter((t) => t.mode === "live");

  console.log(`test-agent-eval: running ${deterministic.length} deterministic task(s)...`);
  for (const task of deterministic) {
    runTask(task, bundle.baseTimeline);
  }

  if (live.length > 0 && !filterId) {
    console.log(`test-agent-eval: skipped ${live.length} live task(s) (eval-19, eval-20)`);
  }

  console.log("test-agent-eval: all deterministic tasks passed");
}

main();
