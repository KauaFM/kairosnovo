// =============================================================
// ORVAX · MetaForm — Criação de Meta (estrutura completa).
// Definição · Estrutura · Plano de Ação · Mental.
// Conectada ao sistema de Pilares (área da vida).
// =============================================================
import React, { useState, useMemo } from 'react';
import {
  Target, Calendar, Flag, ListChecks, Repeat,
  ShieldAlert, Check, ChevronDown, ChevronRight,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { PILLARS } from '../../../pillars';
import type { PillarKey } from '../../../types';
import { YearProjection } from './shared/YearProjection';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

type Priority  = 'baixa' | 'média' | 'alta';
type Frequency = 'diario' | 'semanal_3x' | 'semanal' | 'mensal';

const PRIORITIES: { value: Priority; label: string; tone: string }[] = [
  { value: 'baixa', label: 'Baixa', tone: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700' },
  { value: 'média', label: 'Média', tone: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900' },
  { value: 'alta',  label: 'Alta',  tone: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900' },
];

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'diario',     label: 'Diário'      },
  { value: 'semanal_3x', label: '3x semana'   },
  { value: 'semanal',    label: 'Semanal'     },
  { value: 'mensal',     label: 'Mensal'      },
];

type IconName = keyof typeof Icons;
const IconOf = (n?: string): React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }> => {
  const K = (n || 'Circle') as IconName;
  return (Icons[K] as React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>) || Icons.Circle;
};

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function MetaForm({ onSubmit }: Props) {
  // Section 1 · Definição
  const [name,       setName]       = useState('');
  const [pillar,     setPillar]     = useState<PillarKey | null>(null);
  const [reason,     setReason]     = useState('');
  const [deadline,   setDeadline]   = useState('');
  const [priority,   setPriority]   = useState<Priority>('média');

  // Section 2 · Estrutura
  const [outcome,    setOutcome]    = useState('');
  const [milestones, setMilestones] = useState('');

  // Section 3 · Plano
  const [actions,    setActions]    = useState('');
  const [frequency,  setFrequency]  = useState<Frequency>('diario');
  const [estMinutes, setEstMinutes] = useState('');

  // Section 4 · Mental
  const [obstacles,  setObstacles]  = useState('');
  const [contingency, setContingency] = useState('');

  // Sections collapse state
  const [open, setOpen] = useState({
    def: true, struct: false, plan: false, mental: false,
  });
  const toggle = (k: keyof typeof open) => setOpen({ ...open, [k]: !open[k] });

  // validation — minimum bar é só Definição completa
  const valid =
    name.trim().length >= 3 &&
    pillar !== null &&
    reason.trim().length > 0 &&
    deadline.length > 0;

  // XP — meta criada é evento grande. Mais detalhada = mais XP.
  const xp = useMemo(() => {
    let total = 100; // criar meta = 100 base
    if (outcome.trim())     total += 25;
    if (milestones.trim())  total += 25;
    if (actions.trim())     total += 25;
    if (obstacles.trim())   total += 15;
    if (contingency.trim()) total += 15;
    return total;
  }, [outcome, milestones, actions, obstacles, contingency]);

  // Projection — depende do nível de detalhe
  const projection = useMemo(() => {
    const detailScore =
      [outcome, milestones, actions, obstacles, contingency]
        .filter(s => s.trim()).length;
    if (detailScore >= 4) {
      return {
        intent: 'positive' as const,
        text: 'Esta meta tem todos os ingredientes pra virar realidade. Você não está sonhando — está engenheirando o futuro.',
        hint: 'plano completo · obstáculos mapeados',
      };
    }
    if (detailScore >= 2) {
      return {
        intent: 'neutral' as const,
        text: 'A meta tem corpo, mas pode ganhar densidade. Quanto mais marcos, ações e obstáculos mapeados, menor a chance de evaporar no meio do caminho.',
      };
    }
    return {
      intent: 'warning' as const,
      text: 'Meta sem plano vira frustração. Reserve 5min agora pra preencher pelo menos os marcos e ações — vai dobrar sua chance de chegar lá.',
    };
  }, [outcome, milestones, actions, obstacles, contingency]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        name: name.trim(),
        pillar_key: pillar,
        reason: reason.trim(),
        deadline,
        priority,
        outcome: outcome.trim() || null,
        milestones: milestones.trim() || null,
        actions: actions.trim() || null,
        frequency,
        est_minutes_per_action: Number(estMinutes) || null,
        obstacles: obstacles.trim() || null,
        contingency: contingency.trim() || null,
      },
      xp,
    );
  };

  return (
    <div className="space-y-3">
      {/* Section 1 · Definição (sempre aberto, mandatório) */}
      <Section
        title="Definição"
        sub="o essencial · obrigatório"
        icon={<Target size={13} className="text-emerald-500" />}
        open={open.def}
        onToggle={() => toggle('def')}
        complete={valid}
        required
      >
        <div className="space-y-4">
          {/* Nome */}
          <Field label="Nome da meta">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="ex: Trocar de carreira até dezembro"
              className={inputCls()}
            />
          </Field>

          {/* Área da vida */}
          <Field label="Área da vida">
            <PillarPicker value={pillar} onChange={setPillar} />
          </Field>

          {/* Motivo */}
          <Field label="Por que isso importa pra você?">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="O motivo emocional. Quando der vontade de desistir, é isso que te segura."
              className={textareaCls()}
            />
            <CharCount value={reason.length} max={280} />
          </Field>

          {/* Prazo + Prioridade lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo final" icon={<Calendar size={11} />}>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={[
                  inputCls(),
                  'tabular-nums [color-scheme:light] dark:[color-scheme:dark]',
                ].join(' ')}
              />
            </Field>
            <Field label="Prioridade" icon={<Flag size={11} />}>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => {
                  const active = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={[
                        'flex-1 h-9 rounded-lg border text-[11px] font-semibold transition-all',
                        active ? p.tone : `bg-transparent ${T_LABEL} border-zinc-200 dark:border-zinc-700 hover:border-zinc-400`,
                      ].join(' ')}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Section 2 · Estrutura */}
      <Section
        title="Estrutura"
        sub="resultado + marcos · +50 XP"
        icon={<ListChecks size={13} className="text-emerald-500" />}
        open={open.struct}
        onToggle={() => toggle('struct')}
        complete={!!(outcome.trim() && milestones.trim())}
      >
        <div className="space-y-4">
          <Field label="Resultado final desejado">
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value.slice(0, 280))}
              rows={2}
              placeholder="Como vai ser o dia em que essa meta estiver concluída?"
              className={textareaCls()}
            />
            <CharCount value={outcome.length} max={280} />
          </Field>

          <Field label="Marcos · milestones (1 por linha)">
            <textarea
              value={milestones}
              onChange={(e) => setMilestones(e.target.value.slice(0, 600))}
              rows={4}
              placeholder={'1. Aprender fundamentos\n2. Construir 1 projeto piloto\n3. Aplicar para 5 vagas'}
              className={textareaCls()}
            />
          </Field>
        </div>
      </Section>

      {/* Section 3 · Plano de Ação */}
      <Section
        title="Plano de Ação"
        sub="ações + frequência · +25 XP"
        icon={<Repeat size={13} className="text-emerald-500" />}
        open={open.plan}
        onToggle={() => toggle('plan')}
        complete={!!actions.trim()}
      >
        <div className="space-y-4">
          <Field label="Ações concretas (o que você vai fazer)">
            <textarea
              value={actions}
              onChange={(e) => setActions(e.target.value.slice(0, 400))}
              rows={3}
              placeholder="ex: Estudar 1h por dia · Praticar 3x/semana · Aplicar a 1 vaga toda sexta"
              className={textareaCls()}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequência">
              <div className="grid grid-cols-2 gap-1.5">
                {FREQUENCIES.map((f) => {
                  const active = frequency === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFrequency(f.value)}
                      className={[
                        'h-9 rounded-lg border text-[10px] font-semibold tracking-wide transition-all',
                        active
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : `bg-transparent ${T_LABEL} border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/40`,
                      ].join(' ')}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Tempo por ação">
              <div className={[
                'flex items-center gap-1 h-9 px-3 rounded-lg border',
                'border-zinc-200 dark:border-zinc-800',
              ].join(' ')}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={estMinutes}
                  onChange={(e) => setEstMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="60"
                  className={`bg-transparent outline-none border-0 p-0 flex-1 min-w-0
                    text-[13px] font-semibold tabular-nums ${T_STRONG}
                    placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
                />
                <span className={`text-[11px] font-mono ${T_MUTED}`}>min</span>
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Section 4 · Mental */}
      <Section
        title="Mental · Antifrágil"
        sub="obstáculos + plano de desistência · +30 XP"
        icon={<ShieldAlert size={13} className="text-emerald-500" />}
        open={open.mental}
        onToggle={() => toggle('mental')}
        complete={!!(obstacles.trim() && contingency.trim())}
      >
        <div className="space-y-4">
          <Field label="Possíveis obstáculos">
            <textarea
              value={obstacles}
              onChange={(e) => setObstacles(e.target.value.slice(0, 400))}
              rows={3}
              placeholder="O que pode te fazer travar ou desistir?"
              className={textareaCls()}
            />
          </Field>

          <Field label="Plano de defesa quando bater desânimo">
            <textarea
              value={contingency}
              onChange={(e) => setContingency(e.target.value.slice(0, 400))}
              rows={3}
              placeholder="Quando bater vontade de parar, eu vou: …"
              className={textareaCls()}
            />
          </Field>
        </div>
      </Section>

      <YearProjection
        text={projection.text}
        intent={projection.intent}
        hint={projection.hint}
      />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={xp >= 200 ? `Meta blindada · +${xp - 100} bônus` : undefined}
      />
    </div>
  );
}

// =============================================================
// Section · accordion com header clicável + indicador de completude
// =============================================================
function Section({
  title, sub, icon, open, onToggle, complete, required, children,
}: {
  title: string;
  sub?: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  complete?: boolean;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={[
      'rounded-2xl border transition-colors',
      'bg-white dark:bg-zinc-900',
      complete
        ? 'border-emerald-300 dark:border-emerald-900/60'
        : 'border-zinc-200 dark:border-zinc-800',
    ].join(' ')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center
          bg-zinc-50 dark:bg-zinc-800 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-[12px] font-semibold ${T_STRONG} flex items-center gap-1.5`}>
            {title}
            {required && (
              <span className="text-[8px] font-mono tracking-widest text-rose-500 uppercase">
                obrig.
              </span>
            )}
            {complete && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 inline-flex items-center justify-center">
                <Check size={9} strokeWidth={3.2} className="text-white" />
              </span>
            )}
          </p>
          {sub && <p className={`text-[10px] font-mono tracking-wide ${T_MUTED} mt-0.5`}>{sub}</p>}
        </div>
        {open
          ? <ChevronDown size={14} className={T_LABEL} />
          : <ChevronRight size={14} className={T_LABEL} />}
      </button>
      {open && (
        <div className="px-3.5 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================================
// Field · wrapper com label estilizado
// =============================================================
function Field({
  label, icon, children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-1.5`}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <p className={`mt-1 text-right text-[9px] font-mono ${T_MUTED}`}>{value}/{max}</p>
  );
}

const inputCls = () => [
  'w-full h-10 px-3 rounded-lg border outline-none',
  'bg-white dark:bg-zinc-900',
  'border-zinc-200 dark:border-zinc-800',
  'focus:border-emerald-500 dark:focus:border-emerald-500',
  'text-[13px]',
  T_STRONG,
  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
  'transition-colors',
].join(' ');

const textareaCls = () => [
  'w-full p-3 rounded-lg border outline-none resize-none',
  'bg-white dark:bg-zinc-900',
  'border-zinc-200 dark:border-zinc-800',
  'focus:border-emerald-500 dark:focus:border-emerald-500',
  'text-[13px] leading-relaxed',
  T_STRONG,
  'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
  'transition-colors',
].join(' ');

// =============================================================
// PillarPicker · grid 5×2 dos 10 pilares
// =============================================================
function PillarPicker({
  value, onChange,
}: { value: PillarKey | null; onChange: (k: PillarKey) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {PILLARS.map((p) => {
        const Icon   = IconOf(p.icon);
        const active = value === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            className={[
              'flex flex-col items-center justify-center gap-1 h-14 rounded-lg border transition-all',
              active
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                   hover:border-emerald-500/40`,
            ].join(' ')}
            aria-label={p.label}
          >
            <Icon size={13} strokeWidth={1.8} />
            <span className="text-[8px] font-mono tracking-wider uppercase truncate max-w-full px-1">
              {p.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================
// SubmitBar
// =============================================================
function SubmitBar({
  disabled, xpPreview, onSubmit, bonus,
}: {
  disabled: boolean;
  xpPreview: number;
  onSubmit: () => void;
  bonus?: string;
}) {
  return (
    <div className="pt-2 sticky bottom-0 -mx-5 px-5 py-3
      bg-gradient-to-t from-white via-white to-white/0
      dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900/0">
      <button
        type="button"
        disabled={disabled}
        onClick={onSubmit}
        className={[
          'w-full h-12 rounded-2xl flex items-center justify-center gap-2',
          'text-[13px] font-bold tracking-wide uppercase',
          'transition-all duration-200',
          disabled
            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-[0.98]',
        ].join(' ')}
      >
        <Check size={15} strokeWidth={2.6} />
        Criar Meta
        <span className={[
          'ml-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums',
          disabled ? 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400' : 'bg-white/20 text-white',
        ].join(' ')}>
          +{xpPreview} XP
        </span>
      </button>
      {bonus && !disabled && (
        <p className="mt-2 text-center text-[10px] font-mono tracking-widest uppercase text-emerald-500">
          ✦ {bonus}
        </p>
      )}
    </div>
  );
}
