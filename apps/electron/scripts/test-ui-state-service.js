const {
  clampBoundsToWorkArea,
  normalizeMainWindowState,
} = require("../src/main/services/ui-state-service");

function testClampBoundsToWorkArea() {
  const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
  const clamped = clampBoundsToWorkArea(
    { x: 2000, y: 1200, width: 1440, height: 900 },
    workArea,
    1200,
    700,
  );

  if (clamped.x + clamped.width > workArea.width) {
    throw new Error("clamped window exceeds work area width");
  }
  if (clamped.y + clamped.height > workArea.height) {
    throw new Error("clamped window exceeds work area height");
  }
  if (clamped.width < 1200 || clamped.height < 700) {
    throw new Error("clamped window below minimum size");
  }
}

function testNormalizeMainWindowState() {
  const state = normalizeMainWindowState({
    x: 10.2,
    y: 20.8,
    width: 1440,
    height: 900,
    maximized: true,
    fullscreen: false,
  });

  if (!state || state.x !== 10 || state.y !== 21 || !state.maximized) {
    throw new Error("normalize main window state failed");
  }

  if (normalizeMainWindowState({ x: "bad" })) {
    throw new Error("invalid state should return null");
  }
}

testClampBoundsToWorkArea();
testNormalizeMainWindowState();
console.log("[PASS] ui-state-service");
