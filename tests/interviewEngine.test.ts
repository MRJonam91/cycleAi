import { describe, it, expect } from 'vitest';
import { InterviewEngine } from '../src/main/orchestrator/interviewEngine';
import { SpecLockData } from '../src/shared/types';
import path from 'path';

describe('InterviewEngine (100% Upfront Discovery)', () => {
  it('should scan folder and generate 5 categories of upfront questions', () => {
    const cwd = process.cwd();
    const result = InterviewEngine.scanWorkspaceAndGenerateQuestions(
      cwd,
      'Crea una dashboard finanziaria in tempo reale con grafici'
    );

    expect(result.projectName).toBe(path.basename(cwd));
    expect(result.questions).toHaveLength(5);

    const categories = result.questions.map(q => q.category);
    expect(categories).toContain('architecture');
    expect(categories).toContain('dependencies');
    expect(categories).toContain('edge_cases');
    expect(categories).toContain('verification');
    expect(categories).toContain('autonomy');

    for (const q of result.questions) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.recommendedOption).toBeDefined();
    }
  });

  it('should compile spec lock into an atomic Task DAG', () => {
    const spec: SpecLockData = {
      projectName: 'test-project',
      targetFolder: process.cwd(),
      goalPrompt: 'Build microservice with SQLite',
      questions: [],
      isLocked: false,
    };

    const compiled = InterviewEngine.compileSpecLock(spec);
    expect(compiled.specLock.isLocked).toBe(true);
    expect(compiled.specLock.lockedAt).toBeDefined();
    expect(compiled.tasks.length).toBe(5);

    // Verify DAG task structure
    const task1 = compiled.tasks[0];
    expect(task1.id).toBe('TASK-001');
    expect(task1.complexity).toBe('CRITICAL_ARCH');
    expect(task1.status).toBe('PENDING');

    const task3 = compiled.tasks[2];
    expect(task3.complexity).toBe('FAST_BOILERPLATE');
  });
});
