// =============================================================
// ORVAX · QuickFinanceForm — Registro financeiro · simples e rápido.
// Entrada / Saída / Valor / Categoria / Data
// Sem XP. Foco total em velocidade de input.
// =============================================================
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Icons from 'lucide-react';
import { TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { SubmitBar } from './shared/SubmitBar';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

type FinanceType = 'entrada' | 'saida';

type IconName = keyof typeof Icons;
const CATEGORIES: Record<FinanceType, { label: string; icon: IconName }[]> = {
  saida: [
    { label: 'Mercado',     icon: 'ShoppingCart' },
    { label: 'Transporte',  icon: 'Car' },
    { label: 'Moradia',     icon: 'Home' },
    { label: 'Saúde',       icon: 'HeartPulse' },
    { label: 'Lazer',       icon: 'Gamepad2' },
    { label: 'Assinaturas', icon: 'Repeat' },
    { label: 'Restaurante', icon: 'Utensils' },
    { label: 'Outros',      icon: 'CircleEllipsis' },
  ],
  entrada: [
    { label: 'Salário',    icon: 'Wallet' },
    { label: 'Freelance',  icon: 'Laptop' },
    { label: 'Bônus',      icon: 'Gift' },
    { label: 'Reembolso',  icon: 'RotateCcw' },
    { label: 'Renda extra',icon: 'TrendingUp' },
    { label: 'Outros',     icon: 'CircleEllipsis' },
  ],
};

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
}

export default function QuickFinanceForm({ onSubmit }: Props) {
  const [type,     setType]     = useState<FinanceType>('saida');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [date,     setDate]     = useState(() => new Date().toISOString().slice(0, 10));

  const valueNum = useMemo(() => Number(amount.replace(',', '.')) || 0, [amount]);
  const valid = valueNum > 0 && category !== null && date.length > 0;

  const submit = () => {
    if (!valid) return;
    onSubmit({ type, amount: valueNum, category, date });
  };

  return (
    <div className="space-y-5">
      {/* Tipo · entrada vs saída */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl
        bg-zinc-100 dark:bg-zinc-800/60
        border border-zinc-200 dark:border-zinc-800">
        <TypeBtn
          active={type === 'saida'}
          tone="rose"
          icon={<TrendingDown size={13} />}
          label="Saída"
          onClick={() => { setType('saida'); setCategory(null); }}
        />
        <TypeBtn
          active={type === 'entrada'}
          tone="emerald"
          icon={<TrendingUp size={13} />}
          label="Entrada"
          onClick={() => { setType('entrada'); setCategory(null); }}
        />
      </div>

      {/* Big amount input */}
      <BigCurrencyInput value={amount} onChange={setAmount} type={type} />

      {/* Categoria */}
      <div>
        <label className={`block text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          Categoria
        </label>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES[type].map((c) => {
            const Icon = (Icons[c.icon] as React.ComponentType<{ size?: number; strokeWidth?: number }>) || Icons.Circle;
            const active = category === c.label;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setCategory(c.label)}
                className={[
                  'flex flex-col items-center justify-center gap-1.5 h-[68px] rounded-2xl border transition-all',
                  active
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
                       hover:border-emerald-500/40 hover:-translate-y-0.5`,
                ].join(' ')}
              >
                <Icon size={15} strokeWidth={1.8} />
                <span className="text-[9px] font-mono tracking-wider uppercase text-center leading-tight px-1 truncate max-w-full">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data */}
      <div>
        <label className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${T_LABEL} mb-2`}>
          <Calendar size={11} className="text-emerald-500" />
          Data
        </label>
        <div className="grid grid-cols-3 gap-2">
          <DateBtn label="Hoje"     onClick={() => setDate(toISO(0))}  active={isDays(date, 0)} />
          <DateBtn label="Ontem"    onClick={() => setDate(toISO(1))}  active={isDays(date, 1)} />
          <DateBtn label="Anteontem" onClick={() => setDate(toISO(2))}  active={isDays(date, 2)} />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={[
            'mt-2 w-full h-10 px-3 rounded-lg border outline-none',
            'bg-white dark:bg-zinc-900',
            'border-zinc-200 dark:border-zinc-800',
            'focus:border-emerald-500',
            'text-[13px] tabular-nums',
            T_STRONG,
            '[color-scheme:light] dark:[color-scheme:dark]',
            'transition-colors',
          ].join(' ')}
        />
      </div>

      <SubmitBar
        disabled={!valid}
        onSubmit={submit}
        label={type === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
      />
    </div>
  );
}

// =============================================================
// helpers
// =============================================================
function toISO(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}
function isDays(iso: string, daysAgo: number) {
  return iso === toISO(daysAgo);
}

function TypeBtn({
  active, tone, icon, label, onClick,
}: {
  active: boolean;
  tone: 'rose' | 'emerald';
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const activeBg = tone === 'rose'
    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900'
    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-1.5 h-10 rounded-xl border',
        'text-[12px] font-bold tracking-wide transition-all duration-200',
        active ? activeBg : `border-transparent ${T_LABEL} hover:text-zinc-700 dark:hover:text-zinc-200`,
      ].join(' ')}
    >
      {icon}{label}
    </button>
  );
}

function DateBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-9 rounded-lg border text-[11px] font-semibold transition-all',
        active
          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30'
          : `bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 ${T_NORMAL}
             hover:border-emerald-500/40`,
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function BigCurrencyInput({
  value, onChange, type,
}: {
  value: string;
  onChange: (v: string) => void;
  type: FinanceType;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const accentColor = type === 'saida' ? 'rgb(244 63 94)' : '#10B981';
  const sign = type === 'saida' ? '−' : '+';

  return (
    <div className="flex flex-col items-center py-2">
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
