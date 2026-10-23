import { ProviderId, ProviderSlotStatus, CycleAiSettings } from '../../shared/types';
import { scanCodex } from './codexScanner';
import { scanAntigravity } from './antigravityScanner';
import { scanClaude } from './claudeScanner';

export class QuotaEngine {
  private providersState: Record<ProviderId, ProviderSlotStatus>;
  private settings: CycleAiSettings;

  constructor(settings: CycleAiSettings) {
    this.settings = settings;
    const now = Date.now();
    // Default initial states with realistic 5h rolling windows
    this.providersState = {
      claude: {
        id: 'claude',
        name: 'Anthropic Claude',
        family: 'Anthropic',
        planTier: 'Claude Pro (5h Rolling)',
        activeModel: 'claude-3-7-sonnet',
        detectedModels: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
        cliInstalled: true,
        desktopRunning: false,
        usedPercent: 42,
        resetAt: new Date(now + 2 * 3600 * 1000 + 18 * 60 * 1000).toISOString(),
        burnRatePerMin: 0.35,
        tteMinutes: 137,
        isPaused: false,
        drainUrgencyScore: 18.5,
        lastActivity: new Date(now - 8 * 60 * 1000).toISOString(),
      },
      codex: {
        id: 'codex',
        name: 'OpenAI Codex',
        family: 'OpenAI',
        planTier: 'ChatGPT Plus / Pro (OAuth)',
        activeModel: 'gpt-6.1-sol',
        detectedModels: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-reserve'],
        cliInstalled: true,
        desktopRunning: true,
        usedPercent: 28,
        resetAt: new Date(now + 3 * 3600 * 1000 + 45 * 60 * 1000).toISOString(),
        burnRatePerMin: 0.22,
        tteMinutes: 281,
        isPaused: false,
        drainUrgencyScore: 8.2,
        lastActivity: new Date(now - 2 * 60 * 1000).toISOString(),
      },
      antigravity: {
        id: 'antigravity',
        name: 'Google Antigravity',
        family: 'Google',
        planTier: 'Google AI Pro (Gemini)',
        activeModel: 'Gemini 4 Argon (High)',
        detectedModels: ['Gemini 4 Argon (High)', 'Gemini 3.8 Flash (High)', 'Gemini 3.1 Pro'],
        cliInstalled: true,
        desktopRunning: true,
        usedPercent: 18,
        resetAt: new Date(now + 4 * 3600 * 1000 + 10 * 60 * 1000).toISOString(),
        burnRatePerMin: 0.15,
        tteMinutes: 480,
        isPaused: false,
        drainUrgencyScore: 4.1,
        lastActivity: new Date(now - 1 * 60 * 1000).toISOString(),
      },
    };
  }

  public updateSettings(newSettings: CycleAiSettings): void {
    this.settings = newSettings;
  }

  public async refreshAll(): Promise<Record<ProviderId, ProviderSlotStatus>> {
    const [codexData, agyData, claudeData] = await Promise.all([
      scanCodex().catch(() => ({})),
      scanAntigravity().catch(() => ({})),
      scanClaude().catch(() => ({})),
    ]);

    this.mergeScannedData('codex', codexData);
    this.mergeScannedData('antigravity', agyData);
    this.mergeScannedData('claude', claudeData);

    this.recomputeMetrics();
    return this.providersState;
  }

  private mergeScannedData(id: ProviderId, data: Partial<ProviderSlotStatus>): void {
    const current = this.providersState[id];
    this.providersState[id] = {
      ...current,
      ...data,
      activeModel: this.settings.manualOverrides[id]?.forcedModel || data.activeModel || current.activeModel,
      planTier: this.settings.manualOverrides[id]?.forcedPlan || data.planTier || current.planTier,
    };
  }

  private recomputeMetrics(): void {
    const now = Date.now();
    for (const id of Object.keys(this.providersState) as ProviderId[]) {
      const p = this.providersState[id];

      // Calculate minutes until reset
      let minutesToReset = 240;
      if (p.resetAt) {
        const diffMs = new Date(p.resetAt).getTime() - now;
        minutesToReset = Math.max(1, Math.round(diffMs / 60000));
      }

      // Calculate Time-To-Exhaustion (TTE)
      const headroom = Math.max(0, this.settings.prePauseThreshold - p.usedPercent);
      p.tteMinutes = p.burnRatePerMin > 0 ? Math.round(headroom / p.burnRatePerMin) : 999;

      // Pre-Reset Drain Score: (Unused quota % / minutes to reset)
      // Higher score means we have lots of free quota that will expire soon!
      const unusedPercent = Math.max(0, 100 - p.usedPercent);
      p.drainUrgencyScore = Number((unusedPercent / minutesToReset * 10).toFixed(1));

      // Check Pre-Limit Pause condition
      if (p.usedPercent >= this.settings.prePauseThreshold) {
        p.isPaused = true;
        p.pauseReason = `Raggiunta soglia di sicurezza pre-reset (${p.usedPercent.toFixed(0)}% >= ${this.settings.prePauseThreshold}%). Auto-resume programmato al reset.`;
      } else {
        p.isPaused = false;
        p.pauseReason = undefined;
      }
    }
  }

  public recordUsage(id: ProviderId, percentDelta: number): void {
    const p = this.providersState[id];
    if (p) {
      p.usedPercent = Math.min(100, Math.max(0, p.usedPercent + percentDelta));
      p.lastActivity = new Date().toISOString();
      this.recomputeMetrics();
    }
  }

  public resetSlot(id: ProviderId): void {
    const p = this.providersState[id];
    if (p) {
      p.usedPercent = 0;
      p.isPaused = false;
      p.pauseReason = undefined;
      p.resetAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
      this.recomputeMetrics();
    }
  }

  public getState(): Record<ProviderId, ProviderSlotStatus> {
    return this.providersState;
  }
}
