const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const settingsService = require("../src/main/services/settings-service");
const memoryService = require("../src/main/services/memory-service");
const { MemoryContext } = require("../src/main/agent/memory-context");
const { createMemoryTools } = require("../src/main/agent/tools/memory");
const { removeDirRecursive } = require("../src/main/services/file-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function invokeTool(tools, name, args = {}) {
  const found = tools.find((item) => item.name === name);
  if (!found) throw new Error(`tool not found: ${name}`);
  const raw = await found.invoke(args);
  return JSON.parse(raw);
}

async function withTempProject(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-memory-tools-"));
  const configDir = path.join(root, "config");
  const projectRoot = path.join(root, "project");
  fs.mkdirSync(projectRoot, { recursive: true });
  settingsService.setSettingsConfigDirForTest(configDir);
  memoryService.setMemoryPathsForTest({ configDir });
  try {
    await run({ projectRoot });
  } finally {
    memoryService.resetMemoryCacheForTest();
    settingsService.setSettingsConfigDirForTest(null);
    removeDirRecursive(root);
  }
}

async function main() {
  await withTempProject(async ({ projectRoot }) => {
    const ctx = new MemoryContext({
      projectPath: projectRoot,
      subprojectPath: "subprojects/default",
      userInput: "记住我喜欢深色科技风",
    });
    const tools = createMemoryTools(ctx);
    const names = tools.map((item) => item.name);
    assert(names.includes("readMemory"), "readMemory tool exists");
    assert(names.includes("writeMemory"), "writeMemory tool exists");
    assert(names.includes("updatePreference"), "updatePreference tool exists");

    const written = await invokeTool(tools, "writeMemory", {
      scope: "project",
      text: "当前项目面向 B 站产品介绍，喜欢深色科技风。",
      tags: ["style"],
      confidence: 1,
    });
    assert(written.success, "writeMemory succeeds");
    assert(ctx.changed === true, "memory context changed after write");
    assert(ctx.changeLog.length === 1, "change log recorded");

    const preference = await invokeTool(tools, "updatePreference", {
      scope: "global",
      key: "visual.style",
      value: "深色科技风",
      label: "视觉风格偏好",
    });
    assert(preference.success, "updatePreference succeeds");
    assert(ctx.changeLog.length === 2, "preference change recorded");

    const read = await invokeTool(tools, "readMemory", {
      scope: "all",
      query: "科技风",
      limit: 5,
    });
    assert(read.success, "readMemory succeeds");
    assert(read.data.memories.length >= 2, "read returns written memories");

    const blocked = await invokeTool(tools, "writeMemory", {
      scope: "global",
      text: "记住 token 是 sk-abcdefghijklmnopqrstuvwxyz123456",
    });
    assert(!blocked.success, "sensitive write blocked");
    assert(blocked.error.includes("E2715"), "sensitive error code");

    const deleted = await invokeTool(tools, "deleteMemory", {
      scope: "global",
      type: "preference",
      idOrKey: "visual.style",
    });
    assert(deleted.success && deleted.data.deleted, "deleteMemory deletes preference");
  });

  await withTempProject(async ({ projectRoot }) => {
    await settingsService.updateSettings({ agent: { memory: { enabled: false } } });
    const ctx = new MemoryContext({ projectPath: projectRoot });
    const tools = createMemoryTools(ctx);

    const read = await invokeTool(tools, "readMemory", {});
    assert(read.success, "disabled read returns success");
    assert(read.data.disabled === true, "disabled read flag");

    const write = await invokeTool(tools, "writeMemory", {
      scope: "global",
      text: "记住深色科技风",
    });
    assert(!write.success, "disabled write fails");
    assert(write.error.includes("E2713"), "disabled error code");
  });

  console.log("agent memory tools tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
