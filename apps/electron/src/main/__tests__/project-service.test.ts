import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ProjectService } from '../project-service';
import { TemplateService } from '../template-service';
import { FileService } from '../file-service';
import { WriteQueue } from '../write-queue';
import type { CreateProjectParams } from '@easymotion/shared';

describe('ProjectService', () => {
  let service: ProjectService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'easymotion-project-test-'));

    const fileService = new FileService();
    const writeQueue = new WriteQueue();
    const templateService = new TemplateService(join(tempDir, 'templates'));
    service = new ProjectService({ fileService, writeQueue, templateService });

    (service as unknown as { projectsDir: string }).projectsDir = tempDir;
    (service as unknown as { configDir: string }).configDir = tempDir;
  });

  afterEach(async () => {
    await rmdir(tempDir, { recursive: true });
  });

  describe('createProject', () => {
    it('不应该创建同名项目', async () => {
      const params: CreateProjectParams = { name: '同名项目' };
      await new FileService().ensureDir(join(tempDir, '同名项目'));
      await expect(service.createProject(params)).rejects.toThrow('已存在');
    });
  });

  describe('openProject / saveProject', () => {
    it('应该能打开已保存的项目', async () => {
      const projectPath = join(tempDir, '打开测试');
      const fileService = new FileService();
      await fileService.ensureDir(projectPath);
      await fileService.writeJson(join(projectPath, 'project.json'), {
        version: '1.0.0',
        id: 'test-id',
        name: '打开测试',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: { name: '打开测试', width: 1920, height: 1080, fps: 30, durationInSeconds: 10 },
        settings: { autoSave: true, autoSaveIntervalSeconds: 30, defaultOutputFormat: 'mp4', defaultOutputQuality: 'high' },
        subprojects: [],
      });

      const opened = await service.openProject(projectPath);
      expect(opened.id).toBe('test-id');
      expect(opened.name).toBe('打开测试');
    });

    it('保存项目应该更新 project.json', async () => {
      const projectPath = join(tempDir, '保存测试');
      const fileService = new FileService();
      await fileService.ensureDir(projectPath);
      const project = {
        version: '1.0.0' as const,
        id: 'save-test-id',
        name: '保存测试',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        path: projectPath,
        config: { name: '保存测试', width: 1920, height: 1080, fps: 30, durationInSeconds: 10 },
        settings: { autoSave: true, autoSaveIntervalSeconds: 30, defaultOutputFormat: 'mp4' as const, defaultOutputQuality: 'high' as const },
        subprojects: [],
      };
      await fileService.writeJson(join(projectPath, 'project.json'), project);

      await service.openProject(projectPath);
      const current = service.getCurrentProject();
      expect(current).toBeDefined();

      current!.name = '已修改';
      await service.saveProject(current!);

      await service.closeProject();
      const reopened = await service.openProject(projectPath);
      expect(reopened.name).toBe('已修改');
    });
  });

  describe('deleteProject', () => {
    it('应该能删除项目', async () => {
      const projectPath = join(tempDir, '删除测试');
      const fileService = new FileService();
      await fileService.ensureDir(projectPath);
      await fileService.writeJson(join(projectPath, 'project.json'), {
        version: '1.0.0',
        id: 'delete-test-id',
        name: '删除测试',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        config: { name: '删除测试', width: 1920, height: 1080, fps: 30, durationInSeconds: 10 },
        settings: { autoSave: true, autoSaveIntervalSeconds: 30, defaultOutputFormat: 'mp4', defaultOutputQuality: 'high' },
        subprojects: [],
      });

      await service.openProject(projectPath);
      await service.closeProject();

      await service.deleteProject('delete-test-id');

      const recent = await service.listRecentProjects();
      expect(recent.find((p) => p.id === 'delete-test-id')).toBeUndefined();
    });
  });
});
