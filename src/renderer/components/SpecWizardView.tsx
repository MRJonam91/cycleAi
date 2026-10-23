import React, { useState, useEffect } from 'react';
import { SpecLockData, ClarifyingQuestion, TaskItem } from '../../shared/types';
import { Folder, Play, CheckCircle2, FileCode, HelpCircle, Layers, ArrowRight, Lock, History } from 'lucide-react';

interface SpecWizardViewProps {
  onLockAndStart: (spec: SpecLockData) => void;
  onSelectFolder: () => Promise<string | null>;
}

export const SpecWizardView: React.FC<SpecWizardViewProps> = ({
  onLockAndStart,
  onSelectFolder,
}) => {
  const [goalPrompt, setGoalPrompt] = useState(
    'Crea un generatore di report analytics con dashboard interattiva, export PDF/CSV e gestione multi-tenant con SQLite'
  );
  const [targetFolder, setTargetFolder] = useState('c:\\Users\\conta\\Desktop\\progetti\\cycleAi');
  const [isScanning, setIsScanning] = useState(false);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'INPUT' | 'QUESTIONS' | 'PREVIEW'>('INPUT');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if ((window as any).cycleAiAPI?.getHistory) {
      (window as any).cycleAiAPI.getHistory().then((list: any[]) => {
        if (list && Array.isArray(list)) setHistory(list);
      });
    }
  }, []);

  const handleBrowseFolder = async () => {
    const selected = await onSelectFolder();
    if (selected) {
      setTargetFolder(selected);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!goalPrompt.trim() || !targetFolder.trim()) return;
    setIsScanning(true);

    try {
      const res = await (window as any).cycleAiAPI.scanWorkspace(targetFolder, goalPrompt);
      setQuestions(res.questions);
      // Pre-select recommended answers by default
      const defaults: Record<string, string> = {};
      res.questions.forEach((q: ClarifyingQuestion) => {
        defaults[q.id] = q.recommendedOption;
      });
      setUserAnswers(defaults);
      setStep('QUESTIONS');
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleCompileAndStart = () => {
    const completedQuestions = questions.map(q => ({
      ...q,
      userAnswer: userAnswers[q.id] || q.recommendedOption,
    }));

    const specData: SpecLockData = {
      projectName: targetFolder.split(/[\\/]/).pop() || 'ai-project',
      targetFolder,
      goalPrompt,
      questions: completedQuestions,
      isLocked: false,
    };

    onLockAndStart(specData);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 bg-surface border border-border rounded-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          100% Upfront Discovery & Spec Lock-In
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tutte le domande di chiarimento avvengono subito per definire la richiesta al 100%. Una volta bloccata la specifica, l&apos;orchestratore lavora in autonomia evitando blocchi o interruzioni a metà opera.
        </p>
      </div>

      {/* Step 1: Input Goal & Target Directory */}
      {step === 'INPUT' && (
        <div className="p-6 rounded-2xl bg-surface border border-border space-y-5">
          {history.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-border space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Progetti Recenti Salvati:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 4).map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTargetFolder(item.folder);
                      if (item.goal) setGoalPrompt(item.goal);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surfaceHover border border-border text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors group"
                    title={`Percorso: ${item.folder}`}
                  >
                    <span className="font-semibold text-slate-200 group-hover:text-primary-light">{item.name}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({item.completedCount}/{item.tasksCount} task)</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Cartella Workspace di Destinazione:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={targetFolder}
                onChange={e => setTargetFolder(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-border text-xs text-slate-200 font-mono focus:outline-none focus:border-primary"
                placeholder="Percorso cartella locale..."
              />
              <button
                onClick={handleBrowseFolder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surfaceHover hover:bg-slate-700/60 border border-border text-xs font-semibold text-white transition-colors"
              >
                <Folder className="w-4 h-4 text-primary" />
                <span>Sfoglia</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Obiettivo Finale del Progetto (Goal Prompt):
            </label>
            <textarea
              rows={4}
              value={goalPrompt}
              onChange={e => setGoalPrompt(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-900 border border-border text-xs text-slate-200 focus:outline-none focus:border-primary leading-relaxed resize-none"
              placeholder="Descrivi in dettaglio cosa vuoi ottenere..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleGenerateQuestions}
              disabled={isScanning || !goalPrompt.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              <span>{isScanning ? 'Scansione Codebase in corso...' : 'Genera Domande di Chiarimento 100%'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Clarification Questions (All Upfront!) */}
      {step === 'QUESTIONS' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary-light flex items-center justify-between">
            <span>
              💡 <strong>5 Domande Generata per Definizione al 100%:</strong> Abbiamo pre-selezionato le scelte ottimali consigliate per il tuo stack. Puoi accettarle o cambiarle con un click.
            </span>
            <button
              onClick={() => setStep('INPUT')}
              className="text-xs underline text-slate-400 hover:text-white"
            >
              Modifica Prompt
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="p-5 rounded-2xl bg-surface border border-border space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-border">
                    {qIndex + 1}
                  </span>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-primary tracking-wider">
                      {q.category}
                    </span>
                    <h4 className="text-sm font-semibold text-white">{q.question}</h4>
                  </div>
                </div>

                <div className="space-y-2 pt-1 pl-8">
                  {q.options.map((opt, oIndex) => {
                    const isSelected = (userAnswers[q.id] || q.recommendedOption) === opt;
                    return (
                      <div
                        key={oIndex}
                        onClick={() => handleSelectOption(q.id, opt)}
                        className={`p-3 rounded-xl text-xs cursor-pointer border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-white font-medium'
                            : 'bg-slate-900/60 border-border text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={() => setStep('INPUT')}
              className="px-4 py-2.5 rounded-xl bg-surface hover:bg-surfaceHover border border-border text-xs font-semibold text-slate-300"
            >
              Indietro
            </button>

            <button
              onClick={handleCompileAndStart}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-900/20"
            >
              <Lock className="w-4 h-4" />
              <span>Blocca Specifica e Avvia Esecuzione Autonoma</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
