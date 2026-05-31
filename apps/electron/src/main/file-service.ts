import { createHash } from 'node:crypto';
import {
  access,
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, normalize, resolve, isAbsolute } from 'node:path';
import {
  createFileDeleteFailedError,
  createFileNotFoundError,
  createFileReadFailedError,
  createFileWriteFailedError,
  createPathTraversalError,
  createPermissionDeniedError,
} from './errors';

export class FileService {
  /**
   * 验证路径是否在允许的基准目录内，防止目录遍历攻击
   */
  validatePath(inputPath: string, baseDir: string): string {
    if (!isAbsolute(inputPath)) {
      inputPath = resolve(baseDir, inputPath);
    }

    const normalizedPath = normalize(inputPath);
    const normalizedBase = normalize(baseDir);

    if (!normalizedPath.startsWith(normalizedBase)) {
      throw createPathTraversalError(inputPath);
    }

    return normalizedPath;
  }

  /**
   * 检查路径是否存在
   */
  async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 读取文本文件
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw createFileNotFoundError(filePath);
      }
      if (err.code === 'EACCES') {
        throw createPermissionDeniedError(filePath);
      }
      throw createFileReadFailedError(filePath, err.message);
    }
  }

  /**
   * 读取二进制文件
   */
  async readFileBuffer(filePath: string): Promise<Buffer> {
    try {
      return await readFile(filePath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw createFileNotFoundError(filePath);
      }
      throw createFileReadFailedError(filePath, err.message);
    }
  }

  /**
   * 写入文本文件（非原子写入，简单场景使用）
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await writeFile(filePath, content, 'utf-8');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EACCES') {
        throw createPermissionDeniedError(filePath);
      }
      throw createFileWriteFailedError(filePath, err.message);
    }
  }

  /**
   * 复制文件
   */
  async copyFile(src: string, dest: string): Promise<void> {
    try {
      await mkdir(dirname(dest), { recursive: true });
      await copyFile(src, dest);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw createFileWriteFailedError(dest, `复制失败: ${err.message}`);
    }
  }

  /**
   * 删除文件或目录
   */
  async delete(filePath: string): Promise<void> {
    try {
      await rm(filePath, { recursive: true, force: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw createFileDeleteFailedError(filePath, err.message);
    }
  }

  /**
   * 确保目录存在（递归创建）
   */
  async ensureDir(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'EACCES') {
        throw createPermissionDeniedError(dirPath);
      }
      throw createFileWriteFailedError(dirPath, `创建目录失败: ${err.message}`);
    }
  }

  /**
   * 读取并解析 JSON 文件
   */
  async readJson<T>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    try {
      return JSON.parse(content) as T;
    } catch (error) {
      throw createFileReadFailedError(filePath, `JSON 解析失败: ${(error as Error).message}`);
    }
  }

  /**
   * 将对象写入 JSON 文件
   */
  async writeJson<T>(filePath: string, data: T): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await this.writeFile(filePath, content);
  }

  /**
   * 计算文件 SHA-256 哈希
   */
  async computeHash(filePath: string, algorithm = 'sha256'): Promise<string> {
    const buffer = await this.readFileBuffer(filePath);
    return createHash(algorithm).update(buffer).digest('hex');
  }

  /**
   * 列出目录内容（仅名称列表）
   */
  async listDir(dirPath: string): Promise<string[]> {
    const { readdir } = await import('node:fs/promises');
    try {
      return await readdir(dirPath);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw createFileNotFoundError(dirPath);
      }
      throw createFileReadFailedError(dirPath, err.message);
    }
  }
}
