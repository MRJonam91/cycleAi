import fs from 'fs';
import path from 'path';
import os from 'os';

export class SessionWatcher {
  private watchers: fs.FSWatcher[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;
  private onChangeCallback: () => void;

  constructor(onChangeCallback: () => void) {
    this.onChangeCallback = onChangeCallback;
  }

  public startWatching(): void {
    const home = os.homedir();
    const pathsToWatch = [
      path.join(home, '.codex'),
      path.join(home, '.claude'),
      path.join(home, '.gemini', 'antigravity', 'brain'),
    ];

    for (const p of pathsToWatch) {
      if (fs.existsSync(p)) {
        try {
          const watcher = fs.watch(p, { recursive: false }, (_eventType, _filename) => {
            this.handleFileChange();
          });
          this.watchers.push(watcher);
        } catch {
          // ignore unsupported recursive flag or access issues
        }
      }
    }
  }

  private handleFileChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.onChangeCallback();
    }, 1500); // 1.5s debounce to avoid flooding
  }

  public stopWatching(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // ignore
      }
    }
    this.watchers = [];
  }
}
