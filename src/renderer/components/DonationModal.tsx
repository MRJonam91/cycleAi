import React, { useState } from 'react';
import { Heart, X, Copy, Check, ExternalLink, Coffee, Gift, ShieldCheck } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const cryptoWallets = [
    { name: 'USDT (TRC20)', address: 'TYDzsHnF8JmK7xQ93mVGpzEw38L1vN57AB', key: 'usdt' },
    { name: 'Bitcoin (BTC)', address: 'bc1q9v7m2k0jdf8s62tqflp48e235y40m67x78c9', key: 'btc' },
    { name: 'Ethereum (ETH / Arbitrum)', address: '0x71C94bF2864C6c6530F447AbA1121d15A63c81e3', key: 'eth' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500" />

        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Heart className="w-6 h-6 fill-rose-500/30" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Sostieni il Progetto CycleAI
              </h2>
              <p className="text-xs text-slate-400">
                100% Open Source per la community degli sviluppatori AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-surfaceHover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            CycleAI nasce per permettere a tutti di <strong className="text-white">sfruttare ogni singolo slot dei propri piani AI a pagamento</strong>, senza sprechi e senza interruzioni notturne. Se questo strumento ti ha fatto risparmiare tempo e abbonamenti, considera una piccola donazione per supportare lo sviluppo continuo!
          </p>

          {/* Quick Support Links */}
          <div className="grid grid-cols-3 gap-3">
            <a
              href="https://github.com/sponsors/MRJonam91"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/60 border border-border hover:border-pink-500/50 hover:bg-pink-500/10 transition-all text-center group"
            >
              <Heart className="w-5 h-5 text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">GitHub Sponsors</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                Supporta <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>

            <a
              href="https://ko-fi.com/mrjonam91"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/60 border border-border hover:border-amber-500/50 hover:bg-amber-500/10 transition-all text-center group"
            >
              <Coffee className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">Ko-fi</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                Offri un caffè <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>

            <a
              href="https://paypal.me/MRJonam91"
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-slate-900/60 border border-border hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-center group"
            >
              <Gift className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-white">PayPal</span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                Donazione libera <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </a>
          </div>

          {/* Crypto Addresses */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Indirizzi Crypto Diretti</span>
            </div>
            <div className="space-y-2">
              {cryptoWallets.map(w => (
                <div
                  key={w.key}
                  className="flex items-center justify-between p-2.5 bg-slate-900/80 border border-border rounded-xl text-xs"
                >
                  <div className="overflow-hidden mr-2">
                    <span className="font-medium text-slate-300 block">{w.name}</span>
                    <span className="text-slate-400 font-mono text-[11px] truncate block">
                      {w.address}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(w.address, w.key)}
                    className="p-1.5 rounded-lg bg-surface hover:bg-surfaceHover border border-border text-slate-300 hover:text-white transition-colors flex items-center gap-1 shrink-0"
                    title="Copia indirizzo"
                  >
                    {copiedKey === w.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-medium">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px]">Copia</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-surface hover:bg-surfaceHover text-slate-300 hover:text-white border border-border rounded-lg transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
