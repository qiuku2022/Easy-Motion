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
      "**/coverage/**",
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
    },
  },
  eslintConfigPrettier
);
