// =============================================================
// ORVAX · Life OS — Body Orchestrator
// Navegação entre 3 telas do módulo Corpo.
// =============================================================
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BodySnapshot } from './BodySnapshot';
import { BodyAnalysis } from './BodyAnalysis';
import { BodyDepth } from './BodyDepth';
import { BODY_MOCK } from '../../data/bodyMockData';
import { diagnoseBody } from '../../engine/bodyEngine';

type Tier = 1 | 2 | 3;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : (dir > 0 ? '100%' : '-100%'),
    opacity: dir === 0 ? 1 : 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

export function BodyOrchestrator({ onBack }: { onBack: () => void }) {
  const [tier, setTier] = useState<Tier>(1);
  const [dir, setDir] = useState(0);
  const diagnosis = useMemo(() => diagnoseBody(BODY_MOCK), []);
  const fwd = (t: Tier) => { setDir(1); setTier(t); };
  const bk = (t: Tier) => { setDir(-1); setTier(t); };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {tier === 1 && (
          <motion.div key="snap" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <BodySnapshot data={BODY_MOCK.snapshot} diagnosis={diagnosis} onAnalyze={() => fwd(2)} onBack={onBack} />
          </motion.div>
        )}
        {tier === 2 && (
          <motion.div key="analysis" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <BodyAnalysis data={BODY_MOCK} diagnosis={diagnosis} onDepth={() => fwd(3)} onBack={() => bk(1)} />
          </motion.div>
        )}
        {tier === 3 && (
          <motion.div key="depth" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <BodyDepth data={BODY_MOCK} diagnosis={diagnosis} onBack={() => bk(2)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
