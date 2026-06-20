#!/usr/bin/env node
/**
 * Patch vendored RVE components to accept RveBaseProps from ./shared.ts
 */
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function helpersForEntry(entry) {
  const set = new Set();
  for (const param of entry.parameters) {
    set.add(helperForParam(param));
  }
  return [...set];
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

function ensureSharedImport(code, helpers) {
  const importLine = `import { type RveBaseProps, ${helpers.join(", ")} } from "./shared";`;
  if (code.includes('from "./shared"')) {
    code = code.replace(
      /import \{ type RveBaseProps, [^}]+\} from "\.\/shared";\s*\n?/,
      "",
    );
    code = code.replace(
      /import \{ type RveBaseProps \} from "\.\/shared";\s*\n?/,
      "",
    );
  }
  const remotionImports = [...code.matchAll(/^import .+ from "remotion";/gm)];
  if (remotionImports.length > 0) {
    const last = remotionImports[remotionImports.length - 1];
    const insertAt = last.index + last[0].length;
    return `${code.slice(0, insertAt)}\n${importLine}${code.slice(insertAt)}`;
  }
  return `${importLine}\n${code}`;
}

function normalizeExportSignature(code, component) {
  code = code.replace(/interface \w+Props \{[\s\S]*?\}\s*\n/g, "");

  if (code.includes(`export const ${component}: React.FC`)) {
    code = code.replace(
      new RegExp(
        `export const ${component}: React\\.FC<[^>]+> = \\(\\{[\\s\\S]*?\\}\\) => \\{`,
      ),
      `export function ${component}(props: RveBaseProps = {}) {`,
    );
  }

  code = code.replace(
    new RegExp(`export function ${component}\\([^)]*\\)`),
    `export function ${component}(props: RveBaseProps = {})`,
  );

  return code;
}

function injectPropsBlock(code, component, block) {
  const marker = `export function ${component}(props: RveBaseProps = {}) {`;
  const idx = code.indexOf(marker);
  if (idx === -1) return code;
  const insertAt = idx + marker.length;

  if (code.includes('pText(props, "') || code.includes('pNum(props, "')) {
    code = code.replace(
      /  const \w+ = p(?:Text|Num|Color|Image|Csv)\(props[\s\S]*?(?=\n  const frame|\n  const \{ fps|\n  return)/,
      `${block}\n`,
    );
    return code;
  }

  return `${code.slice(0, insertAt)}\n${block}\n${code.slice(insertAt)}`;
}

function replaceJsxText(code, literal, varName) {
  if (!literal || literal.length < 2) return code;
  const esc = escapeRegExp(literal);
  return code.replace(new RegExp(`(>\\s*)${esc}(\\s*</)`, "g"), `$1{${varName}}$2`);
}

function replaceQuotedString(code, literal, replacement, limit = 20) {
  if (!literal) return code;
  const esc = escapeRegExp(literal);
  let count = 0;
  for (const quote of ['"', "'"]) {
    const re = new RegExp(`${quote}${esc}${quote}`, "g");
    code = code.replace(re, (match, offset, full) => {
      if (count >= limit) return match;
      const before = full.slice(Math.max(0, offset - 30), offset);
      const after = full.slice(offset + match.length, offset + match.length + 5);
      if (/:\s*$/.test(before) && /^[\s,}]/.test(after)) {
        const bare = replacement.replace(/^\{|\}$/g, "");
        count += 1;
        return bare;
      }
      if (/\[\s*$/.test(before) && /^[\s,\]]/.test(after)) {
        const bare = replacement.replace(/^\{|\}$/g, "");
        count += 1;
        return bare;
      }
      count += 1;
      return replacement.startsWith("{") ? replacement : `{${replacement}}`;
    });
  }
  return code;
}

function replaceBackgroundColorProp(code, hex, varName) {
  const esc = escapeRegExp(hex);
  code = code.replace(
    new RegExp(`(backgroundColor:\\s*)"${esc}"`, "g"),
    `$1${varName}`,
  );
  code = code.replace(
    new RegExp(`(backgroundColor:\\s*)'${esc}'`, "g"),
    `$1${varName}`,
  );
  return code;
}

function replaceBackgroundGradient(code, hex, varName) {
  return code.replace(/background:\s*"([^"]+)"/g, (match, inner) => {
    if (!inner.includes(hex)) return match;
    if (inner === hex) return `background: ${varName}`;
    const tpl = inner.replaceAll(hex, `\${${varName}}`);
    return `background: \`${tpl}\``;
  });
}

function replaceSvgFill(code, hex, varName) {
  const esc = escapeRegExp(hex);
  code = code.replace(new RegExp(`fill="${esc}"`, "g"), `fill={${varName}}`);
  code = code.replace(new RegExp(`stroke="${esc}"`, "g"), `stroke={${varName}}`);
  return code;
}

function replacePrimaryColorUsages(code, hex, varName) {
  const esc = escapeRegExp(hex);
  code = code.replace(
    new RegExp(`(stopColor=)${esc}`, "g"),
    `$1{${varName}}`,
  );
  code = code.replace(
    new RegExp(`(fill=)${esc}`, "g"),
    `$1{${varName}}`,
  );
  code = code.replace(new RegExp(`"${esc}"`, "g"), (match, offset, full) => {
    const before = full.slice(Math.max(0, offset - 40), offset);
    if (before.includes("pColor(") || before.includes("pText(")) return match;
    if (/=\s*$/.test(before)) return `{${varName}}`;
    if (/:\s*$/.test(before) || /,\s*$/.test(before)) return varName;
    return `{${varName}}`;
  });
  return code;
}

function replaceNumberTargets(code, entry) {
  const aliases = PARAM_LOCAL_NAMES[entry.id] ?? {};
  for (const param of entry.parameters.filter((p) => p.type === "number")) {
    const varName = aliases[param.key] ?? param.key;
    const num = param.defaultValue;
    code = code.replace(
      new RegExp(`\\[0, ${num}\\]`, "g"),
      `[0, ${varName}]`,
    );
    code = code.replace(
      new RegExp(`\\[1, ${num}\\]`, "g"),
      `[1, ${varName}]`,
    );
    code = code.replace(
      new RegExp(`\\], \\[0, ${num}\\]`, "g"),
      `], [0, ${varName}]`,
    );
    code = code.replace(
      new RegExp(`= ${num};`, "g"),
      `= ${varName};`,
    );
    code = code.replace(
      new RegExp(`= ${num},`, "g"),
      `= ${varName},`,
    );
  }
  return code;
}

function replaceImageUrl(code, url, varName) {
  if (!url) return code;
  const short = url.split("?")[0];
  code = replaceQuotedString(code, url, varName, 5);
  if (short !== url && short.length > 20) {
    code = replaceQuotedString(code, short, varName, 5);
  }
  return code;
}

function applyReplacements(code, entry) {
  const aliases = PARAM_LOCAL_NAMES[entry.id] ?? {};
  const paramKeys = new Set(entry.parameters.map((p) => p.key));

  for (const param of entry.parameters) {
    if (param.type !== "text" && param.type !== "image") continue;
    const varName = aliases[param.key] ?? param.key;
    const literal = String(param.defaultValue);
    if (param.type === "image") {
      code = replaceImageUrl(code, literal, varName);
      continue;
    }
    if (literal.includes(",")) continue;
    code = replaceJsxText(code, literal, varName);
    code = replaceQuotedString(code, literal, `{${varName}}`, 8);
  }

  for (const [key, value] of Object.entries(entry.strings ?? {})) {
    if (!paramKeys.has(key) || typeof value !== "string") continue;
    const varName = aliases[key] ?? key;
    code = replaceJsxText(code, value, varName);
    code = replaceQuotedString(code, value, `{${varName}}`, 8);
  }

  const bgParam = entry.parameters.find((p) => p.key === "backgroundColor");
  if (bgParam?.type === "color") {
    const hex = bgParam.defaultValue;
    code = replaceBackgroundColorProp(code, hex, "backgroundColor");
    code = replaceBackgroundGradient(code, hex, "backgroundColor");
    if (hex === "#000000") {
      code = code.replace(/backgroundColor:\s*"black"/g, "backgroundColor: backgroundColor");
    }
  }

  const primaryParam = entry.parameters.find((p) => p.key === "primaryColor");
  if (primaryParam?.type === "color") {
    const hex = primaryParam.defaultValue;
    code = replaceSvgFill(code, hex, "primaryColor");
    code = replacePrimaryColorUsages(code, hex, "primaryColor");
  }

  const secondaryParam = entry.parameters.find((p) => p.key === "secondaryColor");
  if (secondaryParam?.type === "color") {
    const hex = secondaryParam.defaultValue;
    code = replacePrimaryColorUsages(code, hex, "secondaryColor");
  }

  code = replaceNumberTargets(code, entry);
  return code;
}

function patchFile(entry) {
  const fileName = `${entry.id.replace(/^rve-/, "")}.tsx`;
  const filePath = path.join(RVE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`[skip] missing ${fileName}`);
    return false;
  }

  let code = fs.readFileSync(filePath, "utf8");
  const helpers = helpersForEntry(entry);
  const block = propsBlockForEntry(entry);

  code = normalizeExportSignature(code, entry.component);
  code = applyReplacements(code, entry);
  code = ensureSharedImport(code, helpers);
  code = injectPropsBlock(code, entry.component, block);

  fs.writeFileSync(filePath, code, "utf8");
  return true;
}

function main() {
  let patched = 0;
  for (const entry of PRESET_PARAMETER_ENTRIES) {
    if (patchFile(entry)) patched += 1;
  }
  console.log(`apply-preset-props: patched ${patched}/${PRESET_PARAMETER_ENTRIES.length} components`);
}

main();
