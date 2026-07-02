const { loadEnv } = require("../src/main/utils/load-env");
const { resolveLlmConfig, assertLlmConfig } = require("../src/main/services/llm-service");
const { createChatModel, invokeChatModel } = require("../src/main/agent/llm-factory");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertThrows(fn, expectedSubstring) {
  let thrown = false;
  try {
    fn();
  } catch (error) {
    thrown = true;
    assert(
      String(error.message).includes(expectedSubstring),
      `expected error containing "${expectedSubstring}", got: ${error.message}`
    );
  }
  assert(thrown, `expected throw containing "${expectedSubstring}"`);
}

async function main() {
  loadEnv();

  // LangChain packages load in main process
  require("langchain");
  require("@langchain/openai");
  require("@langchain/anthropic");

  assertThrows(
    () => assertLlmConfig({ apiKey: "", baseUrl: "https://api.example.com" }),
    "E2804"
  );

  assertThrows(
    () => assertLlmConfig({ apiKey: "test-key", baseUrl: "" }),
    "E2800"
  );

  const config = resolveLlmConfig();
  if (!config.apiKey) {
    console.log("test-llm-factory: skip live invoke (no API key configured)");
    console.log("test-llm-factory: all offline checks passed");
    return;
  }

  const model = createChatModel();
  assert(model, "createChatModel should return a ChatModel instance");

  const reply = await invokeChatModel("你好，请用一句话回复。");
  assert(typeof reply === "string" && reply.trim().length > 0, "invoke should return non-empty text");
  console.log("test-llm-factory: live invoke ok, reply length =", reply.trim().length);
  console.log("test-llm-factory: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
