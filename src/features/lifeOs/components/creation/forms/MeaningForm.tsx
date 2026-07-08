// =============================================================
// ORVAX · MeaningForm — Sentido / Espiritual / Interno
// Reflexão · gratidão (3 itens) · propósito · paz interna
// =============================================================
import React, { useState, useMemo } from 'react';
import { Brain, Heart, Compass, Wind } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';
import { SubmitBar } from './shared/SubmitBar';
import { Slider } from './shared/Slider';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const REFLECT_DURATIONS = [5, 10, 20, 45];

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function MeaningForm({ onSubmit }: Props) {
  const [reflected, setReflected] = useState<boolean | null>(null);
  const [reflectMin, setReflectMin] = useState<number | null>(null);
  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');
  const [g3, setG3] = useState('');
  const [purpose, setPurpose] = useState(6);
  const [peace,   setPeace]   = useState(6);

  const gratidoes = [g1, g2, g3].filter(g => g.trim().length > 0);
  const valid = reflected !== null && gratidoes.length >= 1;

  const xp = useMemo(() => {
    let total = 10;
    if (reflected)             total += 25;
    if ((reflectMin ?? 0) >= 20) total += 15;
    total += gratidoes.length * 10;     // 10 por gratidão (até +30)
    if (purpose >= 7)          total += 15;
    if (peace >= 7)            total += 15;
    return total;
  }, [reflected, reflectMin, gratidoes, purpose, peace]);

  const projection = useMemo(() => {
    const high = reflected && gratidoes.length === 3 && purpose >= 7 && peace >= 7;
    if (high) {
      return {
        intent: 'positive' as const,
        text: 'Em 1 ano o ruído interno desaparece. Você sabe pra onde está indo, por quê, e tem paz mesmo quando o externo desmorona.',
      };
    }
    if (gratidoes.length >= 1 || reflected) {
      return {
        intent: 'neutral' as const,
        text: 'O hábito de pausar e olhar pra dentro é raro. Cada registro corta camadas de ansiedade silenciosa que ninguém vê.',
      };
    }
    return {
      intent: 'warning' as const,
      text: 'Sem reflexão, a vida vira reação. Em 1 ano você pode ter conquistado coisas e ainda assim não saber pra onde está indo.',
    };
  }, [reflected, gratidoes, purpose, peace]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        reflected,
        reflect_min: reflected ? reflectMin : null,
        gratitudes: gratidoes,
        purpose_score: purpose,
        peace_score:   peace,
      },
      xp,
    );
  };

  return (
    <div className="space-y-5">
      {/* Reflexão / Meditação */}
      <Section icon={<Brain size={13} className="text-emerald-500" />} label="Fez reflexão / meditação?">
        <YesNoRow value={reflected} onChange={setReflected} />
        {reflected && (
          <div className="mt-3">
            <p className={`text-[9px] font-mono tracking-widest uppercase ${T_MUTED} mb-1.5`}>
              Tempo de introspecção
            </p>
            <div className="flex flex-wrap gap-2">
              {REFLECT_DURATIONS.map((d) => {
                const active = reflectMin === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setReflectMin(d)}
                    className={[
                      'h-9 px-3.5 rounded-full text-[12px] font-semibold tabular-nums transition-all',
                      active
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : `bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL} hover:bg-zinc-200 dark:hover:bg-zinc-700`,
                    ].join(' ')}
                  >
                    {d >= 60 ? `${d / 60}h` : `${d}m`}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* 3 gratidões */}
      <Section icon={<Heart size={13} className="text-emerald-500" />} label="3 coisas pelas quais você é grato">
        <div className="space-y-2">
          {[
            { v: g1, set: setG1, n: 1 },
            { v: g2, set: setG2, n: 2 },
            { v: g3, set: setG3, n: 3 },
          ].map((g) => (
            <div key={g.n} className={[
              'flex items-center gap-2 h-11 px-3 rounded-xl border transition-colors',
              'bg-white dark:bg-zinc-900',
              g.v.trim()
                ? 'border-emerald-300 dark:border-emerald-900/60'
                : 'border-zinc-200 dark:border-zinc-800',
            ].join(' ')}>
              <span className={[
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-bold',
                g.v.trim()
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
              ].join(' ')}>
                {g.n}
              </span>
              <input
                type="text"
                value={g.v}
                onChange={(e) => g.set(e.target.value.slice(0, 80))}
                placeholder={g.n === 1 ? 'a primeira coisa que vier...' : '...'}
                className={`flex-1 bg-transparent outline-none border-0 p-0
                  text-[13px] ${T_STRONG}
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Propósito */}
      <Section icon={<Compass size={13} className="text-emerald-500" />} label="Sente propósito hoje?">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>0 · perdido</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {purpose}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${purpose >= 7 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
            10 · alinhado
          </span>
        </div>
        <Slider value={purpose} onChange={setPurpose} min={0} max={10} />
      </Section>

      {/* Paz */}
      <Section icon={<Wind size={13} className="text-emerald-500" />} label="Paz interna">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>0 · turbulência</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {peace}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${peace >= 7 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
            10 · sereno
          </span>
        </div>
        <Slider value={peace} onChange={setPeace} min={0} max={10} />
      </Section>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={gratidoes.length === 3 ? '3 gratidões · +30 XP' : undefined}
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
