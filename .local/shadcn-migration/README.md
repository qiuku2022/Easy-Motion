# EasyMotion → shadcn/ui 迁移计划（本地工作区）

> **性质**：本地执行手册，不提交到 Git（见根目录 `.gitignore`）  
> **创建日期**：2026-06-11  
> **目标**：将 `apps/electron` 渲染进程 UI 从「Tailwind + 自研 primitive」迁移到「shadcn/ui + 设计 token」，与 `docs/requirements` 技术选型对齐。

---

## 文档索引

| 序号 | 文档 | 内容 |
|------|------|------|
| 00 | [00-概述与原则.md](./00-概述与原则.md) | 目标、范围、权威文档优先级、成功标准 |
| 01 | [01-现状审计.md](./01-现状审计.md) | 代码库差距分析、组件清单、依赖对照 |
| 02 | [02-阶段0-初始化.md](./02-阶段0-初始化.md) | `shadcn init`、路径、Tailwind v3 注意点 |
| 03 | [03-阶段1-主题与Token.md](./03-阶段1-主题与Token.md) | Cinema Dark 变量映射、`em-*` 过渡策略 |
| 04 | [04-阶段2-基础Primitive.md](./04-阶段2-基础Primitive.md) | Button / Input / Label / Separator / Tooltip |
| 05 | [05-阶段3-覆盖层组件.md](./05-阶段3-覆盖层组件.md) | DropdownMenu / ContextMenu / Popover / Dialog |
| 06 | [06-阶段4-布局与导航.md](./06-阶段4-布局与导航.md) | Tabs / ScrollArea / Resizable / Sonner |
| 07 | [07-阶段5-表单与属性面板.md](./07-阶段5-表单与属性面板.md) | Form + RHF + Zod、PropertiesPanel 迁移 |
| 08 | [08-阶段6-时间线边界.md](./08-阶段6-时间线边界.md) | 哪些保持自研、z-index、性能 |
| 09 | [09-验收与回归.md](./09-验收与回归.md) | 清单、a11y、ui-ux-pro-max 检查 |
| 10 | [10-风险回滚与排期.md](./10-风险回滚与排期.md) | 风险、回滚、里程碑、分工 |
| — | [references.md](./references.md) | shadcn 官方文档与项目内文档链接 |

---

## 推荐阅读顺序

1. **执行前**：00 → 01 → references  
2. **动手**：02 → 03（必须先完成主题，再装组件）  
3. **按波次迁移**：04 → 05 → 06 → 07  
4. **收尾**：08 → 09 → 10  

---

## 快速命令（工作目录均为 `apps/electron`）

```powershell
cd apps/electron

# 阶段 0
npx shadcn@latest init

# 阶段 2–4：批量安装（可分步执行）
npx shadcn@latest add button input label textarea separator tooltip tabs dropdown-menu context-menu popover dialog alert-dialog scroll-area resizable sonner badge switch slider select

# 阶段 5：表单栈
pnpm add react-hook-form @hookform/resolvers zod
npx shadcn@latest add form

# 开发验证
pnpm dev
```

---

## 权威来源优先级

```
docs/requirements/UI布局与交互设计-优化版.md
  > docs/design-system/easymotion/MASTER.md
  > docs/requirements/组件库清单.md
  > shadcn 官方文档 (ui.shadcn.com)
  > .cursor/skills/ui-ux-pro-max（实现细节与验收）
```

---

## 状态跟踪（手动勾选）

- [ ] 阶段 0：init 完成，`components.json` 就位
- [ ] 阶段 1：主题 token 与 `em-*` 别名对齐
- [ ] 阶段 2：基础 primitive 安装并有一处引用验证
- [ ] 阶段 3：`PanelTabs` / `AddTrackMenu` / `ContextMenu` 迁移完成
- [ ] 阶段 4：`PanelResizer`、根级 `TooltipProvider` + `Toaster`
- [ ] 阶段 5：`PropertiesPanel` 表单迁移
- [ ] 阶段 6：时间线边界文档化，无回归
- [ ] 阶段 9：验收清单全部通过
