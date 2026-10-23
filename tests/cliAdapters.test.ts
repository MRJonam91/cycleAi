import { describe, it, expect } from 'vitest';
import { CliAdapters } from '../src/main/adapters/cliAdapters';

describe('CliAdapters (Real CLI & Fallback Execution Bridge)', () => {
  it('should detect status for claude, codex, and antigravity without throwing', async () => {
    const clis = await CliAdapters.detectAllClis();

    expect(clis.claude).toBeDefined();
    expect(clis.codex).toBeDefined();
    expect(clis.antigravity).toBeDefined();

    expect(['NATIVE_CLI', 'NPM_GLOBAL', 'FALLBACK_SIMULATION']).toContain(clis.claude.invocationType);
    expect(['NATIVE_CLI', 'NPM_GLOBAL', 'FALLBACK_SIMULATION']).toContain(clis.codex.invocationType);
    expect(['NATIVE_CLI', 'NPM_GLOBAL', 'FALLBACK_SIMULATION']).toContain(clis.antigravity.invocationType);
  });

  it('should execute task with provider and stream output chunk callback', async () => {
    let streamedChunk = '';
    const result = await CliAdapters.executeWithProvider(
      'antigravity',
      'Gemini 3.8 Flash (High)',
      'Test Prompt for Beta Validation',
      process.cwd(),
      (chunk) => {
        streamedChunk += chunk;
      }
    );

    expect(result.exitCode).toBe(0);
    expect(streamedChunk.length).toBeGreaterThan(0);
  }, 15000);
});
