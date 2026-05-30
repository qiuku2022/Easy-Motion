# Python API 接口设计

## 概述

本文档定义 Python FastAPI 子系统的完整接口契约，包括请求/响应 Schema、错误码、状态码和调用示例。Node.js 主进程通过 HTTP 调用这些接口。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| 基础 URL | `http://localhost:8000`（开发环境）|
| 协议 | HTTP/1.1（本地服务，无需 HTTPS）|
| 数据格式 | JSON |
| 编码 | UTF-8 |
| 端口 | 8000（默认），冲突时自动尝试 8001-8090 |

---

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-30T14:23:45.123Z",
    "requestId": "req-uuid"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "E1001",
    "message": "错误描述",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-05-30T14:23:45.123Z",
    "requestId": "req-uuid"
  }
}
```

### HTTP 状态码

| 状态码 | 含义 | 场景 |
|--------|------|------|
| 200 | OK | 请求成功 |
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 资源不存在 |
| 422 | Unprocessable Entity | 请求格式正确但语义错误（如 URL 无法访问）|
| 429 | Too Many Requests | 请求频率过高（爬虫反爬触发）|
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用（如浏览器崩溃后重启中）|

### 错误码定义

| 错误码 | 含义 | HTTP 状态码 | 说明 |
|--------|------|-------------|------|
| E1001 | URL_INVALID | 400 | URL 格式不正确 |
| E1002 | URL_UNREACHABLE | 422 | URL 无法访问（DNS 失败、超时）|
| E1003 | PAGE_LOAD_FAILED | 422 | Playwright 页面加载失败 |
| E1004 | CONTENT_EXTRACT_FAILED | 500 | 内容提取失败 |
| E1005 | RATE_LIMITED | 429 | 请求被目标网站限速 |
| E1006 | BROWSER_CRASH | 503 | Playwright 浏览器崩溃 |
| E1007 | FILE_SAVE_FAILED | 500 | 文件保存失败（磁盘满/权限不足）|
| E1008 | UNSUPPORTED_FORMAT | 400 | 不支持的文件格式 |
| E1009 | DATA_PARSE_FAILED | 422 | 数据解析失败（CSV/JSON 格式错误）|
| E1010 | TIMEOUT | 422 | 操作超时 |

---

## 接口列表

### 1. 健康检查

**GET /health**

Node.js 主进程用于检测 Python 服务是否存活。

**请求：**
```http
GET /health HTTP/1.1
```

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600,
    "browserReady": true
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | `healthy` / `degraded` / `unhealthy` |
| `version` | string | Python 服务版本 |
| `uptime` | number | 服务运行时间（秒）|
| `browserReady` | boolean | Playwright 浏览器是否就绪 |

---

### 2. 网页爬取

**POST /crawl**

抓取指定 URL 的网页内容，提取文本和结构化数据。

**请求：**
```http
POST /crawl HTTP/1.1
Content-Type: application/json

{
  "url": "https://example.com/article",
  "options": {
    "waitForSelector": "article",      // 可选：等待特定元素出现
    "waitForTimeout": 3000,             // 可选：等待时间（毫秒）
    "extractImages": true,              // 是否提取图片 URL
    "extractLinks": true,               // 是否提取链接
    "scrollToBottom": false,            // 是否滚动到页面底部（加载懒加载内容）
    "userAgent": "Mozilla/5.0...",      // 可选：自定义 User-Agent
    "proxy": null                       // 可选：代理配置
  }
}
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标 URL，必须以 http:// 或 https:// 开头 |
| `options` | object | 否 | 爬取选项 |
| `options.waitForSelector` | string | 否 | CSS 选择器，等待该元素出现后提取内容 |
| `options.waitForTimeout` | number | 否 | 页面加载后等待时间（毫秒），默认 3000 |
| `options.extractImages` | boolean | 否 | 是否提取图片 URL，默认 false |
| `options.extractLinks` | boolean | 否 | 是否提取页面链接，默认 false |
| `options.scrollToBottom` | boolean | 否 | 是否滚动加载，默认 false |
| `options.userAgent` | string | 否 | 自定义 User-Agent，默认使用常见浏览器 UA |
| `options.proxy` | string | 否 | 代理服务器地址，如 `http://proxy:8080` |

**响应：**

成功：
```json
{
  "success": true,
  "data": {
    "url": "https://example.com/article",
    "title": "文章标题",
    "content": "纯文本内容（已去除 HTML 标签）",
    "html": "原始 HTML（可选）",
    "markdown": "Markdown 格式内容",
    "images": [
      {
        "url": "https://example.com/img1.jpg",
        "alt": "图片描述",
        "width": 800,
        "height": 600
      }
    ],
    "links": [
      {
        "url": "https://example.com/page2",
        "text": "链接文字"
      }
    ],
    "metadata": {
      "description": "页面描述",
      "keywords": "关键词",
      "author": "作者",
      "publishDate": "2026-05-30T00:00:00Z"
    }
  }
}
```

失败（页面加载超时）：
```json
{
  "success": false,
  "error": {
    "code": "E1010",
    "message": "页面加载超时",
    "details": {
      "url": "https://example.com/slow-page",
      "timeout": 30000
    }
  }
}
```

---

### 3. 网页爬取并保存

**POST /crawl/save**

抓取网页内容并直接保存到指定路径。与 `/crawl` 的区别是返回文件路径而非内容。

**请求：**
```http
POST /crawl/save HTTP/1.1
Content-Type: application/json

{
  "url": "https://example.com/article",
  "outputPath": "/home/user/EasyMotion/项目/data/article.html",
  "options": {
    "format": "html",        // html / markdown / text
    "waitForTimeout": 3000
  }
}
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标 URL |
| `outputPath` | string | 是 | 保存路径（绝对路径）|
| `options` | object | 否 | 选项 |
| `options.format` | string | 否 | 保存格式：`html` / `markdown` / `text`，默认 `html` |
| `options.waitForTimeout` | number | 否 | 等待时间（毫秒），默认 3000 |

**响应：**

成功：
```json
{
  "success": true,
  "data": {
    "savedPath": "/home/user/EasyMotion/项目/data/article.html",
    "fileSize": 15234,
    "format": "html"
  }
}
```

失败（磁盘空间不足）：
```json
{
  "success": false,
  "error": {
    "code": "E1007",
    "message": "文件保存失败：磁盘空间不足",
    "details": {
      "outputPath": "/home/user/EasyMotion/项目/data/article.html",
      "availableSpace": 1048576
    }
  }
}
```

---

### 4. 网页截图

**POST /crawl/screenshot**

抓取网页并截图保存为图片。

**请求：**
```http
POST /crawl/screenshot HTTP/1.1
Content-Type: application/json

{
  "url": "https://example.com",
  "outputPath": "/home/user/EasyMotion/项目/assets/images/screenshot.png",
  "options": {
    "fullPage": false,        // 是否截取完整页面（滚动）
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "waitForTimeout": 3000,
    "waitForSelector": null,    // 等待特定元素出现后截图
    "clip": null              // 可选：截取区域 { x, y, width, height }
  }
}
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `url` | string | 是 | 目标 URL |
| `outputPath` | string | 是 | 保存路径（支持 .png / .jpg / .webp）|
| `options` | object | 否 | 截图选项 |
| `options.fullPage` | boolean | 否 | 是否截取完整页面，默认 false（只截取视口）|
| `options.viewport` | object | 否 | 视口尺寸，默认 `{ width: 1920, height: 1080 }` |
| `options.waitForTimeout` | number | 否 | 等待时间（毫秒），默认 3000 |
| `options.waitForSelector` | string | 否 | 等待该元素出现后截图 |
| `options.clip` | object | 否 | 截取区域 `{ x, y, width, height }` |

**响应：**

成功：
```json
{
  "success": true,
  "data": {
    "savedPath": "/home/user/EasyMotion/项目/assets/images/screenshot.png",
    "fileSize": 245678,
    "width": 1920,
    "height": 1080,
    "format": "png"
  }
}
```

---

### 5. 数据解析

**POST /data/parse**

解析数据文件（CSV/JSON/XLSX）为结构化数据。

**请求：**
```http
POST /data/parse HTTP/1.1
Content-Type: application/json

{
  "filePath": "/home/user/EasyMotion/项目/data/sales.csv",
  "options": {
    "format": "csv",          // csv / json / xlsx
    "delimiter": ",",          // CSV 分隔符，默认自动检测
    "encoding": "utf-8",        // 文件编码
    "sheetName": null,         // XLSX 工作表名，默认第一个
    "maxRows": 1000            // 最大读取行数
  }
}
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `filePath` | string | 是 | 数据文件绝对路径 |
| `options` | object | 否 | 解析选项 |
| `options.format` | string | 否 | 文件格式：`csv` / `json` / `xlsx`，默认从扩展名推断 |
| `options.delimiter` | string | 否 | CSV 分隔符，默认自动检测（逗号/分号/制表符）|
| `options.encoding` | string | 否 | 文件编码，默认 `utf-8` |
| `options.sheetName` | string | 否 | XLSX 工作表名，默认第一个工作表 |
| `options.maxRows` | number | 否 | 最大读取行数，默认 10000 |

**响应：**

成功：
```json
{
  "success": true,
  "data": {
    "format": "csv",
    "headers": ["日期", "销售额", "地区"],
    "rows": [
      { "日期": "2026-01-01", "销售额": 10000, "地区": "北京" },
      { "日期": "2026-01-02", "销售额": 15000, "地区": "上海" }
    ],
    "totalRows": 2,
    "columns": 3
  }
}
```

失败（CSV 格式错误）：
```json
{
  "success": false,
  "error": {
    "code": "E1009",
    "message": "CSV 解析失败：第 3 行列数不一致",
    "details": {
      "filePath": "/home/user/EasyMotion/项目/data/broken.csv",
      "lineNumber": 3,
      "expectedColumns": 3,
      "actualColumns": 2
    }
  }
}
```

---

### 6. 数据格式化

**POST /data/format**

将数据转换为指定格式并保存。

**请求：**
```http
POST /data/format HTTP/1.1
Content-Type: application/json

{
  "inputPath": "/home/user/EasyMotion/项目/data/raw.csv",
  "outputPath": "/home/user/EasyMotion/项目/data/formatted.json",
  "options": {
    "outputFormat": "json",     // json / csv / xlsx
    "transform": {
      "renameColumns": {
        "旧列名": "新列名"
      },
      "filterRows": "销售额 > 10000",
      "sortBy": "日期",
      "sortOrder": "asc"
    }
  }
}
```

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `inputPath` | string | 是 | 输入文件路径 |
| `outputPath` | string | 是 | 输出文件路径 |
| `options` | object | 否 | 格式化选项 |
| `options.outputFormat` | string | 否 | 输出格式：`json` / `csv` / `xlsx`，默认从扩展名推断 |
| `options.transform` | object | 否 | 数据转换操作 |
| `options.transform.renameColumns` | object | 否 | 列名重映射 |
| `options.transform.filterRows` | string | 否 | 过滤条件表达式 |
| `options.transform.sortBy` | string | 否 | 排序列名 |
| `options.transform.sortOrder` | string | 否 | 排序方向：`asc` / `desc` |

**响应：**

成功：
```json
{
  "success": true,
  "data": {
    "outputPath": "/home/user/EasyMotion/项目/data/formatted.json",
    "fileSize": 1024,
    "format": "json",
    "rowsProcessed": 100
  }
}
```

---

## 反爬策略详细实现

### Playwright 配置

```python
# src/crawler/playwright_crawler.py
from playwright.sync_api import sync_playwright
import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...",
]

class PlaywrightCrawler:
    def __init__(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-web-security",
                "--disable-features=IsolateOrigins,site-per-process",
            ]
        )
    
    def crawl(self, url: str, options: dict = None):
        context = self.browser.new_context(
            user_agent=random.choice(USER_AGENTS),
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
        )
        
        # 注入脚本隐藏自动化特征
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.chrome = { runtime: {} };
        """)
        
        page = context.new_page()
        
        # 随机延迟 1-3 秒
        time.sleep(random.uniform(1, 3))
        
        # 模拟真实用户行为
        page.mouse.move(random.randint(100, 500), random.randint(100, 500))
        
        response = page.goto(url, wait_until="networkidle", timeout=30000)
        
        # 等待指定选择器或超时
        if options and options.get("waitForSelector"):
            page.wait_for_selector(options["waitForSelector"], timeout=options.get("waitForTimeout", 3000))
        elif options and options.get("waitForTimeout"):
            page.wait_for_timeout(options["waitForTimeout"])
        
        # 滚动加载（如果需要）
        if options and options.get("scrollToBottom"):
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(2000)
        
        # 提取内容
        content = page.inner_text("body")
        title = page.title()
        
        context.close()
        
        return {
            "url": url,
            "title": title,
            "content": content,
        }
```

### 请求频率控制

- 单 IP 请求间隔：最小 1 秒，默认 1-3 秒随机
- 同一域名并发限制：最多 1 个并发请求
- 失败重试：最多 3 次，每次延迟指数增长（1s → 2s → 4s）
- 429 响应：自动等待 60 秒后重试，最多 2 次

---

## Node.js 调用示例

### 调用封装

```typescript
// electron/src/main/python-client.ts
import axios, { AxiosInstance } from "axios";

class PythonClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(port: number = 8000) {
    this.baseURL = `http://localhost:${port}`;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async healthCheck(): Promise<{ status: string; browserReady: boolean }> {
    const response = await this.client.get("/health");
    return response.data.data;
  }

  async crawl(url: string, options?: CrawlOptions): Promise<CrawlResult> {
    const response = await this.client.post("/crawl", { url, options });
    if (!response.data.success) {
      throw new PythonAPIError(response.data.error);
    }
    return response.data.data;
  }

  async crawlAndSave(
    url: string,
    outputPath: string,
    options?: CrawlSaveOptions
  ): Promise<{ savedPath: string; fileSize: number }> {
    const response = await this.client.post("/crawl/save", {
      url,
      outputPath,
      options,
    });
    if (!response.data.success) {
      throw new PythonAPIError(response.data.error);
    }
    return response.data.data;
  }

  async screenshot(
    url: string,
    outputPath: string,
    options?: ScreenshotOptions
  ): Promise<{ savedPath: string; width: number; height: number }> {
    const response = await this.client.post("/crawl/screenshot", {
      url,
      outputPath,
      options,
    });
    if (!response.data.success) {
      throw new PythonAPIError(response.data.error);
    }
    return response.data.data;
  }

  async parseData(
    filePath: string,
    options?: ParseOptions
  ): Promise<DataParseResult> {
    const response = await this.client.post("/data/parse", {
      filePath,
      options,
    });
    if (!response.data.success) {
      throw new PythonAPIError(response.data.error);
    }
    return response.data.data;
  }
}

class PythonAPIError extends Error {
  code: string;
  details: any;

  constructor(error: { code: string; message: string; details: any }) {
    super(error.message);
    this.code = error.code;
    this.details = error.details;
    this.name = "PythonAPIError";
  }
}
```

### 错误处理

```typescript
// 使用示例
try {
  const result = await pythonClient.crawl("https://example.com");
  console.log("爬取成功:", result.title);
} catch (error) {
  if (error instanceof PythonAPIError) {
    switch (error.code) {
      case "E1001":
        console.error("URL 格式错误:", error.message);
        break;
      case "E1010":
        console.error("页面加载超时，请检查网络或稍后重试");
        break;
      case "E1006":
        console.error("浏览器崩溃，正在重启...");
        // 触发 Python 服务重启
        await pythonService.restart();
        break;
      default:
        console.error("Python API 错误:", error.code, error.message);
    }
  } else if (error.code === "ECONNREFUSED") {
    console.error("Python 服务未启动，请检查服务状态");
  } else {
    console.error("未知错误:", error);
  }
}
```

---

## 服务生命周期管理

### Node.js 主进程管理

```typescript
// electron/src/main/python-service.ts
import { spawn, ChildProcess } from "child_process";
import path from "path";

class PythonService {
  private process: ChildProcess | null = null;
  private port: number = 8000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    const pythonPath = path.join(__dirname, "../../resources/python/main");
    
    this.process = spawn(pythonPath, ["--port", this.port.toString()], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 等待服务就绪
    await this.waitForReady(30000);
    
    // 启动心跳检测
    this.startHeartbeat();
  }

  async waitForReady(timeout: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const health = await pythonClient.healthCheck();
        if (health.status === "healthy") {
          return;
        }
      } catch {
        // 服务未就绪，等待
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("Python 服务启动超时");
  }

  startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await pythonClient.healthCheck();
      } catch {
        // 心跳失败，尝试重启
        console.warn("Python 服务心跳失败，尝试重启...");
        await this.restart();
      }
    }, 5000);
  }

  async restart(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      if (!this.process.killed) {
        this.process.kill("SIGKILL");
      }
    }
    await this.start();
  }

  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.process) {
      this.process.kill("SIGTERM");
    }
  }
}
```

---

*文档版本：v0.1 | 最后更新：2026-05-30*