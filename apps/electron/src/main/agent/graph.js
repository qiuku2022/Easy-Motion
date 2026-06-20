const { createAgent } = require("langchain");
const { createChatModel } = require("./llm-factory");
const { buildSystemPrompt } = require("./prompts/system");
const { buildVisionContextSection } = require("./prompts/vision");
const { createTimelineTools } = require("./tools");

function createTimelineAgent(ctx, visionContext = {}) {
  const model = createChatModel();
  const tools = createTimelineTools(ctx);
  let systemPrompt = buildSystemPrompt({
    timeline: ctx.timeline,
    subprojectName: ctx.meta.subprojectName,
    selectedElement: ctx.meta.selectedElement,
    userInput: ctx.meta.userInput,
    currentFrame: ctx.meta.currentFrame ?? 0,
  });

  systemPrompt += buildVisionContextSection({
    visualAnalysis: visionContext.visualAnalysis,
    toolHints: visionContext.toolHints,
  });

  const agent = createAgent({
    model,
    tools,
    systemPrompt,
  });

  return { agent, systemPrompt };
}
module.exports = { createTimelineAgent };
