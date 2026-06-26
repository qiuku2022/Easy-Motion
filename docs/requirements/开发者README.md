# EasyMotion

> 🎬 用自然语言制作 Remotion 动画 —— 零代码门槛的视频动画创作工具  
> **文档更新：2026-06-26** | 实施状态：**M0–M8 ✅**，**M9 🚧**

EasyMotion 是一款基于 Remotion + Electron 的桌面应用，通过 LLM 驱动的对话式交互，让没有编程经验的剪辑师和内容创作者也能快速生成专业级动画。

---

## 核心特性

- **自然语言驱动**：用中文/英文描述需求，LangChain Agent 自动修改时间线并刷新预览
- **多模态输入**：支持上传参考图片，AI 解析视觉布局并还原
- **实时预览**：时间线 JSON 驱动动态 `MainSequence`；预设走 `animation` 轨道 + `source.props`
- **时间线编辑**：三栏布局，拖拽、关键帧、I/O 工作区、吸附、撤销/重做
- **81 个 RVE 预设**：单击查看 / 双击应用 / 拖到时间线；全参数可编辑
- **导出**：MP4/WEBM 视频（进度与取消）、Remotion 工程 ZIP
- **M5.2 Remotion Code Agent**：AI 读写用户项目内自定义 Remotion 组件源码

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 42 + React 18 |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 状态管理 | Zustand（9 个 store） |
| 动画引擎 | Remotion 4.x |
| 后端服务 | Node.js（Electron 主进程，CommonJS `.js`） |
| 数据分析 | Python 3.11 + FastAPI（**可选**，`pnpm dev:all` 启动） |
| LLM 集成 | LangChain + OpenAI / Anthropic |
| 包管理 | pnpm 10 workspace (monorepo) |

---

## 文档导航

本目录共 **35 份**开发文档，按主题组织：

### 需求分析

| 文档 | 说明 |
|------|------|
| [项目概述.md](项目概述.md) | 背景、目标、用户故事、范围边界、验收标准 |
| [核心功能.md](核心功能.md) | 动画类型、81 RVE 预设、输入限制 |
| [UI布局与交互设计-优化版.md](UI布局与交互设计-优化版.md) | 三栏布局、面板交互、设计 token |
| [交互流程.md](交互流程.md) | 核心工作流、异常处理、撤销重做 |
| [支持格式.md](支持格式.md) | 素材格式限制、导入后处理 |

### 架构设计

| 文档 | 说明 |
|------|------|
| [技术规格.md](技术规格.md) | 通信方案、状态管理、数据存储、安全设计 |
| [项目管理.md](项目管理.md) | 项目结构、版本管理、自动保存 |
| [时间线编辑.md](时间线编辑.md) | 数据模型、动态预览 vs Generator、交互细节 |
| [应用架构详细设计.md](应用架构详细设计.md) | 目录结构、模块划分、IPC、窗口管理 |
| [数据库Schema设计.md](数据库Schema设计.md) | SQLite 表结构（素材库）、索引 |
| [状态管理详细设计.md](状态管理详细设计.md) | Zustand Store 接口与跨 store 通信 |
| [IPC通信协议规范.md](IPC通信协议规范.md) | 通道命名、请求/响应、错误码 |
| [素材处理流水线.md](素材处理流水线.md) | 导入→缩略图→缓存→渲染流程 |

### AI 与生成

| 文档 | 说明 |
|------|------|
| [LLM-Agent设计.md](LLM-Agent设计.md) | LangChain Agent、17 工具、M5.2 Remotion Code |
| [代码生成规范.md](代码生成规范.md) | Generator、Layer 组件、安全白名单 |
| [Python-API接口设计.md](Python-API接口设计.md) | FastAPI 接口（非核心路径） |
| [插件扩展机制.md](插件扩展机制.md) | 预设/组件扩展点 |

### 开发规范

| 文档 | 说明 |
|------|------|
| [项目编码规范.md](项目编码规范.md) | TypeScript/React/Electron/Python 规范 |
| [错误码统一字典.md](错误码统一字典.md) | E1xxx–E9xxx |
| [数据字典汇总.md](数据字典汇总.md) | JSON Schema 字段索引 |
| [配置管理参考.md](配置管理参考.md) | 配置文件、secrets、验证规则 |
| [国际化i18n架构.md](国际化i18n架构.md) | i18n 规划（v1 以中文为主） |

### 项目管理

| 文档 | 说明 |
|------|------|
| [开发里程碑与路线图.md](开发里程碑与路线图.md) | M0–M9 里程碑、交付物、验收标准 |
| [技术风险分析.md](技术风险分析.md) | 风险识别与应对 |
| [依赖清单与许可证.md](依赖清单与许可证.md) | 依赖与 Remotion 许可说明 |

### 质量保障

| 文档 | 说明 |
|------|------|
| [测试策略.md](测试策略.md) | 里程碑脚本测试（m1–m8）；E2E 规划于 M9 |
| [非功能需求.md](非功能需求.md) | 性能、可靠性、安全性 |
| [安全模型设计.md](安全模型设计.md) | CSP、代码注入防护 |
| [可访问性设计.md](可访问性设计.md) | 键盘导航、高对比度 |
| [数据备份与恢复.md](数据备份与恢复.md) | 快照与灾难恢复 |
| [组件库清单.md](组件库清单.md) | shadcn/ui 与业务组件 |
| [监控与日志.md](监控与日志.md) | 日志与崩溃报告 |

### 构建部署

| 文档 | 说明 |
|------|------|
| [构建与部署.md](构建与部署.md) | electron-builder（M9）、CI |
| [开发环境搭建指南.md](开发环境搭建指南.md) | 安装步骤、常见问题 |

---

## 快速开始

### 系统要求

- **Node.js** 20+
- **pnpm** 10+（仓库 `packageManager`: pnpm@10）
- **Python** 3.11+（仅 `pnpm dev:all` 或后端调试需要）
- **内存** 8GB+（推荐 16GB）

### 项目启动

```bash
git clone https://github.com/EasyMotion/EasyMotion.git
cd EasyMotion
pnpm install
python -m pip install -r apps/python/requirements.txt   # 可选

pnpm dev          # Vite (127.0.0.1:5173) + Electron — 日常开发
pnpm dev:all      # 上述 + Python FastAPI（8000 起，自动试 8001–8019）
```

**AI 助手**：应用内 **AI 助手 → 设置** 配置 LLM（Key 加密存于 `~/.easymotion/secrets.json`）。开发后备：复制 `apps/electron/.env.example` 为 `.env`。

### 常用命令

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 渲染进程 + Electron（不启动 Python） |
| `pnpm dev:all` | 含 Python FastAPI |
| `pnpm dev:legacy` | 旧版 HTML UI（在 `apps/electron`） |
| `pnpm lint` / `lint:fix` | ESLint |
| `pnpm test` | m1 + m2 + m3 + m5 + m5.2 |
| `pnpm --filter @easymotion/electron test:m8` | 导出、工作区、工程 ZIP |
| `pnpm --filter @easymotion/electron test:m5.2` | Remotion Code Agent |
| `pnpm vendor:rve-presets` | vendoring 81 个 RVE 预设 |

开发模式 Electron 加载 **`http://127.0.0.1:5173`**（避免 Windows 上 `localhost` IPv6 问题）。

详细指南：[开发环境搭建指南.md](开发环境搭建指南.md) | 仓库根 [README.md](../../README.md)

### 渲染进程 UI（shadcn/ui）

- 路径：`apps/electron/src/renderer/src/components/ui/`
- 配置：`apps/electron/components.json`
- 主题：[`docs/design-system/easymotion/MASTER.md`](../design-system/easymotion/MASTER.md)
- 清单：[组件库清单.md](组件库清单.md)

---

## 项目结构

```
EasyMotion/
├── apps/
│   ├── electron/              # 主进程 (.js) + preload + React 渲染进程
│   │   ├── src/main/          # IPC、Agent、Generator、export-service
│   │   ├── src/renderer/src/  # React UI + Zustand stores
│   │   └── resources/templates/default-project/
│   └── python/                # FastAPI（可选）
├── packages/shared/           # timeline 校验、work-area 等
├── docs/requirements/         # 本目录（35 份）
├── docs/design-system/        # UI token 权威
```

---

## 开发里程碑

| 阶段 | 目标 | 状态 |
|------|------|------|
| M0 | 项目脚手架 | ✅ |
| M1 | 项目系统 + 文件服务 | ✅ |
| M2 | 时间线 + Generator | ✅ |
| M3 | Remotion 预览 | ✅ |
| M4 | 时间线编辑 UI | ✅ |
| M5 | AI 对话 + Agent | ✅ |
| M5.2 | Remotion Code Agent | ✅ |
| M6 | 素材 + 81 RVE 预设 | ✅ |
| M7 | 属性面板 + 关键帧 + 数据绑定 | ✅ |
| M8 | 导出（MP4/WEBM + ZIP + I/O） | ✅ |
| M9 | E2E + 性能 + 打包 | **当前** |

详细规划：[开发里程碑与路线图.md](开发里程碑与路线图.md)

---

## 贡献指南

### 分支策略

- `main`：生产分支
- `feature/*`：功能分支
- `hotfix/*`：紧急修复

### Commit 规范

```
<type>(<scope>): <subject>
```

**Type:** `feat` / `fix` / `docs` / `style` / `refactor` / `test` / `chore`

### 提交 PR 前检查

```bash
pnpm lint
pnpm test
# 若改导出：pnpm --filter @easymotion/electron test:m8
# 若改 Agent：pnpm --filter @easymotion/electron test:m5
```

---

## 许可证

EasyMotion 采用 [MIT 许可证](../../LICENSE)。Remotion 商业使用见 [依赖清单与许可证.md](依赖清单与许可证.md)。

---

*EasyMotion Team | 2026*
