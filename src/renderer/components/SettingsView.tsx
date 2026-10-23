import React, { useState } from 'react';
import { CycleAiSettings, ProviderId, ProviderSlotStatus } from '../../shared/types';
import { Sliders, Shield, Zap, Cpu, Save } from 'lucide-react';

interface SettingsViewProps {
  settings: CycleAiSettings;
  providers: Record<ProviderId, ProviderSlotStatus>;
  onSave: (newSettings: CycleAiSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  providers,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<CycleAiSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    onSave(localSettings);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-4 bg-surface border border-border rounded-xl flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            Configurazione & Policy di Esecuzione
          </h2>
          <p className="text-xs text-slate-400">
            Regola le soglie di sicurezza degli slot, il comportamento di Auto-Resume e i fallback manuali
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>{savedNotice ? 'Salvato!' : 'Salva Impostazioni'}</span>
        </button>
      </div>

      <div className="space-y-5">
        {/* Slot Guard Threshold */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                Soglia di Sicurezza Pre-Reset (Pre-Pause Threshold)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Percentuale di utilizzo dello slot di 5h raggiunta la quale CycleAI salva il checkpoint ed entra in pausa preventiva per evitare il blocco 429.
              </p>
            </div>
            <span className="text-base font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {localSettings.prePauseThreshold}%
            </span>
          </div>

          <input
            type="range"
            min="80"
            max="98"
            step="1"
            value={localSettings.prePauseThreshold}
            onChange={e =>
              setLocalSettings(prev => ({
                ...prev,
                prePauseThreshold: Number(e.target.value),
              }))
            }
            className="w-full accent-primary h-2 bg-slate-900 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>80% (Massima prudenza)</span>
            <span>90% (Consigliato)</span>
            <span>98% (Sfruttamento estremo)</span>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Automazioni & Routing
          </h4>

          {/* Auto Resume */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <span className="text-xs font-semibold text-white block">
                Auto-Resume Post-Reset
              </span>
              <span className="text-[11px] text-slate-400 block">
                Allo scadere del timer di reset (+15s jitter), riprende automaticamente l&apos;esecuzione dal checkpoint senza intervento manuale.
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.autoResumeEnabled}
              onChange={e =>
                setLocalSettings(prev => ({
                  ...prev,
                  autoResumeEnabled: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Multi-Tool Handoff */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div>
              <span className="text-xs font-semibold text-white block">
                Staffetta Continua Multi-Tool (Cross-Tool Relay)
              </span>
              <span className="text-[11px] text-slate-400 block">
                Se un tool raggiunge il 90%, passa immediatamente il testimone ad un altro provider con slot disponibile anziché fermarsi.
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enableMultiToolHandoff}
              onChange={e =>
                setLocalSettings(prev => ({
                  ...prev,
                  enableMultiToolHandoff: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* Down-shifting for Boilerplate */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-xs font-semibold text-white block">
                Risparmio Slot Premium (Model Down-Shifting)
              </span>
              <span className="text-[11px] text-slate-400 block">
                Assegna i micro-task di boilerplate, documentazione e unit test a modelli leggeri (Flash, Haiku, Reserve) per non bruciare la quota dei modelli pesanti.
              </span>
            </div>
            <input
              type="checkbox"
              checked={localSettings.preferFastModelsForBoilerplate}
              onChange={e =>
                setLocalSettings(prev => ({
                  ...prev,
                  preferFastModelsForBoilerplate: e.target.checked,
                }))
              }
              className="w-4 h-4 accent-primary rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Model Overrides per Provider */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            Override Manuale Modelli & Piani (Fallback di Sicurezza)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {(['claude', 'codex', 'antigravity'] as ProviderId[]).map(id => {
              const p = providers[id];
              return (
                <div key={id} className="p-3 rounded-xl bg-slate-900 border border-border space-y-2">
                  <span className="font-bold text-slate-200 capitalize">{p?.name || id}</span>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Modello Preferito:</label>
                    <select
                      value={localSettings.manualOverrides[id]?.forcedModel || p?.activeModel || ''}
                      onChange={e =>
                        setLocalSettings(prev => ({
                          ...prev,
                          manualOverrides: {
                            ...prev.manualOverrides,
                            [id]: {
                              ...prev.manualOverrides[id],
                              forcedModel: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full p-2 rounded-lg bg-surface border border-border text-white text-[11px] focus:outline-none"
                    >
                      {p?.detectedModels?.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
