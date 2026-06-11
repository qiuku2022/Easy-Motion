# 07 — Open Design MCP

## 当前状态

调用 `list_projects` / `list_skills` 时返回：

```
cannot reach the Open Design daemon at http://127.0.0.1:7456
Start it with `pnpm tools-dev`
```

**本次主题研究未使用 OD 生成稿**；结论来自 shadcn 官方 neutral token + 代码/文档对照 + ui-ux-pro-max。

---

## 你启动 OD 后可以做什么

### 1. 启动

```bash
pnpm tools-dev   # 仓库根目录，以你项目脚本为准
```

### 2. 建议 prompt（方案 A 壳层）

> EasyMotion 视频编辑器 Electron 应用，dark only。  
> 三栏布局：左项目/素材、中 Remotion 预览、右属性/AI；底时间线。  
> 风格：shadcn neutral dark，类似 Linear — 灰黑底、白/灰按钮、无饱和红。  
> 输出：顶栏 + 左面板 + 时间线运输条，标注 CSS oklch token。

### 3. 建议 prompt（方案 B）

> 同上，但时间线播放头与片段选中用低饱和靛蓝 #6366f1，壳层仍 monochrome。

### 4. MCP 工作流

```
list_skills → start_run(prompt, skill?) → get_run 轮询 → get_artifact 拉 HTML
```

把 OD 输出的 token 表与 `03`/`04` CSS 草案 diff 后写入 `02-推荐方案.md` 附录。

---

## 与 ui-ux-pro-max 的关系

| 工具 | 本次结果 |
|------|----------|
| ui-ux-pro-max `--design-system` | 推荐了 **同一套** Cinema #0F0F23 + #E11D48 → 证明旧规范在拖后腿 |
| ui-ux-pro-max `minimal dark` | 倾向 #0F172A / #18181B 中性底 → 与方案 A 一致 |
| Open Design | 适合出**整页视觉稿**，待 daemon 启动后补一轮 |

---

## 决策建议

- **赶时间**：不依赖 OD，直接方案 A  
- **要设计稿再改**：你启动 `pnpm tools-dev` 后跟我说，我用 MCP 跑一版对比稿
