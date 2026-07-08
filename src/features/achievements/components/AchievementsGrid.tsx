// =============================================================
// ORVAX · AchievementsGrid — coleção · 2 colunas mobile.
//
// Cada slot é uma EvolutionCard ·
//   · desbloqueado → mode="preview" + data
//   · bloqueado    → mode="locked" + progresso até o XP
//
// A carta é desenhada em 280×380 (px fixos). No grid ela é renderizada
// nesse tamanho natural e ESCALADA via transform pra caber na célula —
// assim o tipográfico não estoura (bug dos nomes saindo do card) e o
// design mantém proporção exata.
//
// Tap em qualquer carta abre o AchievementCardModal.
// =============================================================
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Rank } from '../data/ranks';
import { EvolutionCard } from './EvolutionCard';

const BASE_W = 280;
const BASE_H = 380;

// Mede a célula e escala a carta (tamanho natural) pra preencher sem distorcer.
function ScaledCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setScale(w / BASE_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden rounded-3xl">
      <div
        className="origin-top-left"
        style={{ width: BASE_W, height: BASE_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

interface Props {
  ranks:        Rank[];
  /** XP atual do usuário · pra calcular quais estão desbloqueadas */
  currentXp:    number;
  /** map slug → ISO date · entradas presentes = unlocked */
  unlockedMap:  Record<string, string>;
  onSelect:     (rank: Rank) => void;
}

export function AchievementsGrid({
  ranks, currentXp, unlockedMap, onSelect,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {ranks.map((rank, i) => {
        const isUnlocked = currentXp >= rank.xpRequired;
        const at         = unlockedMap[rank.slug];
        return (
          <motion.button
            key={rank.slug}
            type="button"
            onClick={() => onSelect(rank)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.4, ease: 'easeOut' }}
            className="relative w-full aspect-[280/380] rounded-3xl overflow-hidden
              transition-transform duration-200
              hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/15
              active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label={isUnlocked ? `Ver carta ${rank.name}` : `Carta bloqueada · faltam XP`}
          >
            {/* Carta em tamanho natural · escalada pra célula (tilt OFF no grid) */}
            <ScaledCard>
              {isUnlocked ? (
                <EvolutionCard rank={rank} mode="preview" unlockedAt={at} tilt={false} />
              ) : (
                <EvolutionCard rank={rank} mode="locked" currentXp={currentXp} tilt={false} />
              )}
            </ScaledCard>
          </motion.button>
        );
      })}
    </div>
  );
}
