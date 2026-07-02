const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { removeDirRecursive } = require("../src/main/services/file-service");
const conversationService = require("../src/main/services/conversation-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrowsE2701(fn, message) {
  let error;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  assert(error?.message?.includes("E2701"), message);
}

async function withTempProject(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "em-conv-"));
  const subDir = path.join(root, "subprojects", "default");
  fs.mkdirSync(subDir, { recursive: true });

  fs.writeFileSync(
    path.join(root, "project.json"),
    JSON.stringify({
      version: "1.0",
      name: "test",
      subprojects: [{ id: "sub-default", path: "subprojects/default" }],
    }),
    "utf8"
  );

  fs.writeFileSync(
    path.join(subDir, "subproject.json"),
    JSON.stringify({ conversation: { messages: [] } }),
    "utf8"
  );

  try {
    await run(root);
  } finally {
    removeDirRecursive(root);
  }
}

async function main() {
  await withTempProject(async (root) => {
    const empty = conversationService.loadConversation(root);
    assert(empty.messages.length === 0, "empty conversation should have no messages");

    const saved = await conversationService.saveConversation(root, {
      version: "1.0",
      messages: [
        {
          id: "m1",
          role: "user",
          content: "hello",
          timestamp: 1,
        },
      ],
    });

    assert(saved.saved === true, "save should return saved=true");
    assert(
      fs.existsSync(path.join(root, "subprojects", "default", "conversation.json")),
      "conversation.json should exist"
    );

    const reloaded = conversationService.loadConversation(root);
    assert(reloaded.messages.length === 1, "reloaded conversation should have one message");
    assert(reloaded.messages[0].content === "hello", "message content should match");

    const timeline = {
      version: "1.0",
      fps: 30,
      durationInFrames: 90,
      width: 1280,
      height: 720,
      tracks: [],
    };

    await conversationService.saveAgentUndoSnapshot(root, "subprojects/default", {
      messageId: "m-ai-1",
      timeline,
    });

    assert(
      fs.existsSync(
        path.join(root, "subprojects", "default", "agent-undo-snapshot.json")
      ),
      "agent undo snapshot file should exist"
    );

    const withUndo = conversationService.loadConversation(root);
    assert(
      withUndo.pendingAgentUndo?.messageId === "m-ai-1",
      "conversation should reference pending undo message"
    );

    const pending = conversationService.resolvePendingAgentUndo(root);
    assert(pending === null, "pending undo requires matching message in conversation");

    await conversationService.saveConversation(root, {
      version: "1.0",
      messages: [
        {
          id: "m-ai-1",
          role: "assistant",
          content: "done",
          timestamp: 2,
          actionButtons: [
            { id: "undo-agent", label: "撤销此次 AI 修改", action: "undo-agent" },
          ],
        },
      ],
      pendingAgentUndo: { messageId: "m-ai-1" },
    });

    const resolved = conversationService.resolvePendingAgentUndo(root);
    assert(resolved?.messageId === "m-ai-1", "pending undo should resolve");
    assert(resolved?.timeline?.fps === 30, "pending undo should include timeline");

    await conversationService.clearAgentUndoSnapshot(root);
    assert(
      !fs.existsSync(
        path.join(root, "subprojects", "default", "agent-undo-snapshot.json")
      ),
      "agent undo snapshot should be removed"
    );

    const conversationPath = path.join(
      root,
      "subprojects",
      "default",
      "conversation.json"
    );

    fs.writeFileSync(conversationPath, "{ not-json", "utf8");
    assertThrowsE2701(
      () => conversationService.loadConversation(root),
      "invalid JSON in conversation.json should throw E2701"
    );

    fs.writeFileSync(
      conversationPath,
      JSON.stringify({
        version: "1.0",
        messages: [{ role: "bot", content: "hello" }],
      }),
      "utf8"
    );
    assertThrowsE2701(
      () => conversationService.loadConversation(root),
      "invalid message role should throw E2701"
    );

    assertThrowsE2701(
      () => conversationService.normalizeConversation(null),
      "normalizeConversation(null) should throw E2701"
    );

    fs.unlinkSync(conversationPath);
    fs.writeFileSync(
      path.join(root, "subprojects", "default", "subproject.json"),
      "{ broken-json",
      "utf8"
    );
    assertThrowsE2701(
      () => conversationService.loadConversation(root),
      "invalid subproject.json should throw E2701"
    );
  });

  console.log("conversation-service tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
