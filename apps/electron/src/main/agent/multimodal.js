const fs = require("node:fs");
const path = require("node:path");
const { HumanMessage } = require("langchain");
const { resolveAiRefPath } = require("../services/ai-ref-service");

const MAX_IMAGES = 3;

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function readImageBase64(projectPath, imagePath) {
  const absolute = path.isAbsolute(imagePath)
    ? imagePath
    : resolveAiRefPath(projectPath, imagePath);
  const ext = path.extname(absolute).toLowerCase();
  const mime = MIME_BY_EXT[ext] ?? "image/jpeg";
  const data = fs.readFileSync(absolute).toString("base64");
  return { mime, data, absolute };
}

function buildImageContentBlock(projectPath, imagePath) {
  const { mime, data } = readImageBase64(projectPath, imagePath);
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${data}` },
  };
}

function buildMultimodalHumanMessage({ text, imagePaths = [], projectPath }) {
  const paths = imagePaths.slice(0, MAX_IMAGES);
  if (!paths.length) {
    return new HumanMessage(text);
  }

  const content = [{ type: "text", text }];
  for (const imagePath of paths) {
    content.push(buildImageContentBlock(projectPath, imagePath));
  }
  return new HumanMessage({ content });
}

function resolveImagePaths(projectPath, attachedImages = []) {
  return attachedImages
    .map((item) => {
      if (typeof item === "string") return resolveAiRefPath(projectPath, item);
      return (
        item?.path ||
        (item?.relativePath && resolveAiRefPath(projectPath, item.relativePath))
      );
    })
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
}

module.exports = {
  MAX_IMAGES,
  buildMultimodalHumanMessage,
  buildImageContentBlock,
  resolveImagePaths,
  readImageBase64,
};
