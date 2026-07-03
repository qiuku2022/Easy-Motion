const { randomUUID } = require("node:crypto");
const settingsService = require("./settings-service");
const secretsService = require("./secrets-service");

const activeRequests = new Map();

const SYSTEM_PROMPT =
  "你是 Easy Motion 的 AI 动画助手。用户会用自然语言描述想要的 Remotion 动画效果。" +
  "请用简洁、友好的中文回答，给出可执行的创意建议或步骤；若信息不足，先追问关键细节。";

const PROVIDER_DEFAULTS = {
  anthropic: { baseUrl: "https://api.anthropic.com" },
  openai: { baseUrl: "https://api.openai.com/v1" },
};

function resolveLlmConfig(overrides = {}) {
  const llm = settingsService.getLlmSettings();
  const provider = overrides.provider || llm.provider || "anthropic";
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.anthropic;

  let baseUrl =
    overrides.baseUrl ||
    llm.baseUrl ||
    (provider === "anthropic"
      ? process.env.ANTHROPIC_BASE_URL || process.env.LLM_BASE_URL
      : process.env.OPENAI_BASE_URL || process.env.LLM_BASE_URL) ||
    defaults.baseUrl;

  let apiKey = overrides.apiKey || secretsService.getLlmApiKey(provider);
  if (!apiKey) {
    if (provider === "anthropic") {
      apiKey = process.env.ANTHROPIC_API_KEY || process.env.LLM_API_KEY || "";
    } else if (provider === "openai") {
      apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";
    }
  }

  return {
    provider,
    baseUrl: String(baseUrl).replace(/\/$/, ""),
    apiKey: apiKey || "",
    model: overrides.model || llm.model,
    maxTokens: overrides.maxTokens ?? llm.maxTokens,
    temperature: overrides.temperature ?? llm.temperature,
  };
}

function getLlmConfig(overrides) {
  return resolveLlmConfig(overrides);
}

function assertLlmConfig(config) {
  if (!config.apiKey) {
    throw new Error(
      "E2804: LLM API Key 未配置，请在 AI 助手设置中填写，或于开发环境配置 apps/electron/.env"
    );
  }
  if (!config.baseUrl) {
    throw new Error("E2800: LLM Base URL 未配置");
  }
}

function sendChunk(webContents, requestId, chunk, isDone) {
  if (webContents.isDestroyed()) return;
  webContents.send("renderer:llm:chunk", { requestId, chunk, isDone });
}

function parseSseDataLine(line) {
  const prefix = "data:";
  if (!line.startsWith(prefix)) return null;
  const payload = line.slice(prefix.length).trim();
  if (!payload || payload === "[DONE]") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function extractTextDelta(event) {
  if (!event || typeof event !== "object") return "";

  if (event.type === "content_block_delta" && event.delta?.text) {
    return event.delta.text;
  }
  if (event.type === "text_delta" && event.delta?.text) {
    return event.delta.text;
  }
  if (event.choices?.[0]?.delta?.content) {
    return event.choices[0].delta.content;
  }
  return "";
}

async function readSseStream(response, webContents, requestId) {
  if (!response.body) {
    throw new Error("E2810: LLM 流式响应中断");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const event = parseSseDataLine(trimmed);
      if (!event) continue;

      if (event.type === "error") {
        throw new Error(event.error?.message || "E2800: LLM 服务返回错误");
      }

      const text = extractTextDelta(event);
      if (text) sendChunk(webContents, requestId, text, false);
    }
  }

  sendChunk(webContents, requestId, "", true);
}

async function streamAnthropicChat({
  webContents,
  requestId,
  messages,
  config,
  signal,
}) {
  const url = `${config.baseUrl}/v1/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error("E2804: LLM API Key 无效或无权访问");
    }
    throw new Error(
      `E2800: LLM 请求失败 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  await readSseStream(response, webContents, requestId);
}

async function streamOpenAiChat({ webContents, requestId, messages, config, signal }) {
  const url = `${config.baseUrl}/chat/completions`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      throw new Error("E2804: LLM API Key 无效或无权访问");
    }
    throw new Error(
      `E2800: LLM 请求失败 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  await readSseStream(response, webContents, requestId);
}

async function validateLlmApiKey(overrides = {}) {
  const config = resolveLlmConfig(overrides);
  if (!config.apiKey) {
    return { valid: false, error: "E2804: API Key 不能为空" };
  }
  if (!config.baseUrl) {
    return { valid: false, error: "E2800: Base URL 未配置" };
  }

  try {
    if (config.provider === "openai") {
      const response = await fetch(`${config.baseUrl}/models`, {
        headers: { authorization: `Bearer ${config.apiKey}` },
      });
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: "E2804: LLM API Key 无效或无权访问" };
      }
      if (!response.ok) {
        return { valid: false, error: `E2800: 验证失败 (${response.status})` };
      }
      return { valid: true };
    }

    const response = await fetch(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "E2804: LLM API Key 无效或无权访问" };
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        valid: false,
        error: `E2800: 验证失败 (${response.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
      };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message || "E2800: 无法连接 LLM 服务",
    };
  }
}

function startStream(webContents, payload) {
  const requestId = payload?.requestId || randomUUID();
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];

  if (messages.length === 0) {
    throw new Error("E2002: 消息不能为空");
  }

  const last = messages[messages.length - 1];
  if (!last?.content?.trim()) {
    throw new Error("E2002: 消息不能为空");
  }

  const config = resolveLlmConfig({
    provider: payload?.provider,
    model: payload?.model,
    baseUrl: payload?.baseUrl,
    temperature: payload?.temperature,
    maxTokens: payload?.maxTokens,
  });
  assertLlmConfig(config);

  const controller = new AbortController();
  activeRequests.set(requestId, controller);

  const streamFn =
    config.provider === "openai" ? streamOpenAiChat : streamAnthropicChat;

  void streamFn({
    webContents,
    requestId,
    messages,
    config,
    signal: controller.signal,
  })
    .then(() => {
      secretsService.touchLlmApiKey(config.provider);
    })
    .catch((error) => {
      if (error.name === "AbortError") return;
      const message = error.message || "E2800: LLM 服务未知错误";
      sendChunk(webContents, requestId, `\n\n[错误] ${message}`, true);
    })
    .finally(() => {
      activeRequests.delete(requestId);
    });

  return { requestId };
}

function cancelStream(requestId) {
  const controller = activeRequests.get(requestId);
  if (!controller) return { cancelled: false };
  controller.abort();
  activeRequests.delete(requestId);
  return { cancelled: true };
}

function isLlmConfigured() {
  const config = resolveLlmConfig();
  return Boolean(config.apiKey);
}

module.exports = {
  getLlmConfig,
  resolveLlmConfig,
  assertLlmConfig,
  validateLlmApiKey,
  isLlmConfigured,
  startStream,
  cancelStream,
};
