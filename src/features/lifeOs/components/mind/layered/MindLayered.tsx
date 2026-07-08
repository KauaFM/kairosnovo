// =============================================================
// ORVAX · MindLayered — orquestrador 2-camadas para Mente.
//
// Substitui o modelo "3 telas genéricas" pela organização por
// horizonte de tempo:
//   · CAMADA 1 — Operacional  (dia + semana)  → tomada de decisão imediata
//   · CAMADA 2 — Estratégica  (mês + ano)     → direção de vida
//
// Default: Operacional (responde "o que tá acontecendo hoje?")
// CTA final: switch para Estratégica  (responde "pra onde minha vida tá indo?")
//
// Co-existe com MindOrchestrator (3-tier) — não substitui; é roteado
// alternativamente em MetricsPage. Mesmas fontes de dados (MIND_MOCK + diagnose).
// =============================================================
import React, { useMemo, useState } from 'react';
import { OperationalView } from './OperationalView';
import { StrategicView } from './StrategicView';
import { MIND_MOCK } from '../../../data/mindMockData';
import { diagnose } from '../../../engine/mindEngine';

type Layer = 'operational' | 'strategic';

interface Props {
  onBack: () => void;
}

export function MindLayered({ onBack }: Props) {
  const [layer, setLayer] = useState<Layer>('operational');

  // Diagnose once — distribui pra ambas camadas
  const diagnosis = useMemo(() => diagnose(MIND_MOCK), []);

  const goStrategic   = () => setLayer('strategic');
  const goOperational = () => setLayer('operational');

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      {layer === 'operational' ? (
        <OperationalView
          data={MIND_MOCK}
          diagnosis={diagnosis}
          onStrategic={goStrategic}
          onBack={onBack}
        />
      ) : (
        <StrategicView
          data={MIND_MOCK}
          diagnosis={diagnosis}
          onOperational={goOperational}
          onBack={onBack}
        />
      )}
    </div>
  );
}
