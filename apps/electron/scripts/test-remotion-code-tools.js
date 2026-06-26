const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { RemotionContext } = require("../src/main/agent/remotion-context");
const { compileRemotionCheck } = require("../src/main/agent/remotion-compile-check");
const { createRemotionCodeTools } = require("../src/main/agent/tools/remotion-code");

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

const VALID_TSX = `import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export type RedBgProps = { color?: string };

export const RedBg: React.FC<RedBgProps> = ({ color = "#ff0000" }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ backgroundColor: color, opacity }} />;
};
`;

function createFixtureRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-remotion-tools-"));
  const projectPath = path.join(tmpRoot, "Demo.em");
  const subprojectPath = "subprojects/default";
  const remotionDir = path.join(projectPath, subprojectPath, "remotion");
  const srcDir = path.join(remotionDir, "src");

  fs.mkdirSync(path.join(srcDir, "components", "custom"), { recursive: true });
  fs.writeFileSync(
    path.join(remotionDir, "package.json"),
    JSON.stringify(
      {
        name: "fixture-remotion",
        private: true,
        dependencies: {
          remotion: "4.0.269",
          react: "^18.3.1",
          "react-dom": "^18.3.1",
        },
        devDependencies: {
          typescript: "^5.7.2",
        },
      },
      null,
      2
    ),
    "utf8"
  );
  fs.writeFileSync(
    path.join(remotionDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2
    ),
    "utf8"
  );

  return { tmpRoot, projectPath, subprojectPath, remotionDir };
}

async function invokeTool(tools, name, args = {}) {
  const found = tools.find((item) => item.name === name);
  if (!found) throw new Error(`tool not found: ${name}`);
  const raw = await found.invoke(args);
  return JSON.parse(raw);
}

async function main() {
  const { tmpRoot, projectPath, subprojectPath } = createFixtureRoot();
  const ctx = new RemotionContext({ projectPath, subprojectPath });
  const tools = createRemotionCodeTools(ctx);

  const listed = await invokeTool(tools, "listRemotionFiles", { maxDepth: 4 });
  assert(listed.success, "listRemotionFiles success");
  assert(listed.data.count >= 1, "listRemotionFiles count");

  const pkgInfo = await invokeTool(tools, "getRemotionPackageInfo", {});
  assert(pkgInfo.success, "getRemotionPackageInfo success");
  assert(pkgInfo.data.allowedImports.includes("remotion"), "allowed remotion");

  const written = await invokeTool(tools, "writeRemotionFile", {
    relativePath: "components/custom/RedBg.tsx",
    content: VALID_TSX,
    reason: "test fixture",
  });
  assert(written.success, written.error ?? "writeRemotionFile");
  assert(ctx.changed, "ctx.changed after write");

  const readBack = await invokeTool(tools, "readRemotionFile", {
    relativePath: "components/custom/RedBg.tsx",
    offset: 0,
    limit: 5,
  });
  assert(readBack.success, "readRemotionFile");
  assert(readBack.data.content.includes("RedBg"), "read content");

  const patched = await invokeTool(tools, "patchRemotionFile", {
    relativePath: "components/custom/RedBg.tsx",
    search: 'color = "#ff0000"',
    replace: 'color = "#0000ff"',
  });
  assert(patched.success, patched.error ?? "patchRemotionFile");

  expectThrows(
    () => ctx.writeFile("components/MainSequence.tsx", VALID_TSX),
    /E2410/
  );

  ctx.rollbackFile("components/custom/RedBg.tsx");
  const afterPatchRollback = fs.readFileSync(
    path.join(ctx.srcDir, "components/custom/RedBg.tsx"),
    "utf8"
  );
  assert(afterPatchRollback.includes("#ff0000"), "rollback restored pre-patch content");

  ctx.writeFile("components/custom/Temp.tsx", VALID_TSX);
  ctx.rollbackFile("components/custom/Temp.tsx");
  assert(
    !fs.existsSync(path.join(ctx.srcDir, "components/custom/Temp.tsx")),
    "rollback removes newly created file"
  );

  const compileSkipped = await compileRemotionCheck(ctx.remotionDir);
  assert(compileSkipped.skipped, "compile skipped without node_modules");

  const compileTool = await invokeTool(tools, "compileRemotionCheck", {});
  assert(compileTool.success, "compileRemotionCheck tool wrapper");
  assert(compileTool.data.skipped, "compile tool reports skipped");

  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log("test-remotion-code-tools: passed");
}

main().catch((error) => {
  console.error("test-remotion-code-tools: FAIL", error);
  process.exit(1);
});
