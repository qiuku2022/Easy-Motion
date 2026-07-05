import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  getEasyMotion,
  type AgentMemoryFile,
  type AgentMemoryListResult,
  type AgentMemoryScope,
  type AgentMemoryPreferenceValue,
} from "@/types/easyMotion";
import type { AgentMemorySettings } from "@/types/settings";

interface AgentMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialScope?: AgentMemoryScope;
}

type EditablePreference = {
  label: string;
  value: string;
};

const EMPTY_SETTINGS: AgentMemorySettings = {
  enabled: true,
  autoExtract: false,
  promptBudgetChars: 1200,
  projectMemory: true,
  includeInBackups: false,
};

function formatDate(timestamp?: number) {
  if (!timestamp) return "未知时间";
  return new Date(timestamp).toLocaleString();
}

function formatSource(source?: string) {
  if (source === "user-explicit") return "用户明确要求";
  if (source === "agent-inferred") return "Agent 推断";
  if (source === "manual-edit") return "手动编辑";
  return "未知来源";
}

function serializePreferenceValue(value: AgentMemoryPreferenceValue) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function parsePreferenceValue(raw: string): AgentMemoryPreferenceValue {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    (trimmed.startsWith("{") && trimmed.endsWith("}"))
  ) {
    return JSON.parse(trimmed);
  }
  return trimmed;
}

function getPreferenceEntries(memory?: AgentMemoryFile) {
  return Object.entries(memory?.preferences ?? {}).map(([key, value]) => ({
    key,
    ...value,
  }));
}

function getMemoryCounts(memory?: AgentMemoryFile) {
  return {
    preferences: Object.keys(memory?.preferences ?? {}).length,
    notes: memory?.notes?.length ?? 0,
  };
}

function getScopeLabel(scope: AgentMemoryScope) {
  return scope === "global" ? "全局记忆" : "项目记忆";
}

function MemorySettingToggle({
  title,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${title}，当前${checked ? "已开启" : "已关闭"}`}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex min-h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-full border bg-card px-3 py-1.5 outline-none",
        "transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
        "hover:border-ring/40 hover:bg-muted/25",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
        "active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card disabled:active:scale-100",
        checked ? "border-[oklch(0.708_0_0/0.4)]" : "border-border"
      )}
    >
      <span
        className={cn(
          "min-w-11 text-center text-[11px] font-medium transition-colors duration-200 ease-out motion-reduce:transition-none",
          checked ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {checked ? "已开启" : "已关闭"}
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-block h-4 w-8 shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          checked
            ? "border-[oklch(0.985_0_0/0.28)] bg-[oklch(0.76_0_0)]"
            : "border-border bg-background shadow-inner"
        )}
      />
    </button>
  );
}

function MemorySettingRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors duration-200 ease-out motion-reduce:transition-none",
        !disabled && "hover:border-ring/30 hover:bg-muted/10"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <MemorySettingToggle
        title={title}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function ScopeSegmentedControl({
  value,
  onChange,
}: {
  value: AgentMemoryScope;
  onChange: (scope: AgentMemoryScope) => void;
}) {
  return (
    <div
      className="relative grid h-9 grid-cols-2 rounded-lg border border-border bg-background p-1"
      role="tablist"
      aria-label="记忆作用域"
    >
      <div
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-muted shadow-sm ring-1 ring-border transition-transform duration-200 ease-out motion-reduce:transition-none",
          value === "project" ? "translate-x-full" : "translate-x-0"
        )}
      />
      {(["global", "project"] as const).map((scope) => {
        const active = value === scope;
        return (
          <button
            key={scope}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "relative z-10 inline-flex items-center justify-center rounded-md px-3 text-sm font-medium outline-none transition-colors duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(scope)}
          >
            {scope === "global" ? "全局" : "项目"}
          </button>
        );
      })}
    </div>
  );
}

export function AgentMemoryDialog({
  open,
  onOpenChange,
  initialScope = "global",
}: AgentMemoryDialogProps) {
  const [activeScope, setActiveScope] = useState<AgentMemoryScope>(initialScope);
  const [data, setData] = useState<AgentMemoryListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [newPreferenceKey, setNewPreferenceKey] = useState("");
  const [newPreferenceLabel, setNewPreferenceLabel] = useState("");
  const [newPreferenceValue, setNewPreferenceValue] = useState("");
  const [editingPreferences, setEditingPreferences] = useState<
    Record<string, EditablePreference>
  >({});

  const settings = data?.settings ?? EMPTY_SETTINGS;
  const memoryEnabled = settings.enabled;

  const loadMemory = useCallback(async () => {
    const api = getEasyMotion()?.memory;
    if (!api) return;
    setLoading(true);
    const result = await api.list({ scope: "all" });
    setLoading(false);
    if (!result.success || !result.data) {
      toast.error("加载长期记忆失败", {
        description: result.error?.message,
      });
      return;
    }
    setData(result.data);
    const nextEditing: Record<string, EditablePreference> = {};
    for (const scope of ["global", "project"] as const) {
      for (const item of getPreferenceEntries(result.data[scope])) {
        nextEditing[`${scope}:${item.key}`] = {
          label: item.label ?? "",
          value: serializePreferenceValue(item.value),
        };
      }
    }
    setEditingPreferences(nextEditing);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveScope(initialScope);
    void loadMemory();
  }, [initialScope, loadMemory, open]);

  const updateSettings = async (patch: Partial<AgentMemorySettings>) => {
    const api = getEasyMotion()?.memory;
    if (!api) return;
    setSavingSettings(true);
    const result = await api.updateSettings({ settings: patch });
    setSavingSettings(false);
    if (!result.success || !result.data) {
      toast.error("保存记忆设置失败", {
        description: result.error?.message,
      });
      return;
    }
    setData((prev) =>
      prev ? { ...prev, settings: { ...prev.settings, ...result.data } } : prev
    );
    toast.success("记忆设置已保存");
  };

  const saveNewNote = async () => {
    const api = getEasyMotion()?.memory;
    const text = newNote.trim();
    if (!api || !text) return;
    const result = await api.writeNote({
      scope: activeScope,
      text,
      tags: ["manual"],
    });
    if (!result.success) {
      toast.error("写入记忆失败", {
        description: result.error?.message,
      });
      return;
    }
    setNewNote("");
    toast.success("记忆已写入");
    await loadMemory();
  };

  const saveNewPreference = async () => {
    const api = getEasyMotion()?.memory;
    const key = newPreferenceKey.trim();
    if (!api || !key || !newPreferenceValue.trim()) return;
    let value: AgentMemoryPreferenceValue;
    try {
      value = parsePreferenceValue(newPreferenceValue);
    } catch {
      toast.error("偏好值格式无效", {
        description: "请输入普通文本，或合法 JSON 数组/对象。",
      });
      return;
    }
    const result = await api.updatePreference({
      scope: activeScope,
      key,
      value,
      label: newPreferenceLabel.trim() || undefined,
    });
    if (!result.success) {
      toast.error("保存偏好失败", {
        description: result.error?.message,
      });
      return;
    }
    setNewPreferenceKey("");
    setNewPreferenceLabel("");
    setNewPreferenceValue("");
    toast.success("偏好已保存");
    await loadMemory();
  };

  const savePreference = async (key: string) => {
    const api = getEasyMotion()?.memory;
    const edit = editingPreferences[`${activeScope}:${key}`];
    if (!api || !edit) return;
    let value: AgentMemoryPreferenceValue;
    try {
      value = parsePreferenceValue(edit.value);
    } catch {
      toast.error("偏好值格式无效", {
        description: "请输入普通文本，或合法 JSON 数组/对象。",
      });
      return;
    }
    const result = await api.updatePreference({
      scope: activeScope,
      key,
      value,
      label: edit.label.trim() || undefined,
    });
    if (!result.success) {
      toast.error("保存偏好失败", {
        description: result.error?.message,
      });
      return;
    }
    toast.success("偏好已更新");
    await loadMemory();
  };

  const deleteItem = async (type: "note" | "preference", idOrKey: string) => {
    const api = getEasyMotion()?.memory;
    if (!api) return;
    const result = await api.delete({ scope: activeScope, type, idOrKey });
    if (!result.success) {
      toast.error("删除记忆失败", {
        description: result.error?.message,
      });
      return;
    }
    toast.success("记忆已删除");
    await loadMemory();
  };

  const clearScope = async () => {
    const api = getEasyMotion()?.memory;
    if (!api) return;
    const label = activeScope === "global" ? "全局记忆" : "项目记忆";
    if (!window.confirm(`确认清空${label}？此操作不可撤销。`)) return;
    const result = await api.clear({ scope: activeScope });
    if (!result.success) {
      toast.error("清空记忆失败", {
        description: result.error?.message,
      });
      return;
    }
    toast.success(`${label}已清空`);
    await loadMemory();
  };

  const currentMemory = data
    ? activeScope === "global"
      ? data.global
      : data.project
    : undefined;
  const currentCounts = getMemoryCounts(currentMemory);
  const scopeLabel = getScopeLabel(activeScope);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="h-[min(680px,calc(100vh-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle>Agent 长期记忆</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">
                管理 Agent 可参考的用户偏好与项目上下文。记忆是数据，不是系统指令；本轮明确要求始终优先。
              </DialogDescription>
            </div>
            {data ? (
              <div className="hidden shrink-0 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground md:block">
                <span className="text-foreground">{currentCounts.preferences}</span> 偏好 ·{" "}
                <span className="text-foreground">{currentCounts.notes}</span> 笔记
              </div>
            ) : null}
          </div>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            加载中…
          </div>
        ) : (
          <Tabs
            value={activeScope}
            onValueChange={(value) => setActiveScope(value as AgentMemoryScope)}
            className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)] gap-0"
          >
            <aside className="flex min-h-0 flex-col border-r border-border bg-muted/20">
              <div className="border-b border-border p-4">
                <ScopeSegmentedControl value={activeScope} onChange={setActiveScope} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {activeScope === "global"
                    ? "跨项目沿用的创作偏好。"
                    : "仅当前项目生效的品牌与上下文。"}
                </p>
              </div>

              <div className="scrollbar-theme -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="flex flex-col gap-4 p-4">
                  <section className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        记忆策略
                      </p>
                    </div>
                    <MemorySettingRow
                      title="长期记忆"
                      description="允许 Agent 读取、写入并在回复前参考记忆。"
                      checked={settings.enabled}
                      disabled={savingSettings}
                      onCheckedChange={(checked) =>
                        void updateSettings({ enabled: checked })
                      }
                    />
                    <MemorySettingRow
                      title="自动抽取"
                      description="从强信号对话中提取稳定偏好，默认建议关闭。"
                      checked={settings.autoExtract}
                      disabled={savingSettings || !settings.enabled}
                      onCheckedChange={(checked) =>
                        void updateSettings({ autoExtract: checked })
                      }
                    />
                    <MemorySettingRow
                      title="项目记忆"
                      description="启用当前项目的品牌、客户和风格上下文。"
                      checked={settings.projectMemory}
                      disabled={savingSettings || !settings.enabled}
                      onCheckedChange={(checked) =>
                        void updateSettings({ projectMemory: checked })
                      }
                    />
                    <div className="rounded-lg border border-border bg-background p-3">
                      <Label htmlFor="memory-budget" className="text-xs text-muted-foreground">
                        Prompt 注入预算
                      </Label>
                      <Select
                        value={String(settings.promptBudgetChars)}
                        disabled={savingSettings || !settings.enabled}
                        onValueChange={(value) =>
                          void updateSettings({ promptBudgetChars: Number(value) })
                        }
                      >
                        <SelectTrigger id="memory-budget" className="mt-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="600">600 字符</SelectItem>
                          <SelectItem value="1200">1200 字符</SelectItem>
                          <SelectItem value="2000">2000 字符</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </section>

                  <section className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-medium text-foreground">快速新增</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      写入当前 {scopeLabel}。
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      <Label htmlFor="memory-note">自由笔记</Label>
                      <Textarea
                        id="memory-note"
                        className="min-h-20"
                        value={newNote}
                        disabled={!memoryEnabled}
                        placeholder="例如：偏科技 SaaS 风，字幕密度中等。"
                        onChange={(event) => setNewNote(event.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!memoryEnabled || !newNote.trim()}
                        onClick={saveNewNote}
                      >
                        写入笔记
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                      <Label htmlFor="memory-pref-key">结构化偏好</Label>
                      <Input
                        id="memory-pref-key"
                        value={newPreferenceKey}
                        disabled={!memoryEnabled}
                        placeholder="visual.style"
                        onChange={(event) => setNewPreferenceKey(event.target.value)}
                      />
                      <Input
                        value={newPreferenceLabel}
                        disabled={!memoryEnabled}
                        placeholder="说明，如视觉风格偏好"
                        onChange={(event) => setNewPreferenceLabel(event.target.value)}
                      />
                      <Textarea
                        className="min-h-20"
                        value={newPreferenceValue}
                        disabled={!memoryEnabled}
                        placeholder="深色科技风，或 JSON 数组/对象"
                        onChange={(event) => setNewPreferenceValue(event.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          !memoryEnabled ||
                          !newPreferenceKey.trim() ||
                          !newPreferenceValue.trim()
                        }
                        onClick={saveNewPreference}
                      >
                        保存偏好
                      </Button>
                    </div>
                  </section>

                  <section className="rounded-lg border border-border bg-background p-3">
                    <p className="text-sm font-medium text-foreground">隐私边界</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      不保存 API Key、token、password、本机绝对路径和“忽略规则”类指令。项目记忆不会进入 Remotion 工程 ZIP。
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 text-destructive hover:text-destructive"
                      onClick={clearScope}
                    >
                      清空当前 {scopeLabel}
                    </Button>
                  </section>
                </div>
              </div>
            </aside>

            <main className="flex min-h-0 min-w-0 flex-col bg-background">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{scopeLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentCounts.preferences} 个偏好，{currentCounts.notes} 条笔记
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={loadMemory}>
                  <RefreshCw className="size-3.5" />
                  刷新
                </Button>
              </div>

              {(["global", "project"] as const).map((scope) => {
                const scopedMemory = scope === "global" ? data.global : data.project;
                const scopedPreferences = getPreferenceEntries(scopedMemory);

                return (
                  <TabsContent key={scope} value={scope} className="min-h-0 flex-1">
                    <div className="scrollbar-theme h-full overflow-y-auto">
                      <div className="flex flex-col gap-5 p-5">
                        <section className="flex flex-col gap-3">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">结构化偏好</p>
                              <p className="text-xs text-muted-foreground">
                                推荐使用 visual.*、motion.*、content.*、workflow.*。
                              </p>
                            </div>
                          </div>

                          {scopedPreferences.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                              暂无结构化偏好。可在左侧写入，例如 visual.style = 深色科技风。
                            </div>
                          ) : (
                            scopedPreferences.map((item) => {
                              const editKey = `${scope}:${item.key}`;
                              const edit = editingPreferences[editKey] ?? {
                                label: item.label ?? "",
                                value: serializePreferenceValue(item.value),
                              };
                              return (
                                <article
                                  key={item.key}
                                  className="rounded-lg border border-border bg-card p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate font-mono text-xs text-foreground">
                                        {item.key}
                                      </p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">
                                        {formatSource(item.source)} · 置信度{" "}
                                        {Math.round((item.confidence ?? 0) * 100)}% ·{" "}
                                        {formatDate(item.updatedAt)}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`删除偏好 ${item.key}`}
                                      onClick={() => void deleteItem("preference", item.key)}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                  <div className="mt-3 grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                                    <Input
                                      value={edit.label}
                                      disabled={!memoryEnabled}
                                      placeholder="说明"
                                      onChange={(event) =>
                                        setEditingPreferences((prev) => ({
                                          ...prev,
                                          [editKey]: { ...edit, label: event.target.value },
                                        }))
                                      }
                                    />
                                    <Textarea
                                      className="min-h-10"
                                      value={edit.value}
                                      disabled={!memoryEnabled}
                                      onChange={(event) =>
                                        setEditingPreferences((prev) => ({
                                          ...prev,
                                          [editKey]: { ...edit, value: event.target.value },
                                        }))
                                      }
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={!memoryEnabled}
                                      onClick={() => void savePreference(item.key)}
                                    >
                                      保存
                                    </Button>
                                  </div>
                                </article>
                              );
                            })
                          )}
                        </section>

                        <section className="flex flex-col gap-3">
                          <p className="text-sm font-medium text-foreground">自由笔记</p>
                          {(scopedMemory?.notes ?? []).length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                              暂无自由笔记。适合记录品牌约束、项目背景和风格备注。
                            </div>
                          ) : (
                            scopedMemory?.notes.map((note) => (
                              <article
                                key={note.id}
                                className="rounded-lg border border-border bg-card p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                                      {note.text}
                                    </p>
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                      {formatSource(note.source)} · 置信度{" "}
                                      {Math.round((note.confidence ?? 0) * 100)}% ·{" "}
                                      {formatDate(note.updatedAt)}
                                      {note.subprojectPath ? ` · ${note.subprojectPath}` : ""}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="删除记忆笔记"
                                    onClick={() => void deleteItem("note", note.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </article>
                            ))
                          )}
                        </section>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </main>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
