import fs from 'fs';
import path from 'path';
import os from 'os';
import { CycleAiSettings, SpecLockData, TaskItem, ExecutionLogEvent } from '../../shared/types';

export interface PersistentState {
  version: string;
  settings: CycleAiSettings;
  projectsHistory: {
    id: string;
    name: string;
    folder: string;
    goal: string;
    lockedAt: string;
    tasksCount: number;
    completedCount: number;
  }[];
  lastActiveProjectFolder?: string;
}

export class ProjectStore {
  private static getStorePath(): string {
    const home = os.homedir();
    const cycleDir = path.join(home, '.cycleai');
    if (!fs.existsSync(cycleDir)) {
      try {
        fs.mkdirSync(cycleDir, { recursive: true });
      } catch {
        // ignore
      }
    }
    return path.join(cycleDir, 'app_state.json');
  }

  public static loadState(defaultSettings: CycleAiSettings): PersistentState {
    const storePath = this.getStorePath();
    if (fs.existsSync(storePath)) {
      try {
        const raw = fs.readFileSync(storePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          version: '0.2.0-alpha',
          settings: { ...defaultSettings, ...parsed.settings },
          projectsHistory: parsed.projectsHistory || [],
          lastActiveProjectFolder: parsed.lastActiveProjectFolder,
        };
      } catch {
        // fallback to default
      }
    }

    return {
      version: '0.2.0-alpha',
      settings: defaultSettings,
      projectsHistory: [],
    };
  }

  public static saveState(state: PersistentState): void {
    const storePath = this.getStorePath();
    try {
      fs.writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  }

  public static recordProject(
    folder: string,
    spec: SpecLockData,
    tasks: TaskItem[],
    currentSettings: CycleAiSettings
  ): void {
    const state = this.loadState(currentSettings);
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;

    const existingIdx = state.projectsHistory.findIndex(p => p.folder === folder);
    const entry = {
      id: spec.projectName || path.basename(folder),
      name: spec.projectName || path.basename(folder),
      folder,
      goal: spec.goalPrompt,
      lockedAt: spec.lockedAt || new Date().toISOString(),
      tasksCount: tasks.length,
      completedCount: completed,
    };

    if (existingIdx !== -1) {
      state.projectsHistory[existingIdx] = entry;
    } else {
      state.projectsHistory.unshift(entry);
    }

    state.lastActiveProjectFolder = folder;
    this.saveState(state);
  }
}
