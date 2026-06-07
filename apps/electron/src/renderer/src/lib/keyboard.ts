/** 是否 macOS（Cmd 作为修饰键） */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

/** Premiere 风格：Win/Linux 用 Ctrl，macOS 用 Cmd */
export function isModKey(e: Pick<KeyboardEvent, "metaKey" | "ctrlKey">): boolean {
  return isMacPlatform() ? e.metaKey : e.ctrlKey;
}

export function modKeyLabel(): string {
  return isMacPlatform() ? "Cmd" : "Ctrl";
}
