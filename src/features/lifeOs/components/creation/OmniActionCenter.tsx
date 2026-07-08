// =============================================================
// ORVAX · Life OS — Omni-Action Center
//
// Sistema unificado de entrada rápida de dados.
//   · Trigger: Command Palette (⌘K) — barra fake elegante
//   · Modal:   Bottom Sheet no mobile · centralizado no desktop
//   · Fluxo:   Pilares (Step 1) → Form bespoke (Step 2) → Sucesso/XP (Step 3)
//   · Forms:   Finanças, Saúde, Mente — UI sob medida (zero <input> genérico)
//   · Engine:  XP dinâmico baseado no esforço/qualidade da ação
//
// Único accent permitido: Verde Esmeralda #10B981.
// Light/Dark mode em tudo. Mobile-first (max-w-[428px] no app pai).
// =============================================================
import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  Plus, Command, X, ChevronLeft, Check, Sparkles,
  TrendingDown, TrendingUp, PiggyBank, Flame,
} from 'lucide-react';
import { PILLARS, getPillar } from '../../pillars';
import type { PillarKey } from '../../types';
import { YearProjection } from './forms/shared/YearProjection';
// ── Forms reachable a partir do entry restruturado ──
import QuickDayForm from './forms/QuickDayForm';
import QuickFinanceForm from './forms/QuickFinanceForm';
import CriarWizard from './forms/CriarWizard';
// ── Forms bespoke por pilar · acessíveis via deep dive CTAs (não pelo entry) ──
import NutritionForm from './forms/NutritionForm';
import MetaForm from './forms/MetaForm';
import IdentityForm from './forms/IdentityForm';
import CareerForm from './forms/CareerForm';
import RelationshipsForm from './forms/RelationshipsForm';
import MeaningForm from './forms/MeaningForm';
import EnvironmentForm from './forms/EnvironmentForm';
import LeisureForm from './forms/LeisureForm';

// -------------------------------------------------------------
// design tokens
// -------------------------------------------------------------
const EMERALD = '#10B981';

const CARD = [
  'bg-white dark:bg-zinc-900',
  'border border-zinc-200 dark:border-zinc-800',
].join(' ');

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

// -------------------------------------------------------------
// hooks utilitários
// -------------------------------------------------------------
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const fn = () => setMatches(m.matches);
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return matches;
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

// -------------------------------------------------------------
// dynamic icon helper
// -------------------------------------------------------------
type IconName = keyof typeof Icons;
const IconOf = (n?: string): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> => {
  const K = (n || 'Circle') as IconName;
  return (Icons[K] as React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>) || Icons.Circle;
};

// =============================================================
// PUBLIC API
// =============================================================
/** Intenção de registro · entry simplificado (3 opções) */
export type RegisterIntent = 'day' | 'create' | 'finance';

/** Legado · para callers antigos. Não use em código novo. */
export type ActionTarget = PillarKey | 'meta' | 'identity';

export interface OmniActionPayload {
  /** intenção do registro · 'day' | 'create' | 'finance' */
  intent: RegisterIntent;
  /** payload bruto · shape varia por intenção */
  data: Record<string, unknown>;
  /** ISO date stamp da ação */
  at: string;
}

interface OmniActionCenterProps {
  /** chamado após cada ação registrada com sucesso (ex: persistir no Supabase) */
  onAction?: (payload: OmniActionPayload) => void;
  /** esconde a barra de trigger; exposição apenas via abertura externa */
  hideTrigger?: boolean;
  /** ref opcional para abrir o modal de fora */
  openRef?: React.MutableRefObject<(() => void) | null>;
  className?: string;
}

type Step = 'pillars' | 'form' | 'success';

// =============================================================
// MAIN
// =============================================================
export default function OmniActionCenter({
  onAction, hideTrigger, openRef, className,
}: OmniActionCenterProps) {
  const [open,   setOpen]   = useState(false);
  const [step,   setStep]   = useState<Step>('pillars');
  const [intent, setIntent] = useState<RegisterIntent | null>(null);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  useBodyScrollLock(open);

  // expor opener externo
  useEffect(() => {
    if (!openRef) return;
    openRef.current = () => setOpen(true);
    return () => { if (openRef) openRef.current = null; };
  }, [openRef]);

  // atalho ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // reset interno ao fechar
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setStep('pillars');
      setIntent(null);
    }, 250);
    return () => clearTimeout(t);
  }, [open]);

  // handlers
  const selectIntent = useCallback((i: RegisterIntent) => {
    setIntent(i);
    setStep('form');
  }, []);
  const goBack = useCallback(() => {
    setIntent(null);
    setStep('pillars');
  }, []);
  const submitAction = useCallback((data: Record<string, unknown>) => {
    if (!intent) return;
    onAction?.({
      intent,
      data,
      at: new Date().toISOString(),
    });
    setStep('success');
    setTimeout(() => setOpen(false), 1600);
  }, [intent, onAction]);

  return (
    <>
      {!hideTrigger && (
        <OmniActionTrigger onClick={() => setOpen(true)} className={className} />
      )}

      {/* Portal escapa qualquer stacking context herdado — modal sempre por cima */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <ModalShell
              isDesktop={isDesktop}
              onClose={() => setOpen(false)}
              currentStep={step}
              intent={intent}
              onBack={goBack}
            >
              {step === 'pillars'  && <IntentGrid onSelect={selectIntent} />}
              {step === 'form' && intent && (
                <FormRouter intent={intent} onSubmit={submitAction} />
              )}
              {step === 'success'  && <SuccessScreen intent={intent} />}
            </ModalShell>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// =============================================================
// 1 · TRIGGER — Command Palette style
// =============================================================
export function OmniActionTrigger({
  onClick, className,
}: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group w-full flex items-center gap-3 h-12 px-4 rounded-2xl',
        CARD,
        'shadow-sm hover:shadow-md',
        'hover:border-zinc-300 dark:hover:border-zinc-700',
        'transition-all duration-200 active:scale-[0.99]',
        className || '',
      ].join(' ')}
      aria-label="Abrir Omni-Action Center"
    >
      <span
        className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center
          bg-zinc-100 dark:bg-zinc-800
          group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40
          transition-colors"
      >
        <Plus
          size={15}
          strokeWidth={2.4}
          className="text-zinc-500 dark:text-zinc-400
            group-hover:text-emerald-500 dark:group-hover:text-emerald-400
            transition-colors"
        />
      </span>
      <span className={`flex-1 text-left text-[13px] font-medium truncate ${T_LABEL}`}>
        Criar nova ação, transação ou registro...
      </span>
      <span className={`hidden sm:inline-flex items-center gap-1 h-6 px-1.5 rounded-md
        bg-zinc-100 dark:bg-zinc-800 ${T_MUTED}
        text-[10px] font-mono font-semibold tracking-wider`}
      >
        <Command size={10} strokeWidth={2.5} /> K
      </span>
    </button>
  );
}

// =============================================================
// 2 · MODAL SHELL — Bottom Sheet (mobile) / Centered (desktop)
// =============================================================
function ModalShell({
  children, onClose, isDesktop, currentStep, intent, onBack,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isDesktop: boolean;
  currentStep: Step;
  intent: RegisterIntent | null;
  onBack: () => void;
}) {
  // animação difere por viewport
  const variants = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.95, y: 0 },
        animate: { opacity: 1, scale: 1,    y: 0 },
        exit:    { opacity: 0, scale: 0.95, y: 0 },
      }
    : {
        initial: { opacity: 1, scale: 1, y: '100%' },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit:    { opacity: 1, scale: 1, y: '100%' },
      };

  // bloquear bubble do clique no painel
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Painel */}
      <motion.div
        className={[
          'fixed z-[101]',
          // mobile · bottom sheet
          'inset-x-0 bottom-0 rounded-t-3xl',
          // desktop · centralizado
          'md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2',
          'md:-translate-x-1/2 md:-translate-y-1/2',
          'md:w-full md:max-w-lg md:rounded-3xl',
          // visual
          'bg-white dark:bg-zinc-900',
          'border-t border-zinc-200 dark:border-zinc-800',
          'md:border md:border-zinc-200 md:dark:border-zinc-800',
          'shadow-2xl',
          'max-h-[92vh] md:max-h-[85vh]',
          'flex flex-col overflow-hidden',
        ].join(' ')}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={stopProp}
        role="dialog"
        aria-modal="true"
      >
        {/* drag handle só no mobile */}
        <div className="md:hidden pt-2 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <ShellHeader
          currentStep={currentStep}
          intent={intent}
          onBack={onBack}
          onClose={onClose}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-6
          [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep + (intent ?? '')}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

function ShellHeader({
  currentStep, intent, onBack, onClose,
}: {
  currentStep: Step;
  intent: RegisterIntent | null;
  onBack: () => void;
  onClose: () => void;
}) {
  let title = '+ Registrar';
  let sub   = 'Escolha o que você quer registrar';

  if (currentStep === 'form' && intent) {
    if (intent === 'day') {
      title = 'Registrar Dia';
      sub   = 'Check-in rápido · em menos de 30s';
    } else if (intent === 'create') {
      title = 'Criar';
      sub   = 'Meta · Hábito · Tarefa';
    } else if (intent === 'finance') {
      title = 'Financeiro';
      sub   = 'Entrada · Saída · Categoria';
    }
  } else if (currentStep === 'success') {
    title = 'Registrado';
    sub   = 'Continue assim';
  }

  return (
    <div className="px-5 pt-3 pb-4 flex items-start gap-3">
      {currentStep === 'form' ? (
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 -ml-1 rounded-full flex items-center justify-center
            ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800
            transition-colors`}
          aria-label="Voltar"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
      ) : (
        <div className="w-8 h-8 -ml-1 flex items-center justify-center">
          <Sparkles size={14} className="text-emerald-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h2 className={`text-[15px] font-semibold leading-tight truncate ${T_STRONG}`}>
          {title}
        </h2>
        <p className={`mt-0.5 text-[11px] font-mono tracking-wide truncate ${T_MUTED}`}>
          {sub}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className={`w-8 h-8 -mr-1 rounded-full flex items-center justify-center
          ${T_LABEL} hover:bg-zinc-100 dark:hover:bg-zinc-800
          transition-colors`}
        aria-label="Fechar"
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}

// =============================================================
// 3 · STEP 1 — IntentGrid · 3 opções grandes
// =============================================================
function IntentGrid({ onSelect }: { onSelect: (i: RegisterIntent) => void }) {
  return (
    <div className="space-y-2.5">
      <p className={`text-[10px] font-mono tracking-[0.22em] uppercase mb-1 ${T_LABEL}`}>
        O que você quer registrar?
      </p>
      <IntentCard
        icon={<Icons.Sun size={18} strokeWidth={1.8} />}
        label="Registrar Dia"
        sub="Check-in rápido · humor, energia, foco, disciplina"
        accent="emerald"
        onClick={() => onSelect('day')}
      />
      <IntentCard
        icon={<Icons.Plus size={18} strokeWidth={2} />}
        label="Criar"
        sub="Meta · Hábito · Tarefa · em 3 etapas"
        accent="emerald"
        onClick={() => onSelect('create')}
      />
      <IntentCard
        icon={<Icons.Wallet size={18} strokeWidth={1.8} />}
        label="Financeiro"
        sub="Entrada · Saída · categoria · data"
        accent="emerald"
        onClick={() => onSelect('finance')}
      />

      {/* Footer · educa o usuário sobre XP */}
      <div className={[
        'mt-3 rounded-xl p-3 flex items-start gap-2.5',
        'bg-zinc-50 dark:bg-zinc-800/40',
        'border border-zinc-200 dark:border-zinc-800',
      ].join(' ')}>
        <Icons.MessageCircle size={12} className={`${T_LABEL} mt-0.5 shrink-0`} />
        <p className={`text-[10.5px] leading-relaxed ${T_LABEL}`}>
          XP e ranking são acumulados via WhatsApp Agent. Aqui o foco é
          <strong className={T_STRONG}> velocidade de registro</strong>.
        </p>
      </div>
    </div>
  );
}

// IntentCard · card grande clicável
function IntentCard({
  icon, label, sub, onClick, accent,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  accent: 'emerald';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group w-full flex items-center gap-3 p-4 rounded-2xl text-left',
        'bg-white dark:bg-zinc-900',
        'border border-zinc-200 dark:border-zinc-800',
        'hover:border-emerald-500 hover:-translate-y-0.5',
        'hover:shadow-lg hover:shadow-emerald-500/15',
        'active:scale-[0.99]',
        'transition-all duration-200',
      ].join(' ')}
    >
      <div className={[
        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all',
        'bg-emerald-500 text-white shadow-md shadow-emerald-500/25',
        'group-hover:shadow-emerald-500/40 group-hover:scale-105',
      ].join(' ')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-bold leading-tight ${T_STRONG}`}>{label}</p>
        <p className={`text-[11px] mt-0.5 ${T_LABEL} truncate`}>{sub}</p>
      </div>
      <Icons.ChevronRight
        size={16}
        className={`${T_MUTED} group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0`}
      />
    </button>
  );
}

// =============================================================
// 4 · STEP 2 — Roteador de Forms · 3 intents
// =============================================================
function FormRouter({
  intent, onSubmit,
}: {
  intent: RegisterIntent;
  onSubmit: (data: Record<string, unknown>) => void;
}) {
  if (intent === 'day')     return <QuickDayForm onSubmit={onSubmit} />;
  if (intent === 'create')  return <CriarWizard onSubmit={onSubmit} />;
  return <QuickFinanceForm onSubmit={onSubmit} />;
}

// =============================================================
// 4.A · FINANÇAS — "Cofre Input"
// =============================================================
type FinanceType = 'despesa' | 'receita' | 'investimento';
const FINANCE_CATEGORIES: Record<FinanceType, { label: string; icon: IconName }[]> = {
  despesa: [
    { label: 'Mercado',    icon: 'ShoppingCart' },
    { label: 'Transporte', icon: 'Car' },
    { label: 'Moradia',    icon: 'Home' },
    { label: 'Saúde',      icon: 'HeartPulse' },
    { label: 'Lazer',      icon: 'Gamepad2' },
    { label: 'Outros',     icon: 'CircleEllipsis' },
  ],
  receita: [
    { label: 'Salário',    icon: 'Wallet' },
    { label: 'Freelance',  icon: 'Laptop' },
    { label: 'Bônus',      icon: 'Gift' },
    { label: 'Reembolso',  icon: 'RotateCcw' },
    { label: 'Outros',     icon: 'CircleEllipsis' },
  ],
  investimento: [
    { label: 'Renda Fixa', icon: 'Landmark' },
    { label: 'Ações',      icon: 'TrendingUp' },
    { label: 'Cripto',     icon: 'Bitcoin' },
    { label: 'Reserva',    icon: 'PiggyBank' },
    { label: 'Outros',     icon: 'CircleEllipsis' },
  ],
};

function FinanceForm({
  onSubmit,
}: { onSubmit: (data: Record<string, unknown>, xp: number) => void }) {
  const [type,     setType]     = useState<FinanceType>('despesa');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const valueNum = useMemo(() => Number(amount.replace(',', '.')) || 0, [amount]);
  const valid    = valueNum > 0 && category !== null;

  // XP engine
  const xp = useMemo(() => {
    if (type === 'investimento') return 50;
    if (type === 'receita')      return 20;
    return 5; // despesa = recompensa pelo hábito do registro
  }, [type]);

  // Year projection · finance
  const projection = useMemo(() => {
    if (type === 'investimento') {
      return {
        intent: 'positive' as const,
        text: 'Patrimônio composto silenciosamente. Cada R$ que vai pra renda variável hoje vira liberdade futura — esse é o jogo dos pacientes.',
      };
    }
    if (type === 'receita') {
      return {
        intent: 'neutral' as const,
        text: 'Cada entrada registrada é consciência fiscal. Quem sabe de onde vem, sabe pra onde direcionar — e quem direciona, escolhe seu fim.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Despesa registrada vira escolha consciente, não impulso esquecido. Em 1 ano você vai conhecer seus padrões de gasto melhor que ninguém.',
    };
  }, [type]);

  const submit = () => {
    if (!valid) return;
    onSubmit({ type, amount: valueNum, category }, xp);
  };

  return (
    <div className="space-y-6">
      {/* Segmented control */}
      <SegmentedControl<FinanceType>
        value={type}
        onChange={(v) => { setType(v); setCategory(null); }}
        options={[
          { value: 'despesa',      label: 'Despesa',      icon: <TrendingDown size={13} /> },
          { value: 'receita',      label: 'Receita',      icon: <TrendingUp size={13} /> },
          { value: 'investimento', label: 'Investimento', icon: <PiggyBank size={13} /> },
        ]}
        accent={
          type === 'despesa' ? 'rose' : 'emerald'
        }
      />

      {/* Massive amount input */}
      <div className="pt-4 pb-2">
        <BigCurrencyInput value={amount} onChange={setAmount} type={type} />
      </div>

      {/* Categoria */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-3`}>
          Categoria
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FINANCE_CATEGORIES[type].map((c) => {
            const Icon = IconOf(c.icon);
            const active = category === c.label;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setCategory(c.label)}
                className={[
                  'flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl',
                  'border transition-all duration-150',
                  active
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                       hover:border-emerald-500/40`,
                ].join(' ')}
              >
                <Icon size={13} strokeWidth={1.8} />
                <span className="text-[11px] font-medium tracking-wide truncate">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
      />
    </div>
  );
}

// Segmented control reutilizável
type SegAccent = 'emerald' | 'rose';
interface SegOption<T> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}
function SegmentedControl<T extends string>({
  value, onChange, options, accent,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  accent: SegAccent;
}) {
  const activeBg =
    accent === 'rose'
      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900'
      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900';

  return (
    <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl
      bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex items-center justify-center gap-1.5 h-9 rounded-xl border',
              'text-[11px] font-semibold tracking-wide transition-all duration-200',
              active
                ? activeBg
                : `border-transparent ${T_LABEL} hover:text-zinc-700 dark:hover:text-zinc-200`,
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Input gigante centralizado · só dígitos + vírgula
function BigCurrencyInput({
  value, onChange, type,
}: {
  value: string;
  onChange: (v: string) => void;
  type: FinanceType;
}) {
  const ref = useRef<HTMLInputElement>(null);
  // foco automático
  useEffect(() => { ref.current?.focus(); }, []);

  const accentColor =
    type === 'despesa' ? 'rgb(244 63 94)' : EMERALD;
  const sign = type === 'despesa' ? '−' : '+';

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-2 max-w-full">
        <span
          className="text-[24px] font-mono font-semibold leading-none"
          style={{ color: accentColor, opacity: value ? 1 : 0.35 }}
        >
          {sign} R$
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d,.]/g, '').replace(/\./g, ',');
            const parts = raw.split(',');
            const clean = parts.length > 1
              ? parts[0] + ',' + parts.slice(1).join('').slice(0, 2)
              : parts[0];
            onChange(clean);
          }}
          placeholder="0,00"
          className={[
            'bg-transparent outline-none border-0 p-0',
            'text-5xl font-bold tracking-tight tabular-nums text-center',
            T_STRONG,
            'placeholder:text-zinc-300 dark:placeholder:text-zinc-700',
            'min-w-0 max-w-[240px]',
          ].join(' ')}
          style={{ width: `${Math.max(2, value.length || 4)}ch` }}
        />
      </div>
      {/* underline animado */}
      <div className="mt-2 h-px w-44 bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: value ? '100%' : '0%',
            backgroundColor: accentColor,
          }}
        />
      </div>
    </div>
  );
}

// =============================================================
// 4.B · SAÚDE — Input físico
// =============================================================
const HEALTH_ACTIVITIES: { label: string; icon: IconName }[] = [
  { label: 'Musculação', icon: 'Dumbbell' },
  { label: 'Cardio',     icon: 'Footprints' },
  { label: 'Alongamento',icon: 'StretchHorizontal' },
  { label: 'Esporte',    icon: 'Volleyball' },
];
const HEALTH_DURATIONS = [15, 30, 45, 60];

// Wrapper · Saúde tem dois sub-fluxos: Treino e Nutrição
function HealthForm({
  onSubmit,
}: { onSubmit: (data: Record<string, unknown>, xp: number) => void }) {
  const [tab, setTab] = useState<'treino' | 'nutrition'>('treino');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl
        bg-zinc-100 dark:bg-zinc-800/60
        border border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab('treino')}
          className={[
            'h-9 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all',
            tab === 'treino'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : `${T_LABEL} hover:text-zinc-700 dark:hover:text-zinc-200`,
          ].join(' ')}
        >
          Treino
        </button>
        <button
          type="button"
          onClick={() => setTab('nutrition')}
          className={[
            'h-9 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all',
            tab === 'nutrition'
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : `${T_LABEL} hover:text-zinc-700 dark:hover:text-zinc-200`,
          ].join(' ')}
        >
          Nutrição
        </button>
      </div>

      {tab === 'treino'
        ? <TreinoForm onSubmit={onSubmit} />
        : <NutritionForm onSubmit={onSubmit} />}
    </div>
  );
}

function TreinoForm({
  onSubmit,
}: { onSubmit: (data: Record<string, unknown>, xp: number) => void }) {
  const [activity,    setActivity]    = useState<string | null>(null);
  const [duration,    setDuration]    = useState<number | null>(null);
  const [customDur,   setCustomDur]   = useState('');
  const [intensity,   setIntensity]   = useState(7);

  const effectiveDuration = duration ?? (Number(customDur) || 0);
  const valid = activity !== null && effectiveDuration > 0;

  // XP engine
  const xp = useMemo(() => {
    let total = 25; // base por registrar
    if (intensity >= 8) total = 60;
    if (effectiveDuration >= 60) total += 20;
    return total;
  }, [intensity, effectiveDuration]);

  // Year projection
  const projection = useMemo(() => {
    if (intensity >= 8 && effectiveDuration >= 45) {
      return {
        intent: 'positive' as const,
        text: 'Corpo forte, postura ereta, energia explosiva e disciplina física que contagia todas as outras áreas. Saúde como vantagem competitiva.',
      };
    }
    if (intensity >= 6 || effectiveDuration >= 30) {
      return {
        intent: 'neutral' as const,
        text: 'Corpo mais resiliente, ansiedade controlada e identidade de quem treina sólida. A consistência multiplica o efeito.',
      };
    }
    return {
      intent: 'warning' as const,
      text: 'Treinos leves e raros mantém você fora do vermelho mas não te leva pra cima. Aumente intensidade ou frequência pra ver mudança real.',
    };
  }, [intensity, effectiveDuration]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      { activity, duration_min: effectiveDuration, intensity_rpe: intensity, sub: 'treino' },
      xp,
    );
  };

  return (
    <div className="space-y-6">
      {/* Atividade */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-3`}>
          Atividade
        </label>
        <div className="grid grid-cols-4 gap-2">
          {HEALTH_ACTIVITIES.map((a) => {
            const Icon = IconOf(a.icon);
            const active = activity === a.label;
            return (
              <button
                key={a.label}
                type="button"
                onClick={() => setActivity(a.label)}
                className={[
                  'flex flex-col items-center justify-center gap-1.5 h-[78px] rounded-2xl',
                  'border transition-all duration-200',
                  active
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                       hover:border-emerald-500/40 hover:-translate-y-0.5`,
                ].join(' ')}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="text-[9px] font-mono tracking-wider uppercase">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duração */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-3`}>
          Duração
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {HEALTH_DURATIONS.map((d) => {
            const active = duration === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => { setDuration(d); setCustomDur(''); }}
                className={[
                  'h-9 px-3.5 rounded-full text-[12px] font-semibold tabular-nums transition-all',
                  active
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                    : `bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL}
                       hover:bg-zinc-200 dark:hover:bg-zinc-700`,
                ].join(' ')}
              >
                {d >= 60 ? '1h' : `${d}m`}
              </button>
            );
          })}
          <div className={[
            'flex items-center gap-1 h-9 pl-3 pr-2 rounded-full',
            'bg-zinc-100 dark:bg-zinc-800',
            customDur ? 'ring-2 ring-emerald-500' : '',
          ].join(' ')}>
            <input
              type="text"
              inputMode="numeric"
              value={customDur}
              onChange={(e) => {
                setCustomDur(e.target.value.replace(/\D/g, '').slice(0, 3));
                setDuration(null);
              }}
              placeholder="custom"
              className={`bg-transparent outline-none border-0 p-0 w-16
                text-[12px] font-semibold tabular-nums ${T_STRONG}
                placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
            />
            <span className={`text-[11px] font-mono ${T_MUTED}`}>min</span>
          </div>
        </div>
      </div>

      {/* Intensidade RPE */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={`text-[10px] font-mono tracking-widest uppercase ${T_LABEL}`}>
            Intensidade · RPE
          </label>
          <span className={`text-[14px] font-mono font-bold tabular-nums ${T_STRONG}`}>
            {intensity}<span className={T_MUTED}>/10</span>
          </span>
        </div>
        <RPESlider value={intensity} onChange={setIntensity} />
        <div className={`mt-2 flex justify-between text-[9px] font-mono tracking-wider ${T_MUTED}`}>
          <span>LEVE</span>
          <span>MODERADO</span>
          <span className={intensity >= 8 ? 'text-emerald-500 font-bold' : ''}>EXPLOSIVO</span>
        </div>
      </div>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={effectiveDuration >= 60 ? '+20 bônus duração' : undefined}
      />
    </div>
  );
}

// Slider customizado para RPE (1..10)
function RPESlider({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative h-7 flex items-center">
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div
        className="absolute h-1.5 rounded-full"
        style={{ width: `${((value - 1) / 9) * 100}%`, backgroundColor: EMERALD }}
      />
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rpe-slider relative w-full appearance-none bg-transparent cursor-pointer h-7 z-10"
      />
      <style>{`
        .rpe-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: ${EMERALD};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.45);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .rpe-slider::-webkit-slider-thumb:active { transform: scale(1.15); }
        .rpe-slider::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 9999px;
          background: ${EMERALD};
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16,185,129,0.45);
          cursor: pointer;
        }
        .dark .rpe-slider::-webkit-slider-thumb { border-color: #18181b; }
        .dark .rpe-slider::-moz-range-thumb { border-color: #18181b; }
      `}</style>
    </div>
  );
}

// =============================================================
// 4.C · MENTE — Input de Foco
// =============================================================
const MIND_PROJECTS = [
  'ORVAX', 'Estudo profundo', 'Pesquisa', 'Escrita', 'Curso atual', 'Side-project',
];

function MindForm({
  onSubmit,
}: { onSubmit: (data: Record<string, unknown>, xp: number) => void }) {
  const [deepWork,  setDeepWork]  = useState(false);
  const [goal,      setGoal]      = useState('');
  const [project,   setProject]   = useState<string | null>(null);

  const valid = goal.trim().length > 0;

  const xp = useMemo(() => {
    if (deepWork) return 100;
    return 30; // base
  }, [deepWork]);

  // Year projection · mente
  const projection = useMemo(() => {
    if (deepWork) {
      return {
        intent: 'positive' as const,
        text: 'Você terá acumulado milhares de horas de foco profundo. Foco é o novo QI — quem domina, lidera; quem fragmenta, é liderado.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Cada sessão registrada é uma rep mental. Em 1 ano você terá clareza de pra onde sua atenção realmente foi — e poder pra redirecionar.',
    };
  }, [deepWork]);

  const submit = () => {
    if (!valid) return;
    onSubmit(
      { deep_work: deepWork, goal: goal.trim(), project: project ?? null },
      xp,
    );
  };

  return (
    <div className="space-y-6">
      {/* Toggle iOS-style */}
      <div className={[
        'flex items-center justify-between p-4 rounded-2xl',
        CARD,
        deepWork ? 'border-emerald-500 dark:border-emerald-500' : '',
        'transition-colors',
      ].join(' ')}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            deepWork
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500',
            'transition-colors',
          ].join(' ')}>
            <Flame size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className={`text-[13px] font-semibold ${T_STRONG}`}>Modo Deep Work</p>
            <p className={`text-[11px] ${T_LABEL}`}>Sessão sem interrupções</p>
          </div>
        </div>
        <IOSToggle on={deepWork} onChange={setDeepWork} />
      </div>

      {/* Meta da sessão */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          Meta da sessão
        </label>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Qual a única coisa que você vai dominar agora?"
          className={[
            'w-full bg-transparent border-0 outline-none p-0 pb-2',
            'border-b border-zinc-200 dark:border-zinc-800',
            'focus:border-emerald-500 dark:focus:border-emerald-500',
            'text-[15px] font-medium',
            T_STRONG,
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500 placeholder:font-normal',
            'transition-colors',
          ].join(' ')}
        />
      </div>

      {/* Projetos */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-3`}>
          Área / Projeto
        </label>
        <div className="flex flex-wrap gap-2">
          {MIND_PROJECTS.map((p) => {
            const active = project === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setProject(active ? null : p)}
                className={[
                  'h-8 px-3 rounded-full text-[11px] font-semibold tracking-wide transition-all',
                  active
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                    : `bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL}
                       hover:bg-zinc-200 dark:hover:bg-zinc-700`,
                ].join(' ')}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={deepWork ? 'Deep Work · ×3' : undefined}
      />
    </div>
  );
}

// Toggle iOS-style
function IOSToggle({
  on, onChange,
}: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={[
        'relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0',
        on ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md',
          'transition-transform duration-200',
          on ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}

// =============================================================
// 4.D · GENÉRICO — placeholder elegante para os 7 demais pilares
// =============================================================
function GenericForm({
  pillarKey, onSubmit,
}: {
  pillarKey: PillarKey;
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}) {
  const pillar  = getPillar(pillarKey);
  const [note, setNote] = useState('');
  const xp = 15; // base genérico
  const valid = note.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className={[
        'p-4 rounded-2xl flex items-start gap-3',
        'bg-emerald-50 dark:bg-emerald-950/30',
        'border border-emerald-200 dark:border-emerald-900/50',
      ].join(' ')}>
        <Sparkles size={14} className="text-emerald-500 mt-0.5 shrink-0" />
        <p className={`text-[12px] leading-relaxed ${T_NORMAL}`}>
          Form bespoke de <strong>{pillar.label}</strong> em construção.
          Por enquanto, registre uma anotação rápida.
        </p>
      </div>

      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          Anotação
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Descreva o que você fez..."
          className={[
            'w-full bg-transparent border outline-none p-3 rounded-2xl resize-none',
            'border-zinc-200 dark:border-zinc-800',
            'focus:border-emerald-500 dark:focus:border-emerald-500',
            'text-[13px] leading-relaxed',
            T_STRONG,
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'transition-colors',
          ].join(' ')}
        />
      </div>

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={() => valid && onSubmit({ note: note.trim() }, xp)}
      />
    </div>
  );
}

// =============================================================
// 5 · STEP 3 — Sucesso/XP
// =============================================================
function SuccessScreen({ intent }: { intent: RegisterIntent | null }) {
  const message =
    intent === 'day'     ? 'Dia registrado'    :
    intent === 'create'  ? 'Criado com sucesso':
    intent === 'finance' ? 'Lançamento salvo'  :
                            'Registrado';
  const sub =
    intent === 'day'     ? 'Padrão capturado · sistema atualizado'        :
    intent === 'create'  ? 'Disponível na sua jornada'                    :
    intent === 'finance' ? 'Saldo recalculado em tempo real'              :
                            'Continue assim';
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-12 gap-5"
      initial={{ scale: 0.92 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, ease: 'backOut' }}
    >
      <motion.div
        className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center
          shadow-xl shadow-emerald-500/40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: 'backOut' }}
      >
        <Check size={36} strokeWidth={3} className="text-white" />
      </motion.div>

      <div className="text-center">
        <p className={`text-[20px] font-bold ${T_STRONG} leading-tight`}>
          {message}
        </p>
        <p className={`mt-1 text-[11px] font-mono tracking-wider uppercase ${T_MUTED}`}>
          {sub}
        </p>
      </div>
    </motion.div>
  );
}

// =============================================================
// 6 · SUBMIT BAR (sticky no rodapé do form)
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
            : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-500/40 active:scale-[0.98]',
        ].join(' ')}
      >
        <Check size={15} strokeWidth={2.6} />
        Registrar Ação
        <span className={[
          'ml-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums',
          disabled
            ? 'bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500'
            : 'bg-white/20 text-white',
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
