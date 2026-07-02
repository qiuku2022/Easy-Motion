const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { loadEnv } = require("../src/main/utils/load-env");
const { resolveLlmConfig } = require("../src/main/services/llm-service");
const { createProject } = require("../src/main/services/project-service");
const timelineService = require("../src/main/services/timeline-service");
const agentService = require("../src/main/services/agent-service");

class MockWebContents {
  constructor() {
    this.events = [];
    this.destroyed = false;
  }

  isDestroyed() {
    return this.destroyed;
  }

  send(channel, payload) {
    this.events.push({ channel, payload });
  }

  waitForComplete(requestId, timeoutMs = 180000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        const complete = this.events.find(
          (event) =>
            event.channel === "renderer:conversation:complete" &&
            event.payload.requestId === requestId
        );
        if (complete) {
          resolve(complete.payload);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          reject(new Error("timeout waiting for conversation complete"));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    });
  }
}

async function main() {
  loadEnv();
  const config = resolveLlmConfig();
  if (!config.apiKey) {
    console.log("test-agent-service-flow: skip (no API key)");
    return;
  }

  const parentPath = path.join(os.tmpdir(), `em-agent-flow-${Date.now()}`);
  fs.mkdirSync(parentPath, { recursive: true });

  const created = await createProject({
    name: "AgentFlowTest",
    parentPath,
  });

  const projectPath = created.path;
  const subprojectPath = "subprojects/default";
  const webContents = new MockWebContents();
  const requestId = "req-test-1";

  agentService.startConversationSend(webContents, {
    requestId,
    message: "创建一个标题写着 Hello 的文字，白色，画面中央",
    messages: [],
    subprojectPath,
  });

  const complete = await webContents.waitForComplete(requestId);
  if (!complete.timelineUpdated) {
    throw new Error(`expected timelineUpdated, got ${JSON.stringify(complete)}`);
  }

  const onDisk = timelineService.loadTimeline(projectPath, subprojectPath);
  const hasHello = onDisk.tracks.some((track) =>
    (track.clips ?? []).some(
      (clip) =>
        clip.source?.content?.includes("Hello") || clip.name?.includes("Hello")
    )
  );
  if (!hasHello) {
    throw new Error("timeline on disk missing Hello clip after agent-service flow");
  }

  fs.rmSync(parentPath, { recursive: true, force: true });
  console.log("test-agent-service-flow: PASS");
}

main().catch((error) => {
  console.error("test-agent-service-flow: FAIL", error);
  process.exit(1);
});
