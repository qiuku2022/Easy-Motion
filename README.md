# EasyMotion (M0 Scaffold)

> 日期：2026-06-02  
> 描述：M0 可运行脚手架，包含协作者启动说明与常见问题修复步骤。

本仓库已完成 M0 阶段的最小可运行脚手架：

- monorepo workspace（`apps/*` + `packages/*`）
- Electron 最小窗口应用（`apps/electron`）
- Python FastAPI 最小服务（`apps/python`）
- shared 包（`packages/shared`）

## 启动步骤

```bash
pnpm install
python -m pip install -r apps/python/requirements.txt
pnpm dev
```

启动后：

- Electron 桌面应用会自动拉起
- Python FastAPI 服务监听 `http://127.0.0.1:8000`
- 可通过 `http://127.0.0.1:8000/health` 验证服务状态

## Windows 下首次安装 Electron 的额外步骤

若 `pnpm dev:electron` 报错 `Electron failed to install correctly`，先执行：

```bash
pnpm approve-builds
```

在交互列表中批准 `electron` 运行安装脚本后，重新执行：

```bash
pnpm install
pnpm dev:electron
```

## 给协作者的快速说明

### 日期

- 2026-06-02

### 描述

- 当前仓库处于 M0 阶段，提供最小可运行基础结构
- 可用于继续开发 M1（项目系统与文件服务）
- 若出现 Electron 启动失败，优先按上方 Windows 修复步骤处理
