import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileService } from '../file-service';
import { mkdtemp, writeFile, access, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('FileService', () => {
  let fileService: FileService;
  let tempDir: string;

  beforeEach(async () => {
    fileService = new FileService();
    tempDir = await mkdtemp(join(tmpdir(), 'easymotion-test-'));
  });

  afterEach(async () => {
    await rmdir(tempDir, { recursive: true });
  });

  describe('validatePath', () => {
    it('应该允许基准目录内的路径', () => {
      const result = fileService.validatePath('/home/user/projects/test', '/home/user/projects');
      expect(result).toBe('/home/user/projects/test');
    });

    it('应该拒绝目录遍历路径', () => {
      expect(() => {
        fileService.validatePath('/home/user/projects/../../etc/passwd', '/home/user/projects');
      }).toThrow('路径遍历');
    });

    it('应该解析相对路径', () => {
      const result = fileService.validatePath('sub/file.txt', '/home/user/projects');
      expect(result).toBe('/home/user/projects/sub/file.txt');
    });
  });

  describe('pathExists', () => {
    it('应该返回 true 当文件存在', async () => {
      const filePath = join(tempDir, 'test.txt');
      await writeFile(filePath, 'hello');
      expect(await fileService.pathExists(filePath)).toBe(true);
    });

    it('应该返回 false 当文件不存在', async () => {
      expect(await fileService.pathExists(join(tempDir, 'nonexistent.txt'))).toBe(false);
    });
  });

  describe('readFile / writeFile', () => {
    it('应该能写入并读取文件', async () => {
      const filePath = join(tempDir, 'test.txt');
      await fileService.writeFile(filePath, 'hello world');
      const content = await fileService.readFile(filePath);
      expect(content).toBe('hello world');
    });

    it('读取不存在的文件应该抛出错误', async () => {
      await expect(fileService.readFile(join(tempDir, 'nonexistent.txt'))).rejects.toThrow('文件不存在');
    });
  });

  describe('ensureDir', () => {
    it('应该创建嵌套目录', async () => {
      const dirPath = join(tempDir, 'a', 'b', 'c');
      await fileService.ensureDir(dirPath);
      await expect(access(dirPath)).resolves.toBeUndefined();
    });
  });

  describe('readJson / writeJson', () => {
    it('应该能写入并读取 JSON', async () => {
      const filePath = join(tempDir, 'data.json');
      const data = { name: 'test', value: 42 };
      await fileService.writeJson(filePath, data);
      const result = await fileService.readJson<typeof data>(filePath);
      expect(result).toEqual(data);
    });
  });

  describe('computeHash', () => {
    it('应该计算文件 SHA-256 哈希', async () => {
      const filePath = join(tempDir, 'hash-test.txt');
      await writeFile(filePath, 'hello');
      const hash = await fileService.computeHash(filePath);
      expect(hash).toHaveLength(64); // SHA-256 hex = 64 chars
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
