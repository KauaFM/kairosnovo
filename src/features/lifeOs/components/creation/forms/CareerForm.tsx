// =============================================================
// ORVAX · CareerForm — Carreira / Estudo
// Estudou hoje · Conteúdo · Tempo · Projetos · Tarefas · Foco
// =============================================================
import React, { useState, useMemo } from 'react';
import { BookOpen, Briefcase, ListChecks, Zap } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';
import { SubmitBar } from './shared/SubmitBar';
import { Slider } from './shared/Slider';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const STUDY_DURATIONS = [15, 30, 60, 120];

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function CareerForm({ onSubmit }: Props) {
  const [studied,    setStudied]    = useState<boolean | null>(null);
  const [topic,      setTopic]      = useState('');
  const [studyMin,   setStudyMin]   = useState<number | null>(null);
  const [worked,     setWorked]     = useState<boolean | null>(null);
  const [tasksDone,  setTasksDone]  = useState('');
  const [focus,      setFocus]      = useState(7);

  const tasksNum = Number(tasksDone) || 0;
  const valid = studied !== null && worked !== null;

  // XP engine
  const xp = useMemo(() => {
    let total = 0;
    if (studied)            total += 30;
    if (studyMin && studyMin >= 60) total += 15;
    if (worked)             total += 30;
    if (tasksNum >= 3)      total += 15;
    if (focus >= 8)         total += 20;
    return Math.max(total, valid ? 10 : 0);
  }, [studied, studyMin, worked, tasksNum, focus, valid]);

  // Projection
  const projection = useMemo(() => {
    const heavy = studied && (studyMin || 0) >= 60 && worked && focus >= 7;
    if (heavy) {
      return {
        intent: 'positive' as const,
        text: 'Você terá compostado meses de estudo focado e execução. Carreira deixa de ser jornada de prazer ou medo — vira terreno onde você manda.',
      };
    }
    if (studied || worked) {
      return {
        intent: 'neutral' as const,
        text: 'Cada dia produtivo é um tijolo. A diferença entre uma carreira medíocre e uma extraordinária é a regularidade.',
      };
    }
    return {
      intent: 'warning' as const,
      text: 'Dias zerados acumulam silenciosamente. Em 1 ano, sem registro nem ação, você vai estar exatamente no mesmo lugar — só que com mais idade.',
    };
  }, [studied, studyMin, worked, focus]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        studied,
        topic: studied ? topic.trim() || null : null,
        study_min: studied ? studyMin : null,
        worked_on_projects: worked,
        tasks_completed: worked ? tasksNum : null,
        focus_level: focus,
      },
      xp,
    );
  };

  return (
    <div className="space-y-5">
      {/* 1 · Estudou */}
      <Section icon={<BookOpen size={13} className="text-emerald-500" />} label="Estudou hoje?">
        <YesNoRow value={studied} onChange={setStudied} />
        {studied && (
          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 80))}
              placeholder="o que você estudou?"
              className={[
                'w-full h-10 px-3 rounded-lg border outline-none',
                'bg-white dark:bg-zinc-900',
                'border-zinc-200 dark:border-zinc-800',
                'focus:border-emerald-500',
                'text-[13px]',
                T_STRONG,
                'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
                'transition-colors',
              ].join(' ')}
            />
            <DurationPills value={studyMin} onChange={setStudyMin} options={STUDY_DURATIONS} />
          </div>
        )}
      </Section>

      {/* 2 · Trabalhou em projetos */}
      <Section icon={<Briefcase size={13} className="text-emerald-500" />} label="Trabalhou em projetos?">
        <YesNoRow value={worked} onChange={setWorked} />
        {worked && (
          <div className="mt-3 flex items-center gap-3">
            <ListChecks size={14} className="text-emerald-500" />
            <span className={`text-[11px] font-mono tracking-wider uppercase ${T_LABEL}`}>
              Tarefas concluídas
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={tasksDone}
              onChange={(e) => setTasksDone(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="0"
              className={`flex-1 bg-transparent outline-none border-0 p-0 text-right
                text-[20px] font-bold tracking-tight tabular-nums ${T_STRONG}
                placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
            />
          </div>
        )}
      </Section>

      {/* 3 · Foco · slider */}
      <Section icon={<Zap size={13} className="text-emerald-500" />} label="Nível de foco">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[10px] font-mono tracking-wider ${T_MUTED}`}>0 · disperso</span>
          <span className={`text-[18px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {focus}<span className={T_MUTED}>/10</span>
          </span>
          <span className={`text-[10px] font-mono tracking-wider ${focus >= 8 ? 'text-emerald-500 font-bold' : T_MUTED}`}>
            10 · laser
          </span>
        </div>
        <Slider value={focus} onChange={setFocus} min={0} max={10} />
      </Section>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={
          studied && worked && focus >= 8
            ? 'Tríplice combo · estudo + execução + foco'
            : undefined
        }
      />
    </div>
  );
}

// helpers internos · pequenos
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
      <YesNoBtn active={value === false} onClick={() => onChange(false)} label="Não" tone="neutral" />
      <YesNoBtn active={value === true}  onClick={() => onChange(true)}  label="Sim" tone="emerald" />
    </div>
  );
}

function YesNoBtn({
  active, onClick, label, tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone: 'emerald' | 'neutral';
}) {
  const activeCls = tone === 'emerald'
    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
    : 'bg-zinc-200 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-11 rounded-xl border text-[12px] font-bold tracking-wide transition-all',
        active
          ? activeCls
          : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL} hover:border-emerald-500/40`,
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function DurationPills({
  value, onChange, options,
}: {
  value: number | null;
  onChange: (v: number) => void;
  options: number[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((d) => {
        const active = value === d;
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
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
  );
}
