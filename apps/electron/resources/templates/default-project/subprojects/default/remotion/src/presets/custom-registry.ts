import type { FC } from "react";
import { CinematicTechShowcase } from "../components/custom/CinematicTechShowcase";

/** Agent-maintained custom component registry. Do not edit MainSequence.tsx manually. */
export const CUSTOM_COMPONENT_MAP: Record<string, FC> = {
  CinematicTechShowcase: CinematicTechShowcase as unknown as FC,
};

export function resolveCustomComponent(name: string): FC | undefined {
  return CUSTOM_COMPONENT_MAP[name];
}
