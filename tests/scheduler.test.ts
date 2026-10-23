import { describe, it, expect, beforeEach } from 'vitest';
import { AutonomousScheduler } from '../src/main/orchestrator/scheduler';
import { QuotaEngine } from '../src/main/quota/quotaEngine';
import { CycleAiSettings, TaskItem } from '../src/shared/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('AutonomousScheduler (Relay, Model Routing & Pre-Reset Pause)', () => {
  let settings: CycleAiSettings;
  let quotaEngine: QuotaEngine;
  let scheduler: AutonomousScheduler;
  let tmpTarget: string;

  beforeEach(() => {
    tmpTarget = fs.mkdtempSync(path.join(os.tmpdir(), 'cycleai-sched-test-'));
    settings = {
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
    quotaEngine = new QuotaEngine(settings);
    scheduler = new AutonomousScheduler(quotaEngine, settings);
  });

  it('should select fast models for FAST_BOILERPLATE complexity', () => {
    const task: TaskItem = {
      id: 'TASK-TEST-BOILERPLATE',
      order: 1,
      title: 'Generate unit tests',
      description: 'Boilerplate testing',
      complexity: 'FAST_BOILERPLATE',
      status: 'PENDING',
      logs: [],
    };

    const providers = quotaEngine.getState();
    const selection = (scheduler as any).selectBestProvider(task, providers);

    expect(selection).toBeDefined();
    // Fast boilerplate should choose a fast model like haiku, reserve, or flash
    expect([
      'claude-3-5-haiku',
      'gpt-reserve',
      'Gemini 3.8 Flash (High)',
    ]).toContain(selection.model);
  });

  it('should select reasoning models for CRITICAL_ARCH complexity', () => {
    const task: TaskItem = {
      id: 'TASK-TEST-ARCH',
      order: 1,
      title: 'Core architecture design',
      description: 'Complex logic',
      complexity: 'CRITICAL_ARCH',
      status: 'PENDING',
      logs: [],
    };

    const providers = quotaEngine.getState();
    const selection = (scheduler as any).selectBestProvider(task, providers);

    expect(selection).toBeDefined();
    expect([
      'claude-3-opus',
      'gpt-6-astra',
      'Gemini 4 Argon (High)',
    ]).toContain(selection.model);
  });

  it('should trigger Pre-Limit Pause and emit handoff when provider hits prePauseThreshold', async () => {
    // Fill all providers close to threshold so the chosen one will hit >= 90%
    quotaEngine.recordUsage('claude', 48); // 42 + 48 = 90%
    quotaEngine.recordUsage('codex', 61);  // 28 + 61 = 89%
    quotaEngine.recordUsage('antigravity', 71); // 18 + 71 = 89%

    const task: TaskItem = {
      id: 'TASK-LIMIT-TEST',
      order: 1,
      title: 'Heavy refactoring',
      description: 'High quota consumption',
      complexity: 'STANDARD_DEV',
      status: 'PENDING',
      logs: [],
    };

    let pauseEmitted = false;
    let handoffEmitted = false;

    scheduler.on('log', (event) => {
      if (event.type === 'PAUSE') pauseEmitted = true;
      if (event.type === 'HANDOFF') handoffEmitted = true;
    });

    scheduler.startExecution(tmpTarget, [task]);

    // Wait short time for simulation steps
    await new Promise(r => setTimeout(r, 2600));
    scheduler.pauseExecution();

    expect(pauseEmitted).toBe(true);
    // Handoff snapshot file must be created on disk
    expect(fs.existsSync(path.join(tmpTarget, '.cycleai', 'HANDOFF.md'))).toBe(true);

    // Clean up
    fs.rmSync(tmpTarget, { recursive: true, force: true });
  });
});
