// =============================================================
// ORVAX · EnvironmentForm — Ambiente
// Organizado · nível de distração · adequado para foco
// =============================================================
import React, { useState, useMemo } from 'react';
import { Home, Volume2, FocusIcon } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';
import { SubmitBar } from './shared/SubmitBar';
import { Slider } from './shared/Slider';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function EnvironmentForm({ onSubmit }: Props) {
  const [organized,   setOrganized]   = useState<boolean | null>(null);
  const [distraction, setDistraction] = useState(5);
  const [focusReady,  setFocusReady]  = useState<boolean | null>(null);

  const valid = organized !== null && focusReady !== null;

  const xp = useMemo(() => {
    let total = 10;
    if (organized)         total += 15;
    if (distraction <= 3)  total += 15;
    if (focusReady)        total += 15;
    return total;
  }, [organized, distraction, focusReady]);

  const projection = useMemo(() => {
    if (organized && focusReady && distraction <= 3) {
      return {
        intent: 'positive' as const,
        text: 'Ambiente vira aliado silencioso. Em 1 ano você terá um ecossistema físico que torna disciplina o caminho de menor resistência.',
      };
    }
    if (organized || focusReady) {
      return {
        intent: 'neutral' as const,
        text: 'Pequenos ajustes de ambiente compostam. O espaço onde você vive é a versão externa da sua mente — vale o cuidado.',
      };
    }
    return {
      intent: 'warning' as const,
      text: 'Ambiente caótico produz mente caótica. Em 1 ano sem mudança, você seguirá lutando contra atritos invisíveis o dia inteiro.',
    };
  }, [organized, distraction, focusReady]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        organized,
        distraction_level: distraction,
        focus_ready:       focusReady,
      },
      xp,
    );
  };

  return (
    <div className="space-y-5">
      <Section icon={<Home size={13} className="text-emerald-500" />} label="Ambiente organizado?">
        <YesNoRow value={organized} onChange={setOrganized} />
      </Section>

      <Section icon={<Volume2 size={13} className="text-emerald-500" />} label="Nível de distração">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${distraction <= 3 ? 'text-emerald-500 font-bold' : T_MUTED}`}>0 · silencioso</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {distraction}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>10 · caótico</span>
        </div>
        <Slider value={distraction} onChange={setDistraction} min={0} max={10} inverted />
        <p className={`mt-2 text-[9px] font-mono tracking-wide ${T_MUTED}`}>
          quanto mais baixo, melhor — distração rouba foco em background
        </p>
      </Section>

      <Section icon={<FocusIcon size={13} className="text-emerald-500" />} label="Ambiente adequado para foco?">
        <YesNoRow value={focusReady} onChange={setFocusReady} />
      </Section>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={
          organized && focusReady && distraction <= 3
            ? 'Ambiente otimizado · combo +45'
            : undefined
        }
      />
    </div>
  );
}

function Section({
  icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function YesNoRow({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={[
          'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
          value === false
            ? 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200'
            : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
        ].join(' ')}
      >Não</button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={[
          'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
          value === true
            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
            : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
        ].join(' ')}
      >Sim</button>
    </div>
  );
}
