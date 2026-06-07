/**
 * 等待 Electron remote-debugging-port 就绪且 CDP 有可调试的 page target
 * （供 compound 中 Renderer attach 使用）
 */
const http = require("node:http");

const port = process.env.ELECTRON_CDP_PORT || "9333";
const timeoutMs = Number(process.env.ELECTRON_CDP_TIMEOUT_MS || 120000);
const intervalMs = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      `http://127.0.0.1:${port}${path}`,
      { timeout: 2000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${path}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`timeout for ${path}`));
    });
  });
}

async function hasDebuggableTarget() {
  const list = await fetchJson("/json/list");
  if (!Array.isArray(list)) return false;
  return list.some(
    (t) =>
      t.type === "page" &&
      typeof t.webSocketDebuggerUrl === "string" &&
      t.webSocketDebuggerUrl.length > 0
  );
}

async function main() {
  const deadline = Date.now() + timeoutMs;
  let lastError = "CDP not ready";

  while (Date.now() < deadline) {
    try {
      if (await hasDebuggableTarget()) {
        const list = await fetchJson("/json/list");
        const pages = list.filter((t) => t.type === "page");
        console.log(
          `[wait-cdp] ready: ${pages.length} page target(s) on port ${port}`
        );
        for (const p of pages) {
          console.log(`  - ${p.title || "(no title)"} ${p.url || ""}`);
        }
        return;
      }
      lastError = "no debuggable page target yet";
    } catch (err) {
      lastError = err.message;
    }
    await sleep(intervalMs);
  }

  throw new Error(
    `[wait-cdp] timed out after ${timeoutMs}ms (${lastError})`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
