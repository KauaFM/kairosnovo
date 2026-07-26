// ============================================================
// ORVAX FitCal — Minhas refeições (VITALIS · N3)
// A pessoa come as mesmas ~20 coisas: reusar com 1 toque bate
// qualquer cardápio de 7 dias que ninguém segue.
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { Star, Plus, Loader2, Check, X } from 'lucide-react';
import { useLang } from '../../../i18n/LanguageContext';
import { listFavorites, logFavorite, deleteFavorite } from '../services/nutriCoach';

const ACCENT = '#22c55e';

export default function FavoriteMeals({ onLogged }) {
  const { t } = useLang();
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [doneId, setDoneId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFavs(await listFavorites()); }
    catch (e) { console.error('[favorites]', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const log = async (fav) => {
    setBusyId(fav.id);
    try {
      await logFavorite(fav);
      setDoneId(fav.id);
      setTimeout(() => setDoneId(null), 1500);
      onLogged?.();
      load();
    } catch (e) { console.error('[favorites] log:', e); }
    finally { setBusyId(null); }
  };

  const remove = async (id) => {
    setFavs((p) => p.filter((f) => f.id !== id));
    await deleteFavorite(id).catch(() => load());
  };

  if (loading) return null;
  if (!favs.length) return null; // sem favoritas ainda → não polui a tela

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2 px-1">
        <Star size={11} className="opacity-30" />
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest opacity-40">
          {t('fitcal.myMeals')}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {favs.map((f) => (
          <div key={f.id}
            className="shrink-0 w-[168px] rounded-2xl border p-3 relative group"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
            <button onClick={() => remove(f.id)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-40 hover:!opacity-90 transition-opacity"
              aria-label="Remover"><X size={11} /></button>

            <p className="text-[11px] font-bold leading-tight pr-4 line-clamp-2">{f.name}</p>
            {f.portion && <p className="text-[8px] font-mono opacity-35 mt-0.5 truncate">{f.portion}</p>}

            <div className="flex items-center gap-1.5 mt-2 mb-2.5">
              <span className="text-[13px] font-outfit font-black tabular-nums">{f.kcal}</span>
              <span className="text-[8px] font-mono opacity-35">kcal · P{f.protein_g}g</span>
            </div>

            <button onClick={() => log(f)} disabled={busyId === f.id}
              className="w-full py-2 rounded-xl text-[9px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={doneId === f.id
                ? { backgroundColor: ACCENT, color: '#000' }
                : { border: '1px solid var(--border-color)' }}>
              {busyId === f.id ? <Loader2 size={11} className="animate-spin" />
                : doneId === f.id ? <><Check size={11} strokeWidth={3} /> {t('fitcal.added')}</>
                : <><Plus size={11} /> {t('fitcal.addQuick')}</>}
            </button>

            {f.times_used > 0 && (
              <p className="text-[7px] font-mono opacity-25 text-center mt-1.5">
                {t('fitcal.usedTimes', { n: f.times_used })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
