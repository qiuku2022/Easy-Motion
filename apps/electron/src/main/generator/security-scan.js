/**
 * Generator 写入前 TSX 安全扫描（正则黑名单，对齐代码生成规范 §禁止 API）
 */

const FORBIDDEN_PATTERNS = [
  { id: "eval", pattern: /\beval\s*\(/ },
  { id: "new-function", pattern: /\bnew\s+Function\s*\(/ },
  { id: "require-fs", pattern: /require\s*\(\s*['"]fs['"]\s*\)/ },
  { id: "require-child_process", pattern: /require\s*\(\s*['"]child_process['"]\s*\)/ },
  { id: "import-fs", pattern: /\bfrom\s+['"]fs['"]/ },
  { id: "import-child_process", pattern: /\bfrom\s+['"]child_process['"]/ },
  { id: "import-node:", pattern: /\bfrom\s+['"]node:/ },
  { id: "iframe", pattern: /<iframe\b/i },
  { id: "object-tag", pattern: /<object\b/i },
  { id: "embed-tag", pattern: /<embed\b/i },
  { id: "document-write", pattern: /\bdocument\.write\s*\(/ },
];

function scanTsxSecurity(code) {
  const source = String(code ?? "");
  const violations = [];

  for (const { id, pattern } of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      violations.push(id);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

function assertTsxSecurity(code) {
  const result = scanTsxSecurity(code);
  if (result.valid) return result;
  throw new Error(`E2408: 生成代码包含安全违规 (${result.violations.join(", ")})`);
}

module.exports = {
  FORBIDDEN_PATTERNS,
  scanTsxSecurity,
  assertTsxSecurity,
};
