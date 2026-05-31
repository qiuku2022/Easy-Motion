import { homedir } from 'node:os';
import { join } from 'node:path';
import type {
  CreateProjectParams,
  CreateSubprojectParams,
  DeleteSubprojectParams,
  Project,
  ProjectFile,
  RecentProjectEntry,
  RenameProjectParams,
  RenameSubprojectParams,
  SubprojectFile,
  SubprojectSummary,
} from '@easymotion/shared';
import {
  APP_CONFIG_DIR,
  PROJECT_FILE_NAME,
  RECENT_PROJECTS_FILE,
} from '@easymotion/shared';
import { FileService } from './file-service';
import { WriteQueue } from './write-queue';
import { TemplateService } from './template-service';
import { writeFileAtomic } from './atomic-write';
import {
  createProjectNotFoundError,
  createProjectAlreadyExistsError,
  createProjectCreateFailedError,
  createProjectOpenFailedError,
  createProjectDeleteFailedError,
  createProjectFileCorruptedError,
  createProjectRenameFailedError,
  createInvalidProjectConfigError,
} from './errors';

export class ProjectService {
  private fileService: FileService;
  private writeQueue: WriteQueue;
  private templateService: TemplateService;
  private projectsDir: string;
  private configDir: string;
  private currentProject: Project | null = null;

  constructor(deps?: { fileService?: FileService; writeQueue?: WriteQueue; templateService?: TemplateService }) {
    this.fileService = deps?.fileService ?? new FileService();
    this.writeQueue = deps?.writeQueue ?? new WriteQueue();
    this.templateService = deps?.templateService ?? new TemplateService();
    this.projectsDir = join(homedir(), 'EasyMotion');
    this.configDir = join(homedir(), APP_CONFIG_DIR);
  }

  // ============================================
  // 项目 CRUD
  // ============================================

  async createProject(params: CreateProjectParams): Promise<Project> {
    const projectDir = join(this.projectsDir, params.name);

    if (await this.fileService.pathExists(projectDir)) {
      throw createProjectAlreadyExistsError(params.name);
    }

    try {
      await this.fileService.ensureDir(projectDir);
      const { projectFile, subprojectFile } = await this.templateService.createProjectFromTemplate(
        projectDir,
        params
      );

      // 验证生成的文件
      const project = this.projectFileToProject(projectFile, projectDir);
      project.subprojects = [this.subprojectFileToSummary(subprojectFile)];

      // 添加到最近项目列表
      await this.addToRecentProjects({
        id: project.id,
        name: project.name,
        path: projectDir,
        lastOpenedAt: Date.now(),
      });

      this.currentProject = project;
      return project;
    } catch (error) {
      throw createProjectCreateFailedError((error as Error).message);
    }
  }

  async openProject(projectPath: string): Promise<Project> {
    const projectFilePath = join(projectPath, PROJECT_FILE_NAME);

    if (!(await this.fileService.pathExists(projectFilePath))) {
      throw createProjectNotFoundError(projectPath);
    }

    try {
      const projectFile = await this.fileService.readJson<ProjectFile>(projectFilePath);
      const project = this.projectFileToProject(projectFile, projectPath);

      // 验证项目配置
      this.validateProject(project);

      // 更新最近项目列表
      await this.addToRecentProjects({
        id: project.id,
        name: project.name,
        path: projectPath,
        lastOpenedAt: Date.now(),
      });

      this.currentProject = project;
      return project;
    } catch (error) {
      if ((error as Error).message.includes('JSON')) {
        throw createProjectFileCorruptedError(projectFilePath);
      }
      throw createProjectOpenFailedError(projectPath, (error as Error).message);
    }
  }

  async saveProject(project?: Project): Promise<void> {
    const target = project ?? this.currentProject;
    if (!target) {
      throw createProjectNotFoundError('current');
    }

    const projectFile = this.projectToProjectFile(target);
    const filePath = join(target.path, PROJECT_FILE_NAME);

    await this.writeQueue.enqueue(target.id, async () => {
      await writeFileAtomic(filePath, JSON.stringify(projectFile, null, 2), { backup: true });
    });
  }

  async closeProject(): Promise<void> {
    if (this.currentProject) {
      await this.saveProject(this.currentProject);
    }
    this.currentProject = null;
  }

  async deleteProject(projectId: string, options?: { keepOutput?: boolean }): Promise<void> {
    const recentProjects = await this.listRecentProjects();
    const target = recentProjects.find((p) => p.id === projectId);

    if (!target) {
      throw createProjectNotFoundError(projectId);
    }

    try {
      if (options?.keepOutput) {
        // 保留 output 目录，删除其他内容
        const entries = await this.fileService.listDir(target.path);
        for (const entry of entries) {
          if (entry !== 'output') {
            await this.fileService.delete(join(target.path, entry));
          }
        }
      } else {
        await this.fileService.delete(target.path);
      }

      // 从最近项目中移除
      await this.removeFromRecentProjects(projectId);

      if (this.currentProject?.id === projectId) {
        this.currentProject = null;
      }
    } catch (error) {
      throw createProjectDeleteFailedError(projectId, (error as Error).message);
    }
  }

  async renameProject(params: RenameProjectParams): Promise<void> {
    const recentProjects = await this.listRecentProjects();
    const target = recentProjects.find((p) => p.id === params.projectId);

    if (!target) {
      throw createProjectNotFoundError(params.projectId);
    }

    const oldPath = target.path;
    const newPath = join(this.projectsDir, params.newName);

    try {
      // 重命名目录
      await this.fileService.delete(newPath); // 如果目标存在，先删除
      // 使用 Node.js 的 rename 来重命名
      const { rename } = await import('node:fs/promises');
      await rename(oldPath, newPath);

      // 更新 project.json
      const project = await this.openProject(newPath);
      project.name = params.newName;
      project.path = newPath;
      await this.saveProject(project);

      // 更新最近项目列表
      await this.updateRecentProject(params.projectId, { name: params.newName, path: newPath });
    } catch (error) {
      throw createProjectRenameFailedError(params.projectId, (error as Error).message);
    }
  }

  // ============================================
  // 子项目 CRUD
  // ============================================

  async createSubproject(params: CreateSubprojectParams): Promise<SubprojectSummary> {
    if (!this.currentProject || this.currentProject.id !== params.projectId) {
      throw createProjectNotFoundError(params.projectId);
    }

    const subprojectId = crypto.randomUUID();
    const now = Date.now();

    const subproject: SubprojectSummary = {
      id: subprojectId,
      name: params.name,
      createdAt: now,
      updatedAt: now,
    };

    this.currentProject.subprojects.push(subproject);
    await this.saveProject(this.currentProject);

    return subproject;
  }

  async renameSubproject(params: RenameSubprojectParams): Promise<void> {
    if (!this.currentProject || this.currentProject.id !== params.projectId) {
      throw createProjectNotFoundError(params.projectId);
    }

    const subproject = this.currentProject.subprojects.find((s) => s.id === params.subprojectId);
    if (!subproject) {
      throw createProjectNotFoundError(params.subprojectId);
    }

    subproject.name = params.newName;
    subproject.updatedAt = Date.now();

    await this.saveProject(this.currentProject);
  }

  async deleteSubproject(params: DeleteSubprojectParams): Promise<void> {
    if (!this.currentProject || this.currentProject.id !== params.projectId) {
      throw createProjectNotFoundError(params.projectId);
    }

    const index = this.currentProject.subprojects.findIndex((s) => s.id === params.subprojectId);
    if (index === -1) {
      throw createProjectNotFoundError(params.subprojectId);
    }

    this.currentProject.subprojects.splice(index, 1);
    await this.saveProject(this.currentProject);
  }

  // ============================================
  // 最近项目列表
  // ============================================

  async listRecentProjects(): Promise<RecentProjectEntry[]> {
    const recentPath = join(this.configDir, RECENT_PROJECTS_FILE);

    if (!(await this.fileService.pathExists(recentPath))) {
      return [];
    }

    try {
      const content = await this.fileService.readFile(recentPath);
      return JSON.parse(content) as RecentProjectEntry[];
    } catch {
      return [];
    }
  }

  private async addToRecentProjects(entry: RecentProjectEntry): Promise<void> {
    const recent = await this.listRecentProjects();

    // 移除重复项
    const filtered = recent.filter((p) => p.id !== entry.id);
    // 添加到开头
    filtered.unshift(entry);
    // 限制最近项目数量（最多 20 个）
    const limited = filtered.slice(0, 20);

    const recentPath = join(this.configDir, RECENT_PROJECTS_FILE);
    await writeFileAtomic(recentPath, JSON.stringify(limited, null, 2));
  }

  private async removeFromRecentProjects(projectId: string): Promise<void> {
    const recent = await this.listRecentProjects();
    const filtered = recent.filter((p) => p.id !== projectId);

    const recentPath = join(this.configDir, RECENT_PROJECTS_FILE);
    await writeFileAtomic(recentPath, JSON.stringify(filtered, null, 2));
  }

  private async updateRecentProject(
    projectId: string,
    updates: Partial<RecentProjectEntry>
  ): Promise<void> {
    const recent = await this.listRecentProjects();
    const project = recent.find((p) => p.id === projectId);

    if (project) {
      Object.assign(project, updates);
      const recentPath = join(this.configDir, RECENT_PROJECTS_FILE);
      await writeFileAtomic(recentPath, JSON.stringify(recent, null, 2));
    }
  }

  // ============================================
  // 辅助方法
  // ============================================

  private projectFileToProject(file: ProjectFile, path: string): Project {
    return {
      ...file,
      path,
    };
  }

  private projectToProjectFile(project: Project): ProjectFile {
    const { path: _path, ...file } = project;
    return {
      ...file,
      version: '1.0.0',
      updatedAt: Date.now(),
    };
  }

  private subprojectFileToSummary(file: SubprojectFile): SubprojectSummary {
    return {
      id: file.id,
      name: file.name,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  private validateProject(project: Project): void {
    if (!project.id) {
      throw createInvalidProjectConfigError('项目 ID 不能为空');
    }
    if (!project.name) {
      throw createInvalidProjectConfigError('项目名称不能为空');
    }
    if (!project.config) {
      throw createInvalidProjectConfigError('项目配置不能为空');
    }
  }

  getCurrentProject(): Project | null {
    return this.currentProject;
  }
}
