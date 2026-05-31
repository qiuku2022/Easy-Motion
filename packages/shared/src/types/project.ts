export interface ProjectConfig {
  name: string;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
}

export interface ProjectSettings {
  autoSave: boolean;
  autoSaveIntervalSeconds: number;
  defaultOutputFormat: 'mp4' | 'webm';
  defaultOutputQuality: 'high' | 'medium' | 'low';
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project extends ProjectSummary {
  config: ProjectConfig;
  settings: ProjectSettings;
  subprojects: SubprojectSummary[];
}

export interface SubprojectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface SubprojectFile {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  remotionPath: string;
  assetsPath: string;
  outputPath: string;
  dataPath: string;
  thumbnailsPath: string;
}

export interface ProjectFile {
  version: string;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: ProjectConfig;
  settings: ProjectSettings;
  subprojects: SubprojectSummary[];
}

export interface CreateProjectParams {
  name: string;
  width?: number;
  height?: number;
  fps?: number;
  durationInSeconds?: number;
  template?: string;
}

export interface RenameProjectParams {
  projectId: string;
  newName: string;
}

export interface CreateSubprojectParams {
  projectId: string;
  name: string;
  template?: string;
}

export interface DeleteSubprojectParams {
  projectId: string;
  subprojectId: string;
}

export interface RenameSubprojectParams {
  projectId: string;
  subprojectId: string;
  newName: string;
}

export interface RecentProjectEntry {
  id: string;
  name: string;
  path: string;
  lastOpenedAt: number;
}
