# EasyMotion (M0 Scaffold)

本仓库已完成 M0 阶段的最小可运行脚手架：

- monorepo workspace（`apps/*` + `packages/*`）
- Electron 最小窗口应用（`apps/electron`）
- Python FastAPI 最小服务（`apps/python`）
- shared 包（`packages/shared`）

## 启动步骤

```bash
pnpm install
pip install -r apps/python/requirements.txt
pnpm dev
```

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
