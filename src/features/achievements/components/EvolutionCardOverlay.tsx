// =============================================================
// ORVAX · EvolutionCardOverlay — overlay full-screen do unlock.
//
// 3 fases:
//   1. INTRO       · backdrop fade + carta entra (sealed) com texto
//   2. SCRATCH     · usuário raspa · auto-passa pra REVEAL ao atingir threshold
//   3. REVEAL      · conteúdo aparece + frase + progressMsg + botão "Guardar"
//
// Portal pra document.body · escapa qualquer stacking context.
// =============================================================
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import type { Rank } from '../data/ranks';
import { EvolutionCard } from './EvolutionCard';

interface Props {
  rank:    Rank;
  open:    boolean;
  /** chamado quando o usuário aperta "Guardar" · marca como visto */
  onSave:  () => void;
  /** chamado quando fecha sem salvar (X) — opcional */
  onDismiss?: () => void;
}

type Phase = 'intro' | 'scratch' | 'revealed';

export function EvolutionCardOverlay({ rank, open, onSave, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('intro');

  // Lock scroll quando aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setPhase('intro');
    // Pequeno delay pra deixar a animação respirar
    const t = setTimeout(() => setPhase('scratch'), 1200);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md"
            onClick={onDismiss}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Botão fechar (top-right) */}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full
                bg-zinc-900/80 border border-white/10 text-zinc-400
                hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Fechar"
            >
              <X size={16} className="m-auto" strokeWidth={2.2} />
            </button>
          )}

          {/* Conteúdo central */}
          <div className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
            {/* Header tipográfico · com nome do rank desde a intro */}
            <AnimatePresence mode="wait">
              {phase === 'intro' && (
                <motion.div
                  key="intro-text"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="text-center mb-5"
                >
                  <p className="text-[10px] font-mono tracking-[0.32em] uppercase
                    text-emerald-400 font-bold mb-2">
                    Você atingiu · rank {String(rank.ordinal).padStart(2, '0')}/12
                  </p>
                  <h1 className="text-[36px] font-bold text-white leading-none tracking-tight">
                    {rank.name}
                  </h1>
                  <p className="mt-2 text-[11px] font-mono tracking-wider text-zinc-400">
                    {rank.subtitle}
                  </p>
                </motion.div>
              )}

              {phase === 'scratch' && (
                <motion.div
                  key="scratch-text"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center mb-4"
                >
                  <p className="text-[10px] font-mono tracking-[0.32em] uppercase
                    text-emerald-400 font-bold mb-1">
                    rank {String(rank.ordinal).padStart(2, '0')}/12
                  </p>
                  <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">
                    {rank.name}
                  </h1>
                  <p className="mt-2 text-[10px] font-mono tracking-[0.32em] uppercase text-zinc-500">
                    raspe pra revelar a carta
                  </p>
                </motion.div>
              )}

              {phase === 'revealed' && (
                <motion.div
                  key="rev-text"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center mb-4"
                >
                  <p className="text-[10px] font-mono tracking-[0.32em] uppercase
                    text-emerald-400 font-bold">
                    ✦ revelado
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Carta · sempre montada · muda de mode */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {phase !== 'revealed' ? (
                <EvolutionCard
                  rank={rank}
                  mode="sealed"
                  onReveal={() => {
                    // pequena pausa pra o sweep clear do canvas terminar
                    setTimeout(() => setPhase('revealed'), 250);
                  }}
                />
              ) : (
                <EvolutionCard rank={rank} mode="revealed" />
              )}
            </motion.div>

            {/* Bloco revelado: frase + progressMsg + botão Guardar */}
            <AnimatePresence>
              {phase === 'revealed' && (
                <motion.div
                  className="mt-6 w-full text-center"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                >
                  <p className="text-[14px] font-medium leading-snug text-zinc-100
                    whitespace-pre-line">
                    {rank.phrase}
                  </p>
                  <p className="mt-3 text-[10px] font-mono tracking-widest uppercase
                    text-emerald-400">
                    ✦ {rank.progressMsg}
                  </p>

                  <motion.button
                    type="button"
                    onClick={onSave}
                    className="mt-6 w-full h-12 rounded-2xl
                      bg-emerald-500 text-white shadow-lg shadow-emerald-500/40
                      hover:bg-emerald-600 active:scale-[0.99] transition-all
                      flex items-center justify-center gap-2
                      text-[12px] font-bold tracking-[0.22em] uppercase"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <Check size={14} strokeWidth={2.6} />
                    Guardar carta
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
