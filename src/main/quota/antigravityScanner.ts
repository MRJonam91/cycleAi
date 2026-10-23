import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProviderSlotStatus } from '../../shared/types';

const execAsync = promisify(exec);

export async function scanAntigravity(): Promise<Partial<ProviderSlotStatus>> {
  const home = os.homedir();
  const geminiDir = path.join(home, '.gemini');
  const antigravityDir = path.join(geminiDir, 'antigravity');
  const brainDir = path.join(antigravityDir, 'brain');

  let planTier = 'Google AI Pro (Gemini)';
  let activeModel = 'Gemini 4 Argon (High)';
  const detectedModels = [
    'Gemini 4 Argon (High)',
    'Gemini 3.8 Flash (High)',
    'Gemini 3.1 Pro',
    'Gemini Flash',
  ];
  let lastActivity: string | null = null;
  let desktopRunning = false;
  let cliInstalled = false;

  // 1. Check brain directory for recent conversations
  if (fs.existsSync(brainDir)) {
    try {
      const convs = fs.readdirSync(brainDir);
      let latestMtime = 0;
      for (const conv of convs) {
        const convPath = path.join(brainDir, conv);
        try {
          const stat = fs.statSync(convPath);
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
      cliInstalled = true;
    } catch {
      // ignore
    }
  }

  // 2. Check running processes
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH');
    if (stdout.toLowerCase().includes('antigravity.exe')) {
      desktopRunning = true;
      cliInstalled = true;
    }
  } catch {
    // ignore
  }

  return {
    id: 'antigravity',
    name: 'Google Antigravity',
    family: 'Google',
    planTier,
    activeModel,
    detectedModels,
    cliInstalled,
    desktopRunning,
    lastActivity,
    detectedPath: antigravityDir,
  };
}
