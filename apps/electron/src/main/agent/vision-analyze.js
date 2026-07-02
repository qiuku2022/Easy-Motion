const { createChatModel } = require("./llm-factory");
const { buildVisionAnalysisPrompt } = require("./prompts/vision");
const { buildMultimodalHumanMessage } = require("./multimodal");
const { extractJsonFromText, layoutToToolHints, layoutToPlan } = require("./layout-mapper");

async function analyzeReferenceImages({
  projectPath,
  imagePaths = [],
  userText = "",
  timeline,
  signal,
}) {
  if (!imagePaths.length) {
    return { visualAnalysis: null, toolHints: [], layoutPlan: null, failed: false };
  }

  const model = createChatModel({ temperature: 0.2 });
  const prompt = buildVisionAnalysisPrompt(userText);
  const message = buildMultimodalHumanMessage({
    text: prompt,
    imagePaths,
    projectPath,
  });

  const response = await model.invoke([message], { signal });
  const text =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? response.content
            .map((block) => (typeof block === "string" ? block : block?.text || ""))
            .join("")
        : String(response.content ?? "");

  const visualAnalysis = extractJsonFromText(text);
  if (!visualAnalysis?.layout) {
    return {
      visualAnalysis: null,
      toolHints: [],
      layoutPlan: null,
      failed: true,
      notice: "视觉解析失败，已切换为纯文字模式。请补充布局描述。",
    };
  }

  const toolHints = layoutToToolHints(visualAnalysis, timeline);
  const layoutPlan = layoutToPlan(visualAnalysis, timeline);
  return { visualAnalysis, toolHints, layoutPlan, failed: false };
}

module.exports = { analyzeReferenceImages };
