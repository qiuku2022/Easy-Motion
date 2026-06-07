import type { Timeline } from "./timeline";

export interface IpcError {
  message?: string;
}

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: IpcError;
}

export interface EasyMotionApi {
  version: string;
  project: {
    create: (config: {
      name: string;
      parentPath?: string;
    }) => Promise<IpcResult<{ path: string }>>;
    open: (path: string) => Promise<IpcResult<unknown>>;
    save: () => Promise<IpcResult<unknown>>;
    listRecent: () => Promise<
      IpcResult<{ name: string; path: string; modifiedAt?: number }[]>
    >;
    delete: (path: string, options?: unknown) => Promise<IpcResult<unknown>>;
    getCurrent: () => Promise<
      IpcResult<{ path: string; data: { name: string } } | null>
    >;
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
    }) => Promise<
      IpcResult<{
        imported: import("./asset").ProjectAsset[];
        errors: { path?: string; message: string }[];
        assets: import("./asset").ProjectAsset[];
      }>
    >;
    pickAndImport: (payload?: {
      subprojectPath?: string;
      fps?: number;
    }) => Promise<
      IpcResult<{
        imported: import("./asset").ProjectAsset[];
        errors: { path?: string; message: string }[];
        assets: import("./asset").ProjectAsset[];
      }>
    >;
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
