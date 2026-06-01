# EasyMotion 开发计划

> 本文档记录 EasyMotion 项目的开发进度和后续计划。
> 最后更新：2026-06-01（M4 已完成）

---

## 项目概述

EasyMotion 是一款基于 Remotion + Electron 的桌面应用，通过 LLM 驱动的对话式交互，让没有编程经验的用户也能快速生成专业级动画。

**技术栈**：Electron 30 + React 18 + TypeScript 5.4 + Remotion 4 + Python FastAPI + pnpm workspace

---

## 已完成里程碑

### M0：项目脚手架（✅ 已完成）

**时间**：2026-05-31

**目标**：搭建可运行的 monorepo 骨架，确保开发环境就绪

**交付物**：
- ✅ monorepo 目录结构（apps/electron + apps/python + packages/shared）
- ✅ Electron 最小可运行骨架（主进程 + 预加载 + 渲染进程）
- ✅ Python FastAPI 最小可运行服务（/health 接口）
- ✅ 构建工具链（Vite + TypeScript 严格模式 + ESLint + Prettier）
- ✅ GitHub Actions CI 工作流
- ✅ VS Code 调试配置（Electron 主进程/渲染进程 + Python）

**验收标准**：
- ✅ `pnpm install` 成功
- ✅ `pnpm dev` 启动 Electron 窗口
- ✅ Python `/health` 返回 200
- ✅ `pnpm build` / `pnpm lint` 通过
- ✅ 18/18 单元测试通过

**文件清单**：
```
package.json
pnpm-workspace.yaml
tsconfig.json / tsconfig.base.json
apps/electron/src/main/index.ts
apps/electron/src/preload/index.ts
apps/electron/src/renderer/src/App.tsx
apps/python/main.py
packages/shared/src/types/*.ts
.vscode/launch.json
.github/workflows/ci.yml
```

---

### M1：项目系统 + 文件服务（✅ 已完成）

**时间**：2026-05-31

**目标**：实现项目的创建、打开、保存、删除，建立文件服务基础

**交付物**：
- ✅ **project-service.ts** — 项目 CRUD（新建/打开/保存/关闭/删除/重命名）
- ✅ **file-service.ts** — 文件系统抽象（读/写/复制/删除/哈希/验证）
- ✅ **write-queue.ts** — 单写队列（按 projectId 串行化）
- ✅ **atomic-write.ts** — 原子写入（临时文件 + 重命名 + 备份恢复）
- ✅ **template-service.ts** — 项目模板生成（Remotion 骨架）
- ✅ **config-init.ts** — `~/.easymotion/` 配置目录初始化
- ✅ **错误处理系统** — AppError 基类 + E2000/E2100/E2200 错误工厂
- ✅ **IPC 处理器** — main:project:* 和 main:subproject:* 完整实现
- ✅ **预加载 API** — project/subproject 命名空间
- ✅ **项目模板** — default-project（含 Remotion package.json、tsconfig、Root.tsx）

**验收标准**：
- ✅ 创建项目 → 完整目录结构生成
- ✅ 打开项目 → 加载 project.json
- ✅ 修改保存 → 原子写入 + 备份
- ✅ 删除项目 → 目录清理 + 最近列表更新
- ✅ 文件安全 → validatePath 防止目录遍历

**技术亮点**：
- `Map<string, Promise>` 写入队列：同项目串行，不同项目并行
- `crypto.randomUUID()`：零依赖 UUID 生成
- `writeFileAtomic`：temp → rename → backup 模式
- `wrapHandler`：IPC 错误自动捕获 → 标准响应格式

**测试覆盖**：18/18 通过
- FileService（10 项）：路径验证、读写、JSON、哈希
- WriteQueue（4 项）：串行化、并行、错误传播
- ProjectService（4 项）：创建、打开、保存、删除

---

## 已完成里程碑

### M0：项目脚手架（✅ 已完成）

**时间**：2026-05-31

**目标**：搭建可运行的 monorepo 骨架，确保开发环境就绪

**交付物**：
- ✅ monorepo 目录结构（apps/electron + apps/python + packages/shared）
- ✅ Electron 最小可运行骨架（主进程 + 预加载 + 渲染进程）
- ✅ Python FastAPI 最小可运行服务（/health 接口）
- ✅ 构建工具链（Vite + TypeScript 严格模式 + ESLint + Prettier）
- ✅ GitHub Actions CI 工作流
- ✅ VS Code 调试配置（Electron 主进程/渲染进程 + Python）

**验收标准**：
- ✅ `pnpm install` 成功
- ✅ `pnpm dev` 启动 Electron 窗口
- ✅ Python `/health` 返回 200
- ✅ `pnpm build` / `pnpm lint` 通过
- ✅ 18/18 单元测试通过

**文件清单**：
```
package.json
pnpm-workspace.yaml
tsconfig.json / tsconfig.base.json
apps/electron/src/main/index.ts
apps/electron/src/preload/index.ts
apps/electron/src/renderer/src/App.tsx
apps/python/main.py
packages/shared/src/types/*.ts
.vscode/launch.json
.github/workflows/ci.yml
```

---

### M1：项目系统 + 文件服务（✅ 已完成）

**时间**：2026-05-31

**目标**：实现项目的创建、打开、保存、删除，建立文件服务基础

**交付物**：
- ✅ **project-service.ts** — 项目 CRUD（新建/打开/保存/关闭/删除/重命名）
- ✅ **file-service.ts** — 文件系统抽象（读/写/复制/删除/哈希/验证）
- ✅ **write-queue.ts** — 单写队列（按 projectId 串行化）
- ✅ **atomic-write.ts** — 原子写入（临时文件 + 重命名 + 备份恢复）
- ✅ **template-service.ts** — 项目模板生成（Remotion 骨架）
- ✅ **config-init.ts** — `~/.easymotion/` 配置目录初始化
- ✅ **错误处理系统** — AppError 基类 + E2000/E2100/E2200 错误工厂
- ✅ **IPC 处理器** — main:project:* 和 main:subproject:* 完整实现
- ✅ **预加载 API** — project/subproject 命名空间
- ✅ **项目模板** — default-project（含 Remotion package.json、tsconfig、Root.tsx）

**验收标准**：
- ✅ 创建项目 → 完整目录结构生成
- ✅ 打开项目 → 加载 project.json
- ✅ 修改保存 → 原子写入 + 备份
- ✅ 删除项目 → 目录清理 + 最近列表更新
- ✅ 文件安全 → validatePath 防止目录遍历

**技术亮点**：
- `Map<string, Promise>` 写入队列：同项目串行，不同项目并行
- `crypto.randomUUID()`：零依赖 UUID 生成
- `writeFileAtomic`：temp → rename → backup 模式
- `wrapHandler`：IPC 错误自动捕获 → 标准响应格式

**测试覆盖**：18/18 通过
- FileService（10 项）：路径验证、读写、JSON、哈希
- WriteQueue（4 项）：串行化、并行、错误传播
- ProjectService（4 项）：创建、打开、保存、删除

---

### M2：时间线数据模型 + Generator（✅ 已完成）

**时间**：2026-05-31

**目标**：实现时间线的核心数据结构和代码生成器，建立"数据 → 代码 → 预览"的基础链路

**交付物**：
1. **时间线数据模型**
   - ✅ `packages/shared/src/types/timeline.ts` — 扩展完整接口（`ClipSource` 联合类型、`AnimationConfig`、`Keyframe`、`TextStyle`/`ShapeStyle`/`ImageStyle`、group 轨道的 `children`/`collapsed`）
   - ✅ `packages/shared/src/validation/timeline.ts` — Zod Schema 验证（含 discriminatedUnion 的 `ClipSource`）
   - ✅ `packages/shared/package.json` — 添加 `exports` 条件导出（`import`→源码, `require`→CommonJS dist）

2. **Generator（核心模块）**
   - ✅ `apps/electron/src/main/generator/index.ts` — `TimelineGenerator`：接收 `Timeline` JSON → 扁平化 group 轨道 → 按 order 排序 → 生成 `Root.tsx` + `MainSequence.tsx`
   - ✅ `apps/electron/src/main/generator/template-engine.ts` — `TemplateEngine`：字符串模板引擎，生成含 `<Composition>`、`<AbsoluteFill>`、`<Sequence>` 的合法 TSX
   - ✅ `apps/electron/src/main/generator/component-registry.ts` — `ComponentRegistry`：映射 `text→TextLayer`、`image→ImageLayer`、`shape→ShapeLayer`、`audio→AudioLayer`

3. **基础 Layer 组件**
   - ✅ `TextLayer.tsx` — 文字渲染，支持 `useCurrentFrame` + `interpolate()` 的关键帧动画，入场/出场动画（fade/slide/scale）
   - ✅ `ImageLayer.tsx` — 图片渲染，基于 Remotion `<Img>`
   - ✅ `ShapeLayer.tsx` — 形状渲染（rect/circle via CSS）
   - ✅ `AudioLayer.tsx` — 音频渲染，基于 Remotion `<Audio>`
   - ✅ `layers/utils.ts` — 共享工具：`easingMap`、`applyKeyframes`、`applyInAnimation`/`applyOutAnimation`、`getValueByPath`/`setValueByPath`

4. **timelineStore（Zustand + Immer）**
   - ✅ `apps/electron/src/renderer/src/stores/timelineStore.ts` — 完整状态管理：loadTimeline、addTrack/removeTrack/reorderTracks、addClip/removeClip/moveClip/resizeClip、关键帧操作、播放控制（play/pause/seekTo/step）
   - ✅ 撤销/重做栈（max 50 步，`deepClone` 实现）
   - ✅ `hasUnsavedChanges` 追踪

5. **基础时间线 UI**
   - ✅ `TimelinePanel.tsx` — 主面板，含轨道列表、片段块、播放头、播放控制
   - ✅ `TrackRow.tsx`、`ClipBlock.tsx`、`Playhead.tsx`、`TimelineControls.tsx`
   - ✅ 集成到 `App.tsx`

6. **IPC + Preload**
   - ✅ `main:timeline:update` / `main:timeline:generate` 处理器
   - ✅ `window.electronAPI.timeline` / `.preview` 命名空间

**验收标准**：
- ✅ `pnpm typecheck` 全 workspace 通过
- ✅ `pnpm test` 43/43 通过（18 M1 回归 + 25 M2 新增）
- ✅ VS Code `F5` 调试 "Electron: Main Process" 正常启动
- ✅ 手动创建 timeline JSON（含 2 个 text 轨道）→ Generator 生成 TSX → 编译通过

**技术亮点**：
- `packages/shared` 双模式导出：`exports.import` 供 Vite 源码引用，`exports.require` 供 Node.js 加载 CommonJS dist
- Generator 完整流水线：Timeline JSON → 扁平化 → 排序 → TSX 生成
- Layer 组件自包含关键帧插值：`applyKeyframes` 支持 linear/bezier/hold 三种 interpolation 模式
- timelineStore 使用 Immer 的 `WritableDraft` 中间件，实现不可变状态的直观修改

**测试覆盖**：43/43 通过
- Generator（4 项）：多轨道生成、不可见轨道跳过、group 扁平化、order 排序
- TemplateEngine（5 项）：Root.tsx 生成、MainSequence.tsx 生成、序列排序、keyframes JSON、空序列
- ComponentRegistry（6 项）：四种类型映射、未注册类型异常、全定义枚举
- timelineStore（10 项）：加载、addTrack、undo/redo、addClip、removeClip、moveClip、seekTo、toggleVisibility、历史上限

---

### M3：Remotion 预览集成（✅ 已完成）

**时间**：2026-06-01

**目标**：将 Remotion 预览嵌入 Electron 主窗口，实现"修改即预览"

**交付物**：
1. **iframe 集成** ✅
   - ✅ 子项目 Vite dev server 启动和管理（PreviewService）
   - ✅ iframe 嵌入 Remotion Player（PreviewPanel）
   - ✅ iframe 与父窗口的 `postMessage` 通信（usePreviewBridge）

2. **预览控制** ✅
   - ✅ 播放/暂停/seekTo 控制（PreviewControls）
   - ✅ 播放头位置同步（App.tsx useEffect）
   - ✅ 预览缩放（50%-200%，CSS transform scale）

3. **实时重载** ✅
   - ✅ Generator 生成代码 → 写入 `remotion/src/` → 触发 HMR
   - ✅ IPC `generateAndUpdate` 处理器自动写入磁盘

4. **预览窗口 UI** ✅
   - ✅ 播放控制按钮（播放/暂停/步进/seek/缩放）
   - ✅ 时间码显示（MM:SS:FF 格式）
   - ✅ 预览占位状态（无项目/启动中/错误）

**验收标准**：
- ✅ 打开子项目 → iframe 加载 Remotion Player → 显示动画
- ✅ 点击播放 → 动画播放 → 播放头同步移动
- ✅ 修改 timeline → 500ms 后预览自动更新

**技术亮点**：
- `PreviewService` 使用 Vite Node.js API 在 Electron 主进程中动态启动 dev server
- `postMessage` 双向通信协议：父窗口 ↔ iframe ↔ Remotion Player
- `previewStore` 使用 Zustand + Immer，与 `timelineStore` 双向帧同步
- 动态 `import('vite')` 避免开发依赖打包问题

**测试覆盖**：43/43 通过（M0-M2 回归 + M3 新增无破坏）

**文件清单**：
```
apps/electron/src/main/preview-service.ts
apps/electron/src/main/ipc-handlers/preview.ts
apps/electron/src/renderer/src/stores/previewStore.ts
apps/electron/src/renderer/src/hooks/usePreviewBridge.ts
apps/electron/src/renderer/src/components/preview/PreviewPanel.tsx
apps/electron/src/renderer/src/components/preview/PreviewControls.tsx
apps/electron/src/renderer/src/components/preview/PreviewPlaceholder.tsx
apps/electron/resources/templates/default-project/subprojects/default/remotion/preview/
```

---

### M4：时间线编辑 UI（✅ 已完成）

**时间**：2026-06-01

**目标**：实现完整的时间线拖拽编辑功能

**交付物**：
1. **片段拖拽** ✅
   - ✅ 拖拽片段主体调整位置（`useTimelineDrag` hook，pointer 事件）
   - ✅ 拖拽片段左/右边缘调整时长（resize-left/right 手柄）
   - ✅ 实时视觉反馈，约束：startInFrames ≥ 0，durationInFrames ≥ 1

2. **轨道操作** ✅
   - ✅ 添加轨道按钮 + 下拉菜单（text/image/video/audio/shape）
   - ✅ 删除轨道按钮（×）
   - ✅ 拖拽轨道头部（⠿）调整层级（HTML5 drag + `reorderTracks`）
   - ✅ 轨道锁定（🔒）/ 隐藏（👁）/ 独奏（🎧）/ 静音（🔇）按钮
   - ✅ 轨道颜色标记（4px 竖条，按类型着色）

3. **吸附（Snap）** ✅
   - ✅ `collectSnapPoints()` 收集所有片段边界 + 时间线起点
   - ✅ `findSnapPosition()` 10px 阈值内自动吸附
   - ✅ 绿色虚线视觉反馈（`SnapGuides` 组件）
   - ✅ 按住 Alt 临时禁用吸附
   - ✅ 吸附开关按钮（🧲）

4. **时间线缩放** ✅
   - ✅ `pixelsPerFrame` 动态状态（0.5 ~ 20）
   - ✅ 缩放 +/- 按钮
   - ✅ Shift + 滚轮缩放
   - ✅ 缩放值显示（如 2.5×）

5. **撤销/重做** ✅
   - ✅ **Command Pattern 重构**：11 个 delta-based 专用 Command 类
   - ✅ `CommandHistory` 模块级单例（内存，max 50 步）
   - ✅ `historyMeta` 响应式状态（`canUndo`/`canRedo`/`pastCount`/`futureCount`）
   - ✅ 快捷键：Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y（macOS Cmd 适配）

6. **播放头交互** ✅
   - ✅ 可拖拽播放头（pointer 事件，实时 seek）
   - ✅ 点击时间线 ruler 跳转
   - ✅ Frame clamping [0, durationInFrames-1]

7. **键盘快捷键系统** ✅
   - ✅ `useKeyboardShortcuts` 全局 hook
   - ✅ Space（播放/暂停）、←/→（逐帧）、Delete（删除选中片段）
   - ✅ S（在播放头处分割选中片段）
   - ✅ 输入框内自动屏蔽快捷键

**验收标准**：
- ✅ 拖拽片段到新位置 → timeline 数据更新 → 预览同步
- ✅ 拖拽片段边缘 → duration 变化 → 预览同步
- ✅ 片段靠近边界时自动吸附 → 松开鼠标后位置精确对齐
- ✅ 删除片段 → Ctrl+Z → 片段恢复
- ✅ 连续操作 10 次 → 可连续撤销 10 次 → 撤销栈满后最早的被丢弃
- ✅ 跨轨道拖拽 → 片段移动 → undo 恢复原始轨道和位置
- ✅ 缩放时间线 → clips 重新定位 → 播放头比例正确

**技术亮点**：
- **Command Pattern 架构**：从快照式撤销重构为 delta-based 命令，内存效率提升，Undo/Redo 链支持任意深度回退
- **Redo 栈修复**：`pushToPast()` 方法解决 `redo()` 调用 `push()` 意外清空 redo 栈的 bug
- **Raw Pointer Events**：Timeline 拖拽使用原生 pointer 事件（非 @dnd-kit），获得精确的像素级控制和边缘手柄识别
- **Drag → Immediate → Command 三阶段**：拖拽期间实时更新（无 history），mouseup 时记录 Command，保证 50 次拖拽只产生 1 条历史记录
- **轨道 Solo 逻辑**：检测"是否已 solo"状态机，实现 solo-on（静音其他）/ solo-off（恢复全部）的 toggle 行为

**测试覆盖**：103/103 通过
- CommandHistory（9 项）：push、popUndo、popRedo、pushRedo、canUndo/canRedo、maxSteps、clear
- PatchCommand（3 项）：execute、undo、roundtrip
- 专用 Commands（10 项）：MoveClip、ResizeClip、ReorderTracks、Add/RemoveTrack、Add/RemoveClip、ToggleVisibility/Lock、UpdateKeyframe 的 execute→undo 回合
- timelineStore（17 项）：M0-M3 回归 + 缩放/吸附/删除选中/分割/solo
- M4 集成测试（17 项）：AC1-AC9 全部验收标准 + 跨轨道移动 + resize start frame + splitClip + 键盘动作存在性
- M1-M3 回归（50 项）：FileService、WriteQueue、ProjectService、Generator、TemplateEngine、ComponentRegistry

**文件清单**：
```
apps/electron/src/renderer/src/stores/commands/types.ts
apps/electron/src/renderer/src/stores/commands/CommandHistory.ts
apps/electron/src/renderer/src/stores/commands/PatchCommand.ts
apps/electron/src/renderer/src/stores/commands/MoveClipCommand.ts
apps/electron/src/renderer/src/stores/commands/ResizeClipCommand.ts
apps/electron/src/renderer/src/stores/commands/ReorderTracksCommand.ts
apps/electron/src/renderer/src/stores/commands/AddTrackCommand.ts
apps/electron/src/renderer/src/stores/commands/RemoveTrackCommand.ts
apps/electron/src/renderer/src/stores/commands/AddClipCommand.ts
apps/electron/src/renderer/src/stores/commands/RemoveClipCommand.ts
apps/electron/src/renderer/src/stores/commands/ToggleTrackVisibilityCommand.ts
apps/electron/src/renderer/src/stores/commands/ToggleTrackLockCommand.ts
apps/electron/src/renderer/src/stores/commands/UpdateKeyframeCommand.ts
apps/electron/src/renderer/src/stores/timelineStore.ts（重构为 Command Pattern）
apps/electron/src/renderer/src/components/timeline/ClipBlock.tsx（拖拽/缩放手柄）
apps/electron/src/renderer/src/components/timeline/TrackRow.tsx（轨道控制按钮）
apps/electron/src/renderer/src/components/timeline/TimelinePanel.tsx（Add Track + 重排）
apps/electron/src/renderer/src/components/timeline/TimelineControls.tsx（缩放/吸附开关）
apps/electron/src/renderer/src/components/timeline/Playhead.tsx（可拖拽）
apps/electron/src/renderer/src/components/timeline/SnapGuides.tsx（吸附线）
apps/electron/src/renderer/src/hooks/useTimelineDrag.ts（核心拖拽 hook）
apps/electron/src/renderer/src/hooks/useKeyboardShortcuts.ts（全局快捷键）
apps/electron/src/renderer/src/utils/snap.ts（吸附算法）
```

---

### M5：AI 对话面板 + Agent 集成（⏳ Week 13-15）

**目标**：实现对话式 AI 交互，用户可通过自然语言生成和调整动画

**交付物**：
1. **对话面板 UI**
   - 聊天界面（消息列表、输入框、图片上传）
   - 消息类型区分（用户 / AI / 系统通知）
   - 流式响应显示

2. **LLM 服务集成**
   - `llm-service.ts`：LLM API 代理（OpenAI / Claude）
   - 流式响应处理（SSE / 流式 JSON）
   - API Key 加密存储

3. **Agent 工作流**
   - 意图解析（Prompt + LLM 调用）
   - 工具调用链（`createTrack` → `createClip` → `updateClip`）
   - 视觉解析（多模态 LLM 图片分析）
   - 代码生成和校验

4. **对话调整**
   - 参数调整解析（"字体大一点" → `fontSize * 1.2`）
   - 冲突检测和提示

**验收标准**：
- 用户输入"创建一个标题写着 Hello" → AI 响应 → 时间线出现 text 轨道
- 用户上传参考图片 → AI 解析图片 → 生成与参考图布局相似的动画

---

### M6：素材管理 + 预设系统（⏳ Week 16-17）

**目标**：实现素材导入、管理和预设库

**交付物**：
1. **素材导入**
   - 拖拽导入
   - 文件类型识别
   - 缩略图生成
   - 自动复制到项目 `assets/` 目录

2. **素材库 UI**
   - 左侧主素材库（按类型分组、搜索、筛选）
   - 素材元信息展示

3. **SQLite 素材库**
   - 素材表 schema
   - CRUD 操作
   - 去重策略（SHA-256）

4. **预设系统**
   - 预设 JSON 格式定义和存储
   - 预设分类浏览 UI
   - 预设应用到当前子项目

**验收标准**：
- 拖拽 PNG 到素材库 → 素材显示缩略图 → 文件复制到 `assets/images/`
- 点击"标题-淡入"预设 → 时间线创建对应 text 轨道

---

### M7：属性面板 + 关键帧编辑（⏳ Week 18-19）

**目标**：实现右侧面板的属性编辑和关键帧系统

**交付物**：
1. **属性面板**
   - 选中元素时显示属性编辑界面
   - 变换属性（位置、缩放、旋转、透明度）
   - 样式属性（颜色、字体、边框、阴影）
   - 动画属性（入场/出场类型、持续时间、缓动函数）

2. **关键帧编辑**
   - 属性轨道显示
   - 关键帧添加/删除/编辑
   - 缓动曲线可视化

3. **数据绑定**
   - 数据文件选择（CSV/JSON/XLSX）
   - 字段映射 UI

---

### M8：导出渲染（⏳ Week 20-21）

**目标**：实现视频导出和 Remotion 工程导出

**交付物**：
1. **视频导出**
   - 导出设置对话框（格式、分辨率、质量、输出路径）
   - Remotion CLI 调用（`renderMedia()`）
   - 渲染进度显示
   - 取消渲染（优雅中断）

2. **工程导出**
   - ZIP 打包（源码 + 素材 + package.json + README）
   - 素材路径处理（相对路径重写）

---

### M9：测试 + 优化 + 发布准备（⏳ Week 22-24）

**目标**：完善测试覆盖、性能优化、Bug 修复，达到 MVP 发布标准

**交付物**：
1. **测试**
   - 单元测试覆盖核心模块 ≥ 80%
   - E2E 测试核心工作流
   - 性能测试（启动时间、预览帧率、导出速度）

2. **性能优化**
   - Generator 增量生成（只生成变更部分）
   - 时间线虚拟滚动
   - 缩略图懒加载和缓存

3. **打包发布**
   - electron-builder 配置完善
   - 代码签名（macOS + Windows）
   - 安装包体积 < 300MB

---

## 技术债务与改进计划

| 优先级 | 项 | 计划 | 状态 |
|--------|-----|------|------|
| P1 | Windows 文件锁重试（EACCES） | M9 | ⏳ 待处理 |
| P1 | `fs.rmdir` 废弃警告 → `fs.rm` | M2 | ✅ 已完成 |
| P2 | SQLite 迁移（最近项目、素材库） | M6 | ⏳ 待处理 |
| P2 | 项目窗口 UI（项目列表/新建对话框） | M5 | ⏳ 待处理 |
| P3 | 日志系统（electron-log 配置） | M9 | ⏳ 待处理 |

---

## 开发工作流

```bash
# 启动开发环境
pnpm dev                    # Electron + Python 同时启动

# 代码质量检查
pnpm typecheck              # TypeScript 类型检查
pnpm lint                   # ESLint 检查
pnpm test                   # 运行所有测试
pnpm format                 # Prettier 格式化

# 构建
pnpm build                  # 构建 Electron 应用

# 调试
# VS Code F5 → 选择 "Electron: Main Process" 或 "Python: FastAPI Server"
```

---

## 分支策略

```
main                        # 生产分支，只接受 PR
develop                     # 开发分支，集成功能
feature/m0-scaffold         # M0 已完成 ✅
feature/m1-project-system   # M1 已完成 ✅
feature/m2-timeline         # M2 已完成 ✅
feature/m3-preview          # M3 已完成 ✅
feature/m4-timeline-edit    # M4 已完成 ✅
```

---

*EasyMotion Team | 2026-06-01*
