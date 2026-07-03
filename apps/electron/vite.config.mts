import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function manualChunks(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");

  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  if (
    normalizedId.includes("/react-markdown/") ||
    normalizedId.includes("/remark-gfm/") ||
    normalizedId.includes("/micromark") ||
    normalizedId.includes("/mdast") ||
    normalizedId.includes("/hast") ||
    normalizedId.includes("/unified/") ||
    normalizedId.includes("/vfile/")
  ) {
    return "vendor-markdown";
  }

  if (
    normalizedId.includes("/react/") ||
    normalizedId.includes("/react-dom/") ||
    normalizedId.includes("/scheduler/")
  ) {
    return "vendor-react";
  }

  if (
    normalizedId.includes("/radix-ui/") ||
    normalizedId.includes("/lucide-react/") ||
    normalizedId.includes("/class-variance-authority/")
  ) {
    return "vendor-ui";
  }

  if (
    normalizedId.includes("/react-hook-form/") ||
    normalizedId.includes("/@hookform/") ||
    normalizedId.includes("/zod/")
  ) {
    return "vendor-forms";
  }

  return undefined;
}

export default defineConfig({
  root: path.join(__dirname, "src/renderer"),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.join(__dirname, "src/renderer/src"),
    },
  },
  server: {
    // 固定 IPv4，避免 Windows 上 localhost→::1 导致 127.0.0.1 无法连接（F5 / wait-on / Electron）
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.join(__dirname, "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
