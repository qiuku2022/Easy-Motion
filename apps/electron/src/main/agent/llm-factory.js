const { ChatAnthropic } = require("@langchain/anthropic");
const { ChatOpenAI } = require("@langchain/openai");
const { HumanMessage } = require("langchain");
const { resolveLlmConfig, assertLlmConfig } = require("../services/llm-service");

/**
 * Build a LangChain ChatModel from settings / secrets / .env (via resolveLlmConfig).
 */
function createChatModel(overrides = {}) {
  const config = resolveLlmConfig(overrides);
  assertLlmConfig(config);

  if (config.provider === "openai") {
    return new ChatOpenAI({
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      configuration: {
        baseURL: config.baseUrl,
      },
    });
  }

  return new ChatAnthropic({
    apiKey: config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    anthropicApiUrl: config.baseUrl,
  });
}

/**
 * Single-turn invoke for smoke tests and future Agent fallback.
 */
async function invokeChatModel(input, overrides = {}) {
  const model = createChatModel(overrides);
  const response = await model.invoke([new HumanMessage(input)]);
  if (typeof response.content === "string") {
    return response.content;
  }
  if (Array.isArray(response.content)) {
    return response.content
      .map((block) => (typeof block === "string" ? block : block?.text || ""))
      .join("");
  }
  return String(response.content ?? "");
}

module.exports = {
  createChatModel,
  invokeChatModel,
};
