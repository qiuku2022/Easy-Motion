import { writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createFileWriteFailedError,
  createBackupRestoreFailedError,
} from './errors';

/**
 * 原子文件写入
 * 1. 写入临时文件
 * 2. 如需备份，复制原文件到 .bak
 * 3. 重命名临时文件为目标文件
 * 4. 出错时从备份恢复
 */
export async function writeFileAtomic(
  filePath: string,
  content: string,
  options: { backup?: boolean } = {}
): Promise<void> {
  const tempPath = join(dirname(filePath), `.tmp-${randomUUID()}`);
  const backupPath = `${filePath}.bak`;
  let backupCreated = false;

  try {
    // 1. 写入临时文件
    await writeFile(tempPath, content, 'utf-8');

    // 2. 如需备份且原文件存在，创建备份
    if (options.backup) {
      try {
        await writeFile(backupPath, await import('node:fs/promises').then(m => m.readFile(filePath, 'utf-8')));
        backupCreated = true;
      } catch {
        // 原文件不存在，无需备份
      }
    }

    // 3. 原子重命名
    await rename(tempPath, filePath);
  } catch (error) {
    // 清理临时文件
    try {
      await unlink(tempPath);
    } catch {
      // 忽略清理错误
    }

    // 4. 从备份恢复
    if (backupCreated) {
      try {
        await rename(backupPath, filePath);
      } catch (restoreError) {
        throw createBackupRestoreFailedError(
          filePath,
          `写入失败: ${(error as Error).message}; 恢复备份失败: ${(restoreError as Error).message}`
        );
      }
    }

    throw createFileWriteFailedError(filePath, (error as Error).message);
  }

  // 成功后删除备份（可选，保留备份用于恢复）
  // if (backupCreated) { await unlink(backupPath).catch(() => {}); }
}
