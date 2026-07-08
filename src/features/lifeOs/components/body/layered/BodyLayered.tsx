// =============================================================
// ORVAX · BodyLayered — orquestrador 2-camadas para Saúde/Corpo.
//
//   · CAMADA 1 — Operacional  (dia + semana)  → tomada de decisão imediata
//   · CAMADA 2 — Estratégica  (mês + ano)     → direção de vida
//
// Mesma arquitetura de MindLayered. Reusa BODY_MOCK + bodyEngine.diagnose().
// Mantém o BodyOrchestrator (3-tier) vivo no codebase como rota alternativa.
// =============================================================
import React, { useMemo, useState } from 'react';
import { BodyOperationalView } from './BodyOperationalView';
import { BodyStrategicView } from './BodyStrategicView';
import { BODY_MOCK } from '../../../data/bodyMockData';
import { diagnoseBody } from '../../../engine/bodyEngine';

type Layer = 'operational' | 'strategic';

interface Props {
  onBack: () => void;
}

export function BodyLayered({ onBack }: Props) {
  const [layer, setLayer] = useState<Layer>('operational');

  const diagnosis = useMemo(() => diagnoseBody(BODY_MOCK), []);

  const goStrategic   = () => setLayer('strategic');
  const goOperational = () => setLayer('operational');

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      {layer === 'operational' ? (
        <BodyOperationalView
          data={BODY_MOCK}
          diagnosis={diagnosis}
          onStrategic={goStrategic}
          onBack={onBack}
        />
      ) : (
        <BodyStrategicView
          data={BODY_MOCK}
          diagnosis={diagnosis}
          onOperational={goOperational}
          onBack={onBack}
        />
      )}
    </div>
  );
}
