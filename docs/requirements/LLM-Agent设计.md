# LLM Agent 设计

## 概述

本文档定义基于 LangChain 构建的多模态对话 Agent 的详细设计，包括 Agent 工作流、Prompt 模板、工具调用定义和多模态输入处理流程。

---

## Agent 工作流

### 整体流程

```
用户输入（文字 + 图片）
  ↓
[输入分类器] ─── 纯文字 → [意图解析器]
        └── 含图片 → [多模态解析器] ──→ [意图解析器]
                              ↓
                        [视觉元素提取]
                              ↓
[意图解析器]
  ├── 需求类型判断（新建/修改/删除/查询）
  ├── 目标元素定位
  └── 参数提取
        ↓
[参数校验器] ─── 有效 → [代码生成器]
        └── 无效 → [澄清追问]
              ↓
[代码生成器]
  ├── Timeline JSON 生成/更新
  ├── Remotion TSX 代码生成
  └── 安全校验
        ↓
[执行器]
  ├── 写入 subproject.json
  ├── 触发 Generator
  └── 更新预览
        ↓
[结果反馈] ─── 成功 → 展示效果 + 确认提示
      └── 失败 → 错误说明 + 重试建议
```

### 工作流状态机

```typescript
enum AgentState {
  IDLE = 'idle',                // 等待用户输入
  PARSING = 'parsing',          // 解析输入中
  ANALYZING = 'analyzing',      // 分析需求和图片
  GENERATING = 'generating',    // 生成代码中
  VALIDATING = 'validating',    // 校验生成结果
  EXECUTING = 'executing',      // 执行修改中
  COMPLETED = 'completed',      // 完成
  FAILED = 'failed',            // 失败
  CLARIFYING = 'clarifying',    // 需要用户澄清
}

interface AgentTask {
  id: string;
  state: AgentState;
  type: 'create' | 'modify' | 'delete' | 'query';
  input: {
    text: string;
    images?: string[];          // 图片路径列表
  };
  context: {
    currentProject: Project;
    currentSubproject: Subproject;
    currentTimeline: Timeline;
    selectedElement?: { type: string; id: string };
    conversationHistory: Message[];
  };
  result?: {
    timeline?: Timeline;
    code?: string;
    error?: string;
    suggestions?: string[];
  };
}
```

---

## Prompt 模板规范

### 系统 Prompt（System Prompt）

```
你是一个专业的视频动画制作助手，基于 Remotion 框架帮助用户创建动画。

你的核心能力：
1. 理解用户的自然语言描述，将其转化为精确的动画参数
2. 分析用户提供的参考图片，提取视觉布局信息
3. 生成符合 Remotion 规范的 React 组件代码

你必须遵守的规则：
- 只使用文档中列出的 Remotion API 和组件
- 不使用任何危险 API（fs、child_process、网络请求等）
- 所有颜色使用十六进制格式（如 #FF0000）
- 所有尺寸使用像素单位
- 动画时长使用帧数（frame）单位
- 默认帧率为 30fps

你可以调用的工具：
- createTrack: 创建新轨道
- updateClip: 更新片段属性
- deleteClip: 删除片段
- addKeyframe: 添加关键帧
- queryElement: 查询元素信息

当前项目信息：
- 分辨率：{width}×{height}
- 帧率：{fps}fps
- 总时长：{duration}帧
- 当前子项目：{subprojectName}
```

### 意图解析 Prompt

```
分析用户的输入，判断意图类型和相关元素。

用户输入："{userText}"
当前选中的元素：{selectedElement}

请输出以下 JSON 格式：
{
  "intent": "create|modify|delete|query|unknown",
  "targetType": "text|image|video|shape|chart|animation|group",
  "targetDescription": "对目标元素的描述（用于定位）",
  "parameters": {
    "property": "要修改的属性路径",
    "change": "增加|减少|设为|删除",
    "value": "目标值或变化量"
  },
  "confidence": 0.0-1.0,
  "needsClarification": true|false,
  "clarificationQuestion": "如果需要澄清，提问内容"
}

示例：
用户："字体大一点"
输出：{
  "intent": "modify",
  "targetType": "text",
  "targetDescription": "当前选中的文字元素",
  "parameters": {
    "property": "style.fontSize",
    "change": "增加",
    "value": "20%"
  },
  "confidence": 0.95,
  "needsClarification": false
}
```

### 视觉解析 Prompt

```
分析用户提供的参考图片，提取视觉布局信息。

图片内容：{imageDescription}

请识别并输出以下 JSON 格式：
{
  "layout": {
    "type": "horizontal|vertical|grid|free",
    "elements": [
      {
        "type": "text|image|shape|chart",
        "position": { "x": "left|center|right|百分比", "y": "top|center|bottom|百分比" },
        "size": { "width": "像素或百分比", "height": "像素或百分比" },
        "style": {
          "color": "主色调",
          "fontFamily": "字体（如有）",
          "fontSize": "字号估计",
          "backgroundColor": "背景色"
        },
        "content": "文字内容（如有）",
        "zIndex": "层级顺序"
      }
    ]
  },
  "animationHints": [
    "观察到的动画特征（如：淡入、从左滑入、缩放弹出）"
  ],
  "styleTheme": {
    "colorPalette": ["提取的主色调"],
    "typography": "整体字体风格",
    "mood": "整体氛围（商务、活泼、科技等）"
  }
}

注意事项：
- 位置估计使用相对坐标（百分比）优先于绝对像素
- 颜色提取为十六进制格式
- 如无法识别某元素，标记为 "unknown"
```

### 代码生成 Prompt

```
根据用户的需求和当前时间线状态，生成或修改 Remotion 动画代码。

需求描述：{userRequirement}
当前时间线状态：{currentTimelineJSON}
参考图片分析结果（如有）：{visualAnalysis}

请生成以下输出：

1. **Timeline 更新**（JSON Patch 格式）：
{
  "operations": [
    { "op": "add|replace|remove", "path": "/tracks/0/clips", "value": {...} },
    ...
  ]
}

2. **生成说明**：
- 描述你做了哪些修改
- 解释为什么这样设计
- 如果用户描述模糊，说明你的假设

规则：
- 只修改与需求相关的属性，保留其他不变
- 保持现有轨道和片段的 ID 不变（除非新建）
- 新片段的 startInFrames 不要与现有片段重叠（同一轨道）
- 入场动画 durationInFrames 建议 10-30 帧
- 出场动画 durationInFrames 建议 10-20 帧
```

### 参数调整 Prompt

```
用户希望对现有动画进行微调。

当前片段：{clipJSON}
用户指令："{userText}"

请输出精确的参数修改：
{
  "clipId": "片段 ID",
  "modifications": [
    {
      "property": "属性路径（如 transform.position.x）",
      "oldValue": "当前值",
      "newValue": "修改后的值",
      "reason": "修改原因"
    }
  ],
  "keyframesToAdd": [...],
  "keyframesToRemove": [...],
  "animationsToUpdate": {
    "in": { "type": "...", "durationInFrames": ... },
    "out": { "type": "...", "durationInFrames": ... }
  }
}

调整策略：
- "大一点/小一点"：按比例调整（±20%）
- "快一点/慢一点"：调整 durationInFrames（减半或加倍）
- "移到左边/右边"：相对位置偏移（±100px 或 10%）
- "颜色改成 xxx"：映射到标准色值
- 如果指令模糊，选择最合理的默认值
```

---

## 工具调用定义

Agent 通过 LangChain 的 Tool 机制调用以下工具。每个工具对应一个对时间线的原子操作。

### 工具列表

```typescript
interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: any) => Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}
```

#### 1. createTrack

```typescript
const createTrackTool: Tool = {
  name: 'createTrack',
  description: '在时间线中创建一个新轨道。用于添加新的元素层（如文字层、图片层）。',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '轨道名称' },
      type: { type: 'string', enum: ['text', 'image', 'video', 'audio', 'shape', 'chart', 'animation', 'group'], description: '轨道类型' },
      order: { type: 'number', description: '图层顺序，0 为最底层' }
    },
    required: ['name', 'type']
  }
};

// 示例调用
{
  "name": "createTrack",
  "parameters": {
    "name": "标题文字",
    "type": "text",
    "order": 1
  }
}
```

#### 2. createClip

```typescript
const createClipTool: Tool = {
  name: 'createClip',
  description: '在指定轨道上创建一个片段。需要指定内容、位置、时长和样式。',
  parameters: {
    type: 'object',
    properties: {
      trackId: { type: 'string', description: '目标轨道 ID' },
      name: { type: 'string', description: '片段名称' },
      startInFrames: { type: 'number', description: '起始帧号' },
      durationInFrames: { type: 'number', description: '持续帧数' },
      source: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['inline', 'asset', 'data'] },
          content: { type: 'string', description: '内联内容（文字等）' }
        }
      },
      transform: {
        type: 'object',
        properties: {
          position: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
          scale: { type: 'number' },
          rotation: { type: 'number' },
          opacity: { type: 'number', minimum: 0, maximum: 1 }
        }
      },
      style: { type: 'object', description: '样式属性（因类型而异）' },
      animations: {
        type: 'object',
        properties: {
          in: { type: 'object', properties: { type: { type: 'string' }, durationInFrames: { type: 'number' } } },
          out: { type: 'object', properties: { type: { type: 'string' }, durationInFrames: { type: 'number' } } }
        }
      }
    },
    required: ['trackId', 'name', 'startInFrames', 'durationInFrames']
  }
};
```

#### 3. updateClip

```typescript
const updateClipTool: Tool = {
  name: 'updateClip',
  description: '更新指定片段的属性。用于对话调整（如"字体大一点"、"移到左边"）。',
  parameters: {
    type: 'object',
    properties: {
      clipId: { type: 'string', description: '片段 ID' },
      updates: {
        type: 'object',
        description: '要更新的属性，支持嵌套路径（如 {"transform.position.x": 960}）',
        additionalProperties: true
      }
    },
    required: ['clipId', 'updates']
  }
};

// 示例调用
{
  "name": "updateClip",
  "parameters": {
    "clipId": "clip-001",
    "updates": {
      "style.fontSize": 80,
      "transform.position.x": 200
    }
  }
}
```

#### 4. deleteClip

```typescript
const deleteClipTool: Tool = {
  name: 'deleteClip',
  description: '删除指定片段。',
  parameters: {
    type: 'object',
    properties: {
      clipId: { type: 'string', description: '片段 ID' }
    },
    required: ['clipId']
  }
};
```

#### 5. addKeyframe

```typescript
const addKeyframeTool: Tool = {
  name: 'addKeyframe',
  description: '为片段的某个属性添加关键帧。',
  parameters: {
    type: 'object',
    properties: {
      clipId: { type: 'string' },
      property: { type: 'string', description: '属性路径（如 transform.opacity）' },
      frame: { type: 'number', description: '关键帧所在帧号' },
      value: { type: 'any', description: '属性值' },
      easing: { type: 'string', enum: ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'], default: 'linear' }
    },
    required: ['clipId', 'property', 'frame', 'value']
  }
};
```

#### 6. queryElement

```typescript
const queryElementTool: Tool = {
  name: 'queryElement',
  description: '查询时间线中的元素信息。用于定位目标元素（如"那个红色标题"指的是哪个片段）。',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: '查询描述（如"标题"、"红色文字"、"第二个片段"）' },
      type: { type: 'string', enum: ['clip', 'track'], description: '查询类型' }
    },
    required: ['query', 'type']
  }
};

// 返回示例
{
  "success": true,
  "data": {
    "matches": [
      { "id": "clip-001", "name": "开场标题", "type": "text", "confidence": 0.95 },
      { "id": "clip-002", "name": "副标题", "type": "text", "confidence": 0.3 }
    ],
    "bestMatch": "clip-001"
  }
}
```

#### 7. setAnimation

```typescript
const setAnimationTool: Tool = {
  name: 'setAnimation',
  description: '为片段设置入场或出场动画。',
  parameters: {
    type: 'object',
    properties: {
      clipId: { type: 'string' },
      animationType: { type: 'string', enum: ['in', 'out'], description: '入场或出场' },
      config: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'scale-up', 'scale-down', 'rotate', 'blur', 'none'] },
          durationInFrames: { type: 'number', minimum: 1 }
        }
      }
    },
    required: ['clipId', 'animationType', 'config']
  }
};
```

#### 8. importAsset

```typescript
const importAssetTool: Tool = {
  name: 'importAsset',
  description: '导入素材到项目。用于用户提到"使用这张图片"或"添加背景音乐"。',
  parameters: {
    type: 'object',
    properties: {
      source: { type: 'string', description: '素材来源（URL 或本地路径）' },
      type: { type: 'string', enum: ['image', 'video', 'audio'] },
      name: { type: 'string', description: '素材名称（用于显示）' }
    },
    required: ['source', 'type']
  }
};
```

### 工具调用链示例

**用户输入：** "创建一个标题，写着'欢迎'，放在画面中央，2秒后淡入"

```
Agent 分析：
  intent: "create"
  targetType: "text"
  
调用链：
1. createTrack(name: "标题", type: "text", order: 1)
   → 返回 trackId: "track-001"

2. createClip(
     trackId: "track-001",
     name: "欢迎标题",
     startInFrames: 60,      // 2秒 = 60帧（30fps）
     durationInFrames: 180,   // 持续6秒
     source: { kind: "inline", content: "欢迎" },
     transform: { position: { x: 960, y: 540 }, scale: 1, rotation: 0, opacity: 1 },
     style: { fontFamily: "Inter", fontSize: 72, color: "#ffffff", textAlign: "center" },
     animations: {
       in: { type: "fade", durationInFrames: 20 },
       out: { type: "fade", durationInFrames: 15 }
     }
   )
   → 返回 clipId: "clip-001"

3. 生成 Timeline Patch
4. 触发 Generator
5. 返回结果给用户
```

---

## 多模态输入处理流程

### 图片上传处理

```
用户上传图片
  ↓
[图片预处理]
  ├── 格式转换：统一转为 PNG（保留透明通道）
  ├── 尺寸限制：最长边不超过 2048px，超限则等比缩放
  ├── 质量压缩：文件大小超过 2MB 时进行适度压缩
  └── 保存：复制到项目 assets/ 目录
        ↓
[图片分析]
  ├── 调用多模态 LLM（如 GPT-4V / Claude 3 Opus）
  ├── 传入系统 Prompt（视觉解析 Prompt）
  └── 获取视觉元素结构化数据
        ↓
[元素映射]
  ├── 将视觉元素映射为时间线轨道和片段
  ├── 位置：百分比 → 像素坐标（基于项目分辨率）
  ├── 颜色：提取色值 → 十六进制
  └── 字体：识别字体 → 匹配系统可用字体（或最接近的替代）
        ↓
[与文字需求合并]
  ├── 优先使用用户文字描述中的明确参数
  ├── 图片中的视觉参数作为默认值/补充
  └── 冲突时以文字描述为准（用户明确意图优先）
        ↓
[生成 Timeline]
```

### 图片分析结果使用策略

| 图片信息 | 使用方式 | 优先级 |
|----------|----------|--------|
| 元素位置布局 | 映射为 transform.position | 高（用户通常想要还原布局） |
| 颜色方案 | 映射为 style.color / style.backgroundColor | 中（用户可能明确指定颜色） |
| 字体风格 | 映射为 style.fontFamily / style.fontSize | 低（用户文字描述优先） |
| 动画特征 | 映射为 animations.in / animations.out | 中（用户可能未描述动画） |
| 元素层级 | 映射为 track.order | 高（层级关系必须还原） |

### 多图片处理

- **最多 3 张图片**：分别分析后合并结果
- **处理策略**：
  - 图片 1（主图）：整体布局和主要元素
  - 图片 2（辅助）：补充细节或不同视角
  - 图片 3（风格参考）：颜色、字体等风格要素
- **冲突解决**：如果多张图片对同一元素的描述冲突，提示用户"参考图片中元素位置不一致，以哪张为准？"

---

## 错误处理与降级

### Agent 错误类型

| 错误 | 检测方式 | 恢复策略 |
|------|----------|----------|
| 意图理解失败 | LLM 输出 `intent: "unknown"` 或置信度 < 0.5 | 追问用户"您是想修改标题还是副标题？" |
| 元素定位失败 | queryElement 返回空或低置信度 | 列出候选元素让用户选择 |
| 参数越界 | 校验器检测到值超出有效范围 | 自动截断到边界值，提示"已自动调整到最大/最小支持值" |
| 生成代码语法错误 | esbuild 校验失败 | 尝试自动修复（补全 import 等）；失败则回退 |
| 安全违规 | 正则白名单检测到危险 API | 拒绝执行，标记为异常 |
| LLM 调用超时 | > 60 秒无响应 | 重试 1 次；仍超时进入简化模式 |

### 简化模式

当 LLM 调用失败或超时时，Agent 切换为简化模式：

```
简化模式流程：
1. 跳过多模态视觉解析（如有图片）
2. 仅提取用户文字中的明确参数
3. 使用预设模板生成基础动画：
   - 文字：淡入 + 简单位移
   - 图片：淡入 + 轻微缩放
   - 数据图表：默认柱状图/折线图
4. 生成完成后提示用户"当前为简化生成模式，您可以通过对话继续调整"
```

---

## 上下文管理

### 对话历史压缩

- **保留上限**：最近 10 轮对话
- **压缩策略**：超过 10 轮时，将早期对话摘要为项目状态描述：
  - "当前项目包含 3 个轨道：标题文字（淡入动画）、背景图片（缩放动画）、数据图表（柱状图）"
  - "用户偏好：蓝色主题、无衬线字体"
- **关键操作保留**：涉及删除、重命名等不可逆操作的对话原文保留

### 状态同步

- Agent 每次操作后，将最新 Timeline 状态同步到 conversationStore
- 用户手动修改时间线后，Agent 下次响应前读取最新状态
- 确保 Agent 始终基于当前实际状态工作，而非过时的记忆

---

## 性能优化

### LLM 调用优化

- **流式响应**：Agent 的思考和代码生成过程流式返回，用户实时看到进度
- **并行调用**：视觉解析和意图解析可并行执行（互不影响）
- **缓存**：相同图片的视觉解析结果缓存到项目目录（`.cache/visual-analysis/{imageHash}.json`）
- **增量生成**：修改现有动画时，只生成变更部分的代码 diff，而非全量重新生成

---

*文档版本：v0.1 | 最后更新：2026-05-30*