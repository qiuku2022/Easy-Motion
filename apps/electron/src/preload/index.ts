import { contextBridge, ipcRenderer } from 'electron';
import type { IPCResponse } from '@easymotion/shared';
import { IPC_CHANNELS } from '@easymotion/shared';

// ============================================
// 项目 API
// ============================================
interface ProjectAPI {
  create(params: Record<string, unknown>): Promise<IPCResponse<Record<string, unknown>>>;
  open(params: { projectPath: string }): Promise<IPCResponse<Record<string, unknown>>>;
  save(params?: Record<string, unknown>): Promise<IPCResponse<{ saved: boolean }>>;
  close(): Promise<IPCResponse<void>>;
  delete(params: { projectId: string; keepOutput?: boolean }): Promise<IPCResponse<{ deleted: boolean }>>;
  listRecent(): Promise<IPCResponse<Array<Record<string, unknown>>>>;
  rename(params: { projectId: string; newName: string }): Promise<IPCResponse<Record<string, unknown>>>;
}

const projectAPI: ProjectAPI = {
  create: (params) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.CREATE, params),
  open: (params) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.OPEN, params),
  save: (params) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.SAVE, params),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.CLOSE),
  delete: (params) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.DELETE, params),
  listRecent: () => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.LIST_RECENT),
  rename: (params) => ipcRenderer.invoke(IPC_CHANNELS.PROJECT.RENAME, params),
};

// ============================================
// 子项目 API
// ============================================
interface SubprojectAPI {
  create(params: Record<string, unknown>): Promise<IPCResponse<Record<string, unknown>>>;
  delete(params: { projectId: string; subprojectId: string }): Promise<IPCResponse<{ deleted: boolean }>>;
  rename(params: Record<string, unknown>): Promise<IPCResponse<void>>;
  duplicate(params: Record<string, unknown>): Promise<IPCResponse<Record<string, unknown>>>;
  switch(params: { subprojectId: string }): Promise<IPCResponse<Record<string, unknown>>>;
}

const subprojectAPI: SubprojectAPI = {
  create: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUBPROJECT.CREATE, params),
  delete: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUBPROJECT.DELETE, params),
  rename: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUBPROJECT.RENAME, params),
  duplicate: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUBPROJECT.DUPLICATE, params),
  switch: (params) => ipcRenderer.invoke(IPC_CHANNELS.SUBPROJECT.SWITCH, params),
};

interface TimelineAPI {
  update(timeline: Record<string, unknown>): Promise<IPCResponse<{ success: boolean }>>;
  generate(subprojectId: string): Promise<IPCResponse<{ success: boolean }>>;
}

const timelineAPI: TimelineAPI = {
  update: (timeline) => ipcRenderer.invoke(IPC_CHANNELS.TIMELINE.UPDATE, timeline),
  generate: (subprojectId) => ipcRenderer.invoke(IPC_CHANNELS.TIMELINE.GENERATE, { subprojectId }),
};

interface PreviewAPI {
  play(): Promise<IPCResponse<void>>;
  pause(): Promise<IPCResponse<void>>;
  seek(frame: number): Promise<IPCResponse<void>>;
}

const previewAPI: PreviewAPI = {
  play: () => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW.PLAY),
  pause: () => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW.PAUSE),
  seek: (frame) => ipcRenderer.invoke(IPC_CHANNELS.PREVIEW.SEEK, { frame }),
};

// ============================================
// 通用 API
// ============================================
interface ElectronAPI {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, callback: (...args: unknown[]) => void) => (() => void);
  project: ProjectAPI;
  subproject: SubprojectAPI;
  timeline: TimelineAPI;
  preview: PreviewAPI;
}

const electronAPI: ElectronAPI = {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void =>
      callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  project: projectAPI,
  subproject: subprojectAPI,
  timeline: timelineAPI,
  preview: previewAPI,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type { ElectronAPI, ProjectAPI, SubprojectAPI, TimelineAPI, PreviewAPI };
