import { describe, it, expect } from 'vitest';
import { ProjectStore } from '../src/main/storage/projectStore';
import { CycleAiSettings, SpecLockData, TaskItem } from '../src/shared/types';
import os from 'os';
import path from 'path';

describe('ProjectStore (Persistence)', () => {
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

  it('should load initial state with valid version and defaults', () => {
    const state = ProjectStore.loadState(defaultSettings);
    expect(state.version).toBe('0.2.0-alpha');
    expect(state.settings.prePauseThreshold).toBe(90);
    expect(Array.isArray(state.projectsHistory)).toBe(true);
  });

  it('should record and persist a project', () => {
    const testFolder = path.join(os.tmpdir(), 'cycleai-store-test');
    const spec: SpecLockData = {
      projectName: 'TestProjectAlpha',
      targetFolder: testFolder,
      goalPrompt: 'Alpha Verification Goal',
      questions: [],
      isLocked: true,
      lockedAt: new Date().toISOString(),
    };

    const tasks: TaskItem[] = [
      {
        id: 'TASK-001',
        order: 1,
        title: 'Task Alpha',
        description: 'Testing',
        complexity: 'FAST_BOILERPLATE',
        status: 'COMPLETED',
        logs: [],
      },
    ];

    ProjectStore.recordProject(testFolder, spec, tasks, defaultSettings);
    const updated = ProjectStore.loadState(defaultSettings);
    const found = updated.projectsHistory.find(p => p.folder === testFolder);

    expect(found).toBeDefined();
    expect(found?.name).toBe('TestProjectAlpha');
    expect(found?.completedCount).toBe(1);
  });
});
