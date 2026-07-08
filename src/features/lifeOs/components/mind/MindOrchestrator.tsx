// =============================================================
// ORVAX · Life OS — Mind Orchestrator
//
// Controla navegação entre as 3 telas do módulo Mente.
// Chama mindEngine.diagnose() uma vez e distribui resultados.
// Animações de transição com slide direction.
// =============================================================
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MindSnapshot } from './MindSnapshot';
import { MindAnalysis } from './MindAnalysis';
import { MindDepth } from './MindDepth';
import { MIND_MOCK } from '../../data/mindMockData';
import { diagnose } from '../../engine/mindEngine';

type MindTier = 1 | 2 | 3;

interface Props {
  onBack: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    // direction=0 (mount inicial) → entra sem deslocamento
    x: direction === 0 ? 0 : (direction > 0 ? '100%' : '-100%'),
    opacity: direction === 0 ? 1 : 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

export function MindOrchestrator({ onBack }: Props) {
  const [tier, setTier] = useState<MindTier>(1);
  const [direction, setDirection] = useState(0);

  // Diagnose once, distribute everywhere
  const diagnosis = useMemo(() => diagnose(MIND_MOCK), []);

  const goForward = (next: MindTier) => {
    setDirection(1);
    setTier(next);
  };

  const goBack = (prev: MindTier) => {
    setDirection(-1);
    setTier(prev);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        {tier === 1 && (
          <motion.div
            key="snap"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <MindSnapshot
              data={MIND_MOCK.snapshot}
              diagnosis={diagnosis}
              onAnalyze={() => goForward(2)}
              onBack={onBack}
            />
          </motion.div>
        )}

        {tier === 2 && (
          <motion.div
            key="analysis"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <MindAnalysis
              data={MIND_MOCK}
              diagnosis={diagnosis}
              onDepth={() => goForward(3)}
              onBack={() => goBack(1)}
            />
          </motion.div>
        )}

        {tier === 3 && (
          <motion.div
            key="depth"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <MindDepth
              data={MIND_MOCK}
              diagnosis={diagnosis}
              onBack={() => goBack(2)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
