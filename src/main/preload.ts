import { contextBridge, ipcRenderer } from 'electron';
import { CycleAiSettings, SpecLockData, TaskItem, ProviderId } from '../shared/types';

export const api = {
  getState: () => ipcRenderer.invoke('cycleai:get-state'),
  refreshQuota: () => ipcRenderer.invoke('cycleai:refresh-quota'),
  selectFolder: () => ipcRenderer.invoke('cycleai:select-folder'),
  scanWorkspace: (folder: string, goal: string) => ipcRenderer.invoke('cycleai:scan-workspace', folder, goal),
  lockSpec: (spec: SpecLockData) => ipcRenderer.invoke('cycleai:lock-spec', spec),
  startExecution: (folder: string, tasks: TaskItem[]) => ipcRenderer.invoke('cycleai:start-execution', folder, tasks),
  pauseExecution: () => ipcRenderer.invoke('cycleai:pause-execution'),
  updateSettings: (settings: CycleAiSettings) => ipcRenderer.invoke('cycleai:update-settings', settings),
  resetSlot: (providerId: ProviderId) => ipcRenderer.invoke('cycleai:reset-slot', providerId),
  getHistory: () => ipcRenderer.invoke('cycleai:get-history'),
  onStateUpdate: (callback: (state: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('cycleai:state-update', subscription);
    return () => ipcRenderer.removeListener('cycleai:state-update', subscription);
  },
  onLog: (callback: (log: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('cycleai:log', subscription);
    return () => ipcRenderer.removeListener('cycleai:log', subscription);
  },
};

contextBridge.exposeInMainWorld('cycleAiAPI', api);
