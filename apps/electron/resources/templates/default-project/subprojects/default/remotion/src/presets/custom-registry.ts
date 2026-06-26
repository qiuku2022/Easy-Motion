import type { FC } from "react";

/** Agent-maintained custom component registry. Do not edit MainSequence.tsx manually. */
export const CUSTOM_COMPONENT_MAP: Record<string, FC> = {};

export function resolveCustomComponent(name: string): FC | undefined {
  return CUSTOM_COMPONENT_MAP[name];
}
