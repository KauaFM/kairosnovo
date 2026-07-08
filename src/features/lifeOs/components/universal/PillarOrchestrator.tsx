// =============================================================
// ORVAX · Life OS — Universal Pillar Orchestrator
// Navegação entre 3 telas para qualquer pilar config-driven.
// =============================================================
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PillarSnapshot } from './PillarSnapshot';
import { PillarAnalysis } from './PillarAnalysis';
import { PillarDepth } from './PillarDepth';
import { buildPillarIntelData, PILLAR_INTEL_CONFIGS } from '../../data/pillarIntelConfig';
import { diagnosePillar } from '../../engine/pillarEngine';

type Tier = 1 | 2 | 3;
const slideVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : (dir > 0 ? '100%' : '-100%'),
    opacity: dir === 0 ? 1 : 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
};

interface Props { pillarKey: string; onBack: () => void; }

export function PillarOrchestrator({ pillarKey, onBack }: Props) {
  const config = PILLAR_INTEL_CONFIGS[pillarKey];
  const data = useMemo(() => buildPillarIntelData(pillarKey), [pillarKey]);
  const diagnosis = useMemo(() => diagnosePillar(data, config), [data, config]);
  const [tier, setTier] = useState<Tier>(1);
  const [dir, setDir] = useState(0);
  const fwd = (t: Tier) => { setDir(1); setTier(t); };
  const bk = (t: Tier) => { setDir(-1); setTier(t); };

  if (!config) return <div className="p-8 text-zinc-500 font-mono text-sm">Pilar "{pillarKey}" não configurado.</div>;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {tier === 1 && (
          <motion.div key="snap" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <PillarSnapshot data={data.snapshot} diagnosis={diagnosis} config={config} onAnalyze={() => fwd(2)} onBack={onBack} />
          </motion.div>
        )}
        {tier === 2 && (
          <motion.div key="analysis" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <PillarAnalysis data={data} diagnosis={diagnosis} config={config} onDepth={() => fwd(3)} onBack={() => bk(1)} />
          </motion.div>
        )}
        {tier === 3 && (
          <motion.div key="depth" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>
            <PillarDepth data={data} diagnosis={diagnosis} config={config} onBack={() => bk(2)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
