const FIRST_RESPONSE_TIMEOUT_MS = 90_000;
const CHUNK_IDLE_TIMEOUT_MS = 30_000;

function abortError() {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function raceWithTimeout(promise, ms, errorMessage, signal) {
  if (signal?.aborted) {
    return Promise.reject(abortError());
  }
  return Promise.race([
    promise,
    sleep(ms, signal).then(() => {
      throw new Error(errorMessage);
    }),
  ]);
}

/**
 * Consume LangChain agent message stream with first-response and idle timeouts.
 */
async function consumeAgentMessageStream(stream, { signal, onChunk, onStatus, isAiMessage, getMessageText }) {
  let streamed = "";

  for await (const [message] of stream) {
    if (signal?.aborted) {
      throw abortError();
    }

    if (!isAiMessage(message)) {
      if (message?._getType?.() === "tool" || message?.constructor?.name === "ToolMessage") {
        onStatus?.("executing");
      }
      continue;
    }

    const text = getMessageText(message);
    if (!text || text === streamed) continue;

    const delta = text.startsWith(streamed) ? text.slice(streamed.length) : text;
    streamed = text.startsWith(streamed) ? text : streamed + delta;
    if (delta) onChunk?.(delta);
  }

  return streamed;
}

async function streamAgentWithTimeouts(agent, messages, options) {
  const {
    signal,
    onChunk,
    onStatus,
    isAiMessage,
    getMessageText,
    firstResponseMs = FIRST_RESPONSE_TIMEOUT_MS,
    chunkIdleMs = CHUNK_IDLE_TIMEOUT_MS,
  } = options;

  const streamPromise = agent.stream({ messages }, { streamMode: "messages", signal });
  const stream = await raceWithTimeout(
    streamPromise,
    firstResponseMs,
    "E2801: LLM 首响应超时（90 秒）",
    signal
  );

  const iterator = stream[Symbol.asyncIterator]();
  let streamed = "";
  let gotFirst = false;

  while (true) {
    const nextPromise = iterator.next();
    const result = await raceWithTimeout(
      nextPromise,
      gotFirst ? chunkIdleMs : firstResponseMs,
      gotFirst
        ? "E2810: LLM 流式响应中断（30 秒无数据）"
        : "E2801: LLM 首响应超时（90 秒）",
      signal
    );

    if (result.done) break;

    const [message] = result.value;
    if (!isAiMessage(message)) {
      if (message?._getType?.() === "tool" || message?.constructor?.name === "ToolMessage") {
        onStatus?.("executing");
      }
      continue;
    }

    const text = getMessageText(message);
    if (!text || text === streamed) {
      gotFirst = true;
      continue;
    }

    const delta = text.startsWith(streamed) ? text.slice(streamed.length) : text;
    streamed = text.startsWith(streamed) ? text : streamed + delta;
    if (delta) onChunk?.(delta);
    gotFirst = true;
  }

  return streamed;
}

function isRetriableAgentError(error) {
  if (!error || error.name === "AbortError") return false;
  const message = String(error.message ?? "");
  return (
    message.includes("E2801") ||
    message.includes("E2810") ||
    message.includes("timeout") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNRESET") ||
    message.includes("ECONNREFUSED") ||
    message.includes("fetch failed")
  );
}

module.exports = {
  FIRST_RESPONSE_TIMEOUT_MS,
  CHUNK_IDLE_TIMEOUT_MS,
  streamAgentWithTimeouts,
  consumeAgentMessageStream,
  isRetriableAgentError,
  raceWithTimeout,
};
