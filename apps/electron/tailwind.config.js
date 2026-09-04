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
        "accent-blue": "var(--accent-blue)",
        copilot: {
          DEFAULT: "var(--copilot)",
          subtle: "rgba(163, 113, 247, 0.15)",
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
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        preview: {
          canvas: "var(--preview-canvas)",
        },
        /* GitHub Primer 原生直通支持 */
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
        /* 多轨剪辑色谱映射 */
        track: {
          video: "#1f4028",
          "video-border": "#3fb950",
          audio: "#13384e",
          "audio-border": "#388bfd",
          text: "#453316",
          "text-border": "#d29922",
          fx: "#392556",
          "fx-border": "#a371f7",
          image: "#1a3b32",
          "image-border": "#2ea043",
          shape: "#3d2817",
          "shape-border": "#db6d28",
          chart: "#421d28",
          "chart-border": "#f85149",
          default: "#161b22",
          "default-border": "#30363d",
        },
        /* 过渡期：em-* 别名 → 与语义 token 同步（核心修复：em.accent 改为蓝色） */
        em: {
          bg: "var(--background)",
          surface: "var(--muted)",
          elevated: "var(--accent)",
          border: "var(--border)",
          text: "var(--foreground)",
          muted: "var(--muted-foreground)",
          accent: "var(--accent-blue)" /* 核心修复：从 var(--primary) 改为蓝色，解决播放头变白 */,
          "accent-hover": "#1f6feb",
          teal: "var(--ring)",
          warning: "var(--warning)",
          error: "var(--destructive)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius-overlay)",
        md: "var(--radius-control)",
        sm: "calc(var(--radius-control) - 2px)",
        control: "var(--radius-control)",
        overlay: "var(--radius-overlay)",
      },
      ringWidth: {
        3: "3px",
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
