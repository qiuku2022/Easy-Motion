/** 与 docs/requirements/时间线编辑.md 关键帧 property 路径一致 */

export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function setValueByPath<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  value: unknown,
): T {
  const parts = path.split(".");
  const root = { ...obj } as Record<string, unknown>;
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]!;
    const next = current[part];
    const cloned =
      next != null && typeof next === "object"
        ? { ...(next as Record<string, unknown>) }
        : {};
    current[part] = cloned;
    current = cloned;
  }
  current[parts[parts.length - 1]!] = value;
  return root as T;
}
