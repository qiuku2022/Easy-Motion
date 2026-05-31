import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { initializeConfigDir } from './config-init';
import { FileService } from './file-service';
import { WriteQueue } from './write-queue';
import { TemplateService } from './template-service';
import { ProjectService } from './project-service';
import { registerAllIpcHandlers } from './ipc-handlers';
import { TimelineGenerator } from './generator';
import { TemplateEngine } from './generator/template-engine';
import { ComponentRegistry } from './generator/component-registry';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'EasyMotion',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await initializeConfigDir();

    const fileService = new FileService();
    const writeQueue = new WriteQueue();
    const templateService = new TemplateService();
    const projectService = new ProjectService({ fileService, writeQueue, templateService });
    const templateEngine = new TemplateEngine();
    const componentRegistry = new ComponentRegistry();
    const generator = new TimelineGenerator(templateEngine, componentRegistry);

    registerAllIpcHandlers({ projectService, generator });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
