// =============================================================
// ORVAX · VERITAS F6 — SeasonCard (Temporada)
// Duas moedas: XP vitalício (rank, nunca some) e XP SAZONAL
// (Arena, zera a cada trimestre — fresh start effect).
// Mostra: temporada atual, XP sazonal, posição e dias restantes.
// =============================================================
import React, { useEffect, useState } from 'react';
import { Trophy, Hourglass } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLang } from '../../i18n/LanguageContext';

export default function SeasonCard() {
  const { t } = useLang();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc('veritas_season_info');
        if (error) throw error;
        if (alive) setInfo(data);
      } catch (e) {
        console.warn('[season] info falhou:', e?.message || e);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (!info) return null;

  return (
    <div className="mx-4 mb-6 rounded-[22px] border p-4"
      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-50 flex items-center gap-1.5">
          <Trophy size={12} /> {info.name || t('season.title')}
        </span>
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1"
          style={{ borderColor: 'var(--border-color)' }}>
          <Hourglass size={9} /> {t('season.daysLeft', { n: info.days_left })}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-end gap-2">
            <span className="text-[34px] font-outfit font-black leading-none tabular-nums">{info.season_xp}</span>
            <span className="text-[11px] font-mono opacity-30 mb-1">{t('season.xp')}</span>
          </div>
          <p className="text-[9px] font-mono opacity-35 mt-2 leading-snug">{t('season.explain')}</p>
        </div>
        {info.position != null && (
          <div className="text-right">
            <span className="text-[20px] font-outfit font-black tabular-nums leading-none">#{info.position}</span>
            <p className="text-[8px] font-mono opacity-40 uppercase tracking-widest mt-1">{t('season.position')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
