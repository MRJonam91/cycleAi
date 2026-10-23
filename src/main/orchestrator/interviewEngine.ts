import fs from 'fs';
import path from 'path';
import { ClarifyingQuestion, SpecLockData, TaskItem } from '../../shared/types';

export class InterviewEngine {
  public static scanWorkspaceAndGenerateQuestions(
    targetFolder: string,
    goalPrompt: string
  ): { projectName: string; questions: ClarifyingQuestion[] } {
    let detectedTech = 'TypeScript / Node.js';
    const folderName = path.basename(targetFolder) || 'ai-project';

    // Inspect files
    try {
      if (fs.existsSync(path.join(targetFolder, 'package.json'))) {
        const pkgRaw = fs.readFileSync(path.join(targetFolder, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgRaw);
        detectedTech = `Node.js (${pkg.name || folderName})`;
      } else if (fs.existsSync(path.join(targetFolder, 'pyproject.toml')) || fs.existsSync(path.join(targetFolder, 'requirements.txt'))) {
        detectedTech = 'Python / FastApi / Poetry';
      }
    } catch {
      // ignore
    }

    const questions: ClarifyingQuestion[] = [
      {
        id: 'q-arch',
        category: 'architecture',
        question: `Architettura di base per "${goalPrompt}": quale pattern desideri adottare?`,
        recommendedOption: `(Consigliato) Modular Clean Architecture con separazione rigorosa Core / Adapter / UI`,
        options: [
          `(Consigliato) Modular Clean Architecture con separazione rigorosa Core / Adapter / UI`,
          `Microservizi / Serverless con API REST isolate e database embedded`,
          `Architettura Monolitica Rapida con layer semplificato per massima velocità`,
        ],
      },
      {
        id: 'q-deps',
        category: 'dependencies',
        question: 'Gestione delle dipendenze e persistenza dati:',
        recommendedOption: '(Consigliato) Zero-Native pure JS/TS (SQLite in-memory / JSON WAL) per massima portabilità',
        options: [
          '(Consigliato) Zero-Native pure JS/TS (SQLite in-memory / JSON WAL) per massima portabilità',
          'Database esterno (PostgreSQL / Redis locale con Docker container)',
          'Nessun database, persistenza solo su file system markdown/json',
        ],
      },
      {
        id: 'q-edge',
        category: 'edge_cases',
        question: 'Politica di gestione errori critici e recovery durante l\'esecuzione autonoma:',
        recommendedOption: '(Consigliato) Graceful fallback automatico con retry (max 3 tentativi) prima di skip controllato',
        options: [
          '(Consigliato) Graceful fallback automatico con retry (max 3 tentativi) prima di skip controllato',
          'Stop immediato ed emissione alert acustico/notifica Windows',
          'Self-healing con isolamento del componente difettoso e continuazione dei task paralleli',
        ],
      },
      {
        id: 'q-verify',
        category: 'verification',
        question: 'Criterio di accettazione automatica per ogni micro-task (Definition of Done):',
        recommendedOption: '(Consigliato) Esecuzione typecheck + unit test con exit code 0 + commit Git automatico',
        options: [
          '(Consigliato) Esecuzione typecheck + unit test con exit code 0 + commit Git automatico',
          'Verifica solo statica dei file generati senza esecuzione test',
          'Esecuzione end-to-end con headless browser/CLI verification',
        ],
      },
      {
        id: 'q-autonomy',
        category: 'autonomy',
        question: 'Policy per decisioni secondarie non specificate nel prompt:',
        recommendedOption: '(Consigliato) Autonomia al 100%: l\'agente sceglie la best-practice standard e documenta in DECISIONS.md',
        options: [
          '(Consigliato) Autonomia al 100%: l\'agente sceglie la best-practice standard e documenta in DECISIONS.md',
          'Chiedi conferma se l\'impatto architetturale è elevato',
        ],
      },
    ];

    return {
      projectName: folderName,
      questions,
    };
  }

  public static compileSpecLock(
    spec: SpecLockData
  ): { specLock: SpecLockData; tasks: TaskItem[] } {
    const lockedSpec: SpecLockData = {
      ...spec,
      isLocked: true,
      lockedAt: new Date().toISOString(),
    };

    // Decompose into an atomic Task DAG
    const tasks: TaskItem[] = [
      {
        id: 'TASK-001',
        order: 1,
        title: 'Inizializzazione Workspace, Cartelle Core e Contratto Tipi',
        description: `Definire la struttura directory, schema tipi TypeScript e contratti dati per: ${spec.goalPrompt}`,
        complexity: 'CRITICAL_ARCH',
        status: 'PENDING',
        verifyCommand: 'npm run typecheck',
        logs: [],
      },
      {
        id: 'TASK-002',
        order: 2,
        title: 'Implementazione Logica di Business e Engine Core',
        description: 'Sviluppo dei moduli principali e degli algoritmi di calcolo con gestione errori robusta',
        complexity: 'STANDARD_DEV',
        status: 'PENDING',
        verifyCommand: 'npm test',
        logs: [],
      },
      {
        id: 'TASK-003',
        order: 3,
        title: 'Scrittura Suite Unit Test e Casi Limite',
        description: 'Creazione di test automatizzati per validare edge case e parametri non validi',
        complexity: 'FAST_BOILERPLATE',
        status: 'PENDING',
        verifyCommand: 'npm test -- --coverage',
        logs: [],
      },
      {
        id: 'TASK-004',
        order: 4,
        title: 'Integrazione Componenti UI / CLI Runner e Connessioni',
        description: 'Collegamento del frontend e dei controller con visualizzazione stato in tempo reale',
        complexity: 'STANDARD_DEV',
        status: 'PENDING',
        verifyCommand: 'npm run build',
        logs: [],
      },
      {
        id: 'TASK-005',
        order: 5,
        title: 'Rifinitura, Documentazione README e Checkpoint Finale',
        description: 'Verifica complessiva del progetto, pulizia lint e commit finale di rilascio',
        complexity: 'FAST_BOILERPLATE',
        status: 'PENDING',
        verifyCommand: 'npm run lint',
        logs: [],
      },
    ];

    // Also write .cycleai/SPEC_LOCK.json in targetFolder if writable
    try {
      const cycleDir = path.join(spec.targetFolder, '.cycleai');
      if (!fs.existsSync(cycleDir)) {
        fs.mkdirSync(cycleDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(cycleDir, 'SPEC_LOCK.json'),
        JSON.stringify({ lockedSpec, tasks }, null, 2),
        'utf-8'
      );
    } catch {
      // ignore
    }

    return { specLock: lockedSpec, tasks };
  }
}
