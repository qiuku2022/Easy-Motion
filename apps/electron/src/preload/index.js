const { contextBridge, ipcRenderer } = require("electron");

async function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld("easyMotion", {
  version: "0.1.0",
  project: {
    create: (config) => invoke("main:project:create", config),
    open: (path) => invoke("main:project:open", { path }),
    save: () => invoke("main:project:save"),
    listRecent: () => invoke("main:project:listRecent"),
    delete: (path, options) => invoke("main:project:delete", { path, options }),
    getCurrent: () => invoke("main:project:getCurrent"),
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
});
