#!/usr/bin/env node
/**
 * M0 Smoke Test — 验证项目脚手架文件完整性
 * 用法：node scripts/smoke-test.mjs
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const requiredFiles = [
  // Root
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.base.json',
  '.npmrc',
  '.prettierrc',
  '.prettierignore',
  '.editorconfig',
  '.gitignore',
  '.env.example',
  'eslint.config.mjs',
  // Python
  'apps/python/main.py',
  'apps/python/requirements.txt',
  'apps/python/src/__init__.py',
  'apps/python/src/api/__init__.py',
  'apps/python/src/api/health.py',
  // Shared
  'packages/shared/package.json',
  'packages/shared/tsconfig.json',
  'packages/shared/src/index.ts',
  'packages/shared/src/types/project.ts',
  'packages/shared/src/types/timeline.ts',
  'packages/shared/src/constants/index.ts',
  // Electron
  'apps/electron/package.json',
  'apps/electron/electron.vite.config.ts',
  'apps/electron/tsconfig.json',
  'apps/electron/electron-builder.yml',
  'apps/electron/src/main/index.ts',
  'apps/electron/src/preload/index.ts',
  'apps/electron/src/renderer/index.html',
  'apps/electron/src/renderer/src/main.tsx',
  'apps/electron/src/renderer/src/App.tsx',
  // CI
  '.github/workflows/ci.yml',
];

let failed = false;

for (const file of requiredFiles) {
  const fullPath = resolve(root, file);
  if (existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} — MISSING`);
    failed = true;
  }
}

if (failed) {
  console.error('\n❌ Smoke test FAILED: some required files are missing');
  process.exit(1);
} else {
  console.log(`\n✅ Smoke test PASSED: all ${requiredFiles.length} files present`);
  process.exit(0);
}
