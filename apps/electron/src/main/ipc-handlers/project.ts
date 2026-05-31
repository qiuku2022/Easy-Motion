/**
 * IPC 项目处理器
 * 处理所有 main:project:* 和 main:subproject:* 频道
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@easymotion/shared';
import type { ProjectService } from '../project-service';
import { wrapHandler } from './types';

interface HandlerDeps {
  projectService: ProjectService;
}

export function registerProjectHandlers(deps: HandlerDeps): void {
  // 项目 CRUD
  ipcMain.handle(
    IPC_CHANNELS.PROJECT.CREATE,
    wrapHandler(async (_event, payload) => {
      return await deps.projectService.createProject(payload);
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.OPEN,
    wrapHandler(async (_event, payload: { projectPath: string }) => {
      return await deps.projectService.openProject(payload.projectPath);
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.SAVE,
    wrapHandler(async (_event, payload) => {
      await deps.projectService.saveProject(payload);
      return { saved: true };
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.CLOSE,
    wrapHandler(async () => {
      await deps.projectService.closeProject();
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.LIST_RECENT,
    wrapHandler(async () => {
      return await deps.projectService.listRecentProjects();
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.DELETE,
    wrapHandler(async (_event, payload: { projectId: string; keepOutput?: boolean }) => {
      await deps.projectService.deleteProject(payload.projectId, {
        keepOutput: payload.keepOutput,
      });
      return { deleted: true };
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT.RENAME,
    wrapHandler(async (_event, payload: { projectId: string; newName: string }) => {
      await deps.projectService.renameProject(payload);
      return { renamed: true };
    })
  );

  // 子项目 CRUD
  ipcMain.handle(
    IPC_CHANNELS.SUBPROJECT.CREATE,
    wrapHandler(async (_event, payload: { projectId: string; name: string }) => {
      return await deps.projectService.createSubproject(payload);
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.SUBPROJECT.DELETE,
    wrapHandler(async (_event, payload: { projectId: string; subprojectId: string }) => {
      await deps.projectService.deleteSubproject(payload);
      return { deleted: true };
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.SUBPROJECT.RENAME,
    wrapHandler(async (_event, payload: { projectId: string; subprojectId: string; newName: string }) => {
      await deps.projectService.renameSubproject(payload);
    })
  );
}
