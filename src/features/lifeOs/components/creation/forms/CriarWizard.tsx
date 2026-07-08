// =============================================================
// ORVAX · CriarWizard — Wizard de criação · 3 etapas.
//   Step 1 · Tipo: Meta · Hábito · Tarefa
//   Step 2 · Área da vida (1 dos 10 pilares)
//   Step 3 · Detalhes (form bespoke por tipo)
// Sem XP. Animação suave entre steps.
// =============================================================
import React, { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  Target, Repeat, ListTodo, ChevronLeft, Calendar,
  Flag, Sparkles,
} from 'lucide-react';
import { PILLARS } from '../../../pillars';
import type { PillarKey } from '../../../types';
import { SubmitBar } from './shared/SubmitBar';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

type CreateType = 'meta' | 'habit' | 'task';

const TYPE_OPTIONS: { value: CreateType; label: string; sub: string; icon: React.ReactNode }[] = [
  { value: 'meta',  label: 'Meta',   sub: 'Conquista de longo prazo · plano + prazo', icon: <Target  size={16} strokeWidth={1.8} /> },
  { value: 'habit', label: 'Hábito', sub: 'Rotina recorrente · disciplina diária',    icon: <Repeat  size={16} strokeWidth={1.8} /> },
  { value: 'task',  label: 'Tarefa', sub: 'Ação pontual · prazo curto',               icon: <ListTodo size={16} strokeWidth={1.8} /> },
];

type IconName = keyof typeof Icons;
const IconOf = (n?: string): React.ComponentType<{ size?: number; strokeWidth?: number }> => {
  const K = (n || 'Circle') as IconName;
  return (Icons[K] as React.ComponentType<{ size?: number; strokeWidth?: number }>) || Icons.Circle;
};

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function CriarWizard({ onSubmit }: Props) {
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [type, setType]       = useState<CreateType | null>(null);
  const [pillar, setPillar]   = useState<PillarKey | null>(null);

  const goBack = () => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  const pickType = (t: CreateType) => { setType(t); setStep(2); };
  const pickPillar = (p: PillarKey) => { setPillar(p); setStep(3); };

  const finalSubmit = (details: Record<string, unknown>) => {
    onSubmit({
      kind: type,
      pillar_key: pillar,
      ...details,
    });
  };

  return (
    <div className="space-y-4">
      {/* Stepper visual */}
      <Stepper current={step} type={type} pillar={pillar} onBack={step > 1 ? goBack : undefined} />

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <TypeStep onPick={pickType} />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <PillarStep onPick={pickPillar} />
          </motion.div>
        )}
        {step === 3 && type && pillar && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <DetailsStep type={type} pillar={pillar} onSubmit={finalSubmit} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================
// Stepper · breadcrumb 1 → 2 → 3
// =============================================================
function Stepper({
  current, type, pillar, onBack,
}: {
  current: 1 | 2 | 3;
  type: CreateType | null;
  pillar: PillarKey | null;
  onBack?: () => void;
}) {
  const items = [
    { n: 1, label: 'Tipo',    value: type ? TYPE_OPTIONS.find(t => t.value === type)?.label : null },
    { n: 2, label: 'Área',    value: pillar ? PILLARS.find(p => p.key === pillar)?.short : null },
    { n: 3, label: 'Detalhes', value: null },
  ];
  return (
    <div className={[
      'rounded-2xl px-3 py-2.5 flex items-center gap-2',
      'bg-white dark:bg-zinc-900',
      'border border-zinc-200 dark:border-zinc-800',
    ].join(' ')}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`w-7 h-7 rounded-lg flex items-center justify-center
            ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors`}
          aria-label="Voltar etapa"
        >
          <ChevronLeft size={14} strokeWidth={2.2} />
        </button>
      )}
      {items.map((it, idx) => (
        <React.Fragment key={it.n}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={[
              'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono font-bold shrink-0',
              current === it.n
                ? 'bg-emerald-500 text-white'
                : current > it.n
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500',
            ].join(' ')}>
              {it.n}
            </div>
            <span className={[
              'text-[10px] font-mono tracking-wider uppercase truncate',
              current === it.n ? T_STRONG + ' font-semibold' : T_MUTED,
            ].join(' ')}>
              {it.value || it.label}
            </span>
          </div>
          {idx < items.length - 1 && (
            <span className={`text-[10px] ${T_MUTED} shrink-0`}>›</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// =============================================================
// Step 1 · Tipo
// =============================================================
function TypeStep({ onPick }: { onPick: (t: CreateType) => void }) {
  return (
    <div className="space-y-2.5">
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} mb-1`}>
        O que você quer criar?
      </p>
      {TYPE_OPTIONS.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onPick(t.value)}
          className={[
            'group w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all',
            'bg-white dark:bg-zinc-900',
            'border border-zinc-200 dark:border-zinc-800',
            'hover:border-emerald-500 hover:-translate-y-0.5',
            'hover:shadow-lg hover:shadow-emerald-500/15',
            'active:scale-[0.99]',
          ].join(' ')}
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
            {t.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[14px] font-bold ${T_STRONG}`}>{t.label}</p>
            <p className={`text-[11px] mt-0.5 ${T_LABEL} truncate`}>{t.sub}</p>
          </div>
          <Icons.ChevronRight
            size={14}
            className={`${T_MUTED} group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0`}
          />
        </button>
      ))}
    </div>
  );
}

// =============================================================
// Step 2 · Área (10 pilares)
// =============================================================
function PillarStep({ onPick }: { onPick: (p: PillarKey) => void }) {
  return (
    <div>
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase ${T_LABEL} mb-2`}>
        Em qual área da vida?
      </p>
      <div className="grid grid-cols-3 gap-2">
        {PILLARS.map((p) => {
          const Icon = IconOf(p.icon);
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onPick(p.key)}
              className={[
                'group flex flex-col items-center justify-center gap-2',
                'h-[90px] px-2 rounded-2xl',
                'bg-white dark:bg-zinc-900',
                'border border-zinc-200 dark:border-zinc-800',
                'hover:border-emerald-500 hover:-translate-y-0.5',
                'hover:shadow-lg hover:shadow-emerald-500/10',
                'active:scale-[0.97]',
                'transition-all duration-200',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span className={`text-[9px] font-mono font-semibold tracking-wider uppercase ${T_NORMAL} text-center leading-tight`}>
                {p.short}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================
// Step 3 · Detalhes (depende do tipo)
// =============================================================
function DetailsStep({
  type, pillar, onSubmit,
}: {
  type: CreateType;
  pillar: PillarKey;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  if (type === 'meta')  return <MetaDetails  pillar={pillar} onSubmit={onSubmit} />;
  if (type === 'habit') return <HabitDetails pillar={pillar} onSubmit={onSubmit} />;
  return                       <TaskDetails  pillar={pillar} onSubmit={onSubmit} />;
}

// ----- Meta ----------------------------------------------------
function MetaDetails({
  onSubmit,
}: { pillar: PillarKey; onSubmit: (d: Record<string, unknown>) => void }) {
  const [name,     setName]     = useState('');
  const [reason,   setReason]   = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'baixa' | 'média' | 'alta'>('média');

  const valid = name.trim().length >= 3 && reason.trim().length > 0 && deadline.length > 0;
  const submit = () => valid && onSubmit({ name: name.trim(), reason: reason.trim(), deadline, priority });

  return (
    <div className="space-y-4">
      <Field label="Nome da meta">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="ex: Trocar de carreira até dezembro"
          className={inputCls}
        />
      </Field>
      <Field label="Por que isso importa pra você?">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="O motivo emocional. Quando der vontade de desistir, é isso que te segura."
          className={textareaCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prazo final" icon={<Calendar size={11} />}>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={[inputCls, 'tabular-nums [color-scheme:light] dark:[color-scheme:dark]'].join(' ')}
          />
        </Field>
        <Field label="Prioridade" icon={<Flag size={11} />}>
          <div className="flex gap-1.5">
            {(['baixa', 'média', 'alta'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={[
                  'flex-1 h-10 rounded-lg border text-[11px] font-semibold transition-all capitalize',
                  priority === p
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_LABEL}
                       hover:border-emerald-500/40`,
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>
        </Field>
      </div>
      <SubmitBar disabled={!valid} onSubmit={submit} label="Criar Meta" />
    </div>
  );
}

// ----- Hábito --------------------------------------------------
function HabitDetails({
  onSubmit,
}: { pillar: PillarKey; onSubmit: (d: Record<string, unknown>) => void }) {
  const [name,       setName]       = useState('');
  const [frequency,  setFrequency]  = useState<'diario' | 'semanal_3x' | 'semanal'>('diario');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [reason,     setReason]     = useState('');

  const valid = name.trim().length >= 3 && reason.trim().length > 0;
  const submit = () => valid && onSubmit({ name: name.trim(), frequency, difficulty, reason: reason.trim() });

  return (
    <div className="space-y-4">
      <Field label="Nome do hábito">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="ex: Treinar 1h pela manhã"
          className={inputCls}
        />
      </Field>
      <Field label="Frequência">
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: 'diario',     l: 'Diário'    },
            { v: 'semanal_3x', l: '3x semana' },
            { v: 'semanal',    l: 'Semanal'   },
          ] as const).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setFrequency(f.v)}
              className={[
                'h-10 rounded-lg border text-[11px] font-semibold transition-all',
                frequency === f.v
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_LABEL}
                     hover:border-emerald-500/40`,
              ].join(' ')}
            >
              {f.l}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Dificuldade">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDifficulty(n as 1 | 2 | 3 | 4 | 5)}
              className={[
                'flex-1 h-10 rounded-lg border text-[14px] font-bold tabular-nums transition-all',
                difficulty >= n
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_LABEL}
                     hover:border-emerald-500/40`,
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
        <p className={`mt-1.5 text-[9px] font-mono tracking-wide ${T_MUTED}`}>
          1 · trivial · 5 · exige reorganização da rotina
        </p>
      </Field>
      <Field label="Por que esse hábito vale a pena?">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, 200))}
          rows={2}
          placeholder="Conecta esse hábito com a pessoa que você quer se tornar."
          className={textareaCls}
        />
      </Field>
      <SubmitBar disabled={!valid} onSubmit={submit} label="Criar Hábito" />
    </div>
  );
}

// ----- Tarefa --------------------------------------------------
function TaskDetails({
  onSubmit,
}: { pillar: PillarKey; onSubmit: (d: Record<string, unknown>) => void }) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [deadline,    setDeadline]    = useState('');

  const valid = name.trim().length >= 3;
  const submit = () => valid && onSubmit({
    name: name.trim(),
    description: description.trim() || null,
    deadline: deadline || null,
  });

  return (
    <div className="space-y-4">
      <Field label="Nome da tarefa">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 80))}
          placeholder="ex: Enviar relatório mensal"
          className={inputCls}
        />
      </Field>
      <Field label="Descrição (opcional)">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 280))}
          rows={3}
          placeholder="Detalhes da tarefa..."
          className={textareaCls}
        />
      </Field>
      <Field label="Prazo (opcional)" icon={<Calendar size={11} />}>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={[inputCls, 'tabular-nums [color-scheme:light] dark:[color-scheme:dark]'].join(' ')}
        />
      </Field>
      <SubmitBar disabled={!valid} onSubmit={submit} label="Criar Tarefa" />
    </div>
  );
}

// =============================================================
// Field wrapper · idêntico em todos os details
// =============================================================
function Field({
  label, icon, children,
}: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-1.5`}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full h-10 px-3 rounded-lg border outline-none',
  'bg-white dark:bg-zinc-900',
  'border-zinc-200 dark:border-zinc-800',
  'focus:border-emerald-500',
  'text-[13px]',
  T_STRONG,
  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
  'transition-colors',
].join(' ');

const textareaCls = [
  'w-full p-3 rounded-lg border outline-none resize-none',
  'bg-white dark:bg-zinc-900',
  'border-zinc-200 dark:border-zinc-800',
  'focus:border-emerald-500',
  'text-[13px] leading-relaxed',
  T_STRONG,
  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
  'transition-colors',
].join(' ');
