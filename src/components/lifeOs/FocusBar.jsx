// =============================================================
// ORVAX · VERITAS F2.2 — FocusBar
// Barra flutuante do timer de foco em andamento. O tempo exibido é
// só visual; a duração que vale é a do servidor (RPC end_focus).
// =============================================================
import React, { useEffect, useState } from 'react';
import { Timer, Check, X } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';

const ACCENT = '#22c55e';
const fmt = (s) => {
  const m = Math.floor(s / 60), ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

export default function FocusBar({ focus, onComplete, onCancel }) {
  const { t } = useLang();
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!focus) return;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - focus.startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [focus]);

  if (!focus) return null;
  const ready = elapsed >= 60; // N3 precisa de >= 1 min

  const done = async () => { setBusy(true); try { await onComplete(); } finally { setBusy(false); } };
  const cancel = async () => { setBusy(true); try { await onCancel(); } finally { setBusy(false); } };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-[396px]">
      <div className="rounded-[20px] border p-3 flex items-center gap-3 shadow-xl backdrop-blur-xl"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: `${ACCENT}55`, boxShadow: `0 8px 30px ${ACCENT}22` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${ACCENT}1a` }}>
          <Timer size={16} style={{ color: ACCENT }} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono uppercase tracking-widest opacity-40 leading-none mb-0.5">{t('focus.running')}</p>
          <p className="text-[10px] font-mono font-bold truncate" style={{ color: 'var(--text-main)' }}>{focus.item?.title || t('focus.session')}</p>
        </div>
        <span className="text-[18px] font-outfit font-black tabular-nums" style={{ color: ready ? ACCENT : 'var(--text-main)' }}>{fmt(elapsed)}</span>
        <button onClick={cancel} disabled={busy}
          className="w-8 h-8 rounded-lg border flex items-center justify-center opacity-50 hover:opacity-100 transition-all disabled:opacity-30"
          style={{ borderColor: 'var(--border-color)' }} title={t('focus.cancel')}>
          <X size={14} />
        </button>
        <button onClick={done} disabled={busy || !ready}
          className="h-8 px-3 rounded-lg font-outfit font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 disabled:opacity-30"
          style={{ backgroundColor: ACCENT, color: '#000' }} title={ready ? t('focus.finish') : t('focus.min1')}>
          <Check size={13} /> {t('focus.finish')}
        </button>
      </div>
      {!ready && <p className="text-center text-[8px] font-mono opacity-30 mt-1.5 uppercase tracking-widest">{t('focus.min1')}</p>}
    </div>
  );
}
