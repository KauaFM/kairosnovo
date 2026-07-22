// Compass — Conselho de IAs (Protocolo VERITAS · F5)
// Insights e desafios semanais dos especialistas (VITALIS, NOÛS, FORGE…),
// gerados server-side pelo dimension-coach a partir de métricas REAIS.
// Toda recomendação exibe o dado que a sustenta (explicabilidade).
import { useEffect, useState } from 'react';
import { BrainCircuit, Lightbulb, Swords, AlertTriangle, ClipboardList, Loader2 } from 'lucide-react';
import { getWeeklyCouncil } from '../../../../services/council';
import { useLang } from '../../../../i18n/LanguageContext';

interface CouncilItem {
  dimension: string;
  specialist: string;
  kind: string;
  title: string;
  body: string;
  data_ref: string;
}

const KIND_ICON: Record<string, typeof Lightbulb> = {
  insight: Lightbulb, challenge: Swords, risk: AlertTriangle, plan: ClipboardList, correction: AlertTriangle,
};

export function CouncilCard() {
  const { t } = useLang();
  const [items, setItems] = useState<CouncilItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    getWeeklyCouncil()
      .then((rows) => { if (alive) setItems(rows as CouncilItem[]); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, []);

  if (items !== null && items.length === 0) return null; // sem conselho → sem card

  return (
    <div className="bg-white dark:bg-zinc-900/60 rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/60 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center">
          <BrainCircuit size={14} />
        </div>
        <div>
          <h3 className="text-[10px] font-mono font-bold tracking-[0.3em] uppercase text-zinc-700 dark:text-zinc-200">
            {t('council.title')}
          </h3>
          <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
            {t('council.sub')}
          </p>
        </div>
      </div>

      {items === null ? (
        <div className="py-6 flex items-center justify-center gap-2 text-zinc-400">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-[9px] font-mono uppercase tracking-widest">{t('council.loading')}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => {
            const Icon = KIND_ICON[it.kind] || Lightbulb;
            return (
              <div key={i} className="rounded-2xl border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-mono font-bold tracking-[0.25em] uppercase text-zinc-500 dark:text-zinc-400">
                    {it.specialist}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200/60 dark:bg-white/[0.06] text-[7px] font-mono font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                    <Icon size={8} /> {t('council.kind.' + it.kind)}
                  </span>
                </div>
                <p className="text-[12px] font-outfit font-bold dark:text-white/90 leading-snug">{it.title}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">{it.body}</p>
                {it.data_ref && (
                  <p className="text-[8px] font-mono text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mt-2 border-t border-zinc-100 dark:border-white/[0.04] pt-2">
                    ▸ {it.data_ref}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
