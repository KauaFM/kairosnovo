// ============================================================
// ORVAX FitCal — Fechar o dia (VITALIS · N4)
//
// XP por RESULTADO verificável, não por registrar: o servidor
// (xp-engine, source_type=nutrition_day) recalcula food_logs vs
// metas e decide. O cliente não manda número nenhum. 1×/dia.
// ============================================================
import React, { useState } from 'react';
import { CheckCircle2, Loader2, Trophy, Target } from 'lucide-react';
import { useLang } from '../../../i18n/LanguageContext';
import { closeNutritionDay } from '../services/nutriCoach';

const ACCENT = '#22c55e';

export default function DayCloseCard({ consumed, goal, protein, proteinGoal, mealsCount, onClosed }) {
  const { t } = useLang();
  const [state, setState] = useState('idle'); // idle | saving | done
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const canClose = mealsCount >= 2;
  const pct = goal ? Math.round((consumed / goal) * 100) : 0;

  const close = async () => {
    setState('saving'); setErr('');
    try {
      const res = await closeNutritionDay();
      setResult(res);
      setState('done');
      onClosed?.(res);
    } catch (e) {
      setErr(e?.message || t('fitcal.closeError'));
      setState('idle');
    }
  };

  if (state === 'done' && result) {
    return (
      <div className="rounded-2xl border p-4 mb-3"
        style={{ borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}0D` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: ACCENT, color: '#000' }}>
            <Trophy size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold">
              {result.already ? t('fitcal.alreadyClosed') : t('fitcal.dayClosed')}
            </p>
            <p className="text-[9px] font-mono opacity-50 mt-0.5">
              {result.onTarget ? t('fitcal.onTarget') : t('fitcal.offTarget')}
              {result.proteinHit ? ` · ${t('fitcal.proteinHit')}` : ''}
            </p>
          </div>
          {result.xp > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold shrink-0"
              style={{ backgroundColor: ACCENT, color: '#000' }}>+{result.xp} XP</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4 mb-3"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Target size={13} className="opacity-40" />
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-40">
          {t('fitcal.closeTitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-[16px] font-outfit font-black tabular-nums leading-none">
            {Math.round(consumed)}<span className="text-[10px] font-mono opacity-30">/{goal || '—'}</span>
          </p>
          <p className="text-[8px] font-mono opacity-40 uppercase tracking-wider mt-1">kcal · {pct}%</p>
        </div>
        <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-[16px] font-outfit font-black tabular-nums leading-none">
            {Math.round(protein)}<span className="text-[10px] font-mono opacity-30">/{proteinGoal || '—'}g</span>
          </p>
          <p className="text-[8px] font-mono opacity-40 uppercase tracking-wider mt-1">proteína</p>
        </div>
      </div>

      {err && <p className="text-[10px] font-mono text-red-500 mb-2">{err}</p>}

      <button
        onClick={close}
        disabled={state === 'saving' || !canClose}
        className="w-full py-3 rounded-xl font-outfit font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 disabled:opacity-30 transition-all active:scale-[0.98]"
        style={{ backgroundColor: ACCENT, color: '#000' }}
      >
        {state === 'saving' ? <Loader2 size={14} className="animate-spin" />
          : <><CheckCircle2 size={14} /> {t('fitcal.closeDay')}</>}
      </button>
      {!canClose && (
        <p className="text-[8px] font-mono opacity-30 text-center mt-2">{t('fitcal.closeNeedMeals')}</p>
      )}
    </div>
  );
}
