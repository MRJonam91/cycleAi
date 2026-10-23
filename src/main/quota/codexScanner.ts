import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ProviderSlotStatus } from '../../shared/types';

const execAsync = promisify(exec);

export async function scanCodex(): Promise<Partial<ProviderSlotStatus>> {
  const home = os.homedir();
  const codexDir = path.join(home, '.codex');
  const authPath = path.join(codexDir, 'auth.json');
  const modelsCachePath = path.join(codexDir, 'models_cache.json');
  const sessionIndexPath = path.join(codexDir, 'session_index.jsonl');

  let planTier = 'ChatGPT Plus';
  let activeModel = 'gpt-6.1-sol';
  const detectedModels: string[] = [];
  let lastActivity: string | null = null;
  let cliInstalled = false;
  let desktopRunning = false;
  let detectedPath = codexDir;

  // 1. Check auth.json
  if (fs.existsSync(authPath)) {
    try {
      const authRaw = fs.readFileSync(authPath, 'utf-8');
      const auth = JSON.parse(authRaw);
      if (auth.auth_mode === 'chatgpt') {
        planTier = 'ChatGPT Plus / Pro (OAuth)';
      }
      if (auth.last_refresh) {
        lastActivity = auth.last_refresh;
      }
    } catch {
      // fallback
    }
  }

  // 2. Check models_cache.json
  if (fs.existsSync(modelsCachePath)) {
    try {
      const cacheRaw = fs.readFileSync(modelsCachePath, 'utf-8');
      const cache = JSON.parse(cacheRaw);
      if (cache.models && Array.isArray(cache.models)) {
        for (const m of cache.models) {
          if (m.slug && !detectedModels.includes(m.slug)) {
            detectedModels.push(m.slug);
          }
        }
        if (detectedModels.length > 0) {
          activeModel = detectedModels[0];
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Check session_index.jsonl for latest activity
  if (fs.existsSync(sessionIndexPath)) {
    try {
      const stat = fs.statSync(sessionIndexPath);
      lastActivity = stat.mtime.toISOString();
    } catch {
      // fallback
    }
  }

  // 4. Check running processes
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq codex.exe" /NH');
    if (stdout.toLowerCase().includes('codex.exe')) {
      desktopRunning = true;
      cliInstalled = true;
    }
  } catch {
    // fallback
  }

  return {
    id: 'codex',
    name: 'OpenAI Codex',
    family: 'OpenAI',
    planTier,
    activeModel,
    detectedModels: detectedModels.length > 0 ? detectedModels : ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-reserve'],
    cliInstalled: cliInstalled || fs.existsSync(codexDir),
    desktopRunning,
    lastActivity,
    detectedPath,
  };
}
