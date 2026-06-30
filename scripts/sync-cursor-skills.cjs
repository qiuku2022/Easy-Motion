#!/usr/bin/env node
/**
 * Copy npx-managed skills (.agents/skills) into committed Cursor path (.cursor/skills).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, ".agents", "skills");
const target = path.join(root, ".cursor", "skills");

if (!fs.existsSync(source)) {
  console.error("sync-cursor-skills: missing .agents/skills — run npx skills add/update first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
}

fs.cpSync(source, target, { recursive: true, force: true });

const names = fs.readdirSync(target).filter((name) => {
  const p = path.join(target, name);
  return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "SKILL.md"));
});

console.log(`sync-cursor-skills: copied ${names.length} skill(s) → .cursor/skills/`);
for (const name of names.sort()) {
  console.log(`  - ${name}`);
}
