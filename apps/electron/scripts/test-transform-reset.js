/**
 * 变换属性重置：默认值、单项重置、全部重置与关键帧清除。
 */
const assert = require("node:assert/strict");

function ensureTransform(transform, canvas) {
  const cx = canvas?.width ? canvas.width / 2 : 640;
  const cy = canvas?.height ? canvas.height / 2 : 360;
  return {
    position: {
      x: transform?.position?.x ?? cx,
      y: transform?.position?.y ?? cy,
    },
    scale: transform?.scale ?? 1,
    rotation: transform?.rotation ?? 0,
    opacity: transform?.opacity ?? 1,
  };
}

function getDefaultTransformPropertyValue(path, canvas) {
  const defaults = ensureTransform(undefined, canvas);
  if (path === "transform.position.x") return defaults.position.x;
  if (path === "transform.position.y") return defaults.position.y;
  if (path === "transform.scale") return defaults.scale;
  if (path === "transform.rotation") return defaults.rotation;
  if (path === "transform.opacity") return defaults.opacity;
  throw new Error(`非变换属性：${path}`);
}

function buildResetTransformPropertyPatch(clip, path, canvas) {
  const defaultValue = getDefaultTransformPropertyValue(path, canvas);
  const keyframes = (clip.keyframes ?? []).filter((kf) => kf.property !== path);
  const patch = { keyframes };
  if (path === "transform.position.x") {
    patch.transform = { position: { x: defaultValue } };
  } else if (path === "transform.position.y") {
    patch.transform = { position: { y: defaultValue } };
  } else if (path === "transform.scale") {
    patch.transform = { scale: defaultValue };
  } else if (path === "transform.rotation") {
    patch.transform = { rotation: defaultValue };
  } else if (path === "transform.opacity") {
    patch.transform = { opacity: defaultValue };
  }
  return patch;
}

function buildResetAllTransformPatch(clip, canvas) {
  const defaults = ensureTransform(undefined, canvas);
  const transformPaths = new Set([
    "transform.position.x",
    "transform.position.y",
    "transform.scale",
    "transform.rotation",
    "transform.opacity",
  ]);
  return {
    transform: {
      position: { ...defaults.position },
      scale: defaults.scale,
      rotation: defaults.rotation,
      opacity: defaults.opacity,
    },
    keyframes: (clip.keyframes ?? []).filter((kf) => !transformPaths.has(kf.property)),
  };
}

function run() {
  const canvas = { width: 1920, height: 1080 };
  const clip = {
    transform: {
      position: { x: 100, y: 200 },
      scale: 2,
      rotation: 45,
      opacity: 0.5,
    },
    keyframes: [
      { id: "kf1", property: "transform.opacity", frame: 0, value: 0.2 },
      { id: "kf2", property: "transform.scale", frame: 30, value: 1.5 },
    ],
  };

  assert.equal(getDefaultTransformPropertyValue("transform.position.x", canvas), 960);
  assert.equal(getDefaultTransformPropertyValue("transform.opacity", canvas), 1);

  const resetScale = buildResetTransformPropertyPatch(clip, "transform.scale", canvas);
  assert.equal(resetScale.transform.scale, 1);
  assert.equal(resetScale.keyframes.length, 1);
  assert.equal(resetScale.keyframes[0].property, "transform.opacity");

  const resetAll = buildResetAllTransformPatch(clip, canvas);
  assert.deepEqual(resetAll.transform.position, { x: 960, y: 540 });
  assert.equal(resetAll.transform.scale, 1);
  assert.equal(resetAll.keyframes.length, 0);

  console.log("[PASS] transform-reset");
}

run();
