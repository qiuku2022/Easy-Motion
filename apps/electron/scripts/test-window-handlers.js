const { readWindowState } = require("../src/main/ipc-handlers/window");

function testReadWindowState() {
  const state = readWindowState({
    isMaximized: () => true,
    isFullScreen: () => false,
  });

  if (!state.maximized || state.fullscreen) {
    throw new Error("readWindowState maximized/fullscreen mismatch");
  }

  const fullscreen = readWindowState({
    isMaximized: () => false,
    isFullScreen: () => true,
  });

  if (fullscreen.maximized || !fullscreen.fullscreen) {
    throw new Error("readWindowState fullscreen mismatch");
  }
}

testReadWindowState();
console.log("test-window-handlers: ok");
