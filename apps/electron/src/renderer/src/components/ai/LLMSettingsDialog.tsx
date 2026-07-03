import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { LlmProvider, LlmSettingsFormState } from "@/types/settings";
import { LLM_PROVIDER_OPTIONS, LLM_PROVIDER_PRESETS } from "@/types/settings";
import { getEasyMotion } from "@/types/easyMotion";

interface LLMSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

function toFormState(llm: {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}): LlmSettingsFormState {
  return {
    provider: llm.provider,
    baseUrl: llm.baseUrl,
    model: llm.model,
    maxTokens: llm.maxTokens,
    temperature: llm.temperature,
    apiKey: "",
  };
}

export function LLMSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: LLMSettingsDialogProps) {
  const [form, setForm] = useState<LlmSettingsFormState | null>(null);
  const [keyStored, setKeyStored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const api = getEasyMotion()?.settings;
    if (!api) return;

    setLoading(true);
    const result = await api.get();
    setLoading(false);

    if (!result.success || !result.data?.llm) {
      toast.error("无法加载设置", {
        description: result.error?.message,
      });
      return;
    }

    setForm(toFormState(result.data.llm));
    setKeyStored(Boolean(result.data.llm.apiKeyStored));
  }, []);

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [open, loadSettings]);

  const updateField = <K extends keyof LlmSettingsFormState>(
    key: K,
    value: LlmSettingsFormState[K]
  ) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleProviderChange = (provider: LlmProvider) => {
    const preset = LLM_PROVIDER_PRESETS[provider];
    setForm((prev) =>
      prev
        ? {
            ...prev,
            provider,
            baseUrl: preset.baseUrl,
            model: preset.model,
            apiKey: "",
          }
        : prev
    );
    setKeyStored(false);
  };

  const handleValidate = async () => {
    if (!form) return;
    const api = getEasyMotion()?.settings;
    if (!api) return;

    setValidating(true);
    const result = await api.validateLLMKey({
      provider: form.provider,
      baseUrl: form.baseUrl,
      model: form.model,
      apiKey: form.apiKey || undefined,
    });
    setValidating(false);

    if (result.success && result.data?.valid) {
      toast.success("API Key 验证通过");
      return;
    }

    toast.error("验证失败", {
      description: result.data?.error || result.error?.message || "未知错误",
    });
  };

  const handleSave = async () => {
    if (!form) return;
    const api = getEasyMotion()?.settings;
    if (!api) return;

    setSaving(true);

    const updateResult = await api.update({
      settings: {
        llm: {
          provider: form.provider,
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim(),
          maxTokens: form.maxTokens,
          temperature: form.temperature,
        },
      },
    });

    if (!updateResult.success) {
      setSaving(false);
      toast.error("保存设置失败", {
        description: updateResult.error?.message,
      });
      return;
    }

    if (form.apiKey.trim()) {
      const keyResult = await api.setLlmApiKey({
        provider: form.provider,
        apiKey: form.apiKey.trim(),
      });
      if (!keyResult.success) {
        setSaving(false);
        toast.error("保存 API Key 失败", {
          description: keyResult.error?.message,
        });
        return;
      }
      setKeyStored(true);
      setForm((prev) => (prev ? { ...prev, apiKey: "" } : prev));
    }

    setSaving(false);
    toast.success("LLM 设置已保存");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>LLM 设置</DialogTitle>
          <DialogDescription>
            API Key 加密保存在本机，不会写入项目目录。开发环境仍可使用
            apps/electron/.env 作为后备。
          </DialogDescription>
        </DialogHeader>

        {loading || !form ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            加载中…
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="llm-provider">提供商</Label>
              <Select
                value={form.provider}
                onValueChange={(value) => handleProviderChange(value as LlmProvider)}
              >
                <SelectTrigger id="llm-provider" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="llm-base-url">Base URL</Label>
              <Input
                id="llm-base-url"
                value={form.baseUrl}
                onChange={(event) => updateField("baseUrl", event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="llm-model">模型</Label>
              <Input
                id="llm-model"
                value={form.model}
                onChange={(event) => updateField("model", event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="llm-max-tokens">Max Tokens</Label>
                <Input
                  id="llm-max-tokens"
                  type="number"
                  min={256}
                  max={8192}
                  value={form.maxTokens}
                  onChange={(event) =>
                    updateField("maxTokens", Number(event.target.value) || 4096)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="llm-temperature">Temperature</Label>
                <Input
                  id="llm-temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(event) =>
                    updateField("temperature", Number(event.target.value) || 0.7)
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="llm-api-key">API Key</Label>
              <Input
                id="llm-api-key"
                type="password"
                autoComplete="off"
                placeholder={keyStored ? "已保存（留空则不修改）" : "输入 API Key"}
                value={form.apiKey}
                onChange={(event) => updateField("apiKey", event.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!form || validating || saving}
            onClick={() => void handleValidate()}
          >
            {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "验证 Key"}
          </Button>
          <Button
            type="button"
            disabled={!form || saving || validating}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
