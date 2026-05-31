# IPC 通信协议规范

## 概述

本文档定义 Electron 主进程（Main）与渲染进程（Renderer）之间的完整 IPC 通信协议，包括消息命名规范、请求/响应格式、错误处理、超时策略和并发控制。所有 IPC 接口与 `技术规格.md`、`错误码统一字典.md`、`应用架构详细设计.md` 中对齐。

> **版本**：v0.1  
> **最后更新**：2026-05-30  
> **关联文档**：技术规格.md、应用架构详细设计.md、错误码统一字典.md、状态管理详细设计.md

---

## 消息命名规范

### 1. 命名空间规则

```
[方向]:[领域]:[动作]
```

| 方向 | 含义 | 示例 |
|------|------|------|
| `main` | Renderer → Main（请求） | `main:project:create` |
| `renderer` | Main → Renderer（通知/广播） | `renderer:project:loaded` |
| `broadcast` | Main → 所有 Renderer（广播） | `broadcast:app:shutting-down` |

### 2. 领域划分

| 领域 | 说明 | 处理器文件 |
|------|------|-----------|
| `project` | 总项目/子项目 CRUD | `ipc-handlers/project.ts` |
| `timeline` | 时间线读写、撤销/重做 | `ipc-handlers/timeline.ts` |
| `preview` | 预览控制、iframe 管理 | `ipc-handlers/preview.ts` |
| `conversation` | 对话历史、Agent 任务 | `ipc-handlers/conversation.ts` |
| `assets` | 素材导入、查询、缩略图 | `ipc-handlers/assets.ts` |
| `export` | 渲染导出、进度、取消 | `ipc-handlers/export.ts` |
| `settings` | 应用设置读写 | `ipc-handlers/settings.ts` |
| `app` | 应用生命周期、系统事件 | 内置于 `main/index.ts` |
| `python` | Python 服务代理 | `ipc-handlers/python-proxy.ts` |
| `llm` | LLM API 代理 | `ipc-handlers/llm-proxy.ts` |

### 3. 动作命名

| 动作 | 含义 | 适用场景 |
|------|------|----------|
| `get` | 获取单个资源 | 读取配置、获取项目详情 |
| `list` | 获取列表 | 项目列表、素材列表 |
| `create` | 创建资源 | 新建项目、导入素材 |
| `update` | 更新资源 | 重命名、修改配置 |
| `delete` | 删除资源 | 删除项目、删除素材 |
| `save` | 保存数据（文件写盘） | 保存时间线、保存对话 |
| `load` | 加载数据（文件读盘） | 加载时间线、加载对话 |
| `invoke` | 执行操作（无状态变更） | 播放控制、渲染触发 |
| `subscribe` | 订阅实时事件 | 导出进度、Agent 状态 |
| `unsubscribe` | 取消订阅 | 清理监听器 |

---

## 请求/响应格式

### 1. 请求消息（Renderer → Main）

```typescript
interface IPCRequest<T = unknown> {
  id: string;              // UUID，用于匹配响应（异步场景）
  channel: string;           // 如 "main:project:create"
  payload: T;              // 请求参数
  timestamp: number;        // 客户端发送时间戳（性能追踪）
  timeout?: number;       // 自定义超时（毫秒），默认 30 秒
}
```

**示例（新建项目）：**
```json
{
  "id": "req-uuid-001",
  "channel": "main:project:create",
  "payload": {
    "name": "Demo Project",
    "path": "/Users/qiuku/Projects/Demo",
    "resolution": "1920x1080",
    "fps": 30,
    "durationInFrames": 300
  },
  "timestamp": 1717065600000,
  "timeout": 10000
}
```

### 2. 响应消息（Main → Renderer）

```typescript
interface IPCResponse<T = unknown> {
  id: string;              // 对应请求的 id
  channel: string;         // 如 "main:project:create"
  success: boolean;
  data?: T;               // 成功时返回的数据
  error?: IPCError;       // 失败时的错误信息
  duration: number;       // 服务端处理耗时（毫秒）
}

interface IPCError {
  code: string;           // 错误码，如 "E2015"
  message: string;        // 用户友好的错误描述
  details?: unknown;      // 调试信息（开发模式显示）
}
```

**示例（成功）：**
```json
{
  "id": "req-uuid-001",
  "channel": "main:project:create",
  "success": true,
  "data": {
    "projectId": "proj-uuid-001",
    "path": "/Users/qiuku/Projects/Demo",
    "createdAt": 1717065600000
  },
  "duration": 245
}
```

**示例（失败）：**
```json
{
  "id": "req-uuid-001",
  "channel": "main:project:create",
  "success": false,
  "error": {
    "code": "E2015",
    "message": "项目目录已存在同名文件夹",
    "details": "路径 /Users/qiuku/Projects/Demo 已存在"
  },
  "duration": 12
}
```

### 3. 通知消息（Main → Renderer，单向）

```typescript
interface IPCNotification<T = unknown> {
  channel: string;         // 如 "renderer:export:progress"
  payload: T;
  timestamp: number;
}
```

**示例（导出进度）：**
```json
{
  "channel": "renderer:export:progress",
  "payload": {
    "exportId": "exp-001",
    "currentFrame": 150,
    "totalFrames": 300,
    "percentage": 50,
    "estimatedRemainingSeconds": 15
  },
  "timestamp": 1717065600000
}
```

---

## 完整 IPC 接口定义

### 1. 项目领域（project）

#### `main:project:list`
- **说明**：获取最近打开的项目列表
- **请求参数**：无
- **响应数据**：`ProjectSummary[]`
- **错误码**：`E2001`（数据库查询失败）
- **超时**：5 秒

#### `main:project:create`
- **说明**：新建总项目
- **请求参数**：
  ```typescript
  {
    name: string;               // 项目名称
    path: string;               // 保存路径
    resolution: string;         // 如 "1920x1080"
    fps: number;                // 帧率
    durationInFrames: number;   // 默认时长（帧）
    template?: string;         // 模板名称（可选）
  }
  ```
- **响应数据**：`{ projectId: string; path: string; createdAt: number }`
- **错误码**：`E2015`（目录已存在）、`E2016`（磁盘空间不足）、`E2017`（路径非法）
- **超时**：10 秒

#### `main:project:open`
- **说明**：打开已有项目
- **请求参数**：`{ projectId: string }`
- **响应数据**：`{ project: Project; subprojects: SubprojectSummary[] }`
- **错误码**：`E2018`（项目不存在）、`E2019`（项目文件损坏）
- **超时**：5 秒

#### `main:project:delete`
- **说明**：删除项目（软删除）
- **请求参数**：`{ projectId: string; force?: boolean }` // force=true 彻底删除
- **响应数据**：`{ deleted: boolean }`
- **错误码**：`E2018`（项目不存在）
- **超时**：10 秒

#### `main:project:rename`
- **说明**：重命名项目
- **请求参数**：`{ projectId: string; newName: string }`
- **响应数据**：`{ projectId: string; newName: string }`
- **错误码**：`E2017`（名称非法）、`E2020`（名称重复）
- **超时**：5 秒

#### `main:subproject:create`
- **说明**：在当前项目中新建子项目
- **请求参数**：`{ projectId: string; name: string; template?: string }`
- **响应数据**：`{ subprojectId: string; name: string; createdAt: number }`
- **错误码**：`E2021`（超出子项目数量限制，暂定为 50 个）
- **超时**：5 秒

#### `main:subproject:delete`
- **说明**：删除子项目
- **请求参数**：`{ projectId: string; subprojectId: string }`
- **响应数据**：`{ deleted: boolean }`
- **错误码**：`E2022`（子项目不存在）
- **超时**：5 秒

#### `main:subproject:duplicate`
- **说明**：复制子项目
- **请求参数**：`{ projectId: string; subprojectId: string; newName?: string }`
- **响应数据**：`{ newSubprojectId: string }`
- **错误码**：`E2021`（超出限制）
- **超时**：10 秒

---

### 2. 时间线领域（timeline）

#### `main:timeline:load`
- **说明**：加载子项目时间线
- **请求参数**：`{ subprojectId: string }`
- **响应数据**：`Timeline`（见 时间线编辑.md）
- **错误码**：`E2040`（时间线文件不存在）、`E2041`（时间线格式错误）
- **超时**：3 秒

#### `main:timeline:save`
- **说明**：保存时间线到 `subproject.json`
- **请求参数**：`{ subprojectId: string; timeline: Timeline }`
- **响应数据**：`{ saved: boolean; timestamp: number }`
- **错误码**：`E2042`（写入失败）、`E2043`（时间线校验失败）
- **超时**：10 秒
- **并发控制**：写入队列，同一时刻只有一个写操作在执行（见 技术规格.md）

#### `main:timeline:snapshot:create`
- **说明**：创建时间线快照
- **请求参数**：`{ subprojectId: string; label?: string }`
- **响应数据**：`{ snapshotId: string; timestamp: number }`
- **错误码**：`E2044`（快照创建失败）
- **超时**：5 秒

#### `main:timeline:snapshot:list`
- **说明**：列出所有快照
- **请求参数**：`{ subprojectId: string }`
- **响应数据**：`SnapshotSummary[]`
- **超时**：3 秒

#### `main:timeline:snapshot:restore`
- **说明**：恢复到指定快照
- **请求参数**：`{ subprojectId: string; snapshotId: string }`
- **响应数据**：`{ restored: boolean; timeline: Timeline }`
- **错误码**：`E2045`（快照不存在或损坏）
- **超时**：5 秒

---

### 3. 素材领域（assets）

#### `main:asset:import`
- **说明**：导入素材到项目
- **请求参数**：
  ```typescript
  {
    projectId: string;
    filePaths: string[];        // 本地文件绝对路径
    options?: {
      generateThumbnail?: boolean;  // 默认 true
      copyToProject?: boolean;      // 默认 true（复制到项目目录）
    }
  }
  ```
- **响应数据**：`{ imported: Asset[]; failed: { path: string; reason: string }[] }`
- **错误码**：`E2030`（文件不存在）、`E2031`（不支持的格式）、`E2032`（磁盘空间不足）
- **超时**：60 秒（大文件导入可能耗时较长）
- **并发控制**：素材导入支持并行，但单文件最大 500MB

#### `main:asset:list`
- **说明**：获取项目素材列表
- **请求参数**：`{ projectId: string; type?: AssetType; search?: string }`
- **响应数据**：`AssetSummary[]`
- **错误码**：`E2001`（数据库查询失败）
- **超时**：5 秒

#### `main:asset:delete`
- **说明**：删除素材
- **请求参数**：`{ projectId: string; assetId: string; deleteFile?: boolean }`
- **响应数据**：`{ deleted: boolean }`
- **错误码**：`E2033`（素材不存在）、`E2034`（素材被占用，无法删除）`
- **超时**：5 秒

#### `main:asset:thumbnail`
- **说明**：获取素材缩略图（如尚未生成则异步生成）
- **请求参数**：`{ assetId: string; width?: number; height?: number }`
- **响应数据**：`{ thumbnailPath: string }`（base64 或文件路径）
- **错误码**：`E2035`（缩略图生成失败）
- **超时**：10 秒

---

### 4. 预览领域（preview）

#### `main:preview:control`
- **说明**：控制 Remotion 预览播放
- **请求参数**：
  ```typescript
  {
    subprojectId: string;
    action: 'play' | 'pause' | 'seek' | 'set-speed';
    value?: number;             // seek 时的目标帧，或 set-speed 时的倍速
  }
  ```
- **响应数据**：`{ executed: boolean; currentFrame?: number }`
- **超时**：1 秒（高频操作，超时极短）

#### `main:preview:reload`
- **说明**：强制刷新 iframe（Generator 代码更新后）
- **请求参数**：`{ subprojectId: string }`
- **响应数据**：`{ reloaded: boolean }`
- **错误码**：`E2050`（iframe 加载失败）
- **超时**：10 秒

---

### 5. 导出领域（export）

#### `main:export:start`
- **说明**：启动视频导出
- **请求参数**：
  ```typescript
  {
    subprojectId: string;
    format: 'mp4' | 'webm' | 'gif';
    resolution?: string;         // 默认使用项目分辨率
    quality?: 'high' | 'medium' | 'low';
    outputPath: string;          // 用户选择的输出路径
  }
  ```
- **响应数据**：`{ exportId: string }`
- **错误码**：`E2060`（导出参数无效）、`E2061`（输出路径无写入权限）
- **超时**：5 秒（仅启动，不等待完成）

#### `main:export:cancel`
- **说明**：取消导出
- **请求参数**：`{ exportId: string }`
- **响应数据**：`{ cancelled: boolean }`
- **错误码**：`E2062`（导出任务不存在或已完成）
- **超时**：5 秒

#### `renderer:export:progress`（通知）
- **说明**：导出进度实时推送
- **Payload**：
  ```typescript
  {
    exportId: string;
    status: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'failed';
    currentFrame: number;
    totalFrames: number;
    percentage: number;
    fps: number;
    estimatedRemainingSeconds: number;
  }
  ```

#### `renderer:export:completed`（通知）
- **说明**：导出完成
- **Payload**：
  ```typescript
  {
    exportId: string;
    outputPath: string;
    fileSize: number;
    duration: number;            // 实际耗时（秒）
  }
  ```

---

### 6. 对话领域（conversation）

#### `main:conversation:load`
- **说明**：加载子项目对话历史
- **请求参数**：`{ subprojectId: string }`
- **响应数据**：`Conversation`（见 交互流程.md）
- **错误码**：`E2070`（对话文件不存在）
- **超时**：3 秒

#### `main:conversation:save`
- **说明**：保存对话历史
- **请求参数**：`{ subprojectId: string; conversation: Conversation }`
- **响应数据**：`{ saved: boolean }`
- **错误码**：`E2071`（保存失败）
- **超时**：5 秒

---

### 7. 设置领域（settings）

#### `main:settings:get`
- **说明**：读取应用设置
- **请求参数**：`{ keys?: string[] }` // 不传则返回全部
- **响应数据**：`AppSettings`（见 配置管理参考.md）
- **超时**：2 秒

#### `main:settings:update`
- **说明**：更新应用设置
- **请求参数**：`{ settings: Partial<AppSettings> }`
- **响应数据**：`{ updated: boolean }`
- **错误码**：`E2100`（设置值无效）
- **超时**：3 秒

---

### 8. Python 服务代理（python）

#### `main:python:proxy`
- **说明**：Renderer 通过 Main 转发请求到 Python FastAPI
- **请求参数**：
  ```typescript
  {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;               // Python API 路径，如 "/crawl"
    body?: unknown;
    headers?: Record<string, string>;
  }
  ```
- **响应数据**：Python API 的原生响应（JSON）
- **错误码**：`E1000`（Python 服务不可用）、`E1002`（超时）
- **超时**：30 秒（可自定义）
- **并发**：无限制，由 Python FastAPI 自行处理并发

---

### 9. LLM 服务代理（llm）

#### `main:llm:stream`
- **说明**：发起 LLM 流式请求
- **请求参数**：
  ```typescript
  {
    provider: string;           // 'openai' | 'claude' | 'local'
    model?: string;
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
  }
  ```
- **响应模式**：流式（通过 `renderer:llm:chunk` 通知逐字推送）
- **错误码**：`E2080`（LLM API 配置错误）、`E2081`（LLM 请求失败）、`E2082`（LLM 流式中断）
- **超时**：90 秒（首次响应）；流式输出无超时，但单次 chunk 间隔 > 30 秒视为中断

#### `renderer:llm:chunk`（通知）
- **Payload**：`{ requestId: string; chunk: string; isDone: boolean }`

#### `main:llm:cancel`
- **说明**：取消正在进行的 LLM 请求
- **请求参数**：`{ requestId: string }`
- **响应数据**：`{ cancelled: boolean }`
- **超时**：2 秒

---

### 10. 应用生命周期（app）

#### `broadcast:app:shutting-down`
- **说明**：应用即将关闭，通知所有 Renderer 保存状态
- **Payload**：`{ reason: 'user-quit' | 'update' | 'crash' }`
- **Renderer 响应**：需在 3 秒内完成保存，通过 `main:app:ready-to-quit` 回复

#### `main:app:ready-to-quit`
- **说明**：Renderer 确认已保存，可以安全退出
- **请求参数**：`{ windowId: string }`
- **响应数据**：无

---

## 错误码映射表

### IPC 错误码速查

| IPC 接口 | 可能返回的错误码 | 说明 |
|----------|----------------|------|
| `main:project:create` | `E2015`, `E2016`, `E2017` | 目录已存在、空间不足、路径非法 |
| `main:project:open` | `E2018`, `E2019` | 项目不存在、文件损坏 |
| `main:project:delete` | `E2018` | 项目不存在 |
| `main:project:rename` | `E2017`, `E2020` | 名称非法、重复 |
| `main:subproject:create` | `E2021` | 超出数量限制 |
| `main:subproject:delete` | `E2022` | 子项目不存在 |
| `main:timeline:load` | `E2040`, `E2041` | 时间线不存在、格式错误 |
| `main:timeline:save` | `E2042`, `E2043` | 写入失败、校验失败 |
| `main:asset:import` | `E2030`, `E2031`, `E2032` | 文件不存在、格式不支持、空间不足 |
| `main:asset:delete` | `E2033`, `E2034` | 素材不存在、被占用 |
| `main:preview:reload` | `E2050` | iframe 加载失败 |
| `main:export:start` | `E2060`, `E2061` | 参数无效、无写入权限 |
| `main:export:cancel` | `E2062` | 任务不存在 |
| `main:settings:update` | `E2100` | 设置值无效 |
| `main:python:proxy` | `E1000`, `E1002` | Python 不可用、超时 |
| `main:llm:stream` | `E2080`, `E2081`, `E2082` | 配置错误、请求失败、流式中断 |

---

## 超时策略

### 1. 默认超时

| 操作类型 | 默认超时 | 说明 |
|----------|----------|------|
| 数据库查询 | 5 秒 | project:list、asset:list 等 |
| 文件读写 | 10 秒 | timeline:save、project:create 等 |
| 预览控制 | 1 秒 | preview:control（高频操作） |
| 素材导入 | 60 秒 | asset:import（大文件） |
| 导出启动 | 5 秒 | export:start |
| LLM 流式 | 90 秒 | llm:stream（首次响应） |
| Python 代理 | 30 秒 | python:proxy |
| 系统操作 | 3 秒 | app:ready-to-quit |

### 2. 超时处理策略

```
Renderer 发送 IPC 请求
  ├── 设置超时计时器（Timer）
  ├── 等待 Main 响应
  │     ├── 正常响应 → 清除计时器，返回数据
  │     └── 超时触发 → 
  │           ├── 1. Renderer 显示 "操作超时" 提示
  │           ├── 2. 自动重试 1 次（仅限幂等操作：get、list、load）
  │           ├── 3. 重试仍超时 → 向用户提示"请检查系统状态或稍后重试"
  │           └── 4. 非幂等操作（create、save、delete）不重试，直接报错
  └── 返回结果或错误
```

### 3. 幂等操作判定

| 幂等（可重试） | 非幂等（不可重试） |
|----------------|-------------------|
| `project:list` | `project:create` |
| `project:open` | `project:delete` |
| `timeline:load` | `timeline:save` |
| `asset:list` | `asset:import` |
| `settings:get` | `export:start` |
| `preview:control` | `llm:stream` |

---

## 并发控制

### 1. 主进程单写队列

**实现：** 主进程维护一个 `Map<projectId, WriteQueue>`，同一项目的文件写操作串行执行。

```typescript
// main/utils/write-queue.ts
class ProjectWriteQueue {
  private queue: Map<string, Promise<unknown>> = new Map();

  async enqueue<T>(projectId: string, task: () => Promise<T>): Promise<T> {
    const current = this.queue.get(projectId) ?? Promise.resolve();
    const next = current.then(task).finally(() => {
      if (this.queue.get(projectId) === next) {
        this.queue.delete(projectId);
      }
    });
    this.queue.set(projectId, next);
    return next;
  }
}
```

**受控操作：**
- `main:timeline:save`
- `main:conversation:save`
- `main:project:update`（重命名、修改配置）

### 2. 渲染进程并发限制

- **素材导入**：最多同时导入 5 个文件（超出排队）
- **LLM 请求**：同一时刻只能有一个流式请求在运行（新请求自动取消前一个）
- **导出任务**：同一时刻只能有一个导出任务在运行

### 3. IPC 调用并发数

- 主进程不限制 IPC 并发数，但关键操作（写盘）通过队列串行化。
- 渲染进程侧使用 `Promise.all` 限制批量请求的并发（如素材导入）。

---

## 安全设计

### 1. 通道白名单

主进程启动时注册 IPC 处理器，未注册的通道将被拒绝：

```typescript
// main/index.ts
const VALID_CHANNELS = [
  'main:project:list',
  'main:project:create',
  // ... 所有允许的通道
];

ipcMain.handle('*', (event, channel) => {
  if (!VALID_CHANNELS.includes(channel)) {
    throw new Error(`未授权的 IPC 通道: ${channel}`);
  }
});
```

### 2. 参数校验

所有 IPC 处理器入口进行参数校验（使用 Zod Schema）：

```typescript
// ipc-handlers/project.ts
import { z } from 'zod';

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  path: z.string().min(1),
  resolution: z.string().regex(/^\d+x\d+$/),
  fps: z.number().min(1).max(120),
  durationInFrames: z.number().min(1).max(100000),
  template: z.string().optional(),
});

ipcMain.handle('main:project:create', async (event, payload) => {
  const params = CreateProjectSchema.parse(payload); // 校验失败自动抛出 400 错误
  // ... 处理逻辑
});
```

### 3. 路径注入防护

所有涉及文件路径的 IPC 接口在主进程侧进行路径规范化：

```typescript
import path from 'path';

function sanitizePath(inputPath: string, baseDir: string): string {
  const resolved = path.resolve(baseDir, inputPath);
  if (!resolved.startsWith(baseDir)) {
    throw new Error('路径越界访问'); // 阻止 ../ 攻击
  }
  return resolved;
}
```

---

## 调试与监控

### 1. IPC 日志（开发模式）

```
[IPC] → main:project:create { name: "Demo", ... } (req-uuid-001)
[IPC] ← main:project:create success { projectId: "..." } (245ms)
[IPC] → main:asset:import { filePaths: [...] } (req-uuid-002)
[IPC] ← main:asset:import timeout (60000ms) → retrying...
```

### 2. 性能追踪

- 每个 IPC 请求/响应携带 `timestamp` 和 `duration`，用于识别慢接口。
- 超过平均耗时 3 倍的请求标记为慢查询，输出到 `~/.easymotion/logs/ipc-slow.log`。

### 3. 错误上报

- IPC 错误（code 以 E2/E1 开头）自动记录到 `~/.easymotion/logs/errors.log`。
- 包含：时间戳、通道、错误码、错误消息、请求参数（脱敏后）。

---

## 变更记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v0.1 | 2026-05-30 | 初始版本，定义 10 个领域的 IPC 接口、错误码映射、超时策略 |
