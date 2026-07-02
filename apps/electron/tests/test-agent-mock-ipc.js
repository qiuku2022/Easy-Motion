const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  createProject,
  openProject,
  deleteProject,
} = require("../src/main/services/project-service");

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

  waitForComplete(requestId, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        const complete = this.events.find(
          (event) =>
            event.channel === "renderer:conversation:complete" &&
            event.payload.requestId === requestId,
        );
        if (complete) {
          resolve(complete.payload);
          return;
        }
        const errorEvent = this.events.find(
          (event) =>
            event.channel === "renderer:conversation:error" &&
            event.payload.requestId === requestId,
        );
        if (errorEvent) {
          reject(new Error(errorEvent.payload.message));
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

function loadAgentServiceWithMock(mockRunAgent) {
  const agentPath = require.resolve("../src/main/agent");
  const servicePath = require.resolve("../src/main/services/agent-service");
  delete require.cache[servicePath];
  delete require.cache[agentPath];

  const agent = require(agentPath);
  agent.runAgent = mockRunAgent;
  return require(servicePath);
}

function buildHelloTimeline(base) {
  return {
    ...base,
    tracks: [
      {
        id: "track-text-1",
        name: "标题",
        type: "text",
        clips: [
          {
            id: "clip-hello-1",
            name: "Hello",
            startInFrames: 0,
            durationInFrames: base.durationInFrames,
            source: { kind: "inline", content: "Hello" },
            style: { fontSize: 72, color: "#ffffff" },
          },
        ],
      },
    ],
  };
}

async function main() {
  const parentPath = path.join(os.tmpdir(), `em-mock-ipc-${Date.now()}`);
  fs.mkdirSync(parentPath, { recursive: true });

  const created = await createProject({
    name: "MockIpcTest",
    parentPath,
    width: 1280,
    height: 720,
    fps: 30,
  });

  await openProject(created.path);

  const timelineService = require("../src/main/services/timeline-service");
  const baseTimeline = timelineService.loadTimeline(
    created.path,
    "subprojects/default",
  );
  const updatedTimeline = buildHelloTimeline(baseTimeline);

  const agentService = loadAgentServiceWithMock(async () => ({
    reply: "已添加 Hello 标题（mock）",
    timeline: updatedTimeline,
    timelineChanged: true,
    changeLog: [{ op: "createTrack", trackId: "track-text-1" }],
    simplifiedMode: false,
    systemNotice: null,
  }));

  const webContents = new MockWebContents();
  const requestId = "req-mock-1";

  agentService.startConversationSend(webContents, {
    requestId,
    message: "创建一个标题写着 Hello",
    messages: [],
    subprojectPath: "subprojects/default",
  });

  const complete = await webContents.waitForComplete(requestId);
  if (!complete.timelineUpdated) {
    throw new Error(`expected timelineUpdated, got ${JSON.stringify(complete)}`);
  }

  const onDisk = timelineService.loadTimeline(
    created.path,
    "subprojects/default",
  );
  const hasHello = onDisk.tracks.some((track) =>
    (track.clips ?? []).some(
      (clip) =>
        clip.source?.content?.includes("Hello") || clip.name?.includes("Hello"),
    ),
  );
  if (!hasHello) {
    throw new Error("timeline on disk missing Hello clip after mock IPC flow");
  }

  const statusEvents = webContents.events.filter(
    (event) => event.channel === "renderer:conversation:status",
  );
  if (!statusEvents.some((event) => event.payload.status === "parsing")) {
    throw new Error("expected parsing status event");
  }

  await deleteProject(created.path);
  fs.rmSync(parentPath, { recursive: true, force: true });
  console.log("test-agent-mock-ipc: passed");
}

main().catch((error) => {
  console.error("test-agent-mock-ipc: FAIL", error);
  process.exit(1);
});
