import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "**/release/**",
      "**/.venv/**",
      "**/.build-bundle/**",
      "**/coverage/**",
      "apps/electron/resources/python/**",
      "apps/electron/resources/templates/**",
      ".cursor/**",
    ],
  },
  {
    files: [
      "apps/electron/src/main/**/*.js",
      "apps/electron/src/preload/**/*.js",
      "apps/electron/scripts/**/*.js",
      "apps/python/**/*.cjs",
      "packages/**/*.js",
    ],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["apps/electron/*.mts"],
  })),
  {
    files: ["apps/electron/*.mts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["apps/electron/src/renderer/**/*.{ts,tsx}"],
  })),
  {
    files: ["apps/electron/src/renderer/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "electron",
              message:
                "Renderer 必须通过 preload 暴露的 window.easyMotion 使用系统能力。",
            },
            {
              name: "fs",
              message: "Renderer 禁止直接访问文件系统，请使用 IPC。",
            },
            {
              name: "path",
              message: "Renderer 禁止依赖 Node path，请把路径处理放到主进程。",
            },
            {
              name: "child_process",
              message: "Renderer 禁止启动进程，请通过 IPC 调用主进程服务。",
            },
          ],
          patterns: [
            {
              group: ["node:*", "**/src/main/**", "**/src/preload/**"],
              message: "Renderer 不得导入 Node、Main 或 Preload 实现。",
            },
          ],
        },
      ],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["apps/electron/tests/**/*.ts"],
  })),
  {
    files: ["apps/electron/tests/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  eslintConfigPrettier
);
