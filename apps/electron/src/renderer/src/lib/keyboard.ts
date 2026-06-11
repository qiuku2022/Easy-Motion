/** 是否为可编辑控件（输入框、文本域等） */
export function isEditableElement(el: Element | null | undefined): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/** 点击非输入区域时，将焦点从属性面板等输入框移开，以便时间线快捷键生效 */
export function blurEditableFocusUnlessTarget(target: EventTarget | null) {
  if (isEditableElement(target as Element)) return;
  const active = document.activeElement;
  if (isEditableElement(active)) {
    (active as HTMLElement).blur();
  }
}

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
