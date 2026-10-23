import fs from 'fs';
import path from 'path';
import { ProviderId, TaskItem } from '../../shared/types';

export class HandoffManager {
  public static createHandoffSnapshot(
    targetFolder: string,
    previousProvider: ProviderId,
    previousModel: string,
    completedTask: TaskItem,
    nextTask: TaskItem | null,
    reason: 'SLOT_PAUSE' | 'COMPLETED' | 'FAILOVER'
  ): string {
    const cycleDir = path.join(targetFolder, '.cycleai');
    if (!fs.existsSync(cycleDir)) {
      try {
        fs.mkdirSync(cycleDir, { recursive: true });
      } catch {
        // ignore
      }
    }

    const timestamp = new Date().toISOString();
    const handoffContent = `# CycleAI — Context Hand-off Snapshot
**Data:** ${timestamp}
**Provider Precedente:** ${previousProvider.toUpperCase()} (${previousModel})
**Causale:** ${reason}

---

## 1. Stato di Avanzamento
- **Ultimo Task Completato:** [${completedTask.id}] ${completedTask.title}
- **Esito Validazione:** VERIFIED (exit code 0)
- **Prossimo Task da Eseguire:** ${nextTask ? `[${nextTask.id}] ${nextTask.title}` : 'TUTTI I TASK COMPLETATI! 🎉'}

## 2. Direttiva Immediata per il Prossimo Agente
\`\`\`markdown
Sei subentrato nel progetto tramite CycleAI Relay Hand-off.
TUTTE LE DECISIONI ARCHITETTURALI SONO GIÀ CONGELATE IN .cycleai/SPEC_LOCK.json.
Non rifare il codice già completato nei task precedenti.
Procedi subito con l'implementazione del task:
${nextTask ? `>> ${nextTask.title}: ${nextTask.description}` : 'Verifica finale e rilascio.'}
\`\`\`

## 3. Log e Dettagli Esecuzione Precedente
${completedTask.logs.slice(-5).map(l => `- ${l}`).join('\n')}
`;

    const handoffPath = path.join(cycleDir, 'HANDOFF.md');
    try {
      fs.writeFileSync(handoffPath, handoffContent, 'utf-8');

      // Sync CLAUDE.md for Claude Code
      const claudeMdPath = path.join(targetFolder, 'CLAUDE.md');
      fs.writeFileSync(
        claudeMdPath,
        `<!-- CycleAI Auto-generated context sync -->\n# Progetto gestito da CycleAI\n\nAttuale Hand-off attivo:\n${handoffContent}`,
        'utf-8'
      );

      // Sync AGENTS.md for OpenAI Codex
      const agentsMdPath = path.join(targetFolder, 'AGENTS.md');
      fs.writeFileSync(
        agentsMdPath,
        `<!-- CycleAI Auto-generated context sync -->\n# OpenAI Codex Instructions\n\n${handoffContent}`,
        'utf-8'
      );

      // Sync .gemini/rules for Antigravity
      const geminiRulesDir = path.join(targetFolder, '.gemini', 'rules');
      if (!fs.existsSync(geminiRulesDir)) {
        fs.mkdirSync(geminiRulesDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(geminiRulesDir, 'cycleai_handoff.md'),
        `<!-- Antigravity Context Rule -->\n${handoffContent}`,
        'utf-8'
      );
    } catch {
      // ignore
    }

    return handoffContent;
  }
}
