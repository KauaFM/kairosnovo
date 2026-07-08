// =============================================================
// ORVAX · AchievementCardModal — modal de detalhe da carta.
//
// Acionado ao clicar numa carta do AchievementsGrid.
//   · unlocked → mostra carta em preview + frase + data
//   · locked   → mostra carta locked + XP que falta + dica
// =============================================================
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles } from 'lucide-react';
import type { Rank } from '../data/ranks';
import { EvolutionCard } from './EvolutionCard';

interface Props {
  rank: Rank | null;
  /** XP atual do usuário · pra mostrar quanto falta no caso locked */
  currentXp:  number;
  /** ISO date · null = nunca desbloqueado · undefined = desbloqueado mas sem timestamp */
  unlockedAt?: string | null;
  open: boolean;
  onClose: () => void;
}

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

export function AchievementCardModal({
  rank, currentXp, unlockedAt, open, onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  if (!rank) return null;

  const isLocked  = unlockedAt === null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            className="absolute inset-0 bg-zinc-950/82 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full
              bg-zinc-900/80 border border-white/10 text-zinc-400
              hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Fechar"
          >
            <X size={16} className="m-auto" strokeWidth={2.2} />
          </button>

          <motion.div
            className="relative z-10 flex flex-col items-center max-w-[320px] w-full"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Status header */}
            <div className="text-center mb-5">
              <p className={[
                'text-[10px] font-mono tracking-[0.32em] uppercase font-bold',
                isLocked ? 'text-zinc-400' : 'text-emerald-400',
              ].join(' ')}>
                {isLocked ? 'carta bloqueada' : 'carta desbloqueada'}
              </p>
            </div>

            {isLocked ? (
              <EvolutionCard rank={rank} mode="locked" currentXp={currentXp} />
            ) : (
              <EvolutionCard rank={rank} mode="preview" unlockedAt={unlockedAt ?? undefined} />
            )}

            {/* Detalhes abaixo da carta */}
            <div className="mt-6 w-full text-center">
              {isLocked ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Lock size={12} className="text-zinc-400" />
                    <p className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
                      requer {rank.xpRequired.toLocaleString('pt-BR')} XP
                    </p>
                  </div>
                  <p className="text-[13px] leading-relaxed text-zinc-300">
                    Continue evoluindo no sistema. Cada ação registrada via
                    WhatsApp Agent acumula XP — quando atingir o limiar,
                    a carta {rank.name} aparece em raspadinha.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[14px] leading-snug text-zinc-100 whitespace-pre-line">
                    {rank.phrase}
                  </p>
                  <p className="mt-3 text-[10px] font-mono tracking-widest uppercase text-emerald-400">
                    <Sparkles size={11} className="inline -mt-0.5 mr-1" />
                    {rank.progressMsg}
                  </p>
                  {unlockedAt && (
                    <p className="mt-3 text-[10px] font-mono tracking-wider text-zinc-500">
                      Desbloqueada em {unlockedAt}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
