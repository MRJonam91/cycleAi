import React, { useState } from 'react';
import { ProviderId, ProviderSlotStatus } from '../../shared/types';
import { Clock, Zap, Flame, RefreshCw, AlertTriangle, CheckCircle, Sparkles, Server } from 'lucide-react';

interface QuotaRadarViewProps {
  providers: Record<ProviderId, ProviderSlotStatus>;
  prePauseThreshold: number;
  onRefresh: () => void;
  onResetSlot: (id: ProviderId) => void;
}

export const QuotaRadarView: React.FC<QuotaRadarViewProps> = ({
  providers,
  prePauseThreshold,
  onRefresh,
  onResetSlot,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getProviderTheme = (id: ProviderId) => {
    switch (id) {
      case 'claude':
        return {
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/5',
          text: 'text-amber-400',
          bar: 'bg-amber-500',
          glow: 'glow-amber',
          badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        };
      case 'codex':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/5',
          text: 'text-emerald-400',
          bar: 'bg-emerald-500',
          glow: 'glow-green',
          badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        };
      case 'antigravity':
        return {
          border: 'border-purple-500/30',
          bg: 'bg-purple-500/5',
          text: 'text-purple-400',
          bar: 'bg-purple-500',
          glow: 'glow-purple',
          badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
        };
    }
  };

  const formatCountdown = (isoDate: string | null) => {
    if (!isoDate) return 'Nessun reset imminente';
    const diffMs = new Date(isoDate).getTime() - Date.now();
    if (diffMs <= 0) return 'Reset in corso ora';
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours}h ${minutes}m al reset`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Bar */}
      <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Quota & Slot Intelligence Radar
          </h2>
          <p className="text-xs text-slate-400">
            Monitoraggio in tempo reale dei piani in abbonamento, finestre rolling di 5 ore e calcolo del Burn Rate
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surfaceHover hover:bg-slate-700/50 border border-border text-xs font-semibold text-slate-200 transition-colors ${
            isRefreshing ? 'opacity-70' : ''
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          <span>Rileva Sessioni e Limiti</span>
        </button>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(Object.keys(providers) as ProviderId[]).map(id => {
          const p = providers[id];
          const theme = getProviderTheme(id);
          const isNearLimit = p.usedPercent >= prePauseThreshold;
          const isHighDrain = p.drainUrgencyScore >= 12;

          return (
            <div
              key={id}
              className={`p-5 rounded-2xl bg-surface border ${theme.border} ${theme.glow} flex flex-col justify-between relative overflow-hidden transition-all`}
            >
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${theme.badge}`}>
                      {p.family}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1.5">{p.name}</h3>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right">
                    {p.isPaused ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" /> Pausa Pre-Reset
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" /> Slot Attivo
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Piano:</span>
                    <span className="text-slate-200 font-medium">{p.planTier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Modello Attivo:</span>
                    <span className="text-slate-200 font-mono text-[11px]">{p.activeModel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Integrazione:</span>
                    <span className="text-slate-300">
                      {p.desktopRunning ? '🖥️ Desktop App + CLI' : p.cliInstalled ? '⚡ CLI / SDK ConPTY' : 'Configurabile'}
                    </span>
                  </div>
                </div>

                {/* Progress Bar of 5h Rolling Window */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-400">Slot Rolling 5h Utilizzato:</span>
                    <span className={`font-bold font-mono text-sm ${isNearLimit ? 'text-rose-400' : 'text-white'}`}>
                      {p.usedPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isNearLimit ? 'bg-rose-500' : theme.bar
                      }`}
                      style={{ width: `${Math.min(100, p.usedPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>0%</span>
                    <span className="text-amber-400 font-medium">Soglia Pausa: {prePauseThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Reset and Drain Metrics */}
                <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> Reset Timer:
                    </span>
                    <span className="text-slate-200 font-medium font-mono text-[11px]">
                      {formatCountdown(p.resetAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" /> Burn Rate:
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {p.burnRatePerMin.toFixed(2)}% / min
                    </span>
                  </div>

                  {/* Pre-Reset Drain Highlight */}
                  {isHighDrain && !p.isPaused && (
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-emerald-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Use-it-or-lose-it:
                      </span>
                      <span className="font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Priorità Svuota-Slot (Score {p.drainUrgencyScore})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {p.lastActivity ? `Attività: ${new Date(p.lastActivity).toLocaleTimeString()}` : 'Pronto'}
                </span>

                <button
                  onClick={() => onResetSlot(id)}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-surfaceHover hover:bg-slate-700/60 text-slate-300 hover:text-white border border-border transition-colors"
                  title="Azzera contatore slot per test"
                >
                  Simula Reset
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
