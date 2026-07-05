const memoryService = require("../services/memory-service");

function summarizeMemoryChange(entry) {
  if (entry.type === "preference") {
    return `更新${entry.scope === "project" ? "项目" : "全局"}偏好 ${entry.key}`;
  }
  if (entry.type === "note") {
    return `写入${entry.scope === "project" ? "项目" : "全局"}记忆`;
  }
  if (entry.type === "delete") {
    return `删除${entry.scope === "project" ? "项目" : "全局"}记忆`;
  }
  return "更新长期记忆";
}

class MemoryContext {
  constructor({ projectPath, subprojectPath, userInput } = {}) {
    this.projectPath = projectPath;
    this.subprojectPath = subprojectPath;
    this.userInput = userInput ?? "";
    this.changed = false;
    this.changeLog = [];
  }

  readMemory(input = {}) {
    return memoryService.readMemory({
      projectRoot: this.projectPath,
      subprojectPath: this.subprojectPath,
      query: input.query ?? this.userInput,
      scope: input.scope ?? "all",
      limit: input.limit ?? 10,
    });
  }

  async writeMemory(input = {}) {
    const note = await memoryService.writeNote({
      projectRoot: this.projectPath,
      scope: input.scope ?? "global",
      text: input.text,
      tags: input.tags,
      subprojectPath: input.subprojectPath ?? this.subprojectPath,
      source: input.source ?? "user-explicit",
      confidence: input.confidence,
    });
    this.recordChange({
      type: "note",
      scope: input.scope ?? "global",
      id: note.id,
      text: note.text,
      tags: note.tags,
    });
    return note;
  }

  async updatePreference(input = {}) {
    const preference = await memoryService.updatePreference({
      projectRoot: this.projectPath,
      scope: input.scope ?? "global",
      key: input.key,
      value: input.value,
      label: input.label,
      source: input.source ?? "user-explicit",
      confidence: input.confidence,
    });
    this.recordChange({
      type: "preference",
      scope: input.scope ?? "global",
      key: preference.key,
      label: preference.label,
      value: preference.value,
    });
    return preference;
  }

  async deleteMemory(input = {}) {
    const result = await memoryService.deleteMemoryItem({
      projectRoot: this.projectPath,
      scope: input.scope ?? "global",
      type: input.type,
      idOrKey: input.idOrKey,
    });
    if (result.deleted) {
      this.recordChange({
        type: "delete",
        scope: input.scope ?? "global",
        itemType: input.type,
        idOrKey: input.idOrKey,
      });
    }
    return result;
  }

  buildMemoryContext({ tokenBudget } = {}) {
    return memoryService.buildMemoryContext({
      projectRoot: this.projectPath,
      subprojectPath: this.subprojectPath,
      userInput: this.userInput,
      tokenBudget,
    });
  }

  recordChange(entry) {
    const next = {
      ...entry,
      summary: summarizeMemoryChange(entry),
      createdAt: Date.now(),
    };
    this.changed = true;
    this.changeLog.push(next);
  }

  getChangeSummary() {
    return this.changeLog.map((entry) => entry.summary).join("\n");
  }
}

module.exports = {
  MemoryContext,
  summarizeMemoryChange,
};
