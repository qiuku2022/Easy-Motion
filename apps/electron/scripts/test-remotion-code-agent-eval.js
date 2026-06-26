/**
 * Remotion code eval：replay docs/agent-eval/remotion-code-tasks.json
 *
 * Usage:
 *   node scripts/test-remotion-code-agent-eval.js
 *   node scripts/test-remotion-code-agent-eval.js --task rc-02
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { RemotionContext } = require("../src/main/agent/remotion-context");
const { TimelineContext } = require("../src/main/agent/timeline-context");
const { createRemotionCodeTools } = require("../src/main/agent/tools/remotion-code");
const { registerCustomComponent } = require("../src/main/agent/remotion-registry");

const TASKS_PATH = path.join(
  __dirname,
  "../../../docs/agent-eval/remotion-code-tasks.json"
);

const BASE_TIMELINE = {
  version: "1.0",
  fps: 30,
  durationInFrames: 90,
  width: 1280,
  height: 720,
  tracks: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resolveValue(value, ctx) {
  if (typeof value === "string" && value.startsWith("$snippet:")) {
    const key = value.slice("$snippet:".length);
    return ctx.snippets[key] ?? value;
  }
  if (typeof value === "string" && value.startsWith("$")) {
    return ctx.vars[value.slice(1)];
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, ctx));
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveValue(item, ctx);
    }
    return out;
  }
  return value;
}

function createFixtureRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-rc-eval-"));
  const projectPath = path.join(tmpRoot, "Demo.em");
  const subprojectPath = "subprojects/default";
  const remotionDir = path.join(projectPath, subprojectPath, "remotion");
  const srcDir = path.join(remotionDir, "src");

  fs.mkdirSync(path.join(srcDir, "components", "custom"), { recursive: true });
  fs.mkdirSync(path.join(srcDir, "presets"), { recursive: true });
  fs.writeFileSync(
    path.join(remotionDir, "package.json"),
    JSON.stringify(
      {
        dependencies: { remotion: "4.0.269", react: "^18.3.1" },
      },
      null,
      2
    ),
    "utf8"
  );

  return { tmpRoot, projectPath, subprojectPath, remotionDir, srcDir };
}

async function invokeTool(tools, name, args = {}) {
  const found = tools.find((item) => item.name === name);
  if (!found) throw new Error(`tool not found: ${name}`);
  const raw = await found.invoke(args);
  return JSON.parse(raw);
}

async function runStep(step, ctx) {
  const args = resolveValue(step.args ?? {}, ctx);

  switch (step.op) {
    case "writeRemotionFile": {
      const result = await invokeTool(ctx.tools, "writeRemotionFile", args);
      assert(result.success, result.error ?? "writeRemotionFile failed");
      return;
    }
    case "patchRemotionFile": {
      const result = await invokeTool(ctx.tools, "patchRemotionFile", args);
      assert(result.success, result.error ?? "patchRemotionFile failed");
      return;
    }
    case "registerCustomComponent": {
      const result = await invokeTool(ctx.tools, "registerCustomComponent", args);
      assert(result.success, result.error ?? "registerCustomComponent failed");
      if (step.saveAs) ctx.vars[step.saveAs] = result.data?.clipId;
      return;
    }
    case "listRemotionFiles": {
      const result = await invokeTool(ctx.tools, "listRemotionFiles", args);
      assert(result.success, result.error ?? "listRemotionFiles failed");
      if (step.saveAs) ctx.vars[step.saveAs] = result.data?.files ?? [];
      return;
    }
    case "expectWriteRejected": {
      let thrown = false;
      try {
        ctx.remotionCtx.writeFile(args.relativePath, args.content);
      } catch (error) {
        thrown = true;
        assert(
          new RegExp(args.errorPattern).test(error.message),
          `expected ${args.errorPattern}, got ${error.message}`
        );
      }
      assert(thrown, "expected write rejection");
      return;
    }
    default:
      throw new Error(`unknown op: ${step.op}`);
  }
}

function runAssertions(taskId, assertions, ctx) {
  for (const rule of assertions) {
    switch (rule.type) {
      case "fileExists": {
        const absolute = path.join(ctx.srcDir, rule.path);
        assert(fs.existsSync(absolute), `${taskId}: missing file ${rule.path}`);
        break;
      }
      case "fileContentIncludes": {
        const absolute = path.join(ctx.srcDir, rule.path);
        const content = fs.readFileSync(absolute, "utf8");
        assert(content.includes(rule.includes), `${taskId}: file content ${rule.path}`);
        break;
      }
      case "registryContains": {
        const registryPath = path.join(ctx.srcDir, "presets/custom-registry.ts");
        const content = fs.readFileSync(registryPath, "utf8");
        for (const name of rule.components) {
          assert(content.includes(name), `${taskId}: registry missing ${name}`);
        }
        break;
      }
      case "animationClipCount": {
        const count = ctx.timelineCtx.timeline.tracks
          .filter((track) => track.type === "animation")
          .reduce((sum, track) => sum + (track.clips?.length ?? 0), 0);
        if (rule.min != null) assert(count >= rule.min, `${taskId}: animationClipCount`);
        if (rule.equals != null) assert(count === rule.equals, `${taskId}: animationClipCount`);
        break;
      }
      case "clipSource": {
        const clipId = resolveValue(rule.clipId, ctx);
        let clip = null;
        for (const track of ctx.timelineCtx.timeline.tracks ?? []) {
          clip = (track.clips ?? []).find((item) => item.id === clipId) ?? clip;
        }
        assert(clip, `${taskId}: clip not found ${clipId}`);
        const value = rule.path.split(".").reduce((acc, key) => acc?.[key], clip.source);
        assert(value === rule.equals, `${taskId}: clipSource ${rule.path}`);
        break;
      }
      case "remotionUnchanged": {
        assert(!ctx.remotionCtx.changed, `${taskId}: remotion should be unchanged`);
        break;
      }
      case "fileListIncludes": {
        const files = ctx.vars[rule.var.replace(/^\$/, "")] ?? ctx.vars[rule.var];
        const joined = (files ?? [])
          .map((item) => (typeof item === "string" ? item : item?.path))
          .filter(Boolean)
          .join("\n");
        assert(joined.includes(rule.includes), `${taskId}: file list includes ${rule.includes}`);
        break;
      }
      default:
        throw new Error(`${taskId}: unknown assertion ${rule.type}`);
    }
  }
}

async function runTask(task, snippets) {
  const { tmpRoot, projectPath, subprojectPath, srcDir } = createFixtureRoot();
  const timelineCtx = new TimelineContext(deepClone(BASE_TIMELINE), {
    subprojectName: "默认",
    projectPath,
    subprojectPath,
    currentFrame: 0,
  });
  const remotionCtx = new RemotionContext({ projectPath, subprojectPath });
  const tools = createRemotionCodeTools(remotionCtx, timelineCtx);
  const ctx = { vars: {}, snippets, tools, remotionCtx, timelineCtx, srcDir };

  try {
    for (const step of task.setupSteps ?? []) {
      await runStep(step, ctx);
    }
    for (const step of task.steps ?? []) {
      await runStep(step, ctx);
    }
    runAssertions(task.id, task.assertions ?? [], ctx);
    console.log(`  pass ${task.id}: ${task.name}`);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

async function main() {
  const spec = JSON.parse(fs.readFileSync(TASKS_PATH, "utf8"));
  const filterArg = process.argv.find((arg) => arg.startsWith("--task="));
  const filterId = filterArg?.split("=")[1];

  let tasks = spec.tasks.filter((task) => task.mode === "deterministic");
  if (filterId) {
    tasks = tasks.filter((task) => task.id === filterId);
    assert(tasks.length, `task not found: ${filterId}`);
  }

  console.log(`test-remotion-code-agent-eval: running ${tasks.length} task(s)...`);
  for (const task of tasks) {
    await runTask(task, spec.snippets ?? {});
  }
  console.log("test-remotion-code-agent-eval: all deterministic tasks passed");
}

main().catch((error) => {
  console.error("test-remotion-code-agent-eval: FAIL", error);
  process.exit(1);
});
