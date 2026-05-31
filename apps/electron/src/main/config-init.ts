import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';
import {
  APP_CONFIG_DIR,
  RECENT_PROJECTS_FILE,
  SETTINGS_FILE,
  LOGS_DIR,
} from '@easymotion/shared';

const CONFIG_PATH = join(homedir(), APP_CONFIG_DIR);

/**
 * 初始化 EasyMotion 配置目录
 * 在 ~/.easymotion/ 下创建必要的文件和目录
 * 幂等操作：如果文件已存在，不会覆盖
 */
export async function initializeConfigDir(): Promise<void> {
  await mkdir(CONFIG_PATH, { recursive: true });
  await mkdir(join(CONFIG_PATH, LOGS_DIR), { recursive: true });

  const recentProjectsPath = join(CONFIG_PATH, RECENT_PROJECTS_FILE);
  const settingsPath = join(CONFIG_PATH, SETTINGS_FILE);

  // 仅在文件不存在时创建默认值
  await createIfNotExists(recentProjectsPath, '[]');
  await createIfNotExists(
    settingsPath,
    JSON.stringify(
      {
        theme: 'dark',
        language: 'zh-CN',
        autoSave: true,
        autoSaveIntervalSeconds: 30,
        defaultOutputFormat: 'mp4',
        defaultOutputQuality: 'high',
        leftPanelWidth: 240,
        rightPanelWidth: 280,
        bottomPanelHeight: 180,
      },
      null,
      2
    )
  );
}

async function createIfNotExists(filePath: string, content: string): Promise<void> {
  try {
    await access(filePath);
    // 文件已存在，不做任何操作
  } catch {
    // 文件不存在，创建它
    await writeFile(filePath, content, 'utf-8');
  }
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
