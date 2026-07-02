const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hashContent } = require("../src/main/agent/remotion-context");
const conversationService = require("../src/main/services/conversation-service");
const { removeDirRecursive } = require("../src/main/services/file-service");
const timelineService = require("../src/main/services/timeline-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function buildTimeline(content) {
  return {
    version: "1.0",
    fps: 30,
    durationInFrames: 90,
    width: 1280,
    height: 720,
    tracks: [
      {
        id: "track-text",
        name: "文字",
        type: "text",
        order: 0,
        visible: true,
        locked: false,
        muted: false,
        solo: false,
        clips: [
          {
            id: "clip-title",
            type: "text",
            name: "标题",
            startInFrames: 0,
            durationInFrames: 60,
            source: { kind: "inline", content },
            keyframes: [],
          },
        ],
      },
    ],
  };
}

async function withTempProject(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-mixed-undo-"));
  const subprojectPath = "subprojects/default";
  const subDir = path.join(root, subprojectPath);
  const srcDir = path.join(subDir, "remotion", "src");
  fs.mkdirSync(path.join(srcDir, "components", "custom"), { recursive: true });
  fs.mkdirSync(path.join(srcDir, "presets"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "project.json"),
    JSON.stringify({
      version: "1.0",
      name: "undo",
      subprojects: [{ id: "sub-default", path: subprojectPath }],
    }),
    "utf8"
  );
  fs.writeFileSync(
    path.join(subDir, "subproject.json"),
    JSON.stringify({
      name: "默认",
      timeline: buildTimeline("before"),
      conversation: {
        messages: [
          {
            id: "m-ai",
            role: "assistant",
            content: "done",
            timestamp: 1,
            actionButtons: [
              { id: "undo-agent", label: "撤销此次 AI 修改", action: "undo-agent" },
            ],
          },
        ],
        pendingAgentUndo: { messageId: "m-ai" },
      },
    }),
    "utf8"
  );
  try {
    await run({ root, subprojectPath, srcDir });
  } finally {
    removeDirRecursive(root);
  }
}

async function main() {
  await withTempProject(async ({ root, subprojectPath, srcDir }) => {
    const componentPath = path.join(srcDir, "components", "custom", "ParticleBg.tsx");
    const afterContent = "export const ParticleBg = () => null;\n";
    fs.writeFileSync(componentPath, afterContent, "utf8");

    await timelineService.saveTimeline(root, buildTimeline("after"), subprojectPath);
    await conversationService.saveAgentUndoSnapshot(root, subprojectPath, {
      messageId: "m-ai",
      timeline: buildTimeline("before"),
      remotionFilesBefore: [
        {
          relativePath: "components/custom/ParticleBg.tsx",
          existedBefore: false,
          contentBefore: null,
          existedAfter: true,
          hashAfter: hashContent(afterContent),
        },
      ],
    });

    const pending = conversationService.resolvePendingAgentUndo(root, subprojectPath);
    assert(pending?.messageId === "m-ai", "mixed undo snapshot resolves");
    assert(pending.remotionFilesBefore.length === 1, "mixed undo includes remotion snapshots");

    const restored = await conversationService.restoreAgentUndoSnapshot(root, subprojectPath, {
      messageId: "m-ai",
    });
    assert(restored.restored, "restoreAgentUndoSnapshot restored");
    const restoredTimeline = timelineService.loadTimeline(root, subprojectPath);
    assert(
      restoredTimeline.tracks[0].clips[0].source.content === "before",
      "restoreAgentUndoSnapshot restores timeline"
    );
    assert(!fs.existsSync(componentPath), "restoreAgentUndoSnapshot deletes created file");
    assert(
      conversationService.resolvePendingAgentUndo(root, subprojectPath) === null,
      "restoreAgentUndoSnapshot clears pending undo"
    );
  });

  await withTempProject(async ({ root, subprojectPath, srcDir }) => {
    const componentPath = path.join(srcDir, "components", "custom", "ParticleBg.tsx");
    const afterContent = "export const ParticleBg = () => null;\n";
    fs.writeFileSync(componentPath, afterContent, "utf8");
    await conversationService.saveConversation(root, {
      version: "1.0",
      messages: [
        {
          id: "m-ai",
          role: "assistant",
          content: "done",
          timestamp: 1,
          actionButtons: [
            { id: "undo-agent", label: "撤销此次 AI 修改", action: "undo-agent" },
          ],
        },
      ],
      pendingAgentUndo: { messageId: "m-ai" },
    }, subprojectPath);
    await conversationService.saveAgentUndoSnapshot(root, subprojectPath, {
      messageId: "m-ai",
      timeline: buildTimeline("before"),
      remotionFilesBefore: [
        {
          relativePath: "components/custom/ParticleBg.tsx",
          existedBefore: false,
          contentBefore: null,
          existedAfter: true,
          hashAfter: hashContent(afterContent),
        },
      ],
    });
    fs.writeFileSync(componentPath, "export const ParticleBg = () => <div />;\n", "utf8");

    let conflictThrown = false;
    try {
      await conversationService.restoreAgentUndoSnapshot(root, subprojectPath, {
        messageId: "m-ai",
      });
    } catch (error) {
      conflictThrown = error.message.includes("E2010");
    }
    assert(conflictThrown, "restoreAgentUndoSnapshot rejects remotion hash conflict");
    assert(fs.existsSync(componentPath), "conflict keeps current file");
  });

  console.log("test-agent-mixed-undo: passed");
}

main().catch((error) => {
  console.error("test-agent-mixed-undo: FAIL", error);
  process.exit(1);
});
