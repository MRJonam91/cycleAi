import { describe, it, expect } from 'vitest';
import { ProcessRunner } from '../src/main/orchestrator/processRunner';

describe('ProcessRunner (Real Command Execution)', () => {
  it('should execute a node command and capture stdout with exit code 0', async () => {
    const result = await ProcessRunner.executeCommand(
      'node -e "console.log(\'CYCLEAI_CLI_TEST_OK\')"',
      process.cwd()
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('CYCLEAI_CLI_TEST_OK');
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should stream chunks via onOutputChunk', async () => {
    let captured = '';
    const result = await ProcessRunner.executeCommand(
      'node -e "console.log(\'STREAM_CHUNK_1\'); console.log(\'STREAM_CHUNK_2\')"',
      process.cwd(),
      (chunk) => {
        captured += chunk;
      }
    );

    expect(result.exitCode).toBe(0);
    expect(captured).toContain('STREAM_CHUNK_1');
    expect(captured).toContain('STREAM_CHUNK_2');
  });

  it('should properly handle non-zero exit codes', async () => {
    const result = await ProcessRunner.executeCommand(
      'node -e "process.exit(2)"',
      process.cwd()
    );

    expect(result.exitCode).toBe(2);
  });
});
