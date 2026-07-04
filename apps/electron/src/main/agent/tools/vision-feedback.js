const { tool } = require("langchain");
const { z } = require("zod");

function toolResult(success, data, error) {
  return JSON.stringify({ success, data, error });
}

function failTool(ctx, toolName, error, input) {
  ctx.recordFailure?.(toolName, error, input);
  return toolResult(false, undefined, error.message || String(error));
}

function createVisionFeedbackTools(ctx) {
  const frameSelectorSchema = {
    frame: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("目标全局帧号，优先级高于 timeSeconds"),
    timeSeconds: z
      .number()
      .min(0)
      .optional()
      .describe("按当前 timeline fps 换算为帧号；未传 frame 时生效"),
    reason: z.string().optional().describe("本次操作要检查的视觉目标"),
  };

  const renderFrameTool = tool(
    async (input = {}) => {
      try {
        const data = await ctx.renderFrame(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "renderFrame", error, input);
      }
    },
    {
      name: "renderFrame",
      description:
        "将当前 Agent 本轮内存 timeline 的指定帧离屏渲染为 PNG，用于视觉自检。不是导出视频；若刚修改 Remotion 自定义源码，应先调用 compileRemotionCheck。",
      schema: z.object({
        ...frameSelectorSchema,
        scale: z
          .union([z.literal(0.5), z.literal(1)])
          .optional()
          .describe("渲染缩放，第一版仅支持 0.5 或 1，默认 1"),
      }),
    }
  );

  const seekPlayheadTool = tool(
    async (input = {}) => {
      try {
        const data = await ctx.seekPlayhead(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "seekPlayhead", error, input);
      }
    },
    {
      name: "seekPlayhead",
      description:
        "请求 renderer 将实时预览播放头跳到指定帧，用于后续 capturePreview。不会修改 timeline，也不会导出视频。",
      schema: z.object(frameSelectorSchema),
    }
  );

  const capturePreviewTool = tool(
    async (input = {}) => {
      try {
        const data = await ctx.capturePreview(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "capturePreview", error, input);
      }
    },
    {
      name: "capturePreview",
      description:
        "截取当前 Electron 实时预览 iframe 可见画面为 PNG。适合确认当前预览窗口状态；窗口不可见或预览未加载时可能失败。",
      schema: z.object({
        ...frameSelectorSchema,
        settleMs: z
          .number()
          .int()
          .min(0)
          .max(2000)
          .optional()
          .describe("seek 后等待预览稳定的毫秒数，默认 180"),
      }),
    }
  );

  const verifyFrameAgainstGoalTool = tool(
    async (input = {}) => {
      try {
        const data = await ctx.verifyFrameAgainstGoal(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "verifyFrameAgainstGoal", error, input);
      }
    },
    {
      name: "verifyFrameAgainstGoal",
      description:
        "读取 renderFrame 或 capturePreview 生成的截图并用多模态模型复核是否符合视觉目标。返回结构化 pass/confidence/issues/suggestedToolActions；建议仅用于明确视觉自检。",
      schema: z.object({
        renderId: z.string().describe("renderFrame 或 capturePreview 返回的 renderId"),
        goal: z.string().min(1).describe("用户的视觉目标或本次要确认的画面要求"),
        checks: z
          .array(
            z.enum(["text", "color", "layout", "visibility", "style", "animation"])
          )
          .optional()
          .describe("可选检查项；默认检查 visibility/layout/style"),
      }),
    }
  );

  return [
    renderFrameTool,
    seekPlayheadTool,
    capturePreviewTool,
    verifyFrameAgainstGoalTool,
  ];
}

module.exports = {
  createVisionFeedbackTools,
};
