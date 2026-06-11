# EasyMotion 主题焕新 — 研究文档

> 创建：2026-06-11  
> 状态：**方案 A 已实施**（2026-06-11）  
> 不涉及代码改动；实施见 `08-实施清单.md`

---

## 结论（TL;DR）

当前「土」的主要原因不是 shadcn 组件差，而是 **旧设计规范（Cinema Dark + Action Red）与 nova 组件形态打架**：

| 问题 | 表现 |
|------|------|
| 三色抢戏 | 紫蓝底 + 大红 Primary + 青色 Ring |
| Primary 滥用 | 保存/新建/发送全是 `bg-primary` → 满屏红按钮 |
| 圆角打架 | nova 按钮默认 `rounded-lg`，业务里大量 `rounded-sm` 覆写 |
| 饱和度过高 | `#0F0F23` / `#E11D48` 像早期「赛博剪辑器」模板 |

**推荐默认落地：方案 A — shadcn Neutral Dark（黑白灰 + 白按钮）**  
你若想保留一点品牌色，用 **方案 B — 单色 UI + 时间线专用 accent**（UI 仍中性，播放头/选中用蓝或紫）。

---

## 文档索引

| 文件 | 内容 |
|------|------|
| [00-现状诊断.md](./00-现状诊断.md) | 当前 token、组件、文档三方对照 |
| [01-方案对比.md](./01-方案对比.md) | A / B / C 三套方案与参考产品 |
| [02-推荐方案.md](./02-推荐方案.md) | **拍板用**：推荐 A，备选 B，弃用旧 Cinema 作为主 UI |
| [03-TOKENS-方案A-shadcn-neutral.css](./03-TOKENS-方案A-shadcn-neutral.css) | 可直接替换 `index.css` 的 token 块 |
| [04-TOKENS-方案B-editor-accent.css](./04-TOKENS-方案B-editor-accent.css) | 中性 UI + `--timeline-accent` |
| [05-按钮与圆角规范.md](./05-按钮与圆角规范.md) | variant 用法、去掉满屏 `rounded-sm` |
| [06-时间线语义色.md](./06-时间线语义色.md) | 画布/playhead 与壳层分离 |
| [07-Open-Design.md](./07-Open-Design.md) | MCP 用法（当前未启动） |
| [08-实施清单.md](./08-实施清单.md) | 改哪些文件、验收什么 |

---

## 与官方文档的关系

| 文档 | 本次处理 |
|------|----------|
| `docs/requirements/UI布局与交互设计-优化版.md` §0.1 | **待你确认后**再改配色表（现仍写 Cinema Dark） |
| `docs/design-system/easymotion/MASTER.md` | 实施时同步为新 token |
| `.local/shadcn-migration/` | 迁移已完成；本目录只管「好看」 |

---

## 下一步

1. 读 [02-推荐方案.md](./02-推荐方案.md)，选 **A** 或 **B**（或说「就要纯白黑」）  
2. 若 Open Design 可用：按 [07-Open-Design.md](./07-Open-Design.md) 生成视觉稿再微调 token  
3. 确认后对我说「按方案 A 实施」，我再动 `index.css` 和业务里的 `rounded-sm` / `variant`
