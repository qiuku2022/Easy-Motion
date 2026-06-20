#!/usr/bin/env node
/** Fix corrupted pText/pImage fallback literals after a bad apply-preset-props run. */
const fs = require("node:fs");
const path = require("node:path");
const {
  PRESET_PARAMETER_ENTRIES,
  PARAM_LOCAL_NAMES,
  EXTRA_PROPS_LINES,
} = require("./preset-parameters-registry.cjs");

const ROOT = path.resolve(__dirname, "..");
const RVE_DIR = path.join(
  ROOT,
  "resources/templates/default-project/subprojects/default/remotion/src/presets/rve",
);

function helperForParam(param) {
  if (param.type === "number") return "pNum";
  if (param.type === "color") return "pColor";
  if (param.type === "image") return "pImage";
  if (
    param.type === "text" &&
    typeof param.defaultValue === "string" &&
    param.defaultValue.includes(",")
  ) {
    return "pCsv";
  }
  return "pText";
}

function propsBlockForEntry(entry) {
  const aliases = PARAM_LOCAL_NAMES[entry.id] ?? {};
  const lines = entry.parameters.map((param) => {
    const varName = aliases[param.key] ?? param.key;
    const helper = helperForParam(param);
    if (helper === "pNum") {
      return `  const ${varName} = pNum(props, "${param.key}", ${param.defaultValue});`;
    }
    if (helper === "pCsv") {
      const parts = String(param.defaultValue)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      return `  const ${varName} = pCsv(props, "${param.key}", ${JSON.stringify(parts)});`;
    }
    return `  const ${varName} = ${helper}(props, "${param.key}", ${JSON.stringify(param.defaultValue)});`;
  });
  const extra = EXTRA_PROPS_LINES[entry.id] ?? [];
  return [...lines, ...extra].join("\n");
}

function repairFile(entry) {
  const fileName = `${entry.id.replace(/^rve-/, "")}.tsx`;
  const filePath = path.join(RVE_DIR, fileName);
  if (!fs.existsSync(filePath)) return false;

  let code = fs.readFileSync(filePath, "utf8");
  if (!code.includes("RveBaseProps")) return false;

  const block = propsBlockForEntry(entry);
  const re = new RegExp(
    `(export function ${entry.component}\\(props: RveBaseProps = \\{\\}\\) \\{)\\n[\\s\\S]*?(?=\\n  const frame|\\n  const \\{ fps|\\n  return)`,
  );
  if (!re.test(code)) return false;
  code = code.replace(re, `$1\n${block}\n`);
  code = code.replace(/\n\};\n/g, "\n}\n");
  fs.writeFileSync(filePath, code, "utf8");
  return true;
}

function main() {
  let repaired = 0;
  for (const entry of PRESET_PARAMETER_ENTRIES) {
    if (repairFile(entry)) repaired += 1;
  }
  console.log(`repair-preset-props-blocks: ${repaired} files`);
}

main();
