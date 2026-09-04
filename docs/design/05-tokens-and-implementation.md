# Easy-Motion 代码落地与 Token 映射指南 (Tokens & Implementation)

> **关联文档**：[设计系统主文档](./README.md) ｜ [色彩系统](./01-color-palette.md) ｜ [排版系统](./02-typography.md) ｜ [轮廓与圆角](./03-shape-and-radii.md)  
> **权威工程入口**：
> - `apps/electron/tailwind.config.js`
> - `apps/electron/src/renderer/src/index.css`
> - `apps/electron/src/renderer/src/types/easyMotion.ts`

---

## 一、实施落地总纲

为了将 GitHub Design 规范无缝融入 Easy-Motion 现有的 Electron + React + Tailwind + shadcn/ui 架构，本实施方案坚持：
1. **零破坏性破坏（Non-Breaking Migration）**：保留现行关键语义 token 名，通过底层变量值替换实现全局视觉换新；
2. **三层 Token 规范注入**：在 `index.css` 中完整定义 Primitive -> Semantic -> Component 变量链；
3. **Tailwind 语义对齐**：将 Primer 的 `canvas-*`、`fgColor-*`、`borderColor-*` 及 GitHub Green 正式注册入 Tailwind 配置。

---

## 二、CSS 变量全量配置 (注入 `src/renderer/src/index.css`)

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Mona+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap");

@layer base {
  :root,
  .dark {
    /* =========================================================================
     * 1. 基础原始值 (Layer 1: Primitive Tokens)
     * ========================================================================= */
    --pr-color-gray-0: #f0f6fc;
    --pr-color-gray-1: #e6edf3;
    --pr-color-gray-2: #c9d1d9;
    --pr-color-gray-3: #8b949e;
    --pr-color-gray-4: #7d8590;
    --pr-color-gray-5: #6e7681;
    --pr-color-gray-6: #30363d;
    --pr-color-gray-7: #21262d;
    --pr-color-gray-8: #161b22;
    --pr-color-gray-9: #0d1117;
    --pr-color-gray-10: #010409;

    /* 品牌绿核心 */
    --pr-color-green-brand: #0FBF3E;
    --pr-color-green-light: #3fb950;
    --pr-color-green-medium: #2ea043;
    --pr-color-green-dark: #238636;
    --pr-color-green-deep: #196c2e;

    /* 功能基色 */
    --pr-color-blue: #2f81f7;
    --pr-color-blue-dark: #1f6feb;
    --pr-color-yellow: #d29922;
    --pr-color-red: #f85149;
    --pr-color-red-dark: #da3633;
    --pr-color-purple: #a371f7;
    --pr-color-purple-dark: #8250df;

    /* 圆角基元 (Primer Radii) */
    --radius-xsmall: 2px;
    --radius-small: 4px;
    --radius-medium: 6px;
    --radius-large: 8px;
    --radius-xlarge: 12px;
    --radius-full: 9999px;

    /* =========================================================================
     * 2. 语义功能层 (Layer 2: Semantic / Functional Tokens)
     * ========================================================================= */
    --background: var(--pr-color-gray-9);         /* #0d1117 主工作台背景 */
    --foreground: var(--pr-color-gray-1);         /* #e6edf3 主文本 */
    --card: var(--pr-color-gray-8);               /* #161b22 面板卡片 */
    --card-foreground: var(--pr-color-gray-1);
    --popover: var(--pr-color-gray-8);            /* #161b22 浮动面板与菜单 */
    --popover-foreground: var(--pr-color-gray-1);

    /* 主行动色：全面对齐 GitHub Green */
    --primary: var(--pr-color-green-dark);         /* #238636 */
    --primary-foreground: #ffffff;
    --primary-hover: var(--pr-color-green-medium);/* #2ea043 */
    --primary-active: var(--pr-color-green-deep); /* #196c2e */

    /* 次级交互与幽灵色 */
    --secondary: var(--pr-color-gray-7);          /* #21262d */
    --secondary-foreground: var(--pr-color-gray-1);
    --muted: var(--pr-color-gray-7);              /* #21262d */
    --muted-foreground: var(--pr-color-gray-4);   /* #7d8590 */
    --accent: var(--pr-color-gray-7);
    --accent-foreground: var(--pr-color-gray-0);

    /* 状态色 */
    --destructive: var(--pr-color-red-dark);       /* #da3633 */
    --destructive-foreground: #ffffff;
    --warning: var(--pr-color-yellow);            /* #d29922 */
    --warning-foreground: #010409;
    --info: var(--pr-color-blue);                 /* #2f81f7 */
    --copilot: var(--pr-color-purple);            /* #a371f7 */

    /* 边框与焦点 */
    --border: var(--pr-color-gray-6);             /* #30363d */
    --input: var(--pr-color-gray-6);              /* #30363d */
    --ring: var(--pr-color-blue-dark);            /* #1f6feb 聚焦外环 */

    /* 专属区域 */
    --preview-canvas: #05070a;                    /* 播放舞台深渊黑 */
    --timeline-track-bg: var(--pr-color-gray-10); /* #010409 时间线轨道底色 */

    /* 圆角映射 (shadcn 对齐) */
    --radius-control: var(--radius-medium);       /* 6px 标准按钮与输入框 */
    --radius-overlay: var(--radius-large);        /* 8px 浮层与弹窗 */
    --radius: var(--radius-medium);
  }
}
```

---

## 三、Tailwind 配置文件扩展 (`tailwind.config.js`)

在 `apps/electron/tailwind.config.js` 的 `theme.extend` 中添加以下映射配置：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          foreground: "var(--warning-foreground)",
        },
        copilot: {
          DEFAULT: "var(--copilot)",
          subtle: "rgba(163, 113, 247, 0.15)",
        },
        preview: {
          canvas: "var(--preview-canvas)",
        },
        /* GitHub Primer 特色色彩直接支持 */
        gh: {
          green: "#0FBF3E",
          "green-btn": "#238636",
          "green-hover": "#2ea043",
          blue: "#2f81f7",
          purple: "#a371f7",
          canvas: "#0d1117",
          subtle: "#161b22",
          inset: "#010409",
          border: "#30363d",
          "border-muted": "#21262d",
        },
        /* 轨道类别色谱映射 */
        track: {
          video: "#1f4028",
          "video-border": "#3fb950",
          audio: "#13384e",
          "audio-border": "#388bfd",
          text: "#453316",
          "text-border": "#d29922",
          fx: "#392556",
          "fx-border": "#a371f7",
        },
      },
      fontFamily: {
        sans: ['"Mona Sans"', '"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Consolas", "monospace"],
      },
      borderRadius: {
        xsmall: "var(--radius-xsmall)", // 2px
        small: "var(--radius-small)",   // 4px
        medium: "var(--radius-medium)", // 6px
        large: "var(--radius-large)",   // 8px
        xlarge: "var(--radius-xlarge)", // 12px
        control: "var(--radius-control)",
        overlay: "var(--radius-overlay)",
      },
      boxShadow: {
        "primer-btn": "0 1px 0 rgba(1, 4, 9, 0.4), inset 0 1px 0 rgba(240, 246, 252, 0.05)",
        "primer-btn-primary": "0 1px 0 rgba(1, 4, 9, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        "primer-overlay": "0 4px 12px rgba(1, 4, 9, 0.5), 0 1px 3px rgba(1, 4, 9, 0.4)",
      },
    },
  },
  plugins: [],
};
```

---

## 四、经典组件代码范例 (React + Tailwind)

### 4.1 导出/主要行动按钮（GitHub Green Primary Button）

```tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';

export const ExportActionButton: React.FC = () => {
  return (
    <Button
      variant="default"
      className="h-8 px-3 rounded-medium bg-primary hover:bg-primary-hover text-white font-medium shadow-primer-btn-primary transition-colors border border-white/10"
    >
      <Rocket className="w-4 h-4 mr-1.5" />
      <span>渲染导出</span>
    </Button>
  );
};
```

### 4.2 时间线视频剪辑块 (Timeline Video Clip)

```tsx
import React from 'react';

interface ClipProps {
  title: string;
  duration: string;
  isSelected?: boolean;
}

export const TimelineVideoClip: React.FC<ClipProps> = ({ title, duration, isSelected }) => {
  return (
    <div
      className={`
        relative h-12 rounded-small bg-track-video border transition-all select-none cursor-pointer flex items-center px-2.5 justify-between
        ${isSelected 
          ? 'border-white ring-2 ring-blue-500/50 shadow-md' 
          : 'border-track-video-border/70 hover:border-track-video-border'
        }
      `}
    >
      {/* 左侧裁切手柄 */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/40 rounded-l-small" />
      
      <span className="text-xs font-medium text-gray-100 truncate max-w-[120px]">{title}</span>
      <span className="text-[11px] font-mono text-gray-300 tabular-nums">{duration}</span>

      {/* 右侧裁切手柄 */}
      <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/40 rounded-r-small" />
    </div>
  );
};
```

### 4.3 时间码显示器 (Tabular Timecode Display)

```tsx
import React from 'react';

export const TimecodeDisplay: React.FC<{ timecode: string }> = ({ timecode }) => {
  return (
    <div className="flex items-center space-x-1 px-2.5 py-1 bg-gh-inset border border-gh-border-muted rounded-medium">
      <span className="text-xs text-gray-400 font-sans">当前位置:</span>
      <span className="font-mono text-xs font-semibold text-gray-100 tabular-nums tracking-wider">
        {timecode}
      </span>
    </div>
  );
};
```

---

## 五、开发者迁移与回归指引

1. **样式编译检查**：
   - 每次修改配置或 token 后，执行 `pnpm lint` 确保 Tailwind 类名合法；
   - 运行 `pnpm typecheck` 验证组件 Props 类型完整性；
2. **零退化原则**：
   - 旧代码中残留的 `em-*` 别名已在 `tailwind.config.js` 中平滑重定向至对应的 Primer 变量，无需一次性暴力重构所有旧业务组件；
3. **视觉一致性复核**：
   - 在亮/暗模式下切换验证文字对比度（≥ 4.5:1）；
   - 在视频预览区载入不同色调的 Remotion 模板，确认周边面板未造成眩光或色差干扰。
