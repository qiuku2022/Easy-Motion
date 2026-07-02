const {
  hasErrorCode,
  formatConversationSendError,
} = require("../src/main/services/conversation-errors");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  assert(hasErrorCode("E2804: invalid key"), "detects E2804");
  assert(!hasErrorCode("something failed"), "plain text has no code");

  const wrapped = formatConversationSendError(new Error("disk full"));
  assert(
    wrapped.message === "E2700: 消息发送失败（disk full）",
    "wraps unknown errors as E2700"
  );

  const preserved = formatConversationSendError(new Error("E2804: bad key"));
  assert(preserved.message === "E2804: bad key", "preserves existing codes");

  const empty = formatConversationSendError(new Error(""));
  assert(empty.message === "E2700: 消息发送失败", "empty becomes E2700");

  console.log("conversation-errors tests passed");
}

main();
