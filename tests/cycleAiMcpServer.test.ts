import { describe, it, expect } from 'vitest';
import { CycleAiMcpServer } from '../src/main/mcp/cycleAiMcpServer';
import { SpecLockData, TaskItem, ProviderSlotStatus } from '../src/shared/types';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('CycleAiMcpServer (Loopback MCP Channel for Desktop Apps)', () => {
  it('should expose standard MCP tool definitions', () => {
    const tools = CycleAiMcpServer.getToolDefinitions();
    expect(tools.length).toBe(3);

    const names = tools.map(t => t.name);
    expect(names).toContain('cycleai_get_active_task');
    expect(names).toContain('cycleai_verify_and_complete_task');
    expect(names).toContain('cycleai_check_quota_status');
  });

  it('should tell the model to yield when quota hits prePauseThreshold', () => {
    const mockProviders: Record<string, ProviderSlotStatus> = {
      claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        family: 'Anthropic',
        planTier: 'Claude Pro',
        activeModel: 'claude-3-7-sonnet',
        detectedModels: [],
        cliInstalled: true,
        desktopRunning: false,
        usedPercent: 92, // Above 90% threshold!
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        burnRatePerMin: 0.5,
        tteMinutes: 0,
        isPaused: true,
        drainUrgencyScore: 10,
        lastActivity: null,
      },
    };

    const res = CycleAiMcpServer.handleToolCall(
      'cycleai_check_quota_status',
      { providerId: 'claude' },
      null,
      null,
      mockProviders,
      90
    );

    expect(res.success).toBe(true);
    expect(res.data.shouldYield).toBe(true);
    expect(res.data.directive).toContain('ATTENZIONE: Quota slot vicina al limite');
  });

  it('should allow model to continue when quota is healthy', () => {
    const mockProviders: Record<string, ProviderSlotStatus> = {
      codex: {
        id: 'codex',
        name: 'OpenAI Codex',
        family: 'OpenAI',
        planTier: 'ChatGPT Plus',
        activeModel: 'gpt-6.1-sol',
        detectedModels: [],
        cliInstalled: true,
        desktopRunning: true,
        usedPercent: 35, // Below 90% threshold!
        resetAt: new Date(Date.now() + 3600000).toISOString(),
        burnRatePerMin: 0.2,
        tteMinutes: 200,
        isPaused: false,
        drainUrgencyScore: 5,
        lastActivity: null,
      },
    };

    const res = CycleAiMcpServer.handleToolCall(
      'cycleai_check_quota_status',
      { providerId: 'codex' },
      null,
      null,
      mockProviders,
      90
    );

    expect(res.success).toBe(true);
    expect(res.data.shouldYield).toBe(false);
    expect(res.data.directive).toContain('Quota disponibile');
  });

  it('should return active task data from cycleai_get_active_task', () => {
    const mockProject: SpecLockData = {
      projectName: 'BetaProject',
      targetFolder: process.cwd(),
      goalPrompt: 'Implement Beta Architecture',
      questions: [],
      isLocked: true,
    };

    const mockTask: TaskItem = {
      id: 'TASK-001',
      order: 1,
      title: 'Setup Core',
      description: 'Implement core modules',
      complexity: 'CRITICAL_ARCH',
      status: 'IN_PROGRESS',
      logs: [],
    };

    const res = CycleAiMcpServer.handleToolCall(
      'cycleai_get_active_task',
      {},
      mockProject,
      mockTask,
      {},
      90
    );

    expect(res.success).toBe(true);
    expect(res.data.projectName).toBe('BetaProject');
    expect(res.data.task.id).toBe('TASK-001');
  });
});
