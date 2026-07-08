// =============================================================
// ORVAX · AchievementsPage — aba completa de conquistas.
//
// Header · progresso global · grid · modal de detalhe.
// Self-contained · só precisa de currentXp + unlockedMap (persistido externamente).
// =============================================================
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Award, ChevronLeft, Sparkles } from 'lucide-react';
import {
  RANKS, getCurrentRank, getRankProgress,
} from '../data/ranks';
import type { Rank } from '../data/ranks';
import { AchievementsGrid } from './AchievementsGrid';
import { AchievementCardModal } from './AchievementCardModal';

interface Props {
  /** XP total acumulado do usuário */
  currentXp: number;
  /** map slug → ISO date · slugs presentes = desbloqueadas */
  unlockedMap?: Record<string, string>;
  /** opcional · botão de voltar no topo */
  onBack?: () => void;
}

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

export function AchievementsPage({
  currentXp, unlockedMap = {}, onBack,
}: Props) {
  const [selected, setSelected] = useState<Rank | null>(null);

  const currentRank = getCurrentRank(currentXp);
  const progress    = getRankProgress(currentXp);

  // Conta cartas desbloqueadas via XP threshold (não depende do unlockedMap)
  const unlockedCount = RANKS.filter(r => currentXp >= r.xpRequired).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-zinc-50/80 dark:bg-zinc-950/80
        border-b border-zinc-200 dark:border-zinc-800 px-5 py-3 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`w-9 h-9 rounded-full flex items-center justify-center
              ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
            aria-label="Voltar"
          >
            <ChevronLeft size={18} strokeWidth={2.2} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
            Coleção · cartas de evolução
          </p>
          <h1 className={`text-[15px] font-bold leading-tight truncate ${T_STRONG}`}>
            <Award size={14} className="inline -mt-0.5 mr-1.5 text-emerald-500" />
            Conquistas
          </h1>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
          bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30">
          <span className="text-[9px] font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
            {unlockedCount}/{RANKS.length}
          </span>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">

        {/* Card de progresso · monocromático · esmeralda só na barra */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={[
            'rounded-3xl p-6 relative overflow-hidden',
            'bg-white dark:bg-zinc-950',
            'border border-zinc-200 dark:border-zinc-800',
          ].join(' ')}
        >
          {/* Tick marks geométricos */}
          <span className="absolute top-3 left-3 w-2 h-px bg-zinc-300 dark:bg-zinc-700" />
          <span className="absolute top-3 left-3 w-px h-2 bg-zinc-300 dark:bg-zinc-700" />
          <span className="absolute top-3 right-3 w-2 h-px bg-zinc-300 dark:bg-zinc-700" />
          <span className="absolute top-3 right-3 w-px h-2 bg-zinc-300 dark:bg-zinc-700" />

          <div className="flex items-start justify-between mb-1">
            <p className={`text-[9px] font-mono tracking-[0.32em] uppercase font-bold
              text-zinc-500 dark:text-zinc-500`}>
              rank atual
            </p>
            <p className={`text-[9px] font-mono tracking-[0.28em] uppercase tabular-nums
              text-zinc-400 dark:text-zinc-500`}>
              {currentRank.ordinal} <span className="opacity-50">/</span> {RANKS.length}
            </p>
          </div>

          <h2 className={`text-[28px] font-black tracking-tight leading-none uppercase ${T_STRONG}`}>
            {currentRank.name}
          </h2>
          <p className={`mt-2 text-[11px] font-mono italic ${T_LABEL}`}>
            «&nbsp;{currentRank.subtitle}&nbsp;»
          </p>

          {/* Hairline */}
          <div className="my-4 h-px bg-zinc-200 dark:bg-zinc-800" />

          {/* Próximo + barra · esmeralda mínima */}
          {progress.next ? (
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                <span className={`tracking-[0.22em] uppercase ${T_MUTED}`}>
                  Próximo · <span className={T_NORMAL}>{progress.next.name}</span>
                </span>
                <span className={`tabular-nums font-bold ${T_NORMAL}`}>
                  {progress.remaining.toLocaleString('pt-BR')} XP
                </span>
              </div>
              <div className="h-[3px] rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.pct * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className={`mt-2 flex items-center gap-2`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className={`text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
                  {Math.round(progress.pct * 100)}% até o próximo rank
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <p className={`text-[10px] font-mono tracking-[0.32em] uppercase font-bold ${T_STRONG}`}>
                Topo da pirâmide · Soberano
              </p>
            </div>
          )}
        </motion.div>

        {/* Grid */}
        <div>
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} mb-3`}>
            Coleção · {RANKS.length} cartas
          </p>
          <AchievementsGrid
            ranks={RANKS}
            currentXp={currentXp}
            unlockedMap={unlockedMap}
            onSelect={setSelected}
          />
        </div>

      </div>

      {/* Modal de detalhe */}
      <AchievementCardModal
        rank={selected}
        currentXp={currentXp}
        unlockedAt={
          selected
            ? (currentXp >= selected.xpRequired
                ? (unlockedMap[selected.slug] ?? '')
                : null)
            : null
        }
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
