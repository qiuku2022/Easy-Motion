# EasyMotion

> 🎬 用自然语言制作 Remotion 动画 —— 零代码门槛的视频动画创作工具

EasyMotion 是一款基于 Remotion + Electron 的桌面应用，通过 LLM 驱动的对话式交互，让没有编程经验的剪辑师和内容创作者也能快速生成专业级动画。

---

## 核心特性

- **🗣️ 自然语言驱动**：用中文/英文描述需求，AI 自动生成动画
- **🖼️ 多模态输入**：支持上传参考图片，AI 解析视觉布局并还原
- **⏱️ 实时预览**：修改即预览，Generator 自动生成 Remotion 代码
- **🎨 时间线编辑**：经典剪辑软件三栏布局，支持拖拽、关键帧、吸附
- **📤 导出灵活**：支持 MP4/WEBM 视频导出，或导出完整 Remotion 工程

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron + React 18 |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 状态管理 | Zustand + Immer |
| 动画引擎 | Remotion |
| 后端服务 | Node.js (Electron 主进程) |
| 数据分析 | Python + FastAPI + Playwright |
| LLM 集成 | OpenAI / Claude / 本地模型 |
| 包管理 | pnpm workspace (monorepo) |

---

## 文档导航

本项目的开发文档体系包含 35 份文档，按开发阶段组织：

### 📋 需求分析

| 文档 | 说明 |
|------|------|
| [项目概述.md](docs/requirements/项目概述.md) | 背景、目标、用户故事、范围边界、验收标准 |
| [核心功能.md](docs/requirements/核心功能.md) | 动画类型、预设系统、输入限制 |
| [UI布局设计.md](docs/requirements/UI布局设计.md) | 三栏布局、面板交互、响应式适配 |
| [交互流程.md](docs/requirements/交互流程.md) | 核心工作流、异常处理、撤销重做 |
| [支持格式.md](docs/requirements/支持格式.md) | 素材格式限制、导入后处理 |

### 🏗️ 架构设计

| 文档 | 说明 |
|------|------|
| [技术规格.md](docs/requirements/技术规格.md) | 通信方案、状态管理、数据存储、安全设计 |
| [项目管理.md](docs/requirements/项目管理.md) | 项目结构、版本管理、自动保存 |
| [时间线编辑.md](docs/requirements/时间线编辑.md) | 数据模型、Remotion 映射、交互细节 |
| [应用架构详细设计.md](docs/requirements/应用架构详细设计.md) | 目录结构、模块划分、IPC 定义、窗口管理 |
| [数据库Schema设计.md](docs/requirements/数据库Schema设计.md) | SQLite 表结构、索引、迁移策略 |
| [状态管理详细设计.md](docs/requirements/状态管理详细设计.md) | Zustand Store 接口、状态流转、跨 Store 通信 |
| [IPC通信协议规范.md](docs/requirements/IPC通信协议规范.md) | 消息格式、请求/响应、错误码映射、超时策略 |
| [素材处理流水线.md](docs/requirements/素材处理流水线.md) | 导入→转码→缩略图→缓存→渲染完整流程 |

### 🤖 AI 与生成

| 文档 | 说明 |
|------|------|
| [LLM-Agent设计.md](docs/requirements/LLM-Agent设计.md) | Agent 工作流、Prompt 模板、工具调用 |
| [代码生成规范.md](docs/requirements/代码生成规范.md) | Remotion 模板、Layer 组件、安全白名单 |
| [Python-API接口设计.md](docs/requirements/Python-API接口设计.md) | FastAPI 接口契约、爬虫策略 |
| [插件扩展机制.md](docs/requirements/插件扩展机制.md) | 预设/组件/工具/导出扩展点、插件生命周期、安全沙箱 |

### 📐 开发规范

| 文档 | 说明 |
|------|------|
| [项目编码规范.md](docs/requirements/项目编码规范.md) | TypeScript/React/Electron/Python 编码规范 |
| [错误码统一字典.md](docs/requirements/错误码统一字典.md) | 跨层错误码体系（E1xxx-E9xxx） |
| [数据字典汇总.md](docs/requirements/数据字典汇总.md) | 所有 JSON Schema 字段索引和完整定义 |
| [配置管理参考.md](docs/requirements/配置管理参考.md) | 配置文件字段、热重载策略、验证规则 |
| [国际化i18n架构.md](docs/requirements/国际化i18n架构.md) | i18n 技术选型、翻译文件组织、代码集成规范、布局适配 |

### 🗺️ 项目管理

| 文档 | 说明 |
|------|------|
| [开发里程碑与路线图.md](docs/requirements/开发里程碑与路线图.md) | 9 个里程碑、模块依赖、交付物、验收标准 |
| [技术风险分析.md](docs/requirements/技术风险分析.md) | 9 项风险识别、影响评估、Plan B |
| [依赖清单与许可证.md](docs/requirements/依赖清单与许可证.md) | 完整依赖清单、许可证合规性、Remotion 许可说明 |

### 🧪 质量保障

| 文档 | 说明 |
|------|------|
| [测试策略.md](docs/requirements/测试策略.md) | 单元/集成/E2E/性能测试、CI 矩阵、覆盖率 |
| [非功能需求.md](docs/requirements/非功能需求.md) | 性能指标、可靠性、安全性、兼容性 |
| [安全模型设计.md](docs/requirements/安全模型设计.md) | CSP、代码注入防护、文件系统沙箱 |
| [可访问性设计.md](docs/requirements/可访问性设计.md) | 键盘导航、屏幕阅读器、高对比度、减少动画 |
| [数据备份与恢复.md](docs/requirements/数据备份与恢复.md) | 自动快照、手动备份、灾难恢复、导出格式 |
| [组件库清单.md](docs/requirements/组件库清单.md) | shadcn/ui 组件、自定义组件、依赖关系 |
| [监控与日志.md](docs/requirements/监控与日志.md) | 日志系统、崩溃报告、性能监控、隐私保护 |

### 🚀 构建部署

| 文档 | 说明 |
|------|------|
| [构建与部署.md](docs/requirements/构建与部署.md) | electron-builder 配置、CI 工作流、自动更新 |
| [开发环境搭建指南.md](docs/requirements/开发环境搭建指南.md) | 系统依赖、安装步骤、常见问题 |

---

## 快速开始

### 系统要求

- **macOS**: 12+ (Monterey) / Intel & Apple Silicon
- **Windows**: Windows 10 1909+ / 64-bit
- **Linux**: Ubuntu 20.04 LTS+ / 64-bit
- **内存**: 8GB+（推荐 16GB）
- **磁盘**: 20GB+ 可用空间

### 依赖安装

```bash
# 1. 安装 Node.js v20
# https://nodejs.org/

# 2. 安装 pnpm
npm install -g pnpm@latest

# 3. 安装 Python 3.11
# macOS: brew install python@3.11
# Ubuntu: sudo apt install python3.11 python3.11-venv
# Windows: https://www.python.org/downloads/

# 4. 安装 Playwright 浏览器
pip install playwright
playwright install

# 5. 安装 FFmpeg
# macOS: brew install ffmpeg
# Ubuntu: sudo apt install ffmpeg
```

### 项目启动

```bash
# 克隆仓库
git clone https://github.com/EasyMotion/EasyMotion.git
cd EasyMotion

# 安装依赖
pnpm install
cd apps/python && pip install -r requirements.txt && cd ../..

# 启动开发环境
pnpm dev
```

开发环境启动后：
- Electron 窗口自动打开
- Python FastAPI 服务运行在 `http://localhost:8000`
- 渲染进程开发服务器运行在 `http://localhost:5173`

### 常用命令

```bash
pnpm dev              # 启动完整开发环境
pnpm build            # 构建所有应用
pnpm test             # 运行单元测试
pnpm test:e2e         # 运行 E2E 测试
pnpm lint             # ESLint 检查
pnpm format           # 代码格式化
pnpm build:local      # 本地打包测试
```

详细开发指南：[开发环境搭建指南.md](docs/requirements/开发环境搭建指南.md)

### 渲染进程 UI（shadcn/ui）

- 路径：`apps/electron/src/renderer/src/components/ui/`
- 配置：`apps/electron/components.json`（style: nova，base: radix）
- 新增：`cd apps/electron && npx shadcn@latest add <name>`
- 主题：`src/renderer/src/index.css` + [`MASTER.md`](../design-system/easymotion/MASTER.md)
- 清单：[`组件库清单.md`](组件库清单.md)

业务组件优先使用语义类（`bg-background`、`text-primary`）；`em-*` 为过渡期别名，与时间线画布内旧类名兼容。

---

## 项目结构

```
EasyMotion/
├── apps/
│   ├── electron/              # Electron 主应用
│   │   ├── src/
│   │   │   ├── main/          # 主进程（Node.js）
│   │   │   ├── preload/       # 预加载脚本
│   │   │   └── renderer/        # 渲染进程（React）
│   │   └── resources/
│   │       └── templates/      # 项目模板
│   └── python/                # Python FastAPI 服务
│       ├── src/
│       │   ├── api/            # FastAPI 路由
│       │   ├── crawler/        # Playwright 爬虫
│       │   └── data_processor/ # 数据处理
│       └── tests/
├── packages/
│   └── shared/                # 共享类型和常量
├── docs/
│   ├── requirements/           # 开发文档（25 份）
│   ├── Remotion-doc/          # Remotion 官方文档
│   └── Remotion-API/          # Remotion API 文档
├── pnpm-workspace.yaml
└── package.json
```

---

## 开发里程碑

| 阶段 | 周期 | 目标 |
|------|------|------|
| M0 | Week 1-2 | 项目脚手架（monorepo + Electron + Python） |
| M1 | Week 3-4 | 项目系统 + 文件服务 |
| M2 | Week 5-7 | 时间线数据模型 + Generator |
| M3 | Week 8-9 | Remotion 预览集成 |
| M4 | Week 10-12 | 时间线编辑 UI |
| M5 | Week 13-15 | AI 对话面板 + Agent |
| M6 | Week 16-17 | 素材管理 + 预设系统 |
| M7 | Week 18-19 | 属性面板 + 关键帧编辑 |
| M8 | Week 20-21 | 导出渲染 |
| M9 | Week 22-24 | 测试 + 优化 + 发布准备 |

详细规划：[开发里程碑与路线图.md](docs/requirements/开发里程碑与路线图.md)

---

## 贡献指南

### 分支策略

- `main`: 生产分支，只接受 PR
- `develop`: 开发分支，集成功能
- `feature/*`: 功能分支
- `hotfix/*`: 紧急修复

### Commit 规范

```
<type>(<scope>): <subject>

<body>
```

**Type:** `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

**Scope:** `main` / `renderer` / `generator` / `python` / `docs`

### 提交 PR 前检查

```bash
pnpm lint        # 无 ESLint 错误
pnpm typecheck   # TypeScript 类型检查通过
pnpm test        # 测试通过
```

---

## 许可证

EasyMotion 项目采用 [MIT 许可证](LICENSE)。

**第三方许可证声明：**
- Remotion 使用 [Remotion License](https://remotion.dev/license)，商业使用需满足免费条件或购买许可证
- 完整依赖清单和许可证信息见 [依赖清单与许可证.md](docs/requirements/依赖清单与许可证.md)

---

## 联系方式

- Issues: [GitHub Issues](https://github.com/EasyMotion/EasyMotion/issues)
- Discussions: [GitHub Discussions](https://github.com/EasyMotion/EasyMotion/discussions)

---

*EasyMotion Team | 2026*
