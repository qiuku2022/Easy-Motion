/** 与 remotion preview-entry.tsx 保持一致 */
export const PREVIEW_CHANNEL = "easymotion-preview";

export type PreviewOutbound =
  | { channel: typeof PREVIEW_CHANNEL; type: "PLAY" }
  | { channel: typeof PREVIEW_CHANNEL; type: "PAUSE" }
  | { channel: typeof PREVIEW_CHANNEL; type: "SEEK"; frame: number }
  | { channel: typeof PREVIEW_CHANNEL; type: "RELOAD" }
  | { channel: typeof PREVIEW_CHANNEL; type: "SET_LOOP"; loop: boolean }
  | { channel: typeof PREVIEW_CHANNEL; type: "TIMELINE_UPDATE"; timeline: unknown };

export type PreviewInbound =
  | { channel: typeof PREVIEW_CHANNEL; type: "READY" }
  | { channel: typeof PREVIEW_CHANNEL; type: "FRAME_CHANGE"; frame: number }
  | { channel: typeof PREVIEW_CHANNEL; type: "PLAYBACK_STATE"; playing: boolean };

export function postPreview(
  target: Window | null | undefined,
  message: PreviewOutbound
) {
  target?.postMessage(message, "*");
}

export function parsePreviewMessage(data: unknown): PreviewInbound | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as Record<string, unknown>;
  if (msg.channel !== PREVIEW_CHANNEL) return null;
  if (msg.type === "READY") {
    return { channel: PREVIEW_CHANNEL, type: "READY" };
  }
  if (msg.type === "FRAME_CHANGE" && typeof msg.frame === "number") {
    return { channel: PREVIEW_CHANNEL, type: "FRAME_CHANGE", frame: msg.frame };
  }
  if (msg.type === "PLAYBACK_STATE" && typeof msg.playing === "boolean") {
    return { channel: PREVIEW_CHANNEL, type: "PLAYBACK_STATE", playing: msg.playing };
  }
  return null;
}
