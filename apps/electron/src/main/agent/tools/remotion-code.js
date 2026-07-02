const { tool } = require("langchain");
const { z } = require("zod");
const { getAllowedImportPrefixes } = require("../remotion-sandbox");
const {
  registerCustomComponent,
  listCustomComponents,
  unregisterCustomComponent,
} = require("../remotion-registry");

function toolResult(success, data, error) {
  return JSON.stringify({ success, data, error });
}

function createRemotionCodeTools(ctx, timelineCtx = null) {
  const listRemotionFilesTool = tool(
    async ({ maxDepth }) => {
      try {
        const files = ctx.listFiles({ maxDepth: maxDepth ?? 4 });
        return toolResult(true, {
          remotionDir: ctx.remotionDir,
          srcDir: ctx.srcDir,
          count: files.length,
          files,
        });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "listRemotionFiles",
      description:
        "列出用户 Remotion 项目 remotion/src 下的文件树（只读）。用于了解现有组件与目录结构。",
      schema: z.object({
        maxDepth: z
          .number()
          .min(1)
          .max(8)
          .optional()
          .describe("目录深度，默认 4"),
      }),
    }
  );

  const readRemotionFileTool = tool(
    async ({ relativePath, offset, limit }) => {
      try {
        const data = ctx.readFile(relativePath, { offset, limit });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "readRemotionFile",
      description:
        "读取用户 Remotion 项目 remotion/src 下的单个文件（只读）。支持 offset/limit 按行分页。",
      schema: z.object({
        relativePath: z
          .string()
          .describe("相对 remotion/src 的路径，如 components/custom/MyIntro.tsx"),
        offset: z.number().min(0).optional().describe("起始行号，默认 0"),
        limit: z.number().min(1).max(500).optional().describe("读取行数，默认 200"),
      }),
    }
  );

  const writeRemotionFileTool = tool(
    async ({ relativePath, content, reason }) => {
      try {
        const data = ctx.writeFile(relativePath, content, { reason });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "writeRemotionFile",
      description:
        "创建或覆盖 Remotion 源码文件。仅允许 components/custom/** 与 presets/custom-registry.ts。写入前会做安全扫描与 import 白名单校验。",
      schema: z.object({
        relativePath: z.string().describe("相对 remotion/src 的写入路径"),
        content: z.string().describe("完整文件内容"),
        reason: z.string().optional().describe("变更说明"),
      }),
    }
  );

  const patchRemotionFileTool = tool(
    async ({ relativePath, search, replace }) => {
      try {
        const data = ctx.patchFile(relativePath, search, replace);
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "patchRemotionFile",
      description:
        "对 Remotion 源码做唯一匹配的 search/replace 补丁。仅允许沙箱可写路径。",
      schema: z.object({
        relativePath: z.string().describe("相对 remotion/src 的路径"),
        search: z.string().describe("必须唯一匹配的原文"),
        replace: z.string().describe("替换后的文本"),
      }),
    }
  );

  const compileRemotionCheckTool = tool(
    async () => {
      try {
        const result = await ctx.runCompileCheck();
        return toolResult(true, result);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "compileRemotionCheck",
      description:
        "对用户 Remotion 项目运行 TypeScript 编译检查（tsc --noEmit）。写入 TSX 后应调用以验证能否编译。",
      schema: z.object({}),
    }
  );

  const getRemotionPackageInfoTool = tool(
    async () => {
      try {
        const allowedImports = [...getAllowedImportPrefixes(ctx.remotionDir)].sort();
        return toolResult(true, {
          remotionDir: ctx.remotionDir,
          allowedImports,
        });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "getRemotionPackageInfo",
      description:
        "返回用户 Remotion 项目路径与允许 import 的包名列表（读 remotion/package.json）。",
      schema: z.object({}),
    }
  );

  const registerCustomComponentTool = tool(
    async ({
      componentName,
      content,
      parameters,
      startInFrames,
      durationInFrames,
      trackId,
      applyToTimeline,
    }) => {
      try {
        if (!timelineCtx) {
          return toolResult(false, undefined, "E2416: timeline 上下文不可用");
        }
        const data = registerCustomComponent(ctx, timelineCtx, {
          componentName,
          content,
          parameters,
          startInFrames,
          durationInFrames,
          trackId,
          applyToTimeline,
        });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "registerCustomComponent",
      description:
        "注册自定义 Remotion 组件：写入 components/custom/*.tsx、更新 custom-registry.ts，并（默认）添加到 animation 轨道时间线。复杂自定义动画优先用此工具而非手写 createClip。",
      schema: z.object({
        componentName: z.string().describe("PascalCase 组件名，如 ParticleBg"),
        content: z.string().describe("完整 TSX 源码"),
        parameters: z
          .record(z.unknown())
          .optional()
          .describe("默认 props，写入 clip.source.props"),
        startInFrames: z.number().min(0).optional().describe("时间线起始帧，默认当前播放头"),
        durationInFrames: z.number().min(1).optional().describe("片段时长，默认整段"),
        trackId: z.string().optional().describe("目标 animation 轨道 id"),
        applyToTimeline: z
          .boolean()
          .optional()
          .describe("是否添加到时间线，默认 true"),
      }),
    }
  );

  const listCustomComponentsTool = tool(
    async ({ includeTimelineUsage } = {}) => {
      try {
        if (!timelineCtx) {
          return toolResult(false, undefined, "E2416: timeline 上下文不可用");
        }
        const data = listCustomComponents(ctx, timelineCtx, {
          includeTimelineUsage,
        });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "listCustomComponents",
      description:
        "列出已注册的自定义 Remotion 组件，可包含时间线引用。删除或修改自定义组件前先调用。",
      schema: z.object({
        includeTimelineUsage: z
          .boolean()
          .optional()
          .describe("是否返回 timeline 中引用该组件的片段，默认 false"),
      }),
    }
  );

  const unregisterCustomComponentTool = tool(
    async ({
      componentName,
      removeTimelineClips,
      deleteFile,
      confirmDeleteUsages,
    }) => {
      try {
        if (!timelineCtx) {
          return toolResult(false, undefined, "E2416: timeline 上下文不可用");
        }
        const data = unregisterCustomComponent(ctx, timelineCtx, {
          componentName,
          removeTimelineClips,
          deleteFile,
          confirmDeleteUsages,
        });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "unregisterCustomComponent",
      description:
        "注销自定义 Remotion 组件；可选删除 TSX 文件和时间线引用片段。删除引用和文件必须用户明确确认。",
      schema: z.object({
        componentName: z.string().describe("PascalCase 组件名，如 ParticleBg"),
        removeTimelineClips: z
          .boolean()
          .optional()
          .describe("是否删除时间线中引用该组件的片段，默认 false"),
        deleteFile: z
          .boolean()
          .optional()
          .describe("是否删除 components/custom/{Name}.tsx，默认 false"),
        confirmDeleteUsages: z
          .boolean()
          .optional()
          .describe("确认删除时间线引用片段，默认 false"),
      }),
    }
  );

  return [
    listRemotionFilesTool,
    readRemotionFileTool,
    writeRemotionFileTool,
    patchRemotionFileTool,
    registerCustomComponentTool,
    listCustomComponentsTool,
    unregisterCustomComponentTool,
    compileRemotionCheckTool,
    getRemotionPackageInfoTool,
  ];
}

module.exports = { createRemotionCodeTools };
