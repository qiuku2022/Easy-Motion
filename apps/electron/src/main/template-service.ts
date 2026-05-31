import { join } from 'node:path';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import type { CreateProjectParams, ProjectFile, SubprojectFile } from '@easymotion/shared';

function getDefaultTemplateRoot(): string {
  return join(process.cwd(), 'resources/templates/default-project');
}

interface TemplateContext {
  projectId: string;
  projectName: string;
  subprojectId: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  durationInFrames: number;
}

export class TemplateService {
  private templateRoot: string;

  constructor(templateRoot?: string) {
    this.templateRoot = templateRoot ?? getDefaultTemplateRoot();
  }

  /**
   * 从模板创建项目
   */
  async createProjectFromTemplate(
    projectPath: string,
    params: CreateProjectParams
  ): Promise<{ projectFile: ProjectFile; subprojectFile: SubprojectFile }> {
    const now = Date.now();
    const projectId = crypto.randomUUID();
    const subprojectId = crypto.randomUUID();

    const context: TemplateContext = {
      projectId,
      projectName: params.name,
      subprojectId,
      createdAt: now,
      updatedAt: now,
      width: params.width ?? 1920,
      height: params.height ?? 1080,
      fps: params.fps ?? 30,
      durationInSeconds: params.durationInSeconds ?? 10,
      durationInFrames: (params.durationInSeconds ?? 10) * (params.fps ?? 30),
    };

    // 复制模板目录结构
    await this.copyTemplateDir(this.templateRoot, projectPath, context);

    // 读取生成的 project.json 和 subproject.json
    const projectFile = JSON.parse(
      await readFile(join(projectPath, 'project.json'), 'utf-8')
    ) as ProjectFile;

    const subprojectFile = JSON.parse(
      await readFile(
        join(projectPath, 'subprojects', 'default', 'subproject.json'),
        'utf-8'
      )
    ) as SubprojectFile;

    return { projectFile, subprojectFile };
  }

  /**
   * 递归复制模板目录，替换模板变量
   */
  private async copyTemplateDir(
    srcDir: string,
    destDir: string,
    context: TemplateContext
  ): Promise<void> {
    await mkdir(destDir, { recursive: true });

    const entries = await readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(srcDir, entry.name);
      const destPath = join(destDir, entry.name);

      if (entry.isDirectory()) {
        await this.copyTemplateDir(srcPath, destPath, context);
      } else {
        await this.copyTemplateFile(srcPath, destPath, context);
      }
    }
  }

  /**
   * 复制单个模板文件，替换变量
   */
  private async copyTemplateFile(
    srcPath: string,
    destPath: string,
    context: TemplateContext
  ): Promise<void> {
    const content = await readFile(srcPath, 'utf-8');
    const replaced = this.replaceTemplateVars(content, context);
    await writeFile(destPath, replaced, 'utf-8');
  }

  /**
   * 替换模板变量 {{key}}
   */
  private replaceTemplateVars(content: string, context: TemplateContext): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = context[key as keyof TemplateContext];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}
