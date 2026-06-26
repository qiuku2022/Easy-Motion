const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  assertWritableRelativePath,
  assertReadableRelativePath,
  assertImportsAllowed,
  resolveRemotionPaths,
  listSrcFiles,
} = require("../src/main/agent/remotion-sandbox");
const { scanTsxSecurity } = require("../src/main/generator/security-scan");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectThrows(fn, pattern) {
  try {
    fn();
    throw new Error(`expected throw matching ${pattern}`);
  } catch (error) {
    if (error.message.includes("expected throw")) throw error;
    assert(pattern.test(error.message), `unexpected error: ${error.message}`);
  }
}

function main() {
  assert(assertWritableRelativePath("components/custom/Foo.tsx") === "components/custom/Foo.tsx");
  assert(assertWritableRelativePath("presets/custom-registry.ts") === "presets/custom-registry.ts");

  expectThrows(
    () => assertWritableRelativePath("components/MainSequence.tsx"),
    /E2410.*不允许写入/
  );
  expectThrows(() => assertWritableRelativePath("../outside.tsx"), /E2410/);
  expectThrows(() => assertWritableRelativePath("/abs.tsx"), /E2410/);

  assert(assertReadableRelativePath("components/MainSequence.tsx") === "components/MainSequence.tsx");

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-sandbox-"));
  const projectPath = path.join(tmpRoot, "Demo.em");
  const subprojectPath = "subprojects/default";
  const remotionDir = path.join(projectPath, subprojectPath, "remotion");
  const srcDir = path.join(remotionDir, "src", "components", "custom");
  fs.mkdirSync(srcDir, { recursive: true });
  fs.writeFileSync(
    path.join(remotionDir, "package.json"),
    JSON.stringify({ dependencies: { remotion: "4.0.269", react: "^18.3.1" } }),
    "utf8"
  );
  fs.writeFileSync(path.join(srcDir, "Sample.tsx"), "// sample", "utf8");

  const paths = resolveRemotionPaths(projectPath, subprojectPath);
  assert(paths.srcDir === path.join(remotionDir, "src"), "resolveRemotionPaths srcDir");

  const files = listSrcFiles(paths.srcDir, { maxDepth: 4 });
  assert(files.some((f) => f.path === "components/custom/Sample.tsx"), "listSrcFiles");

  const safeCode = `import React from "react";\nimport { AbsoluteFill, useCurrentFrame } from "remotion";\nexport const X = () => <AbsoluteFill />;`;
  assert(scanTsxSecurity(safeCode).valid, "security scan safe");
  assertImportsAllowed(safeCode, remotionDir);

  expectThrows(
    () => assertImportsAllowed(`import { Rect } from "@remotion/shapes";`, remotionDir),
    /E2411/
  );

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log("test-remotion-sandbox: passed");
}

main();
