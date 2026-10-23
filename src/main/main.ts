import { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } from 'electron';
import path from 'path';
import { QuotaEngine } from './quota/quotaEngine';
import { AutonomousScheduler } from './orchestrator/scheduler';
import { InterviewEngine } from './orchestrator/interviewEngine';
import { SessionWatcher } from './quota/sessionWatcher';
import { ProjectStore } from './storage/projectStore';
import { CycleAiSettings, SpecLockData, TaskItem, ProviderId, ExecutionLogEvent } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let powerBlockerId: number | null = null;
let sessionWatcher: SessionWatcher | null = null;

const defaultSettings: CycleAiSettings = {
  prePauseThreshold: 90,
  autoResumeEnabled: true,
  enableMultiToolHandoff: true,
  preferFastModelsForBoilerplate: true,
  manualOverrides: {
    claude: {},
    codex: {},
    antigravity: {},
  },
};

const persistentState = ProjectStore.loadState(defaultSettings);
const initialSettings = persistentState.settings;

const quotaEngine = new QuotaEngine(initialSettings);
const scheduler = new AutonomousScheduler(quotaEngine, initialSettings);

const executionLogs: ExecutionLogEvent[] = [];
let activeProject: SpecLockData | null = null;
let tasks: TaskItem[] = [];
let isHibernating = false;
let nextAutoResumeAt: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0B0F17',
    title: 'CycleAI — AI Project Orchestrator (Windows Desktop)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  // Keep Windows awake during active or scheduled operations
  try {
    powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
  } catch {
    // ignore
  }

  // Load dev server or production dist
  const devUrl = 'http://localhost:5173';
  if (process.env.WAIT_ON_WEB) {
    mainWindow.loadURL(devUrl).catch(() => {
      // If dev server takes a second, retry
      setTimeout(() => mainWindow?.loadURL(devUrl), 1500);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html')).catch(() => {
      mainWindow?.loadURL(devUrl);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
      powerSaveBlocker.stop(powerBlockerId);
    }
  });
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cycleai:state-update', {
      providers: quotaEngine.getState(),
      activeProject,
      tasks,
      currentRunningTaskId: tasks.find(t => t.status === 'IN_PROGRESS')?.id || null,
      isRunning: (scheduler as any).isRunning,
      isHibernating,
      nextAutoResumeAt,
      executionLogs: executionLogs.slice(-100),
      settings: (scheduler as any).settings,
    });
  }
}

// Scheduler events
scheduler.on('log', (logEvent: ExecutionLogEvent) => {
  executionLogs.push(logEvent);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('cycleai:log', logEvent);
  }
  broadcastState();
});

scheduler.on('task-updated', (updatedTask: TaskItem) => {
  const idx = tasks.findIndex(t => t.id === updatedTask.id);
  if (idx !== -1) {
    tasks[idx] = updatedTask;
  }
  broadcastState();
});

scheduler.on('hibernation-started', (wakeTimeIso: string) => {
  isHibernating = true;
  nextAutoResumeAt = wakeTimeIso;
  broadcastState();
});

scheduler.on('hibernation-ended', () => {
  isHibernating = false;
  nextAutoResumeAt = null;
  broadcastState();
});

scheduler.on('completed', () => {
  broadcastState();
});

// IPC handlers
ipcMain.handle('cycleai:get-state', async () => {
  await quotaEngine.refreshAll();
  return {
    providers: quotaEngine.getState(),
    activeProject,
    tasks,
    currentRunningTaskId: tasks.find(t => t.status === 'IN_PROGRESS')?.id || null,
    isRunning: (scheduler as any).isRunning,
    isHibernating,
    nextAutoResumeAt,
    executionLogs: executionLogs.slice(-100),
    settings: (scheduler as any).settings,
  };
});

ipcMain.handle('cycleai:refresh-quota', async () => {
  await quotaEngine.refreshAll();
  broadcastState();
  return quotaEngine.getState();
});

ipcMain.handle('cycleai:select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Seleziona la cartella del progetto',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('cycleai:scan-workspace', async (_event, folder: string, goal: string) => {
  return InterviewEngine.scanWorkspaceAndGenerateQuestions(folder, goal);
});

ipcMain.handle('cycleai:lock-spec', async (_event, spec: SpecLockData) => {
  const compiled = InterviewEngine.compileSpecLock(spec);
  activeProject = compiled.specLock;
  tasks = compiled.tasks;
  ProjectStore.recordProject(spec.targetFolder, activeProject, tasks, (scheduler as any).settings);
  broadcastState();
  return compiled;
});

ipcMain.handle('cycleai:start-execution', async (_event, folder: string, taskList: TaskItem[]) => {
  tasks = taskList;
  if (activeProject) {
    ProjectStore.recordProject(folder, activeProject, tasks, (scheduler as any).settings);
  }
  scheduler.startExecution(folder, tasks);
  broadcastState();
  return true;
});

ipcMain.handle('cycleai:pause-execution', async () => {
  scheduler.pauseExecution();
  broadcastState();
  return true;
});

ipcMain.handle('cycleai:update-settings', async (_event, newSettings: CycleAiSettings) => {
  quotaEngine.updateSettings(newSettings);
  scheduler.updateSettings(newSettings);
  ProjectStore.saveState({
    version: '0.2.0-alpha',
    settings: newSettings,
    projectsHistory: ProjectStore.loadState(newSettings).projectsHistory,
    lastActiveProjectFolder: activeProject?.targetFolder,
  });
  broadcastState();
  return true;
});

ipcMain.handle('cycleai:reset-slot', async (_event, providerId: ProviderId) => {
  quotaEngine.resetSlot(providerId);
  broadcastState();
  return quotaEngine.getState();
});

ipcMain.handle('cycleai:get-history', async () => {
  const loaded = ProjectStore.loadState((scheduler as any).settings);
  return loaded.projectsHistory;
});

app.whenReady().then(async () => {
  await quotaEngine.refreshAll();

  // Start live background watcher for sessions
  sessionWatcher = new SessionWatcher(async () => {
    await quotaEngine.refreshAll();
    broadcastState();
  });
  sessionWatcher.startWatching();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (sessionWatcher) {
    sessionWatcher.stopWatching();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
