import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { PreviewApp } from "./PreviewApp";

const rootEl = document.getElementById("root");
if (rootEl) {
  const previewWindow = window as typeof window & {
    __EASYMOTION_PREVIEW_ROOT__?: Root;
  };
  const root = previewWindow.__EASYMOTION_PREVIEW_ROOT__ ?? createRoot(rootEl);
  previewWindow.__EASYMOTION_PREVIEW_ROOT__ = root;
  root.render(React.createElement(PreviewApp));
}
