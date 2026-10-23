import { describe, it, expect } from 'vitest';
import { HandoffManager } from '../src/main/orchestrator/handoffManager';
import { TaskItem } from '../src/shared/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('HandoffManager (Universal Context Hand-off)', () => {
  it('should generate .cycleai/HANDOFF.md and sync native config files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cycleai-handoff-test-'));

    const completedTask: TaskItem = {
      id: 'TASK-001',
      order: 1,
      title: 'Creazione Schema DB e Tipi',
      description: 'Definire contratti',
      complexity: 'CRITICAL_ARCH',
      status: 'COMPLETED',
      logs: ['Log 1', 'Log 2', 'Verificato'],
    };

    const nextTask: TaskItem = {
      id: 'TASK-002',
      order: 2,
      title: 'Scrittura API Endpoint',
      description: 'Implementare router',
      complexity: 'STANDARD_DEV',
      status: 'PENDING',
      logs: [],
    };

    const handoff = HandoffManager.createHandoffSnapshot(
      tmpDir,
      'claude',
      'claude-3-7-sonnet',
      completedTask,
      nextTask,
      'SLOT_PAUSE'
    );

    expect(handoff).toContain('CLAUDE (claude-3-7-sonnet)');
    expect(handoff).toContain('TASK-001');
    expect(handoff).toContain('TASK-002');

    // Check files on disk
    expect(fs.existsSync(path.join(tmpDir, '.cycleai', 'HANDOFF.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.gemini', 'rules', 'cycleai_handoff.md'))).toBe(true);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
