const timeline = require("./timeline");
const trackSolo = require("./track-solo");
const previewVisibility = require("./preview-visibility");
const keyframes = require("./keyframes");
const workArea = require("./work-area");

module.exports = {
  ...timeline,
  ...trackSolo,
  ...previewVisibility,
  ...keyframes,
  ...workArea,
};
