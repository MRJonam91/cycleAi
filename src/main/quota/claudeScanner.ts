import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProviderSlotStatus } from '../../shared/types';

const execAsync = promisify(exec);

export async function scanClaude(): Promise<Partial<ProviderSlotStatus>> {
  const home = os.homedir();
  const claudeDir = path.join(home, '.claude');
  const sessionsDir = path.join(claudeDir, 'sessions');

  let planTier = 'Claude Pro (5h Rolling Window)';
  let activeModel = 'claude-3-7-sonnet';
  const detectedModels = [
    'claude-3-7-sonnet',
    'claude-3-5-sonnet',
    'claude-3-5-haiku',
    'claude-3-opus',
  ];
  let lastActivity: string | null = null;
  let cliInstalled = false;
  let desktopRunning = false;

  // 1. Check directory
  if (fs.existsSync(claudeDir)) {
    cliInstalled = true;
    try {
      if (fs.existsSync(sessionsDir)) {
        const files = fs.readdirSync(sessionsDir);
        let latestMtime = 0;
        for (const file of files) {
          const filePath = path.join(sessionsDir, file);
          try {
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs > latestMtime) {
              latestMtime = stat.mtimeMs;
            }
          } catch {
            // ignore
          }
        }
        if (latestMtime > 0) {
          lastActivity = new Date(latestMtime).toISOString();
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Check running processes
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Claude.exe" /NH');
    if (stdout.toLowerCase().includes('claude.exe')) {
      desktopRunning = true;
    }
  } catch {
    // ignore
  }

  return {
    id: 'claude',
    name: 'Anthropic Claude',
    family: 'Anthropic',
    planTier,
    activeModel,
    detectedModels,
    cliInstalled,
    desktopRunning,
    lastActivity,
    detectedPath: claudeDir,
  };
}
