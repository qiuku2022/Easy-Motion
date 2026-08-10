# EasyMotion

> [English](README.en.md) | [简体中文](README.md)

> Create Remotion animations with natural language — Electron desktop app (React + LangChain Agent)  
> M0–M12 ✅ · Windows pre-release available (feature enhancements ongoing)

EasyMotion lets editors and content creators drive timeline editing through **conversation**, preview Remotion animations in real time, and export videos or full projects. Includes **81 RVE presets**, keyframe editing, an asset library, and an AI assistant.

## Core capabilities

- **Natural-language editing**: LangChain Agent modifies timeline JSON, assets/data, Work Area, and export jobs; preview refreshes automatically
- **Dynamic preview**: `MainSequence` renders preset `props` and keyframes (`apply-keyframes`) at runtime
- **Timeline**: drag-and-drop, snapping, I/O work area, undo/redo, bottom keyframe tracks
- **Preset library**: click to preview / double-click to apply / drag onto timeline; fully editable parameter panel
- **Asset library**: import, search, categorize; favorites and recently used (left panel **Assets** tab)
- **Export**: MP4 / WEBM (progress and cancel), Remotion project ZIP
- **Remotion Code Agent (M5.2/M10)**: AI read/write, register, list, and unregister custom TSX components in user projects, with mixed undo support
- **Agent persistent memory (M12)**: remembers color/rhythm preferences across sessions; manage global and project memory from AI assistant / LLM settings / project panel

**Layout**: left panel Project / Assets / Presets · center 16:9 preview · right panel Properties / Templates · bottom timeline · full-height AI assistant column on the far right.

## Download

Windows x64 pre-release installer (unsigned; SmartScreen may warn):

- Baidu Netdisk: [EasyMotion-Setup.exe](https://pan.baidu.com/s/1IszD8X-GDhq-hjcH9cN0Lg?pwd=ncwr) · extraction code `ncwr`
- Or build locally: `pnpm build:win` → `apps/electron/release/EasyMotion-Setup-*.exe`

The installer bundles Python. On first use, enter your API Key in **AI Assistant → Settings**. Report issues via [Issues](https://github.com/qiuku2022/Easy-Motion/issues).

## Quick start

**Requirements**: Node.js 20+ · pnpm 10+ · Python 3.11+ (only for `dev:all` / packaging)

```bash
pnpm install
python -m pip install -r apps/python/requirements.txt   # optional, for Python features

# After clone: generate preset animated thumbnails (81 WebPs, not in Git; requires Chrome + ffmpeg)
cd apps/electron && pnpm generate:preset-thumbnails

pnpm dev          # daily development
pnpm dev:all      # + Python FastAPI
```

AI Key: in-app **AI Assistant → Settings**, or copy `apps/electron/.env.example` → `.env`.

| Command | Purpose |
|---------|---------|
| `pnpm lint` / `pnpm test` | Lint / main-process tests |
| `pnpm --filter @easymotion/electron test:m5` | Agent timeline / assets / data / batch / export / undo regression |
| `pnpm --filter @easymotion/electron test:m8` | Export and ZIP |
| `pnpm --filter @easymotion/electron test:m5.2` | Remotion Code Agent |
| `pnpm --filter @easymotion/electron test:m12` | Agent long-term memory (M12) |

Electron dev mode loads **`http://127.0.0.1:5173`** (avoid `localhost` on Windows — it may resolve to IPv6 only).

### Preset thumbnails

```bash
cd apps/electron
pnpm generate:preset-thumbnails              # all (~30–40 min)
pnpm generate:preset-thumbnails --only rve-pie-chart
pnpm generate:preset-thumbnails --skip-existing
```

Without thumbnails, the preset library still works; cards show gradient placeholders. Output: `resources/presets/thumbnails/` and `src/renderer/public/presets/thumbnails/`.

Generate **at least once** before packaging (or ensure `resources/presets/thumbnails/*.webp` exists); `build:renderer` syncs them to Vite `public/` automatically.

## Build Windows installer

**Requirements**: build on **Windows x64** locally (Python venv cannot be cross-compiled). Python 3.10+ must be installed on the machine.

```bash
pnpm build:win
```

Pipeline: sync preset thumbnails → Vite build → bundle Python venv → `electron-builder` (NSIS).

| Artifact | Path |
|----------|------|
| Installer | `apps/electron/release/EasyMotion-Setup-*.exe` |
| Portable directory | `apps/electron/release/win-unpacked/` |

The installer bundled-starts Python FastAPI (`127.0.0.1:8000`); users do not need a separate Python install. Currently an **unsigned test build**; SmartScreen may warn.

Granular commands:

```bash
pnpm build:python                              # Python bundle only
pnpm --filter @easymotion/electron build:dir   # directory only, no NSIS
```

See [`docs/requirements/构建与部署.md`](docs/requirements/构建与部署.md) for details (Chinese).

## Debugging (Cursor / VS Code)

For daily work, **`pnpm dev`** is enough. Press **F5** for breakpoints:

| Configuration | Purpose |
|---------------|---------|
| **▸ EasyMotion** | Main process (IPC, services, Agent) |
| **▸ EasyMotion + React** | Main process + React renderer (auto-attach CDP 9333) |

F5 checks the Electron binary and ensures Vite on 5173 is ready (reuses if already running, ~0.3s). Stopping debug keeps Vite running for faster next F5. Task panel: **`dev`** (`Ctrl+Shift+B`), **`test`**.

**First `pnpm install` on Windows**: if F5 reports `ENOENT path.txt`, the Electron binary download is incomplete:

```bash
pnpm install    # root package.json sets onlyBuiltDependencies: electron
# if still failing:
pnpm approve-builds   # check electron
pnpm install
```

F5 `debug: prepare` also tries auto-fix via `ensure-electron-binary.cjs`.

## Module status

| Module | Description |
|--------|-------------|
| Electron main | Project, timeline, preview, Generator, Agent, export |
| Renderer | Timeline UI, property panel, preset library, asset library, AI panel |
| Python API | FastAPI (optional in dev; bundled in installer) |

Opening a project auto-starts Remotion preview; legacy projects get `layers/*` `apply-keyframes` import paths patched on preview start.

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/requirements/开发者README.md`](docs/requirements/开发者README.md) | Developer entry, stack, milestones (Chinese) |
| [`docs/requirements/构建与部署.md`](docs/requirements/构建与部署.md) | electron-builder, CI, bundle size (Chinese) |
| [`docs/requirements/`](docs/requirements/) | Full requirements and architecture (35+ docs, Chinese) |
| [`.local/agent-capability-plan/README.md`](.local/agent-capability-plan/README.md) | M10 Agent capability rollout notes |
| [`AGENTS.md`](AGENTS.md) | AI coding agent constraints |
| [`docs/design-system/easymotion/MASTER.md`](docs/design-system/easymotion/MASTER.md) | UI design tokens |

## Repository layout

```
apps/electron/     # Main process, preload, React UI, Remotion templates, electron-builder
apps/python/       # FastAPI (bundled into installer extraResources)
packages/shared/   # Shared timeline logic
docs/              # Requirements, screenshots, design system
```

## For contributors

- Do not commit: `.env`, `node_modules/`, **`presets/thumbnails/*.webp`**, `apps/electron/resources/python/` (build output), `release/`, `dist/`
- Add shadcn components: `cd apps/electron && npx shadcn@latest add <name>`
- Before commit: `pnpm lint` · `pnpm test`

---

MIT · See [`LICENSE`](LICENSE) and [`docs/requirements/依赖清单与许可证.md`](docs/requirements/依赖清单与许可证.md) (Chinese)
