const { tool } = require("langchain");
const { z } = require("zod");
const { searchPresets } = require("../preset-catalog");

const TRACK_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "shape",
  "chart",
  "animation",
  "group",
];

const ANIMATION_TYPES = [
  "fade",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
  "scale-up",
  "scale-down",
  "rotate",
  "blur",
  "none",
];

const PRESET_CATEGORIES = [
  "background",
  "title",
  "data-chart",
  "intro-outro",
  "social-media",
  "content",
  "transition",
];

function toolResult(success, data, error) {
  return JSON.stringify({ success, data, error });
}

function createTimelineTools(ctx) {
  const createTrackTool = tool(
    async ({ name, type, order }) => {
      try {
        const track = ctx.createTrack({ name, type, order });
        return toolResult(true, { trackId: track.id, name: track.name, type: track.type });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "createTrack",
      description: "在时间线中创建一个新轨道。用于添加新的元素层（如文字层、图片层）。",
      schema: z.object({
        name: z.string().describe("轨道名称"),
        type: z.enum(TRACK_TYPES).describe("轨道类型"),
        order: z.number().optional().describe("图层顺序，0 为最底层"),
      }),
    }
  );

  const createClipTool = tool(
    async (input) => {
      try {
        const clip = ctx.createClip(input);
        return toolResult(true, {
          clipId: clip.id,
          trackId: input.trackId,
          name: clip.name,
        });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "createClip",
      description:
        "在指定轨道上创建一个片段。需要指定内容、位置、时长和样式。文字内容放在 source.content。",
      schema: z.object({
        trackId: z.string().describe("目标轨道 ID"),
        name: z.string().describe("片段名称"),
        startInFrames: z.number().describe("起始帧号"),
        durationInFrames: z.number().describe("持续帧数"),
        source: z
          .object({
            kind: z.enum(["inline", "asset", "data", "component"]).optional(),
            content: z.string().optional().describe("内联文字内容"),
            shape: z.enum(["rect", "circle"]).optional().describe("shape 轨道：矩形或圆形"),
            width: z.number().optional().describe("shape 宽度（像素）"),
            height: z.number().optional().describe("shape 高度（像素）"),
            radius: z.number().optional().describe("圆形半径（像素）"),
            component: z.string().optional().describe("animation 轨道组件名"),
            assetId: z.string().optional().describe("素材库 ID（importAsset 返回）"),
            path: z.string().optional().describe("素材相对路径，如 assets/image/xxx.png"),
            publicPath: z.string().optional().describe("Remotion public 路径，如 /assets/image/xxx.png"),
          })
          .optional(),
        transform: z
          .object({
            position: z
              .object({
                x: z.number(),
                y: z.number(),
              })
              .optional(),
            scale: z.number().optional(),
            rotation: z.number().optional(),
            opacity: z.number().min(0).max(1).optional(),
          })
          .optional(),
        style: z.record(z.string(), z.unknown()).optional(),
        animations: z
          .object({
            in: z
              .object({
                type: z.string(),
                durationInFrames: z.number(),
              })
              .optional(),
            out: z
              .object({
                type: z.string(),
                durationInFrames: z.number(),
              })
              .optional(),
          })
          .optional(),
      }),
    }
  );

  const updateClipTool = tool(
    async ({ clipId, updates }) => {
      try {
        const targetId = clipId || ctx.meta.selectedElement?.id;
        if (!targetId) {
          return toolResult(false, undefined, "未指定 clipId，且没有选中的片段");
        }
        ctx.updateClip({ clipId: targetId, updates: updates ?? {} });
        return toolResult(true, { clipId: targetId });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "updateClip",
      description:
        "更新片段属性。相对调整：大一点/小一点 ±20% 数值；快/慢 durationInFrames 减半或加倍；左/右移 position ±100px。修改文字用 source.content，字号必须用 style.fontSize。修改背景：shape 用 style.background 或 style.fillColor；NewsletterBackground 等组件背景用 style.background / style.backgroundColor。用户已选中片段时 clipId 可省略。",
      schema: z.object({
        clipId: z
          .string()
          .optional()
          .describe("片段 ID；用户已选中片段时可省略，默认修改选中片段"),
        updates: z
          .record(z.string(), z.unknown())
          .describe("要更新的属性，支持嵌套路径如 style.fontSize"),
      }),
    }
  );

  const setAnimationTool = tool(
    async ({ clipId, animationType, config }) => {
      try {
        ctx.setAnimation({ clipId, animationType, config });
        return toolResult(true, { clipId, animationType });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "setAnimation",
      description: "为片段设置入场或出场动画。",
      schema: z.object({
        clipId: z.string(),
        animationType: z.enum(["in", "out"]).describe("入场或出场"),
        config: z.object({
          type: z.enum(ANIMATION_TYPES),
          durationInFrames: z.number().min(1),
        }),
      }),
    }
  );

  const queryElementTool = tool(
    async ({ query, type }) => {
      try {
        const data = ctx.queryElement({ query, type });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "queryElement",
      description: "查询时间线中的元素信息。用于定位目标轨道或片段。",
      schema: z.object({
        query: z.string().describe("查询描述，如「标题」「Hello」"),
        type: z.enum(["clip", "track"]).describe("查询类型"),
      }),
    }
  );

  const deleteClipTool = tool(
    async ({ clipId }) => {
      try {
        const result = ctx.deleteClip({ clipId });
        return toolResult(true, { clipId: result.clipId, trackId: result.trackId });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "deleteClip",
      description: "删除指定片段。用户已选中片段时 clipId 可省略。",
      schema: z.object({
        clipId: z
          .string()
          .optional()
          .describe("片段 ID；用户已选中片段时可省略"),
      }),
    }
  );

  const addKeyframeTool = tool(
    async ({ clipId, property, frame, value, easing, interpolation }) => {
      try {
        const result = ctx.addKeyframe({
          clipId,
          property,
          frame,
          value,
          easing,
          interpolation,
        });
        return toolResult(true, {
          clipId: result.clipId,
          keyframeId: result.keyframeId,
        });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "addKeyframe",
      description:
        "为片段属性添加关键帧。frame 为片段内相对帧号（0 为片段起点）。适合位移动画、透明度渐变等。",
      schema: z.object({
        clipId: z
          .string()
          .optional()
          .describe("片段 ID；用户已选中片段时可省略"),
        property: z
          .string()
          .describe("属性路径，如 transform.opacity、transform.position.x、style.fontSize"),
        frame: z.number().describe("片段内帧号，从 0 开始"),
        value: z
          .union([
            z.number(),
            z.string(),
            z.boolean(),
            z.record(z.string(), z.unknown()),
            z.array(z.unknown()),
          ])
          .describe("该帧的属性值"),
        easing: z
          .enum(["linear", "ease-in", "ease-out", "ease-in-out", "spring"])
          .optional()
          .describe("缓动，默认 linear"),
        interpolation: z
          .enum(["linear", "bezier", "hold"])
          .optional()
          .describe("插值方式，默认 linear"),
      }),
    }
  );

  const importAssetTool = tool(
    async ({ source, type, name }) => {
      try {
        const asset = await ctx.importAsset({ source, type, name });
        return toolResult(true, {
          assetId: asset.id,
          name: asset.name,
          type: asset.type,
          path: asset.path,
          publicPath: asset.publicPath,
        });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "importAsset",
      description:
        "导入图片/视频/音频到项目素材库。source 可为本地路径或 URL。导入后用 createClip 并设置 source.kind=asset。",
      schema: z.object({
        source: z.string().describe("素材来源：本地绝对路径、项目相对路径或 URL"),
        type: z.enum(["image", "video", "audio"]).describe("素材类型"),
        name: z.string().optional().describe("素材显示名称"),
      }),
    }
  );

  const listPresetsTool = tool(
    async ({ query, category, limit }) => {
      try {
        const presets = searchPresets({ query, category, limit });
        return toolResult(true, { presets, count: presets.length });
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "listPresets",
      description:
        "搜索内置 Remotion 动画预设（81 个）。按名称、描述或分类查询，返回 presetId 供 applyPreset 使用。",
      schema: z.object({
        query: z.string().describe("搜索词，如「柱状图」「标题淡入」「片头」"),
        category: z
          .enum(PRESET_CATEGORIES)
          .optional()
          .describe("可选分类过滤"),
        limit: z.number().min(1).max(20).optional().describe("返回条数，默认 10"),
      }),
    }
  );

  const applyPresetTool = tool(
    async ({ presetId, presetName, startInFrames, trackId, parameters }) => {
      try {
        const data = ctx.applyPreset({
          presetId,
          presetName,
          startInFrames,
          trackId,
          parameters,
        });
        return toolResult(true, data);
      } catch (error) {
        return toolResult(false, undefined, error.message);
      }
    },
    {
      name: "applyPreset",
      description:
        "将内置 Remotion 预设应用到时间线 animation 轨道。优先用 listPresets 查 presetId；也可用 presetName 模糊匹配。默认落在当前播放头位置。",
      schema: z.object({
        presetId: z
          .string()
          .optional()
          .describe("预设 ID，如 rve-popping-text"),
        presetName: z
          .string()
          .optional()
          .describe("预设中文名或关键词，如「缩放弹出」「柱状图」"),
        startInFrames: z
          .number()
          .optional()
          .describe("起始帧；省略则使用当前播放头"),
        trackId: z.string().optional().describe("目标 animation 轨道 ID"),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("预设参数（如 { text: \"标题\" }），写入 clip.source.props"),
      }),
    }
  );

  return [
    createTrackTool,
    createClipTool,
    updateClipTool,
    deleteClipTool,
    addKeyframeTool,
    queryElementTool,
    setAnimationTool,
    importAssetTool,
    listPresetsTool,
    applyPresetTool,
  ];
}

module.exports = { createTimelineTools };
