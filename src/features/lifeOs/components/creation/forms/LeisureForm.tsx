// =============================================================
// ORVAX · LeisureForm — Lazer / Recuperação
// Descansou · tipo de lazer · nível de recuperação
// =============================================================
import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Battery, Gamepad2 } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';
import { SubmitBar } from './shared/SubmitBar';
import { Slider } from './shared/Slider';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const TIPOS: { label: string; icon: keyof typeof Icons }[] = [
  { label: 'Filme/Série', icon: 'Tv' },
  { label: 'Música',      icon: 'Music' },
  { label: 'Jogo',        icon: 'Gamepad2' },
  { label: 'Sair',        icon: 'MapPin' },
  { label: 'Hobby',       icon: 'Palette' },
  { label: 'Família',     icon: 'Users' },
  { label: 'Sono extra',  icon: 'Moon' },
  { label: 'Nada',        icon: 'CircleSlash' },
];

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function LeisureForm({ onSubmit }: Props) {
  const [rested,  setRested]  = useState<boolean | null>(null);
  const [tipo,    setTipo]    = useState<string | null>(null);
  const [recovery, setRecovery] = useState(6);

  const valid = rested !== null && tipo !== null;

  const xp = useMemo(() => {
    let total = 10;
    if (rested)         total += 20;
    if (recovery >= 7)  total += 15;
    if (tipo === 'Nada' && rested === false) total = 5; // honestidade conta pouco aqui
    return total;
  }, [rested, recovery, tipo]);

  const projection = useMemo(() => {
    if (rested && recovery >= 7) {
      return {
        intent: 'positive' as const,
        text: 'Você terá entendido que descanso é parte do treino, não interrupção dele. Performance sustentável vira hábito.',
      };
    }
    if (rested === false || tipo === 'Nada') {
      return {
        intent: 'warning' as const,
        text: 'Descanso negligenciado vira fadiga crônica. Em 1 ano você acorda cansado e culpa o trabalho — o problema é que nunca recarregou.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Reconhecer o tipo de lazer que recarrega você é poder. Cada registro afina a calibragem do seu sistema de recuperação.',
    };
  }, [rested, recovery, tipo]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        rested,
        leisure_type:    tipo,
        recovery_score:  recovery,
      },
      xp,
    );
  };

  return (
    <div className="space-y-5">
      {/* Descansou */}
      <div>
        <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          <Battery size={13} className="text-emerald-500" /> Descansou hoje?
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRested(false)}
            className={[
              'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
              rested === false
                ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
                : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
            ].join(' ')}
          >Não</button>
          <button
            type="button"
            onClick={() => setRested(true)}
            className={[
              'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
              rested === true
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
            ].join(' ')}
          >Sim</button>
        </div>
      </div>

      {/* Tipo de lazer */}
      <div>
        <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          <Gamepad2 size={13} className="text-emerald-500" /> Tipo de lazer
        </label>
        <div className="grid grid-cols-4 gap-2">
          {TIPOS.map((t) => {
            const Icon = (Icons[t.icon] as React.ComponentType<{ size?: number; strokeWidth?: number }>) || Icons.Circle;
            const active = tipo === t.label;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setTipo(t.label)}
                className={[
                  'flex flex-col items-center justify-center gap-1.5 h-[78px] rounded-2xl border transition-all',
                  active
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                       hover:border-emerald-500/40 hover:-translate-y-0.5`,
                ].join(' ')}
              >
                <Icon size={16} strokeWidth={1.8} />
                <span className="text-[9px] font-mono tracking-wider uppercase text-center leading-tight px-1">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recuperação */}
      <div>
        <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          <Battery size={13} className="text-emerald-500" /> Nível de recuperação
        </label>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>0 · drenado</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {recovery}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${recovery >= 7 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
            10 · 100%
          </span>
        </div>
        <Slider value={recovery} onChange={setRecovery} min={0} max={10} />
      </div>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={rested && recovery >= 8 ? 'Recuperação total · +35 XP' : undefined}
      />
    </div>
  );
}
