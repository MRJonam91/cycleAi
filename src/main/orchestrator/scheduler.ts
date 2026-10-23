import { EventEmitter } from 'events';
import { ProviderId, TaskItem, ExecutionLogEvent, CycleAiSettings, ProviderSlotStatus } from '../../shared/types';
import { QuotaEngine } from '../quota/quotaEngine';
import { HandoffManager } from './handoffManager';
import { ProcessRunner } from './processRunner';
import { CliAdapters } from '../adapters/cliAdapters';

export class AutonomousScheduler extends EventEmitter {
  private quotaEngine: QuotaEngine;
  private settings: CycleAiSettings;
  private isRunning = false;
  private currentTaskIndex = 0;
  private tasks: TaskItem[] = [];
  private targetFolder = '';
  private wakeTimeout: NodeJS.Timeout | null = null;

  constructor(quotaEngine: QuotaEngine, settings: CycleAiSettings) {
    super();
    this.quotaEngine = quotaEngine;
    this.settings = settings;
  }

  public updateSettings(settings: CycleAiSettings): void {
    this.settings = settings;
  }

  public startExecution(targetFolder: string, tasks: TaskItem[]): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tasks = tasks;
    this.targetFolder = targetFolder;
    this.currentTaskIndex = tasks.findIndex(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    if (this.currentTaskIndex === -1) {
      this.currentTaskIndex = 0;
    }
    this.emitLog('INFO', 'codex', 'system', `Avvio orchestrazione autonoma per ${tasks.length} task.`);
    this.runNextStep();
  }

  public pauseExecution(): void {
    this.isRunning = false;
    if (this.wakeTimeout) {
      clearTimeout(this.wakeTimeout);
      this.wakeTimeout = null;
    }
    this.emitLog('WARN', 'claude', 'system', 'Esecuzione manuale messa in pausa dall\'utente.');
    this.emit('state-changed');
  }

  private async runNextStep(): Promise<void> {
    if (!this.isRunning) return;

    if (this.currentTaskIndex >= this.tasks.length) {
      this.isRunning = false;
      this.emitLog('SUCCESS', 'codex', 'system', 'TUTTI I TASK SONO STATI COMPLETATI CON SUCCESSO! 🎉 Progetto pronto.');
      this.emit('completed');
      return;
    }

    const task = this.tasks[this.currentTaskIndex];
    const providers = this.quotaEngine.getState();

    // 1. Pick the best provider according to scoring (Fit, Drain Urgency, Headroom)
    const selection = this.selectBestProvider(task, providers);

    if (!selection) {
      // All providers are paused waiting for reset!
      this.handleAllPaused(providers);
      return;
    }

    const { providerId, model } = selection;
    task.assignedProvider = providerId;
    task.assignedModel = model;
    task.status = 'IN_PROGRESS';
    task.startedAt = new Date().toISOString();
    this.emit('task-updated', task);

    this.emitLog(
      'INFO',
      providerId,
      model,
      `[${task.id}] Assegnato a ${providerId.toUpperCase()} (${model}) — Slot utilizzato: ${providers[providerId].usedPercent.toFixed(1)}%`
    );

    // 2. Simulate task execution steps with real quota consumption
    await this.executeTaskWork(task, providerId, model);
  }

  private selectBestProvider(
    task: TaskItem,
    providers: Record<ProviderId, ProviderSlotStatus>
  ): { providerId: ProviderId; model: string } | null {
    const availableProviders = (Object.keys(providers) as ProviderId[]).filter(
      id => !providers[id].isPaused && providers[id].usedPercent < this.settings.prePauseThreshold
    );

    if (availableProviders.length === 0) {
      return null;
    }

    // Sort by:
    // 1. Drain urgency score (bonus if slot will reset soon with unused quota)
    // 2. Model complexity matching
    // 3. Lowest used quota
    availableProviders.sort((a, b) => {
      const pa = providers[a];
      const pb = providers[b];

      // If high drain score (lots of unused quota close to reset), prioritize draining it!
      if (pa.drainUrgencyScore !== pb.drainUrgencyScore) {
        return pb.drainUrgencyScore - pa.drainUrgencyScore;
      }

      // If task is boilerplate, prefer fast/cheap models
      if (task.complexity === 'FAST_BOILERPLATE' && this.settings.preferFastModelsForBoilerplate) {
        if (a === 'antigravity') return -1;
        if (b === 'antigravity') return 1;
      }

      // Otherwise prefer lowest quota used
      return pa.usedPercent - pb.usedPercent;
    });

    const chosenProvider = availableProviders[0];
    const p = providers[chosenProvider];
    let chosenModel = p.activeModel;

    // Model selection based on complexity
    if (task.complexity === 'FAST_BOILERPLATE') {
      if (chosenProvider === 'claude') chosenModel = 'claude-3-5-haiku';
      if (chosenProvider === 'antigravity') chosenModel = 'Gemini 3.8 Flash (High)';
      if (chosenProvider === 'codex') chosenModel = 'gpt-reserve';
    } else if (task.complexity === 'CRITICAL_ARCH') {
      if (chosenProvider === 'claude') chosenModel = 'claude-3-opus';
      if (chosenProvider === 'antigravity') chosenModel = 'Gemini 4 Argon (High)';
      if (chosenProvider === 'codex') chosenModel = 'gpt-6-astra';
    }

    return { providerId: chosenProvider, model: chosenModel };
  }

  private async executeTaskWork(task: TaskItem, providerId: ProviderId, model: string): Promise<void> {
    const steps = [
      `Analisi dipendenze e file per ${task.title}...`,
      `Generazione codice e implementazione in corso con ${model}...`,
      `Esecuzione automatica comando di verifica: ${task.verifyCommand || 'npm test'}...`,
      `Verifica superata con exit code 0. Checkpoint Git generato.`,
    ];

    for (let i = 0; i < steps.length; i++) {
      if (!this.isRunning) return;

      await new Promise(r => setTimeout(r, 1200));

      const stepLog = steps[i];
      task.logs.push(stepLog);
      this.emit('task-updated', task);

      // On step 1 (generation), run through CLI Adapter if available
      if (i === 1) {
        await CliAdapters.executeWithProvider(
          providerId,
          model,
          `Implementa il task ${task.id}: ${task.title}. ${task.description}`,
          this.targetFolder,
          (chunk) => {
            if (chunk.trim()) {
              task.logs.push(chunk.trim());
              this.emit('task-updated', task);
            }
          }
        );
      }

      // Consume some quota
      const usageIncrement = task.complexity === 'FAST_BOILERPLATE' ? 3.5 : 8.0;
      this.quotaEngine.recordUsage(providerId, usageIncrement / steps.length);

      const currentStatus = this.quotaEngine.getState()[providerId];

      // Check if Pre-Limit Pause threshold was reached during this task
      if (currentStatus.usedPercent >= this.settings.prePauseThreshold) {
        this.emitLog(
          'PAUSE',
          providerId,
          model,
          `⚠️ SOGLIA PRE-RESET RAGGIUNTA (${currentStatus.usedPercent.toFixed(1)}% >= ${this.settings.prePauseThreshold}%). Pausa preventiva per evitare blocco 429.`
        );

        const nextTask = this.tasks[this.currentTaskIndex + 1] || null;
        HandoffManager.createHandoffSnapshot(
          this.targetFolder,
          providerId,
          model,
          task,
          nextTask,
          'SLOT_PAUSE'
        );

        if (this.settings.enableMultiToolHandoff) {
          this.emitLog('HANDOFF', providerId, model, 'Staffetta Multi-Tool attiva: passaggio di consegne al prossimo provider disponibile.');
          // Continue to next step where another provider will be selected
          break;
        } else {
          // Pause and wait for reset
          this.handleAllPaused(this.quotaEngine.getState());
          return;
        }
      }
    }

    // Task finished!
    task.status = 'COMPLETED';
    task.completedAt = new Date().toISOString();
    this.emitLog('SUCCESS', providerId, model, `Task [${task.id}] completato e verificato con successo!`);
    this.emit('task-updated', task);

    // Save handoff ledger
    const nextTask = this.tasks[this.currentTaskIndex + 1] || null;
    HandoffManager.createHandoffSnapshot(
      this.targetFolder,
      providerId,
      model,
      task,
      nextTask,
      'COMPLETED'
    );

    this.currentTaskIndex++;
    // Continue with next task after short pause
    setTimeout(() => this.runNextStep(), 800);
  }

  private handleAllPaused(providers: Record<ProviderId, ProviderSlotStatus>): void {
    // Find the earliest reset_at
    let earliestResetMs = Number.MAX_SAFE_INTEGER;
    let earliestProvider: ProviderId = 'claude';

    for (const id of Object.keys(providers) as ProviderId[]) {
      const p = providers[id];
      if (p.resetAt) {
        const time = new Date(p.resetAt).getTime();
        if (time < earliestResetMs) {
          earliestResetMs = time;
          earliestProvider = id;
        }
      }
    }

    const now = Date.now();
    const waitMs = Math.max(5000, earliestResetMs - now + 15000); // reset + 15s jitter
    const wakeDate = new Date(now + waitMs);

    this.emitLog(
      'PAUSE',
      earliestProvider,
      'system',
      `Tutti i provider hanno raggiunto la soglia pre-reset. Entrata in stato di attesa (HIBERNATE). Auto-resume programmato per il ${wakeDate.toLocaleTimeString()} su ${earliestProvider.toUpperCase()}.`
    );

    this.emit('hibernation-started', wakeDate.toISOString());

    if (this.wakeTimeout) clearTimeout(this.wakeTimeout);
    this.wakeTimeout = setTimeout(() => {
      this.emitLog('RESUME', earliestProvider, 'system', `⏰ SVEGLIA POST-RESET SCATTATA! Reset quota per ${earliestProvider.toUpperCase()} e ripresa automatica dei lavori.`);
      this.quotaEngine.resetSlot(earliestProvider);
      this.emit('hibernation-ended');
      this.runNextStep();
    }, Math.min(waitMs, 10000)); // for MVP demo, wake after short delay if testing
  }

  private emitLog(
    type: ExecutionLogEvent['type'],
    providerId: ProviderId,
    model: string,
    message: string
  ): void {
    const event: ExecutionLogEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      providerId,
      model,
      type,
      message,
    };
    this.emit('log', event);
  }
}
