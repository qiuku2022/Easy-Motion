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
const CLIP_TYPES = TRACK_TYPES.filter((type) => type !== "group");

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
const ASSET_TYPES = ["image", "video", "audio"];
const CHART_TYPES = ["line", "bar", "pie", "area"];
const SCENE_TEMPLATE_IDS = ["product-intro", "data-report", "social-short"];
const EXPORT_FORMATS = ["mp4", "webm"];
const EXPORT_RESOLUTIONS = ["original", "1080p", "720p"];
const EXPORT_QUALITIES = ["low", "medium", "high"];

const CLIP_SELECTOR_SCHEMA = z.object({
  type: z.enum(CLIP_TYPES).optional().describe("按片段类型过滤"),
  trackId: z.string().optional().describe("按轨道 ID 过滤"),
  trackNameIncludes: z.string().optional().describe("轨道名称包含文本"),
  nameIncludes: z.string().optional().describe("片段名称包含文本"),
  textIncludes: z.string().optional().describe("片段文字内容或预设文本参数包含文本"),
  sourceComponent: z.string().optional().describe("animation 组件名包含文本"),
  presetId: z.string().optional().describe("内置预设 ID"),
  lastModifiedBy: z.enum(["user", "ai"]).optional().describe("按最近修改来源过滤"),
  timeRange: z
    .object({
      startInFrames: z.number().describe("起始帧，包含"),
      endInFrames: z.number().describe("结束帧，不包含"),
      includePartialOverlap: z.boolean().optional().describe("是否包含部分重叠，默认 true"),
    })
    .optional()
    .describe("按全局时间范围过滤"),
});

function toolResult(success, data, error) {
  return JSON.stringify({ success, data, error });
}

function failTool(ctx, toolName, error, input) {
  ctx.recordToolError?.(error, { toolName, input });
  return toolResult(false, undefined, error.message);
}

function createTimelineTools(ctx) {
  const listTimelineTool = tool(
    async (input = {}) => {
      try {
        const data = ctx.listTimeline(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "listTimeline", error, input);
      }
    },
    {
      name: "listTimeline",
      description:
        "读取当前时间线的结构化摘要（轨道、片段、时间范围、素材/组件摘要）。复杂修改、批量修改或删除前应先调用。",
      schema: z.object({
        includeClips: z.boolean().optional().describe("是否包含片段摘要，默认 true"),
        includeKeyframes: z.boolean().optional().describe("是否包含关键帧详情，默认 false"),
        includeStyles: z.boolean().optional().describe("是否包含 style 对象，默认 false"),
        maxClipsPerTrack: z.number().min(0).max(100).optional().describe("每条轨道最多返回片段数，默认 20"),
        maxTracks: z.number().min(1).max(200).optional().describe("最多返回轨道数，默认 50"),
      }),
    }
  );

  const getClipDetailTool = tool(
    async (input) => {
      try {
        const data = ctx.getClipDetail(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "getClipDetail", error, input);
      }
    },
    {
      name: "getClipDetail",
      description:
        "读取指定片段的完整 JSON 和所在轨道信息。准备精确修改已有片段前使用，避免覆盖嵌套属性。",
      schema: z.object({
        clipId: z.string().describe("片段 ID"),
      }),
    }
  );

  const queryTimelineRangeTool = tool(
    async (input) => {
      try {
        const data = ctx.queryTimelineRange(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "queryTimelineRange", error, input);
      }
    },
    {
      name: "queryTimelineRange",
      description:
        "按全局帧范围查询时间线片段。适合回答某段时间有什么元素，或在删除/移动一段内容前确认影响范围。",
      schema: z.object({
        startInFrames: z.number().describe("查询起始帧（全局帧，包含）"),
        endInFrames: z.number().describe("查询结束帧（全局帧，不包含）"),
        type: z.enum(CLIP_TYPES).optional().describe("可选片段类型过滤"),
        trackId: z.string().optional().describe("可选轨道 ID 过滤"),
        includePartialOverlap: z.boolean().optional().describe("是否包含部分重叠片段，默认 true"),
      }),
    }
  );

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
        "更新片段属性。相对调整：大一点/小一点 ±20% 数值；快/慢 durationInFrames 减半或加倍；左/右移 position ±100px。修改文字用 source.content，字号必须用 style.fontSize。修改背景：shape 用 style.background 或 style.fillColor；NewsletterBackground 等组件背景用 style.background / style.backgroundColor。修改图表/预设：updateClip 设置 source.props.primaryColor（折线）、source.props.secondaryColor（数据点）等 manifest 参数。用户已选中片段时 clipId 可省略。",
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

  const moveClipTool = tool(
    async (input) => {
      try {
        const result = ctx.moveClip(input);
        return toolResult(true, {
          clipId: result.clipId,
          from: result.from,
          to: result.to,
          durationInFrames: result.durationInFrames,
          timelineExtended: result.timelineExtended,
        });
      } catch (error) {
        return failTool(ctx, "moveClip", error, input);
      }
    },
    {
      name: "moveClip",
      description:
        "移动片段到新的全局起始帧，或按相对帧数前后移动；可跨同类型轨道。用于「往后挪 2 秒」「移到第 90 帧」「放到另一个文字轨道」。",
      schema: z.object({
        clipId: z
          .string()
          .optional()
          .describe("片段 ID；用户已选中片段时可省略"),
        targetTrackId: z.string().optional().describe("目标轨道 ID；省略则留在原轨道"),
        startInFrames: z.number().optional().describe("目标全局起始帧"),
        relativeOffsetInFrames: z.number().optional().describe("相对当前起始帧移动的帧数，可为负数"),
        extendTimeline: z.boolean().optional().describe("移动后超出总时长时是否自动延长时间线，默认 false"),
      }),
    }
  );

  const updateTimelineSettingsTool = tool(
    async (input) => {
      try {
        const result = ctx.updateTimelineSettings(input);
        return toolResult(true, {
          before: result.before,
          after: result.after,
          scaledPositions: result.scaledPositions,
          fittedDuration: result.fittedDuration,
        });
      } catch (error) {
        return failTool(ctx, "updateTimelineSettings", error, input);
      }
    },
    {
      name: "updateTimelineSettings",
      description:
        "更新时间线元数据：分辨率 width/height、fps、总时长 durationInFrames。缩短总时长会截断片段时默认失败。",
      schema: z.object({
        width: z.number().optional().describe("画布宽度，正整数像素"),
        height: z.number().optional().describe("画布高度，正整数像素"),
        fps: z.number().optional().describe("帧率，1 到 120 的整数"),
        durationInFrames: z.number().optional().describe("总时长帧数，正整数"),
        fitExistingClips: z
          .boolean()
          .optional()
          .describe("缩短总时长会截断片段时，是否自动适配到最大片段结束帧，默认 false"),
        scalePositions: z
          .boolean()
          .optional()
          .describe("改分辨率时是否按比例缩放片段位置和 shape 尺寸，默认 false"),
      }),
    }
  );

  const batchUpdateClipsTool = tool(
    async (input) => {
      try {
        const data = ctx.batchUpdateClips(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "batchUpdateClips", error, input);
      }
    },
    {
      name: "batchUpdateClips",
      description:
        "对符合 selector 的多个片段应用同一组更新。支持 dryRun 预览影响范围，默认最多 20 个匹配。",
      schema: z.object({
        selector: CLIP_SELECTOR_SCHEMA.describe("片段选择器"),
        updates: z
          .record(z.string(), z.unknown())
          .describe("要批量更新的属性，支持点路径如 style.color、source.props.primaryColor"),
        maxMatches: z.number().min(1).max(100).optional().describe("最大匹配数量，默认 20"),
        dryRun: z.boolean().optional().describe("仅预览影响范围，不修改时间线"),
        allowSourceReplace: z
          .boolean()
          .optional()
          .describe("是否允许直接替换整个 source，默认 false"),
      }),
    }
  );

  const batchDeleteClipsTool = tool(
    async (input) => {
      try {
        const data = ctx.batchDeleteClips(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "batchDeleteClips", error, input);
      }
    },
    {
      name: "batchDeleteClips",
      description:
        "批量删除符合 selector 的片段。默认 dryRun=true；删除多个片段必须 confirmDelete=true。",
      schema: z.object({
        selector: CLIP_SELECTOR_SCHEMA.describe("片段选择器"),
        maxMatches: z.number().min(1).max(100).optional().describe("最大匹配数量，默认 20"),
        dryRun: z.boolean().optional().describe("仅预览影响范围，默认 true"),
        confirmDelete: z.boolean().optional().describe("确认删除多个片段，默认 false"),
      }),
    }
  );

  const batchShiftClipsTool = tool(
    async (input) => {
      try {
        const data = ctx.batchShiftClips(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "batchShiftClips", error, input);
      }
    },
    {
      name: "batchShiftClips",
      description:
        "将符合 selector 的多个片段整体前后平移指定帧数。用于「3 秒后的元素整体往后移 2 秒」。",
      schema: z.object({
        selector: CLIP_SELECTOR_SCHEMA.describe("片段选择器"),
        offsetInFrames: z.number().describe("平移帧数；正数向后，负数向前"),
        maxMatches: z.number().min(1).max(100).optional().describe("最大匹配数量，默认 20"),
        dryRun: z.boolean().optional().describe("仅预览影响范围，不修改时间线"),
        extendTimeline: z.boolean().optional().describe("超出总时长时是否扩展时间线，默认 false"),
      }),
    }
  );

  const applySceneTemplateTool = tool(
    async (input) => {
      try {
        const data = ctx.applySceneTemplate(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "applySceneTemplate", error, input);
      }
    },
    {
      name: "applySceneTemplate",
      description:
        "按结构化场景模板一次创建一段动画。支持 product-intro、data-report、social-short；高风险或缺参数时先 dryRun。",
      schema: z.object({
        templateId: z.enum(SCENE_TEMPLATE_IDS).describe("场景模板 ID"),
        startInFrames: z.number().optional().describe("模板起始帧，默认 0"),
        durationInFrames: z.number().min(1).optional().describe("模板总时长，默认随模板"),
        parameters: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            "模板参数：productName/tagline/logoAssetId/chartData/rows/xField/yField/hook/points 等"
          ),
        dryRun: z.boolean().optional().describe("仅返回计划，不修改时间线"),
      }),
    }
  );

  const applyVisualLayoutTool = tool(
    async (input = {}) => {
      try {
        const data = ctx.applyVisualLayout(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "applyVisualLayout", error, input);
      }
    },
    {
      name: "applyVisualLayout",
      description:
        "将参考图视觉分析得到的 layoutPlan 落到时间线。图片会话中可不传 visualAnalysis，默认使用当前参考图计划。",
      schema: z.object({
        visualAnalysis: z.record(z.string(), z.unknown()).optional().describe("视觉分析 JSON；省略则使用当前图片会话结果"),
        layoutPlan: z.record(z.string(), z.unknown()).optional().describe("可执行 layoutPlan；省略时由 visualAnalysis 或当前图片会话生成"),
        startInFrames: z.number().optional().describe("从 visualAnalysis 生成计划时的起始帧"),
        durationInFrames: z.number().min(1).optional().describe("从 visualAnalysis 生成计划时的片段时长"),
        dryRun: z.boolean().optional().describe("仅返回计划，不修改时间线"),
      }),
    }
  );

  const getWorkAreaTool = tool(
    async () => {
      try {
        const data = ctx.getWorkArea();
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "getWorkArea", error, {});
      }
    },
    {
      name: "getWorkArea",
      description:
        "读取当前导出 Work Area 和实际导出帧范围。用于回答「现在会导出哪段」。",
      schema: z.object({}),
    }
  );

  const setWorkAreaTool = tool(
    async (input) => {
      try {
        const data = ctx.setWorkArea(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "setWorkArea", error, input);
      }
    },
    {
      name: "setWorkArea",
      description:
        "设置或清空导出 Work Area。inFrame/outFrame 是全局帧且 outFrame 为包含帧；用户用秒表达时按 fps 换算。",
      schema: z.object({
        inFrame: z.number().optional().describe("入点帧，包含"),
        outFrame: z.number().optional().describe("出点帧，包含"),
        clear: z.boolean().optional().describe("清空 Work Area"),
      }),
    }
  );

  const exportVideoTool = tool(
    async (input) => {
      try {
        const data = await ctx.exportVideo(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "exportVideo", error, input);
      }
    },
    {
      name: "exportVideo",
      description:
        "启动视频导出。outputPath 必填，Agent 不允许猜测保存位置；只导出某段时先 setWorkArea。",
      schema: z.object({
        outputPath: z.string().describe("导出文件绝对路径，必须由用户明确提供"),
        format: z.enum(EXPORT_FORMATS).optional().describe("导出格式，默认 mp4"),
        resolution: z.enum(EXPORT_RESOLUTIONS).optional().describe("导出分辨率，默认 original"),
        quality: z.enum(EXPORT_QUALITIES).optional().describe("导出质量，默认 medium"),
      }),
    }
  );

  const getExportStatusTool = tool(
    async () => {
      try {
        const data = ctx.getExportStatus();
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "getExportStatus", error, {});
      }
    },
    {
      name: "getExportStatus",
      description: "读取当前是否有正在进行的导出任务。",
      schema: z.object({}),
    }
  );

  const cancelExportTool = tool(
    async (input = {}) => {
      try {
        const data = await ctx.cancelExport(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "cancelExport", error, input);
      }
    },
    {
      name: "cancelExport",
      description:
        "取消当前视频导出；exportId 可省略，省略时取消当前 active export。",
      schema: z.object({
        exportId: z.string().optional().describe("导出任务 ID，省略则取消当前任务"),
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

  const listAssetsTool = tool(
    async (input = {}) => {
      try {
        const data = ctx.listAssets(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "listAssets", error, input);
      }
    },
    {
      name: "listAssets",
      description:
        "列出或搜索当前项目素材库中的图片/视频/音频。用户说「素材库里的」「已有的」「刚导入的」时应先调用，避免重复导入。",
      schema: z.object({
        type: z.enum(ASSET_TYPES).optional().describe("按素材类型过滤"),
        query: z.string().optional().describe("按素材名称、原始文件名或路径搜索"),
        favoriteOnly: z.boolean().optional().describe("只返回收藏素材，默认 false"),
        recentOnly: z.boolean().optional().describe("按最近使用/导入排序，默认 false"),
        limit: z.number().min(1).max(100).optional().describe("最多返回数量，默认 20"),
      }),
    }
  );

  const placeAssetTool = tool(
    async (input) => {
      try {
        const data = await ctx.placeAsset(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "placeAsset", error, input);
      }
    },
    {
      name: "placeAsset",
      description:
        "将已有素材库素材放到时间线。会自动选择或创建匹配类型轨道，设置素材 source、默认时长和居中 transform。",
      schema: z.object({
        assetId: z.string().optional().describe("素材 ID；优先使用"),
        query: z.string().optional().describe("素材搜索词；未指定 assetId 时使用"),
        type: z.enum(ASSET_TYPES).optional().describe("配合 query 使用的素材类型过滤"),
        startInFrames: z.number().optional().describe("起始帧；省略则使用当前播放头"),
        trackId: z.string().optional().describe("目标轨道 ID；省略则自动选轨或建轨"),
        position: z
          .object({
            x: z.number().optional(),
            y: z.number().optional(),
          })
          .optional()
          .describe("素材中心位置；省略则居中"),
        scale: z.number().optional().describe("缩放，默认 1"),
        objectFit: z.enum(["contain", "cover", "fill"]).optional().describe("图片/视频填充方式，默认 contain"),
        durationInFrames: z.number().min(1).optional().describe("片段时长；省略则使用素材元数据或默认时长"),
        extendTimeline: z.boolean().optional().describe("素材超出总时长时是否扩展时间线，默认 false"),
      }),
    }
  );

  const importDataFileTool = tool(
    async (input) => {
      try {
        const data = await ctx.importDataFile(input);
        return toolResult(true, {
          relativePath: data.relativePath,
          headers: data.headers,
          rowCount: data.rowCount,
          previewRows: data.previewRows,
        });
      } catch (error) {
        return failTool(ctx, "importDataFile", error, input);
      }
    },
    {
      name: "importDataFile",
      description:
        "导入 CSV/JSON 数据文件到当前项目 data/ 目录，并返回字段名、行数和预览行。用于后续 bindChartData。",
      schema: z.object({
        source: z.string().describe("数据文件路径：本地绝对路径或项目相对路径，仅支持 CSV/JSON"),
      }),
    }
  );

  const mapChartDataTool = tool(
    async (input) => {
      try {
        const data = ctx.mapChartData(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "mapChartData", error, input);
      }
    },
    {
      name: "mapChartData",
      description:
        "将 rows 按 xField/yField 映射成图表数据 {label,value}。适合用户直接提供少量结构化 rows 时使用。",
      schema: z.object({
        rows: z.array(z.record(z.string(), z.unknown())).describe("数据行数组"),
        xField: z.string().describe("作为 label 的字段名"),
        yField: z.string().describe("作为数值的字段名"),
      }),
    }
  );

  const bindChartDataTool = tool(
    async (input) => {
      try {
        const data = await ctx.bindChartData(input);
        return toolResult(true, data);
      } catch (error) {
        return failTool(ctx, "bindChartData", error, input);
      }
    },
    {
      name: "bindChartData",
      description:
        "将 CSV/JSON 或 rows 数据绑定到 chart 轨道片段或 animation 图表预设。chart 轨道写 source.kind=data，图表预设写 source.props.data。",
      schema: z.object({
        clipId: z.string().optional().describe("目标图表片段 ID"),
        query: z.string().optional().describe("未指定 clipId 时用于查询目标图表片段"),
        source: z.string().optional().describe("要导入并绑定的数据文件路径"),
        dataFile: z.string().optional().describe("项目内已导入的数据文件相对路径，如 data/demo.csv"),
        rows: z.array(z.record(z.string(), z.unknown())).optional().describe("直接提供的数据行"),
        xField: z.string().describe("X 轴/label 字段名"),
        yField: z.string().describe("Y 轴/value 字段名"),
        chartType: z.enum(CHART_TYPES).optional().describe("chart 轨道图表类型或预设参数"),
        title: z.string().optional().describe("图表标题"),
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
    listTimelineTool,
    getClipDetailTool,
    queryTimelineRangeTool,
    createTrackTool,
    createClipTool,
    updateClipTool,
    moveClipTool,
    updateTimelineSettingsTool,
    batchUpdateClipsTool,
    batchDeleteClipsTool,
    batchShiftClipsTool,
    applySceneTemplateTool,
    applyVisualLayoutTool,
    getWorkAreaTool,
    setWorkAreaTool,
    exportVideoTool,
    getExportStatusTool,
    cancelExportTool,
    deleteClipTool,
    addKeyframeTool,
    queryElementTool,
    setAnimationTool,
    importAssetTool,
    listAssetsTool,
    placeAssetTool,
    importDataFileTool,
    mapChartDataTool,
    bindChartDataTool,
    listPresetsTool,
    applyPresetTool,
  ];
}

module.exports = { createTimelineTools };
