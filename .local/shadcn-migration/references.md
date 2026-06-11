# 参考链接

## shadcn/ui 官方文档

| 主题 | URL |
|------|-----|
| 首页 | https://ui.shadcn.com |
| Vite 安装 | https://ui.shadcn.com/docs/installation/vite |
| components.json | https://ui.shadcn.com/docs/components-json |
| CLI | https://ui.shadcn.com/docs/cli |
| Theming | https://ui.shadcn.com/docs/theming |
| Dark Mode (Vite) | https://ui.shadcn.com/docs/dark-mode/vite |
| Monorepo | https://ui.shadcn.com/docs/monorepo |
| React 19 说明 | https://ui.shadcn.com/react-19 |
| shadcn/create（可视化预设） | https://ui.shadcn.com/create |

### 组件文档

| 组件 | URL |
|------|-----|
| Button | https://ui.shadcn.com/docs/components/button |
| Input | https://ui.shadcn.com/docs/components/input |
| Label | https://ui.shadcn.com/docs/components/label |
| Textarea | https://ui.shadcn.com/docs/components/textarea |
| Form | https://ui.shadcn.com/docs/components/form |
| Select | https://ui.shadcn.com/docs/components/select |
| Slider | https://ui.shadcn.com/docs/components/slider |
| Switch | https://ui.shadcn.com/docs/components/switch |
| Tabs | https://ui.shadcn.com/docs/components/tabs |
| Tooltip | https://ui.shadcn.com/docs/components/tooltip |
| Dropdown Menu | https://ui.shadcn.com/docs/components/dropdown-menu |
| Context Menu | https://ui.shadcn.com/docs/components/context-menu |
| Popover | https://ui.shadcn.com/docs/components/popover |
| Dialog | https://ui.shadcn.com/docs/components/dialog |
| Alert Dialog | https://ui.shadcn.com/docs/components/alert-dialog |
| Scroll Area | https://ui.shadcn.com/docs/components/scroll-area |
| Resizable | https://ui.shadcn.com/docs/components/resizable |
| Sonner | https://ui.shadcn.com/docs/components/sonner |
| Separator | https://ui.shadcn.com/docs/components/separator |

---

## EasyMotion 开发文档

| 文档 | 路径 |
|------|------|
| UI 布局与交互（权威） | `docs/requirements/UI布局与交互设计-优化版.md` |
| 技术规格 | `docs/requirements/技术规格.md` |
| 组件库清单 | `docs/requirements/组件库清单.md` |
| 应用架构 | `docs/requirements/应用架构详细设计.md` |
| 项目编码规范 | `docs/requirements/项目编码规范.md` |
| 可访问性 | `docs/requirements/可访问性设计.md` |
| 时间线编辑 | `docs/requirements/时间线编辑.md` |
| 开发里程碑 | `docs/requirements/开发里程碑与路线图.md` |
| 设计系统 Master | `docs/design-system/easymotion/MASTER.md` |

---

## 项目内工具

| 资源 | 路径 |
|------|------|
| ui-ux-pro-max 技能 | `.cursor/skills/ui-ux-pro-max/SKILL.md` |
| shadcn 栈 CSV | `.cursor/skills/ui-ux-pro-max/data/stacks/shadcn.csv` |
| 搜索脚本 | `.cursor/skills/ui-ux-pro-max/scripts/search.py` |

### 常用搜索命令

```powershell
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack shadcn -n 12
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux -n 8
python .cursor/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain web -n 8
```

---

## 代码入口（迁移目标）

| 路径 | 说明 |
|------|------|
| `apps/electron/package.json` | 依赖 |
| `apps/electron/vite.config.ts` | `@` 别名 |
| `apps/electron/tailwind.config.js` | 主题扩展 |
| `apps/electron/src/renderer/src/index.css` | CSS 变量 |
| `apps/electron/src/renderer/index.html` | `class="dark"` |
| `apps/electron/src/renderer/src/components/` | 业务组件 |
