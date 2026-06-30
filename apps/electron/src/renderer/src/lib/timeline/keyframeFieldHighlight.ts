/** 播放头处有关键帧时，属性输入框高亮（用 border，避免 ring 被 overflow 裁切） */
export const KEYFRAME_AT_PLAYHEAD_INPUT_CLASS =
  "border-amber-400/60 focus-visible:border-amber-400/70 focus-visible:ring-amber-400/25";

/** 非 input 控件（如取色器行） */
export const KEYFRAME_AT_PLAYHEAD_FIELD_CLASS =
  "rounded-md ring-inset ring-1 ring-amber-400/50";
