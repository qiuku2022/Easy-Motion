/**
 * 文件错误码 E2200-E2299
 */
export const FileErrorCodes = {
  FILE_NOT_FOUND: 'E2200',
  FILE_ALREADY_EXISTS: 'E2201',
  FILE_READ_FAILED: 'E2202',
  FILE_WRITE_FAILED: 'E2203',
  FILE_DELETE_FAILED: 'E2204',
  FILE_COPY_FAILED: 'E2205',
  FILE_MOVE_FAILED: 'E2206',
  PATH_TRAVERSAL_DETECTED: 'E2207',
  DIRECTORY_NOT_FOUND: 'E2208',
  DIRECTORY_CREATE_FAILED: 'E2209',
  PERMISSION_DENIED: 'E2210',
  DISK_FULL: 'E2211',
  BACKUP_RESTORE_FAILED: 'E2212',
} as const;

import { AppError } from './app-error';

export function createFileNotFoundError(filePath: string): AppError {
  return new AppError(FileErrorCodes.FILE_NOT_FOUND, `文件不存在: ${filePath}`, { filePath });
}

export function createFileAlreadyExistsError(filePath: string): AppError {
  return new AppError(FileErrorCodes.FILE_ALREADY_EXISTS, `文件已存在: ${filePath}`, { filePath });
}

export function createFileReadFailedError(filePath: string, reason?: string): AppError {
  return new AppError(
    FileErrorCodes.FILE_READ_FAILED,
    `读取文件失败: ${filePath}${reason ? ` (${reason})` : ''}`,
    { filePath, reason }
  );
}

export function createFileWriteFailedError(filePath: string, reason?: string): AppError {
  return new AppError(
    FileErrorCodes.FILE_WRITE_FAILED,
    `写入文件失败: ${filePath}${reason ? ` (${reason})` : ''}`,
    { filePath, reason }
  );
}

export function createFileDeleteFailedError(filePath: string, reason?: string): AppError {
  return new AppError(
    FileErrorCodes.FILE_DELETE_FAILED,
    `删除文件失败: ${filePath}${reason ? ` (${reason})` : ''}`,
    { filePath, reason }
  );
}

export function createPathTraversalError(inputPath: string): AppError {
  return new AppError(
    FileErrorCodes.PATH_TRAVERSAL_DETECTED,
    `检测到路径遍历攻击: ${inputPath}`,
    { inputPath }
  );
}

export function createPermissionDeniedError(filePath: string): AppError {
  return new AppError(FileErrorCodes.PERMISSION_DENIED, `权限不足: ${filePath}`, { filePath });
}

export function createDiskFullError(filePath: string): AppError {
  return new AppError(FileErrorCodes.DISK_FULL, `磁盘空间不足: ${filePath}`, { filePath });
}

export function createBackupRestoreFailedError(filePath: string, message: string): AppError {
  return new AppError(FileErrorCodes.BACKUP_RESTORE_FAILED, `备份恢复失败: ${filePath} - ${message}`, { filePath });
}
