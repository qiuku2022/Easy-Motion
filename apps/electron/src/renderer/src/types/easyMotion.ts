import type { Timeline } from "./timeline";
import type { AppSettings, LlmProvider } from "./settings";
import type { Conversation, AttachedImage } from "./conversation";

export interface PendingAgentUndoPayload {
  messageId: string;
  timeline?: Timeline | null;
  remotionFilesBefore?: Array<{
    relativePath: string;
    existedBefore: boolean;
    contentBefore: string | null;
    existedAfter?: boolean;
    hashAfter?: string | null;
  }>;
  savedAt?: number;
}

export interface IpcError {
  message?: string;
}

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: IpcError;
}

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmChunkPayload {
  requestId: string;
  chunk: string;
  isDone: boolean;
}

export interface ConversationChunkPayload {
  requestId: string;
  chunk: string;
  isDone: boolean;
}

export interface ConversationCompletePayload {
  requestId: string;
  reply?: string;
  timelineUpdated?: boolean;
  timeline?: Timeline;
  remotionCodeUpdated?: boolean;
  previewReload?: boolean;
  timelinePush?: boolean;
  subprojectPath?: string;
  changeSummary?: string;
  timelineChangeSummary?: string;
  remotionChangeSummary?: string;
  changeLog?: unknown[];
  remotionChangeLog?: unknown[];
  remotionUndoSnapshots?: PendingAgentUndoPayload["remotionFilesBefore"];
  cancelled?: boolean;
  simplifiedMode?: boolean;
  systemNotice?: string;
}

export interface ConversationStatusPayload {
  requestId: string;
  status: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
}

/** 子项目内 `.easymotion/workspace.json` */
export interface ProjectWorkspace {
  version: string;
  timeline: {
    keyframePanelExpanded: boolean;
  };
}

export interface ProjectWorkspacePatch {
  timeline?: Partial<ProjectWorkspace["timeline"]>;
}

export interface WindowState {
  maximized: boolean;
  fullscreen: boolean;
}

export interface EasyMotionApi {
  version: string;
  shell?: {
    platform: string;
    trafficLightInset: boolean;
    customWindowControls: boolean;
  };
  window?: {
    minimize: () => Promise<IpcResult<void>>;
    toggleMaximize: () => Promise<IpcResult<WindowState>>;
    close: () => Promise<IpcResult<void>>;
    getState: () => Promise<IpcResult<WindowState>>;
    onStateChanged: (callback: (state: WindowState) => void) => () => void;
  };
  project: {
    create: (config: {
      name: string;
      parentPath?: string;
    }) => Promise<IpcResult<{ path: string }>>;
    open: (path: string) => Promise<IpcResult<unknown>>;
    save: () => Promise<IpcResult<unknown>>;
    listRecent: () => Promise<IpcResult<ProjectSummary[]>>;
    listLocal: () => Promise<
      IpcResult<{ scanRoot: string; projects: ProjectSummary[] }>
    >;
    delete: (path: string, options?: unknown) => Promise<IpcResult<unknown>>;
    getCurrent: () => Promise<
      IpcResult<{ path: string; data: { name: string } } | null>
    >;
    close: () => Promise<IpcResult<{ closed: boolean }>>;
    pickParentDirectory: () => Promise<IpcResult<{ path: string }>>;
    pickProjectDirectory: () => Promise<IpcResult<{ path: string }>>;
  };
  timeline: {
    load: (payload?: { subprojectPath?: string }) => Promise<IpcResult<Timeline>>;
    save: (payload: {
      timeline: Timeline;
      subprojectPath?: string;
    }) => Promise<IpcResult<Timeline>>;
    applySample: (payload?: {
      subprojectPath?: string;
    }) => Promise<IpcResult<Timeline>>;
    generate: (payload?: {
      subprojectPath?: string;
    }) => Promise<IpcResult<{ files: string[]; previewReload?: boolean }>>;
    checkRemotionDrift: (payload?: {
      subprojectPath?: string;
    }) => Promise<
      IpcResult<{
        drifted: boolean;
        suggestSync: boolean;
        tracksEmpty: boolean;
        fingerprint?: string;
        storedFingerprint?: string | null;
        hasCustomRemotionCode?: boolean;
        customRemotionReason?: string | null;
        timelineDrivenPreview?: boolean;
      }>
    >;
    syncPreviewManifest: (payload: {
      timeline: Timeline;
      subprojectPath?: string;
    }) => Promise<
      IpcResult<{
        manifestWritten?: boolean;
        timeline?: Timeline;
        previewReload?: boolean;
        timelinePush?: boolean;
      }>
    >;
    syncFromRemotion: (payload?: {
      subprojectPath?: string;
      preserveTracks?: boolean;
    }) => Promise<
      IpcResult<{
        timeline: Timeline;
        stats: {
          trackCount: number;
          clipCount: number;
          fingerprint: string;
          syncSource: string;
          compositionResolved: boolean;
          compositionError?: string | null;
          manifestUsed?: boolean;
        };
      }>
    >;
  };
  preview: {
    start: (payload?: unknown) => Promise<
      IpcResult<{ url: string; remotionFingerprint?: string | null }>
    >;
    stop: () => Promise<IpcResult<unknown>>;
    getState: () => Promise<IpcResult<{ status: string; url?: string }>>;
    onLog: (callback: (data: { line?: string; phase?: string }) => void) => void;
  };
  asset: {
    list: () => Promise<IpcResult<import("./asset").ProjectAsset[]>>;
    importFiles: (payload: {
      filePaths: string[];
      subprojectPath?: string;
      fps?: number;
      duplicateResolutions?: Record<
        string,
        import("./asset").DuplicateResolution
      >;
    }) => Promise<IpcResult<import("./asset").AssetImportResult>>;
    pickAndImport: (payload?: {
      subprojectPath?: string;
      fps?: number;
      duplicateResolutions?: Record<
        string,
        import("./asset").DuplicateResolution
      >;
    }) => Promise<IpcResult<import("./asset").AssetImportResult>>;
    updateMeta: (payload: {
      assetId: string;
      isFavorite?: boolean;
      name?: string;
    }) => Promise<IpcResult<import("./asset").ProjectAsset>>;
    recordUsage: (payload: {
      assetId: string;
    }) => Promise<IpcResult<import("./asset").ProjectAsset>>;
    readThumbnail: (payload: {
      assetId: string;
    }) => Promise<IpcResult<{ dataUrl: string }>>;
  };
  data: {
    pickAndParse: () => Promise<
      IpcResult<{
        relativePath: string;
        headers: string[];
        rows: Record<string, string>[];
        previewRows: Record<string, string>[];
      } | null>
    >;
    mapChart: (payload: {
      rows: Record<string, string>[];
      xField: string;
      yField: string;
    }) => Promise<IpcResult<{ data: { label: string; value: number }[] }>>;
  };
  llm: {
    stream: (payload: {
      requestId?: string;
      messages: LlmMessage[];
      provider?: LlmProvider;
      model?: string;
      baseUrl?: string;
      temperature?: number;
      maxTokens?: number;
    }) => Promise<IpcResult<{ requestId: string }>>;
    cancel: (payload: {
      requestId: string;
    }) => Promise<IpcResult<{ cancelled: boolean }>>;
    onChunk: (callback: (data: LlmChunkPayload) => void) => () => void;
  };
  settings: {
    get: (payload?: {
      keys?: string[];
    }) => Promise<IpcResult<AppSettings>>;
    update: (payload: {
      settings: Partial<AppSettings>;
    }) => Promise<IpcResult<{ updated: boolean; settings: AppSettings }>>;
    setLlmApiKey: (payload: {
      provider?: LlmProvider;
      apiKey: string;
    }) => Promise<IpcResult<{ stored: boolean }>>;
    validateLLMKey: (payload?: {
      provider?: LlmProvider;
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    }) => Promise<IpcResult<{ valid: boolean; error?: string }>>;
  };
  conversation: {
    load: (payload?: {
      subprojectId?: string;
      subprojectPath?: string;
    }) => Promise<
      IpcResult<{
        conversation: Conversation;
        subprojectPath?: string;
        subprojectId?: string;
        pendingAgentUndo?: PendingAgentUndoPayload | null;
      }>
    >;
    save: (payload: {
      subprojectId?: string;
      subprojectPath?: string;
      conversation: Conversation;
    }) => Promise<
      IpcResult<{ saved: boolean; conversation: Conversation }>
    >;
    clear: (payload?: {
      subprojectId?: string;
      subprojectPath?: string;
    }) => Promise<
      IpcResult<{ saved: boolean; conversation: Conversation }>
    >;
    saveAgentUndo: (payload: {
      subprojectId?: string;
      subprojectPath?: string;
      messageId: string;
      timeline?: Timeline | null;
      remotionFilesBefore?: PendingAgentUndoPayload["remotionFilesBefore"];
    }) => Promise<IpcResult<{ saved: boolean; messageId: string }>>;
    restoreAgentUndo: (payload?: {
      subprojectId?: string;
      subprojectPath?: string;
      messageId?: string;
    }) => Promise<
      IpcResult<{
        restored: boolean;
        messageId: string;
        timeline?: Timeline | null;
        restoredFiles?: string[];
        previewReload?: boolean;
        timelinePush?: boolean;
      }>
    >;
    clearAgentUndo: (payload?: {
      subprojectId?: string;
      subprojectPath?: string;
    }) => Promise<IpcResult<{ cleared: boolean }>>;
    pickAiRefs: (payload?: {
      subprojectId?: string;
      subprojectPath?: string;
    }) => Promise<
      IpcResult<{
        images: Array<{
          id: string;
          path: string;
          relativePath: string;
          name: string;
          previewUrl?: string;
        }>;
        max: number;
      }>
    >;
    readAiRefPreview: (payload: {
      path?: string;
      relativePath?: string;
      subprojectId?: string;
      subprojectPath?: string;
    }) => Promise<IpcResult<{ dataUrl: string }>>;
    send: (payload: {
      requestId?: string;
      message: string;
      messages?: LlmMessage[];
      subprojectId?: string;
      subprojectPath?: string;
      selectedClipId?: string | null;
      currentFrame?: number;
      confirmOverwrite?: boolean;
      attachedImages?: AttachedImage[];
      creationMode?: "quick" | "free" | "auto";
    }) => Promise<IpcResult<{ requestId: string }>>;
    cancel: (payload: {
      requestId: string;
    }) => Promise<IpcResult<{ cancelled: boolean }>>;
    onChunk: (callback: (data: ConversationChunkPayload) => void) => () => void;
    onComplete: (
      callback: (data: ConversationCompletePayload) => void
    ) => () => void;
    onError: (
      callback: (data: { requestId: string; message: string }) => void
    ) => () => void;
    onStatus: (callback: (data: ConversationStatusPayload) => void) => () => void;
  };
  workspace: {
    load: (payload?: {
      subprojectPath?: string;
    }) => Promise<IpcResult<ProjectWorkspace>>;
    save: (payload: {
      patch: ProjectWorkspacePatch;
      subprojectPath?: string;
    }) => Promise<IpcResult<ProjectWorkspace>>;
  };
  export: {
    start: (payload: import("./export").ExportStartRequest) => Promise<
      IpcResult<{ exportId: string }>
    >;
    project: (payload: import("./export").ProjectExportStartRequest) => Promise<
      IpcResult<{ exportId: string }>
    >;
    cancel: (exportId: string) => Promise<IpcResult<{ cancelled: boolean }>>;
    pickOutput: (payload: {
      defaultPath?: string;
      format?: import("./export").ExportFormat;
    }) => Promise<IpcResult<{ path: string | null }>>;
    pickProjectOutput: (payload: {
      defaultPath?: string;
    }) => Promise<IpcResult<{ path: string | null }>>;
    getActive: () => Promise<
      IpcResult<{ exportId: string; kind?: import("./export").ExportKind } | null>
    >;
    onProgress: (
      callback: (data: import("./export").ExportProgressPayload) => void,
    ) => () => void;
    onCompleted: (
      callback: (data: import("./export").ExportCompletedPayload) => void,
    ) => () => void;
    onError: (
      callback: (data: import("./export").ExportErrorPayload) => void,
    ) => () => void;
  };
}

declare global {
  interface Window {
    easyMotion?: EasyMotionApi;
  }
}

export function getEasyMotion(): EasyMotionApi | undefined {
  return window.easyMotion;
}
