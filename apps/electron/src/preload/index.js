const { contextBridge, ipcRenderer } = require("electron");

async function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld("easyMotion", {
  version: "0.1.1",
  shell: {
    platform: process.platform,
    trafficLightInset: process.platform === "darwin",
    customWindowControls:
      process.platform === "win32" || process.platform === "linux",
  },
  window: {
    minimize: () => invoke("main:window:minimize"),
    toggleMaximize: () => invoke("main:window:toggleMaximize"),
    close: () => invoke("main:window:close"),
    getState: () => invoke("main:window:getState"),
    onStateChanged: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:window:stateChanged", listener);
      return () =>
        ipcRenderer.removeListener("renderer:window:stateChanged", listener);
    },
  },
  project: {
    create: (config) => invoke("main:project:create", config),
    open: (path) => invoke("main:project:open", { path }),
    save: () => invoke("main:project:save"),
    listRecent: () => invoke("main:project:listRecent"),
    listLocal: () => invoke("main:project:listLocal"),
    delete: (path, options) => invoke("main:project:delete", { path, options }),
    getCurrent: () => invoke("main:project:getCurrent"),
    close: () => invoke("main:project:close"),
    pickParentDirectory: () => invoke("main:project:pickParentDirectory"),
    pickProjectDirectory: () => invoke("main:project:pickProjectDirectory"),
  },
  timeline: {
    load: (payload) => invoke("main:timeline:load", payload),
    save: (payload) => invoke("main:timeline:save", payload),
    applySample: (payload) => invoke("main:timeline:applySample", payload),
    generate: (payload) => invoke("main:timeline:generate", payload),
    checkRemotionDrift: (payload) =>
      invoke("main:timeline:checkRemotionDrift", payload),
    syncFromRemotion: (payload) =>
      invoke("main:timeline:syncFromRemotion", payload),
    syncPreviewManifest: (payload) =>
      invoke("main:timeline:syncPreviewManifest", payload),
  },
  preview: {
    start: (payload) => invoke("main:preview:start", payload),
    stop: () => invoke("main:preview:stop"),
    getState: () => invoke("main:preview:getState"),
    onLog: (callback) => {
      ipcRenderer.on("renderer:preview:log", (_event, data) => callback(data));
    },
  },
  asset: {
    list: () => invoke("main:asset:list"),
    importFiles: (payload) => invoke("main:asset:import", payload),
    pickAndImport: (payload) => invoke("main:asset:pickAndImport", payload),
    updateMeta: (payload) => invoke("main:asset:updateMeta", payload),
    recordUsage: (payload) => invoke("main:asset:recordUsage", payload),
    readThumbnail: (payload) => invoke("main:asset:readThumbnail", payload),
  },
  data: {
    pickAndParse: () => invoke("main:data:pickAndParse"),
    mapChart: (payload) => invoke("main:data:mapChart", payload),
  },
  llm: {
    stream: (payload) => invoke("main:llm:stream", payload),
    cancel: (payload) => invoke("main:llm:cancel", payload),
    onChunk: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:llm:chunk", listener);
      return () => ipcRenderer.removeListener("renderer:llm:chunk", listener);
    },
  },
  settings: {
    get: (payload) => invoke("main:settings:get", payload),
    update: (payload) => invoke("main:settings:update", payload),
    setLlmApiKey: (payload) => invoke("main:settings:setLlmApiKey", payload),
    validateLLMKey: (payload) => invoke("main:settings:validateLLMKey", payload),
  },
  conversation: {
    load: (payload) => invoke("main:conversation:load", payload),
    save: (payload) => invoke("main:conversation:save", payload),
    clear: (payload) => invoke("main:conversation:clear", payload),
    saveAgentUndo: (payload) => invoke("main:conversation:saveAgentUndo", payload),
    clearAgentUndo: (payload) => invoke("main:conversation:clearAgentUndo", payload),
    pickAiRefs: (payload) => invoke("main:conversation:pickAiRefs", payload),
    readAiRefPreview: (payload) => invoke("main:conversation:readAiRefPreview", payload),
    send: (payload) => invoke("main:conversation:send", payload),
    cancel: (payload) => invoke("main:conversation:cancel", payload),
    onChunk: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:conversation:chunk", listener);
      return () => ipcRenderer.removeListener("renderer:conversation:chunk", listener);
    },
    onComplete: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:conversation:complete", listener);
      return () => ipcRenderer.removeListener("renderer:conversation:complete", listener);
    },
    onError: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:conversation:error", listener);
      return () => ipcRenderer.removeListener("renderer:conversation:error", listener);
    },
    onStatus: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:conversation:status", listener);
      return () => ipcRenderer.removeListener("renderer:conversation:status", listener);
    },
  },
  export: {
    start: (payload) => invoke("main:export:start", payload),
    project: (payload) => invoke("main:export:project", payload),
    cancel: (exportId) => invoke("main:export:cancel", { exportId }),
    pickOutput: (payload) => invoke("main:export:pickOutput", payload),
    pickProjectOutput: (payload) => invoke("main:export:pickProjectOutput", payload),
    getActive: () => invoke("main:export:getActive"),
    onProgress: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:export:progress", listener);
      return () => ipcRenderer.removeListener("renderer:export:progress", listener);
    },
    onCompleted: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:export:completed", listener);
      return () => ipcRenderer.removeListener("renderer:export:completed", listener);
    },
    onError: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on("renderer:export:error", listener);
      return () => ipcRenderer.removeListener("renderer:export:error", listener);
    },
  },
});
