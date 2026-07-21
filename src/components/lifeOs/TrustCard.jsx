// =============================================================
// ORVAX · VERITAS F2.1 — TrustCard (Índice de Integridade)
// Mostra o Trust Score (0–100), a faixa e os últimos eventos.
// Transparência total: o usuário vê o placar e o que o moveu.
// =============================================================
import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../i18n/LanguageContext';

const ACCENT = '#22c55e';

function band(score, t) {
  if (score >= 90) return { label: t('trust.band90'), color: ACCENT };
  if (score >= 70) return { label: t('trust.band70'), color: '#84cc16' };
  if (score >= 40) return { label: t('trust.band40'), color: '#eab308' };
  return { label: t('trust.band0'), color: '#f97316' };
}

export default function TrustCard() {
  const { t } = useLang();
  const [score, setScore] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const [ts, ev] = await Promise.all([
        supabase.from('trust_scores').select('score').eq('user_id', user.id).maybeSingle(),
        supabase.from('trust_events').select('delta, reason, created_at')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);
      if (!alive) return;
      setScore(ts.data?.score ?? 50); // nasce neutro
      setEvents(ev.data ?? []);
    })();
    return () => { alive = false; };
  }, []);

  if (score == null) return null;
  const b = band(score, t);
  const reasonLabel = (r) => t('trust.reason.' + r) !== 'trust.reason.' + r ? t('trust.reason.' + r) : r;

  return (
    <div className="mx-4 mb-6 rounded-[22px] border p-4"
      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-50 flex items-center gap-1.5">
          <ShieldCheck size={12} style={{ color: b.color }} /> {t('trust.title')}
        </span>
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color: b.color, border: `1px solid ${b.color}44` }}>{b.label}</span>
      </div>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-[34px] font-outfit font-black leading-none tabular-nums" style={{ color: b.color }}>{Math.round(score)}</span>
        <span className="text-[11px] font-mono opacity-30 mb-1">/ 100</span>
      </div>

      <div className="h-[4px] rounded-full bg-current/10 overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: b.color }} />
      </div>

      <p className="text-[9px] font-mono opacity-35 leading-snug mb-3">{t('trust.explain')}</p>

      {events.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-current/10">
          {events.map((e, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] font-mono">
              <span className="opacity-50 truncate">{reasonLabel(e.reason)}</span>
              <span className="font-bold tabular-nums" style={{ color: e.delta >= 0 ? ACCENT : '#f97316' }}>
                {e.delta >= 0 ? '+' : ''}{e.delta}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
