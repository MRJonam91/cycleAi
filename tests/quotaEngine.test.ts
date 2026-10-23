import { describe, it, expect, beforeEach } from 'vitest';
import { QuotaEngine } from '../src/main/quota/quotaEngine';
import { CycleAiSettings } from '../src/shared/types';

describe('QuotaEngine (4-Tier Sensing & Quota Logic)', () => {
  let settings: CycleAiSettings;
  let engine: QuotaEngine;

  beforeEach(() => {
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
    engine = new QuotaEngine(settings);
  });

  it('should initialize all 3 providers with valid 5h rolling windows', () => {
    const state = engine.getState();
    expect(state.claude).toBeDefined();
    expect(state.codex).toBeDefined();
    expect(state.antigravity).toBeDefined();

    expect(state.claude.family).toBe('Anthropic');
    expect(state.codex.family).toBe('OpenAI');
    expect(state.antigravity.family).toBe('Google');

    expect(state.claude.usedPercent).toBeGreaterThanOrEqual(0);
    expect(state.claude.usedPercent).toBeLessThan(100);
  });

  it('should trigger pre-limit pause when quota hits or exceeds prePauseThreshold', () => {
    engine.recordUsage('claude', 60); // 42 + 60 = 102 -> capped at 100%
    const state = engine.getState();

    expect(state.claude.usedPercent).toBeGreaterThanOrEqual(90);
    expect(state.claude.isPaused).toBe(true);
    expect(state.claude.pauseReason).toContain('Raggiunta soglia di sicurezza pre-reset');
  });

  it('should accurately calculate drainUrgencyScore (use-it-or-lose-it)', () => {
    const state = engine.getState();
    expect(state.claude.drainUrgencyScore).toBeGreaterThan(0);
  });

  it('should reset slot and clear paused state on resetSlot', () => {
    engine.recordUsage('claude', 60);
    expect(engine.getState().claude.isPaused).toBe(true);

    engine.resetSlot('claude');
    const state = engine.getState();
    expect(state.claude.usedPercent).toBe(0);
    expect(state.claude.isPaused).toBe(false);
    expect(state.claude.pauseReason).toBeUndefined();
  });
});
