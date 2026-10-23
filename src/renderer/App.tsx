import React, { useState, useEffect } from 'react';
import {
  CycleAiState,
  SpecLockData,
  TaskItem,
  ProviderId,
  CycleAiSettings,
} from '../shared/types';
import { QuotaRadarView } from './components/QuotaRadarView';
import { SpecWizardView } from './components/SpecWizardView';
import { RelayRunnerView } from './components/RelayRunnerView';
import { SettingsView } from './components/SettingsView';
import { DonationModal } from './components/DonationModal';
import {
  Zap,
  Lock,
  Layers,
  Sliders,
  Heart,
  Activity,
  Cpu,
  RefreshCw,
} from 'lucide-react';

const defaultState: CycleAiState = {
  providers: {
    claude: {
      id: 'claude',
      name: 'Anthropic Claude',
      family: 'Anthropic',
      planTier: 'Claude Pro (5h Rolling)',
      activeModel: 'claude-3-7-sonnet',
      detectedModels: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'],
      cliInstalled: true,
      desktopRunning: false,
      usedPercent: 42,
      resetAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      burnRatePerMin: 0.35,
      tteMinutes: 137,
      isPaused: false,
      drainUrgencyScore: 18.5,
      lastActivity: null,
    },
    codex: {
      id: 'codex',
      name: 'OpenAI Codex',
      family: 'OpenAI',
      planTier: 'ChatGPT Plus / Pro',
      activeModel: 'gpt-6.1-sol',
      detectedModels: ['gpt-6.1-sol', 'gpt-6-astra', 'gpt-reserve'],
      cliInstalled: true,
      desktopRunning: true,
      usedPercent: 28,
      resetAt: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
      burnRatePerMin: 0.22,
      tteMinutes: 281,
      isPaused: false,
      drainUrgencyScore: 8.2,
      lastActivity: null,
    },
    antigravity: {
      id: 'antigravity',
      name: 'Google Antigravity',
      family: 'Google',
      planTier: 'Google AI Pro (Gemini)',
      activeModel: 'Gemini 4 Argon (High)',
      detectedModels: ['Gemini 4 Argon (High)', 'Gemini 3.8 Flash (High)'],
      cliInstalled: true,
      desktopRunning: true,
      usedPercent: 18,
      resetAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      burnRatePerMin: 0.15,
      tteMinutes: 480,
      isPaused: false,
      drainUrgencyScore: 4.1,
      lastActivity: null,
    },
  },
  activeProject: null,
  tasks: [],
  currentRunningTaskId: null,
  isRunning: false,
  isHibernating: false,
  nextAutoResumeAt: null,
  executionLogs: [],
  settings: {
    prePauseThreshold: 90,
    autoResumeEnabled: true,
    enableMultiToolHandoff: true,
    preferFastModelsForBoilerplate: true,
    manualOverrides: {
      claude: {},
      codex: {},
      antigravity: {},
    },
  },
};

export const App: React.FC = () => {
  const [state, setState] = useState<CycleAiState>(defaultState);
  const [activeTab, setActiveTab] = useState<'RADAR' | 'WIZARD' | 'RUNNER' | 'SETTINGS'>('RADAR');
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  useEffect(() => {
    // If running inside Electron, wire IPC
    if ((window as any).cycleAiAPI) {
      const api = (window as any).cycleAiAPI;
      api.getState().then((serverState: any) => {
        if (serverState) setState(serverState);
      });

      const unsubState = api.onStateUpdate((updatedState: any) => {
        setState(updatedState);
      });

      return () => {
        unsubState?.();
      };
    }
  }, []);

  const handleRefreshQuota = async () => {
    if ((window as any).cycleAiAPI) {
      await (window as any).cycleAiAPI.refreshQuota();
    }
  };

  const handleResetSlot = async (providerId: ProviderId) => {
    if ((window as any).cycleAiAPI) {
      await (window as any).cycleAiAPI.resetSlot(providerId);
    } else {
      setState(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [providerId]: {
            ...prev.providers[providerId],
            usedPercent: 0,
            isPaused: false,
            resetAt: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
          },
        },
      }));
    }
  };

  const handleSelectFolder = async () => {
    if ((window as any).cycleAiAPI) {
      return await (window as any).cycleAiAPI.selectFolder();
    }
    return 'c:\\Users\\conta\\Desktop\\progetti\\cycleAi';
  };

  const handleLockAndStart = async (specData: SpecLockData) => {
    if ((window as any).cycleAiAPI) {
      const compiled = await (window as any).cycleAiAPI.lockSpec(specData);
      setActiveTab('RUNNER');
      await (window as any).cycleAiAPI.startExecution(specData.targetFolder, compiled.tasks);
    } else {
      setActiveTab('RUNNER');
    }
  };

  const handleStartRunner = async () => {
    if ((window as any).cycleAiAPI && state.activeProject) {
      await (window as any).cycleAiAPI.startExecution(
        state.activeProject.targetFolder,
        state.tasks
      );
    }
  };

  const handlePauseRunner = async () => {
    if ((window as any).cycleAiAPI) {
      await (window as any).cycleAiAPI.pauseExecution();
    }
  };

  const handleSaveSettings = async (newSettings: CycleAiSettings) => {
    if ((window as any).cycleAiAPI) {
      await (window as any).cycleAiAPI.updateSettings(newSettings);
    } else {
      setState(prev => ({ ...prev, settings: newSettings }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden">
      {/* Top Main Navigation Bar */}
      <header className="h-16 px-6 bg-surface/80 backdrop-blur border-b border-border flex items-center justify-between shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                Cycle<span className="text-primary">AI</span>
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-300 border border-purple-500/20 px-1.5 py-0.2 rounded">
                Beta v0.3
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Zero-Block AI Usage Maximizer
            </p>
          </div>
        </div>

        {/* Live Slot Pills in Header */}
        <div className="hidden md:flex items-center gap-3">
          {(Object.keys(state.providers) as ProviderId[]).map(id => {
            const p = state.providers[id];
            const isPaused = p.isPaused || p.usedPercent >= state.settings.prePauseThreshold;
            let dotColor = 'bg-emerald-400';
            if (isPaused) dotColor = 'bg-rose-400';
            else if (p.usedPercent >= 70) dotColor = 'bg-amber-400';

            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-border text-xs"
                title={`${p.name}: ${p.usedPercent.toFixed(1)}%`}
              >
                <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                <span className="font-semibold text-slate-300 capitalize">{id}:</span>
                <span className="font-mono text-slate-200">{p.usedPercent.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center bg-slate-900 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('RADAR')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'RADAR'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quota Radar</span>
            </button>

            <button
              onClick={() => setActiveTab('WIZARD')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'WIZARD'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>100% Spec Lock</span>
            </button>

            <button
              onClick={() => setActiveTab('RUNNER')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'RUNNER'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Relay Runner</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'SETTINGS'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Impostazioni</span>
            </button>
          </nav>

          {/* Glowing Donation CTA */}
          <button
            onClick={() => setIsDonationOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 hover:from-pink-500/30 hover:to-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all shadow-sm hover:scale-105"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500/50" />
            <span>Donazioni</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'RADAR' && (
          <QuotaRadarView
            providers={state.providers}
            prePauseThreshold={state.settings.prePauseThreshold}
            onRefresh={handleRefreshQuota}
            onResetSlot={handleResetSlot}
          />
        )}

        {activeTab === 'WIZARD' && (
          <SpecWizardView
            onLockAndStart={handleLockAndStart}
            onSelectFolder={handleSelectFolder}
          />
        )}

        {activeTab === 'RUNNER' && (
          <RelayRunnerView
            tasks={state.tasks}
            logs={state.executionLogs}
            activeProject={state.activeProject}
            isRunning={state.isRunning}
            isHibernating={state.isHibernating}
            nextAutoResumeAt={state.nextAutoResumeAt}
            onStart={handleStartRunner}
            onPause={handlePauseRunner}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsView
            settings={state.settings}
            providers={state.providers}
            onSave={handleSaveSettings}
          />
        )}
      </main>

      {/* Donation / Sponsors Modal */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />
    </div>
  );
};

export default App;
