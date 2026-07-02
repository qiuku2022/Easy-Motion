const {
  normalizeClipUpdates,
  resolveRelativeClipUpdates,
} = require("../src/main/agent/clip-updates");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const clip = {
    id: "clip-title-main",
    type: "text",
    durationInFrames: 125,
    style: { fontSize: 96, color: "#0A0A0A" },
    transform: { position: { x: 420, y: 520 }, scale: 1 },
  };

  const normalized = normalizeClipUpdates({
    fontSize: 120,
    style: { color: "#ffffff" },
  });
  assert(normalized["style.fontSize"] === 120, "root fontSize -> style.fontSize");
  assert(normalized["style.color"] === "#ffffff", "flatten nested style");

  const bigger = resolveRelativeClipUpdates(clip, "字体大一点", {});
  assert(bigger["style.fontSize"] === 115, "96 * 1.2 = 115");

  const smaller = resolveRelativeClipUpdates(clip, "字体小一点", {});
  assert(smaller["style.fontSize"] === 77, "96 * 0.8 = 77");

  const wrongLlm = resolveRelativeClipUpdates(clip, "字体大一点", { fontSize: 72 });
  assert(wrongLlm["style.fontSize"] === 115, "override wrong LLM fontSize with relative");

  console.log("clip-updates tests passed");
}

main();
