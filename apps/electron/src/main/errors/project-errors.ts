/**
 * 项目错误码 E2100-E2199
 */
export const ProjectErrorCodes = {
  PROJECT_NOT_FOUND: 'E2100',
  PROJECT_ALREADY_EXISTS: 'E2101',
  PROJECT_CREATE_FAILED: 'E2102',
  PROJECT_OPEN_FAILED: 'E2103',
  PROJECT_SAVE_FAILED: 'E2104',
  PROJECT_DELETE_FAILED: 'E2105',
  PROJECT_RENAME_FAILED: 'E2106',
  INVALID_PROJECT_CONFIG: 'E2107',
  PROJECT_FILE_CORRUPTED: 'E2108',
  PROJECT_IN_USE: 'E2109',
} as const;

import { AppError } from './app-error';

export function createProjectNotFoundError(projectId: string): AppError {
  return new AppError(ProjectErrorCodes.PROJECT_NOT_FOUND, `项目不存在: ${projectId}`, {
    projectId,
  });
}

export function createProjectAlreadyExistsError(name: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_ALREADY_EXISTS,
    `项目已存在: ${name}`,
    { name }
  );
}

export function createProjectCreateFailedError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(ProjectErrorCodes.PROJECT_CREATE_FAILED, `创建项目失败: ${message}`, details);
}

export function createProjectOpenFailedError(path: string, reason?: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_OPEN_FAILED,
    `打开项目失败: ${path}${reason ? ` (${reason})` : ''}`,
    { path, reason }
  );
}

export function createProjectSaveFailedError(projectId: string, reason?: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_SAVE_FAILED,
    `保存项目失败: ${projectId}${reason ? ` (${reason})` : ''}`,
    { projectId, reason }
  );
}

export function createProjectDeleteFailedError(projectId: string, reason?: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_DELETE_FAILED,
    `删除项目失败: ${projectId}${reason ? ` (${reason})` : ''}`,
    { projectId, reason }
  );
}

export function createProjectRenameFailedError(projectId: string, reason?: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_RENAME_FAILED,
    `重命名项目失败: ${projectId}${reason ? ` (${reason})` : ''}`,
    { projectId, reason }
  );
}

export function createInvalidProjectConfigError(reason: string): AppError {
  return new AppError(ProjectErrorCodes.INVALID_PROJECT_CONFIG, `项目配置无效: ${reason}`);
}

export function createProjectFileCorruptedError(path: string): AppError {
  return new AppError(
    ProjectErrorCodes.PROJECT_FILE_CORRUPTED,
    `项目文件已损坏: ${path}`,
    { path }
  );
}
