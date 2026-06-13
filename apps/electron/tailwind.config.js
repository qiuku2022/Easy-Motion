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
        /* 过渡期：em-* 别名 → 与语义 token 同步，旧组件无需批量改类名 */
        em: {
          bg: "var(--background)",
          surface: "var(--muted)",
          elevated: "var(--accent)",
          border: "var(--border)",
          text: "var(--foreground)",
          muted: "var(--muted-foreground)",
          accent: "var(--primary)",
          "accent-hover": "oklch(0.488 0.215 25)", /* #BE123C */
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
        sm: "calc(var(--radius-control) - 1px)",
        control: "var(--radius-control)",
        overlay: "var(--radius-overlay)",
      },
      ringWidth: {
        3: "3px",
      },
    },
  },
  plugins: [],
};
