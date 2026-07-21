// =============================================================
// ORVAX · VERITAS F2.1 — VerifySheet (micro-entrevista N2)
// Aparece ao concluir. Coleta dificuldade + 1 resposta curta.
// "Pular" = N1 (autodeclaração). "Confirmar" = N2 (mais XP se específico).
// Resolve com { difficulty, level, answers }.
// =============================================================
import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Zap } from 'lucide-react';
import { useLang } from '../../i18n/LanguageContext';

const ACCENT = '#22c55e';

export default function VerifySheet({ open, title, onResolve }) {
  const { t } = useLang();
  const [diff, setDiff] = useState(3);
  const [answer, setAnswer] = useState('');
  const taRef = useRef(null);

  useEffect(() => {
    if (open) { setDiff(3); setAnswer(''); setTimeout(() => taRef.current?.focus(), 120); }
  }, [open]);

  if (!open) return null;

  const skip = () => onResolve({ difficulty: diff, level: 1, answers: {} });
  const confirm = () => {
    const a = answer.trim();
    onResolve({ difficulty: diff, level: a ? 2 : 1, answers: a ? { how: a } : {} });
  };

  const diffs = [
    { v: 1, label: t('verify.d1') }, { v: 2, label: t('verify.d2') },
    { v: 3, label: t('verify.d3') }, { v: 4, label: t('verify.d4') }, { v: 5, label: t('verify.d5') },
  ];

  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={skip}>
      <div className="w-full max-w-[400px] rounded-[24px] border p-5"
        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono tracking-[0.3em] uppercase flex items-center gap-1.5" style={{ color: ACCENT }}>
            <ShieldCheck size={12} /> {t('verify.badge')}
          </span>
          <button onClick={skip} className="opacity-40 hover:opacity-100 transition-opacity"><X size={18} /></button>
        </div>

        <p className="text-[13px] font-outfit font-bold truncate mb-4">{title || t('verify.title')}</p>

        {/* Dificuldade */}
        <label className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-1.5">{t('verify.howHard')}</label>
        <div className="flex gap-1 mb-4">
          {diffs.map((d) => (
            <button key={d.v} onClick={() => setDiff(d.v)}
              className="flex-1 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wide border transition-all"
              style={diff === d.v
                ? { backgroundColor: ACCENT, color: '#000', borderColor: ACCENT }
                : { borderColor: 'var(--border-color)', color: 'var(--text-main)', opacity: 0.55 }}>
              {d.label}
            </button>
          ))}
        </div>

        {/* Micro-entrevista */}
        <label className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-1.5">{t('verify.question')}</label>
        <textarea ref={taRef} value={answer} onChange={(e) => setAnswer(e.target.value)}
          rows={2} placeholder={t('verify.placeholder')}
          className="w-full text-[12px] font-mono bg-transparent border rounded-xl px-3 py-2 outline-none resize-none transition-all"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
        <p className="text-[9px] font-mono opacity-30 mt-1.5 leading-snug">{t('verify.hint')}</p>

        <div className="flex gap-2 mt-4">
          <button onClick={skip}
            className="flex-1 py-3 rounded-2xl font-outfit font-bold text-[11px] uppercase tracking-wider border transition-all active:scale-95"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', opacity: 0.7 }}>
            {t('verify.skip')}
          </button>
          <button onClick={confirm}
            className="flex-[1.4] py-3 rounded-2xl font-outfit font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
            style={{ backgroundColor: ACCENT, color: '#000' }}>
            <Zap size={13} /> {t('verify.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
