// =============================================================
// ORVAX · Life OS — Finance Orchestrator
// =============================================================
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FinanceSnapshot } from './FinanceSnapshot';
import { FinanceAnalysis } from './FinanceAnalysis';
import { FinanceDepth } from './FinanceDepth';
import { FINANCE_MOCK } from '../../data/financeMockData';
import { diagnoseFinance } from '../../engine/financeEngine';

type Tier = 1 | 2 | 3;
const slideVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : (dir > 0 ? '100%' : '-100%'),
    opacity: dir === 0 ? 1 : 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

export function FinanceOrchestrator({ onBack }: { onBack: () => void }) {
  const [tier, setTier] = useState<Tier>(1);
  const [dir, setDir] = useState(0);
  const diagnosis = useMemo(() => diagnoseFinance(FINANCE_MOCK), []);
  const fwd = (t: Tier) => { setDir(1); setTier(t); };
  const bk = (t: Tier) => { setDir(-1); setTier(t); };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {tier === 1 && (
          <motion.div key="snap" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <FinanceSnapshot data={FINANCE_MOCK.snapshot} diagnosis={diagnosis} onAnalyze={() => fwd(2)} onBack={onBack} />
          </motion.div>
        )}
        {tier === 2 && (
          <motion.div key="analysis" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <FinanceAnalysis data={FINANCE_MOCK} diagnosis={diagnosis} onDepth={() => fwd(3)} onBack={() => bk(1)} />
          </motion.div>
        )}
        {tier === 3 && (
          <motion.div key="depth" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <FinanceDepth data={FINANCE_MOCK} diagnosis={diagnosis} onBack={() => bk(2)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
