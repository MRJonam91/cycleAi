import { spawn } from 'child_process';

export interface CommandExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export class ProcessRunner {
  public static executeCommand(
    command: string,
    cwd: string,
    onOutputChunk?: (data: string) => void,
    timeoutMs: number = 60000
  ): Promise<CommandExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      let child: any = null;
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        if (child) {
          try {
            child.kill();
          } catch {
            // ignore
          }
        }
      }, timeoutMs);

      try {
        child = spawn(command, [], {
          cwd,
          shell: true,
          windowsHide: true,
          env: { ...process.env, FORCE_COLOR: '0' },
        });

        child.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          stdout += text;
          onOutputChunk?.(text);
        });

        child.stderr?.on('data', (data: Buffer) => {
          const text = data.toString();
          stderr += text;
          onOutputChunk?.(`[stderr] ${text}`);
        });

        child.on('close', (code: number | null) => {
          clearTimeout(timer);
          const durationMs = Date.now() - startTime;
          resolve({
            exitCode: timedOut ? -1 : (code ?? 0),
            stdout,
            stderr: timedOut ? `${stderr}\n[Timeout reached after ${timeoutMs}ms]` : stderr,
            durationMs,
          });
        });

        child.on('error', (err: Error) => {
          clearTimeout(timer);
          resolve({
            exitCode: 1,
            stdout,
            stderr: `${stderr}\nProcess error: ${err.message}`,
            durationMs: Date.now() - startTime,
          });
        });
      } catch (err: any) {
        clearTimeout(timer);
        resolve({
          exitCode: 1,
          stdout: '',
          stderr: `Spawn exception: ${err.message}`,
          durationMs: Date.now() - startTime,
        });
      }
    });
  }
}
