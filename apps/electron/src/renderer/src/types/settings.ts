export type LlmProvider = "openai" | "anthropic";

/** quick=仅 timeline | free=timeline+remotion | auto=按输入路由 */
export type AgentCreationMode = "quick" | "free" | "auto";

export interface AgentSettings {
  creationMode: AgentCreationMode;
}

export interface LlmSettings {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  streamResponse: boolean;
  apiKeyConfigured?: boolean;
  apiKeyStored?: boolean;
}

export interface AppSettings {
  version: string;
  llm: LlmSettings;
  agent: AgentSettings;
}

export interface LlmSettingsFormState {
  provider: LlmProvider;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
}

export const LLM_PROVIDER_OPTIONS: { value: LlmProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic 兼容（MiniMax / Claude）" },
  { value: "openai", label: "OpenAI 兼容" },
];

export const LLM_PROVIDER_PRESETS: Record<
  LlmProvider,
  { baseUrl: string; model: string }
> = {
  anthropic: {
    baseUrl: "https://api.minimaxi.com/anthropic",
    model: "MiniMax-M3",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};
