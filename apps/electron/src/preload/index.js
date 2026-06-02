const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("easyMotion", {
  version: "0.1.0"
});
