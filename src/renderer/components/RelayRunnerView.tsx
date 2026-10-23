import React, { useRef, useEffect } from 'react';
import { TaskItem, ExecutionLogEvent, SpecLockData } from '../../shared/types';
import { Play, Pause, CheckCircle2, Clock, AlertTriangle, Terminal, Layers, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface RelayRunnerViewProps {
  tasks: TaskItem[];
  logs: ExecutionLogEvent[];
  activeProject: SpecLockData | null;
  isRunning: boolean;
  isHibernating: boolean;
  nextAutoResumeAt: string | null;
  onStart: () => void;
  onPause: () => void;
}

export const RelayRunnerView: React.FC<RelayRunnerViewProps> = ({
  tasks,
  logs,
  activeProject,
  isRunning,
  isHibernating,
  nextAutoResumeAt,
  onStart,
  onPause,
}) => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getComplexityBadge = (c: TaskItem['complexity']) => {
    switch (c) {
      case 'CRITICAL_ARCH':
        return <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.5 rounded font-mono">ARCH TIER-1</span>;
      case 'STANDARD_DEV':
        return <span className="text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">DEV TIER-2</span>;
      case 'FAST_BOILERPLATE':
        return <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">FAST TIER-3</span>;
    }
  };

  const getProviderBadge = (provider?: string) => {
    if (!provider) return null;
    switch (provider) {
      case 'claude':
        return <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">Claude</span>;
      case 'codex':
        return <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">Codex</span>;
      case 'antigravity':
        return <span className="text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">Antigravity</span>;
      default:
        return null;
    }
  };

  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hibernation Sleep Banner */}
      {isHibernating && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 glow-amber flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">
                In Attesa del Reset dello Slot (Pausa Pre-Limit al 90%)
              </h4>
              <p className="text-xs text-slate-300">
                I file sono salvati in <code>.cycleai/HANDOFF.md</code>. Ripresa automatica garantita al secondo esatto di reset: {nextAutoResumeAt ? new Date(nextAutoResumeAt).toLocaleTimeString() : 'imminente'}.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-amber-500/20 text-amber-200 px-3 py-1 rounded-lg font-bold">
            Auto-Resume Attivo
          </span>
        </div>
      )}

      {/* Control & Progress Bar */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">
              {activeProject?.projectName || 'Progetto Attivo'}
            </h3>
            {activeProject?.isLocked && (
              <span className="text-[10px] font-semibold bg-blue-500/10 text-primary border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Specifica 100% Bloccata
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate max-w-xl mt-0.5">
            {activeProject?.goalPrompt || 'Nessuna specifica caricata. Usa il Wizard per iniziare.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400">Avanzamento DAG:</span>
            <span className="text-sm font-bold text-white block font-mono">
              {completedCount} / {tasks.length} ({progressPercent}%)
            </span>
          </div>

          {isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Metti in Pausa</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={tasks.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Avvia Esecuzione</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: DAG Pipeline (Left) & Live Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* DAG Task List */}
        <div className="lg:col-span-5 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
            <Layers className="w-4 h-4 text-primary" /> Task DAG Atomici ({tasks.length})
          </h4>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {tasks.map((task, idx) => {
              const isCurrent = task.status === 'IN_PROGRESS';
              const isCompleted = task.status === 'COMPLETED';

              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-primary/10 border-primary glow-blue'
                      : isCompleted
                      ? 'bg-slate-900/50 border-slate-800 opacity-90'
                      : 'bg-surface border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <h5 className={`text-xs font-bold ${isCurrent ? 'text-primary-light' : isCompleted ? 'text-slate-300 line-through' : 'text-white'}`}>
                        {task.title}
                      </h5>
                    </div>

                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping shrink-0" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-700 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {task.description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {getComplexityBadge(task.complexity)}
                      {getProviderBadge(task.assignedProvider)}
                    </div>
                    {task.assignedModel && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {task.assignedModel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Execution Logs Terminal */}
        <div className="lg:col-span-7 flex flex-col h-[610px] rounded-2xl bg-black/90 border border-border overflow-hidden">
          {/* Terminal Titlebar */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>CycleAI Execution Multiplexer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            </div>
          </div>

          {/* Logs View */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-2 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-10 text-center">
                In attesa di avvio. Le decisioni e i log di compilazione/verifica appariranno qui in tempo reale.
              </div>
            ) : (
              logs.map(log => {
                let badgeClass = 'text-slate-400';
                if (log.type === 'SUCCESS') badgeClass = 'text-emerald-400 font-bold';
                if (log.type === 'WARN') badgeClass = 'text-amber-400 font-bold';
                if (log.type === 'PAUSE') badgeClass = 'text-rose-400 font-bold';
                if (log.type === 'RESUME') badgeClass = 'text-cyan-400 font-bold';
                if (log.type === 'HANDOFF') badgeClass = 'text-purple-400 font-bold';

                return (
                  <div key={log.id} className="leading-relaxed">
                    <span className="text-slate-600">[{log.timestamp}]</span>{' '}
                    <span className="text-primary-light">[{log.providerId}]</span>{' '}
                    <span className={badgeClass}>[{log.type}]</span>{' '}
                    <span className="text-slate-200">{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
