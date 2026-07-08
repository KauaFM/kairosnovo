// =============================================================
// ORVAX · QuickDayForm — Check-in diário em < 30 segundos.
// 4 sliders (humor, energia, foco, disciplina) + emoji + storytelling.
// Sem XP. Sem fricção. Termina e fecha.
// =============================================================
import React, { useState, useMemo } from 'react';
import {
  Smile, Zap, Crosshair, Shield, Sparkles,
} from 'lucide-react';
import { Slider } from './shared/Slider';
import { SubmitBar } from './shared/SubmitBar';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const MOOD_EMOJIS = [
  { v: 1,  e: '😶', label: 'apático' },
  { v: 3,  e: '😞', label: 'baixo'   },
  { v: 5,  e: '😐', label: 'ok'      },
  { v: 7,  e: '🙂', label: 'bem'     },
  { v: 9,  e: '🔥', label: 'pleno'   },
];

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function QuickDayForm({ onSubmit }: Props) {
  const [mood,       setMood]       = useState(7);
  const [energy,     setEnergy]     = useState(6);
  const [focus,      setFocus]      = useState(6);
  const [discipline, setDiscipline] = useState(7);

  const avg = +((mood + energy + focus + discipline) / 4).toFixed(1);

  // Storytelling reativo
  const story = useMemo(() => {
    if (avg >= 8) return { tone: 'positive' as const, text: 'Dia de pico. Identidade alinhada com o sistema.' };
    if (avg >= 6.5) return { tone: 'neutral' as const, text: 'Dia sólido. Combo consistente · você tá no caminho.' };
    if (avg >= 5) return { tone: 'neutral' as const, text: 'Dia médio. Consciência registrada — metade do trabalho.' };
    return { tone: 'warning' as const, text: 'Dia pesado. Nomear é o primeiro passo · amanhã reseta.' };
  }, [avg]);

  // Mood emoji selecionado por proximidade
  const activeEmoji = useMemo(() => {
    return MOOD_EMOJIS.reduce((closest, m) =>
      Math.abs(m.v - mood) < Math.abs(closest.v - mood) ? m : closest
    , MOOD_EMOJIS[0]);
  }, [mood]);

  const submit = () => onSubmit({
    mood, energy, focus, discipline,
    avg,
  });

  return (
    <div className="space-y-6">
      {/* Header com emoji ativo + média */}
      <div className={[
        'rounded-2xl p-5 flex items-center gap-4',
        'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-zinc-900',
        'border border-emerald-200 dark:border-emerald-900/40',
      ].join(' ')}>
        <div className="text-[44px] leading-none transition-transform" key={activeEmoji.v}>
          {activeEmoji.e}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL}`}>
            Como você está
          </p>
          <p className={`mt-0.5 text-[15px] font-bold ${T_STRONG} capitalize`}>
            {activeEmoji.label}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-mono text-[28px] font-bold tabular-nums leading-none ${T_STRONG}`}>
            {avg}
          </p>
          <p className={`mt-0.5 text-[9px] font-mono tracking-widest uppercase ${T_MUTED}`}>
            Média do dia
          </p>
        </div>
      </div>

      {/* 4 sliders */}
      <SliderField
        icon={<Smile size={14} className="text-emerald-500" />}
        label="Humor"
        hint="Como você se sentiu emocionalmente"
        value={mood}
        onChange={setMood}
        leftLabel="apagado"
        rightLabel="pleno"
      />
      <SliderField
        icon={<Zap size={14} className="text-emerald-500" />}
        label="Energia"
        hint="Disposição física no geral"
        value={energy}
        onChange={setEnergy}
        leftLabel="drenado"
        rightLabel="elétrico"
      />
      <SliderField
        icon={<Crosshair size={14} className="text-emerald-500" />}
        label="Foco"
        hint="Capacidade de manter atenção"
        value={focus}
        onChange={setFocus}
        leftLabel="disperso"
        rightLabel="laser"
      />
      <SliderField
        icon={<Shield size={14} className="text-emerald-500" />}
        label="Disciplina"
        hint="Quanto você executou apesar da resistência"
        value={discipline}
        onChange={setDiscipline}
        leftLabel="cedeu"
        rightLabel="sólido"
      />

      {/* Storytelling */}
      <div className={[
        'rounded-2xl border p-3.5 flex items-start gap-3',
        story.tone === 'positive'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-200'
          : story.tone === 'warning'
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200'
          : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300',
      ].join(' ')}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-white/70 dark:bg-black/20">
          <Sparkles size={13} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono tracking-[0.22em] uppercase opacity-70 mb-0.5">
            História do dia
          </p>
          <p className="text-[12.5px] leading-relaxed font-medium">
            {story.text}
          </p>
        </div>
      </div>

      <SubmitBar
        disabled={false}
        onSubmit={submit}
        label="Registrar Dia"
      />

      <p className={`text-center text-[9px] font-mono tracking-[0.22em] uppercase ${T_MUTED}`}>
        · check-in em &lt; 30s · você ganha XP via WhatsApp ·
      </p>
    </div>
  );
}

function SliderField({
  icon, label, hint, value, onChange, leftLabel, rightLabel,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className={`text-[12px] font-bold ${T_STRONG}`}>{label}</span>
        </div>
        <span className={`text-[20px] font-mono font-bold tabular-nums ${T_STRONG}`}>
          {value}<span className={`text-[12px] ${T_MUTED}`}>/10</span>
        </span>
      </div>
      <Slider value={value} onChange={onChange} min={0} max={10} />
      <div className={`mt-1 flex justify-between text-[9px] font-mono tracking-wider uppercase ${T_MUTED}`}>
        <span>{leftLabel}</span>
        {hint && <span className="opacity-70">{hint}</span>}
        <span className={value >= 8 ? 'text-emerald-500 font-bold' : ''}>{rightLabel}</span>
      </div>
    </div>
  );
}
