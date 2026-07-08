// =============================================================
// ORVAX · Life OS — XpToastLayer
// Escuta `orvax:xp-gain` e desenha um toast flutuante por 2s.
// Montar uma única vez perto da raiz (App.jsx).
// =============================================================
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface XpToast {
  id: string;
  amount: number;
  reason: string;
  total?: number;
}

export function XpToastLayer() {
  const [toasts, setToasts] = useState<XpToast[]>([]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const t: XpToast = {
        id,
        amount: detail.amount || 0,
        reason: detail.reason || '',
        total: detail.total,
      };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 2200);
    };
    window.addEventListener('orvax:xp-gain', handler);
    return () => window.removeEventListener('orvax:xp-gain', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed z-[100] top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-full flex items-center gap-2 text-[12px] font-mono font-bold tracking-wider bg-zinc-900/95 border border-white/15 text-white shadow-lg shadow-black/30 animate-in fade-in slide-in-from-top-4"
        >
          <Sparkles size={13} className="text-yellow-400" />
          <span>+{t.amount} XP</span>
          {t.total != null && (
            <span className="opacity-50 font-normal">· TOTAL {t.total}</span>
          )}
        </div>
      ))}
    </div>
  );
}
