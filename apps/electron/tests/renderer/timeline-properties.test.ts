import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPatchFromPropertyPath } from "../../src/renderer/src/lib/timeline/clipPropertySchema";
import {
  clampOpacityInternal,
  opacityFromPercent,
  opacityInternalToFormValue,
} from "../../src/renderer/src/lib/timeline/opacityProperty";
import { snapPositionValue } from "../../src/renderer/src/lib/timeline/positionProperty";
import {
  clampScaleInternal,
  scaleFromPercent,
  scaleInternalToFormValue,
} from "../../src/renderer/src/lib/timeline/scaleProperty";
import {
  buildResetAllTransformPatch,
  buildResetTransformPropertyPatch,
  getDefaultTransformPropertyValue,
} from "../../src/renderer/src/lib/timeline/transformReset";
import type { Clip } from "../../src/renderer/src/types/timeline";

describe("timeline property conversions", () => {
  it("converts opacity percentages without applying the conversion twice", () => {
    assert.equal(opacityFromPercent(50), 0.5);
    assert.equal(opacityFromPercent(0), 0);
    assert.equal(opacityFromPercent(100), 1);
    assert.equal(clampOpacityInternal(0.5), 0.5);
    assert.equal(opacityInternalToFormValue(1), "100");
    assert.equal(opacityInternalToFormValue(0.995), "100");

    const patch = buildPatchFromPropertyPath("transform.opacity", 0.5);
    assert.equal(patch.transform?.opacity, 0.5);
  });

  it("converts scale percentages and preserves internal scale values", () => {
    assert.equal(scaleFromPercent(100), 1);
    assert.equal(scaleFromPercent(150), 1.5);
    assert.equal(scaleFromPercent(-50), -0.5);
    assert.equal(clampScaleInternal(1.5), 1.5);
    assert.equal(scaleInternalToFormValue(-1), "-100");

    const patch = buildPatchFromPropertyPath("transform.scale", 1.5);
    assert.equal(patch.transform?.scale, 1.5);
  });

  it("snaps positions to integer timeline coordinates", () => {
    assert.equal(snapPositionValue(960.4), 960);
    assert.equal(snapPositionValue(640.6), 641);
    assert.equal(snapPositionValue("x"), 0);
  });
});

describe("timeline transform reset", () => {
  const canvas = { width: 1920, height: 1080 };
  const clip: Clip = {
    id: "clip-1",
    type: "text",
    name: "Title",
    startInFrames: 0,
    durationInFrames: 60,
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

  it("resets one property and removes only its keyframes", () => {
    assert.equal(getDefaultTransformPropertyValue("transform.position.x", canvas), 960);
    assert.equal(getDefaultTransformPropertyValue("transform.opacity", canvas), 1);

    const patch = buildResetTransformPropertyPatch(clip, "transform.scale", canvas);
    assert.equal(patch.transform?.scale, 1);
    assert.deepEqual(
      patch.keyframes?.map((keyframe) => keyframe.property),
      ["transform.opacity"]
    );
  });

  it("resets all transform values and removes transform keyframes", () => {
    const patch = buildResetAllTransformPatch(clip, canvas);
    assert.deepEqual(patch.transform?.position, { x: 960, y: 540 });
    assert.equal(patch.transform?.scale, 1);
    assert.equal(patch.transform?.rotation, 0);
    assert.equal(patch.transform?.opacity, 1);
    assert.deepEqual(patch.keyframes, []);
  });
});
