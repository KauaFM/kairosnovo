// =============================================================
// ORVAX · PillarLayered — orquestrador genérico 2-camadas.
//
// Substitui a duplicação Mind/Body por um único componente.
// Adicionar pilar = 1 config no registry. Zero código novo.
//
// Mantém:
//   ✓ separação operacional (dia/semana) · estratégica (mês/ano)
//   ✓ isolamento por área (radar interno only)
//   ✓ storytelling do diagnose
//   ✓ problema principal + ação imediata + previsão + verdade + direção
// =============================================================
import React, { useState } from 'react';
import { PillarOperationalView } from './PillarOperationalView';
import { PillarStrategicView } from './PillarStrategicView';
import type {
  PillarLayeredConfig, PillarLayeredData, PillarLayeredDiagnosis,
} from './types';

type Layer = 'operational' | 'strategic';

interface Props {
  config:    PillarLayeredConfig;
  data:      PillarLayeredData;
  diagnosis: PillarLayeredDiagnosis;
  onBack:    () => void;
}

export function PillarLayered({ config, data, diagnosis, onBack }: Props) {
  const [layer, setLayer] = useState<Layer>('operational');

  const goStrategic   = () => setLayer('strategic');
  const goOperational = () => setLayer('operational');

  return (
    <div className="fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto overflow-x-hidden">
      {layer === 'operational' ? (
        <PillarOperationalView
          config={config}
          data={data}
          diagnosis={diagnosis}
          onStrategic={goStrategic}
          onBack={onBack}
        />
      ) : (
        <PillarStrategicView
          config={config}
          data={data}
          diagnosis={diagnosis}
          onOperational={goOperational}
          onBack={onBack}
        />
      )}
    </div>
  );
}
