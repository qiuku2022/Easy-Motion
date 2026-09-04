<div align="center">
  <img src="apps/electron/src/renderer/public/app-icon.png" width="112" alt="EasyMotion icon" />

  <h1>EasyMotion</h1>

  <p><strong>Drive the timeline with natural language. Build animations with Remotion.</strong></p>
  <p>A Windows desktop animation app for editors and content creators.</p>

  <p>
    <a href="README.md">简体中文</a> · <strong>English</strong>
  </p>

  <p><code>Electron</code> · <code>React</code> · <code>Remotion</code> · <code>LangChain</code> · <code>FastAPI</code></p>
</div>

![EasyMotion workspace](docs/assets/readme/easymotion-workspace.png)

EasyMotion combines conversational AI with a visual timeline. Create and refine animations in natural language, or directly edit assets, keyframes, preset parameters, and the work area—with real-time preview and export built in.

> EasyMotion is currently a Windows pre-release intended for evaluation and development testing.

## Features

- **AI timeline editing**: Add, move, and adjust animations, assets, data, and keyframes using natural language.
- **Live Remotion preview**: Timeline JSON drives a dynamic `MainSequence` that refreshes automatically.
- **Visual timeline**: Drag and drop, snapping, I/O work area, undo/redo, and keyframe editing.
- **123 animation presets**: 81 RVE presets plus 42 Remotion Bits presets.
- **Assets and custom components**: Manage local media and let the AI create and maintain project-level Remotion components.
- **Flexible export**: Export MP4, WebM, or a complete Remotion project ZIP.

## Download

Windows x64 test installer:

- [Baidu Netdisk](https://pan.baidu.com/s/1IszD8X-GDhq-hjcH9cN0Lg?pwd=ncwr) (extraction code: `ncwr`)

Python is bundled with the installer. The current build is unsigned, so Windows SmartScreen may display a warning. To use AI features, configure an API key under **AI Assistant → Settings**.

Report problems through [GitHub Issues](https://github.com/qiuku2022/Easy-Motion/issues).

## Local development

### Requirements

- Node.js 20+
- pnpm 10+
- Python 3.11+ (only required for the FastAPI service and Windows packaging)

### Start the app

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the Vite renderer and Electron without Python. Configure the AI key in the app, or copy `apps/electron/.env.example` to `.env` for development.

To run FastAPI as well, initialize its Python environment from the repository root:

```powershell
python -m venv apps/python/.venv
.\apps\python\.venv\Scripts\python.exe -m pip install -r apps/python/requirements.txt
pnpm dev:all
```

### Common commands

| Command             | Purpose                                 |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | Start Electron and the renderer         |
| `pnpm dev:all`      | Start FastAPI as well                   |
| `pnpm check`        | Run lint, type checking, and core tests |
| `pnpm test:release` | Run export and real-render verification |
| `pnpm build:win`    | Build the Windows installer             |

For Windows packaging, preset thumbnails, and debugging, see [Build and deployment](docs/requirements/构建与部署.md) and the [development setup guide](docs/requirements/开发环境搭建指南.md) (Chinese).

## Repository layout

```text
apps/electron/     Electron main process, Preload, React UI, and Remotion
apps/python/       Optional FastAPI service
packages/shared/   Shared timeline models and logic
docs/requirements/ Product, architecture, and development documentation
```

## Documentation

- [Development setup](docs/requirements/开发环境搭建指南.md) (Chinese)
- [Build and deployment](docs/requirements/构建与部署.md) (Chinese)
- [Product and technical documentation](docs/requirements/) (Chinese)
- [Coding-agent guidelines](AGENTS.md) (Chinese)

## License

EasyMotion is released under the MIT License. See [dependencies and licenses](docs/requirements/依赖清单与许可证.md) for Remotion and third-party licensing notes (Chinese).
