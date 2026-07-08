// =============================================================
// ORVAX · NutritionForm — registro nutricional diário.
// Refeições · calorias · proteína · água · ultraprocessados · compulsão
// =============================================================
import React, { useState, useMemo } from 'react';
import { Plus, X, Check, Droplets, Flame, AlertTriangle } from 'lucide-react';
import { YearProjection } from './shared/YearProjection';

const EMERALD = '#10B981';

const T_STRONG = 'text-zinc-900 dark:text-zinc-50';
const T_NORMAL = 'text-zinc-700 dark:text-zinc-200';
const T_LABEL  = 'text-zinc-500 dark:text-zinc-400';
const T_MUTED  = 'text-zinc-400 dark:text-zinc-500';

const MEAL_PRESETS = ['Café', 'Lanche', 'Almoço', 'Jantar'] as const;

interface MealRow {
  id: string;
  label: string;
  desc: string;
  kcal: string;
}

interface Props {
  onSubmit: (data: Record<string, unknown>, xp: number) => void;
}

export default function NutritionForm({ onSubmit }: Props) {
  const [meals, setMeals] = useState<MealRow[]>([
    { id: 'm1', label: 'Café',   desc: '', kcal: '' },
    { id: 'm2', label: 'Almoço', desc: '', kcal: '' },
  ]);
  const [protein,    setProtein]    = useState('');
  const [waterL,     setWaterL]     = useState(0);   // litros, com stepper
  const [ultra,      setUltra]      = useState<boolean | null>(null);
  const [bingeing,   setBingeing]   = useState<boolean | null>(null);

  // computações
  const totalKcal = useMemo(
    () => meals.reduce((s, m) => s + (Number(m.kcal) || 0), 0),
    [meals],
  );
  const proteinG  = Number(protein) || 0;
  const filledMeals = meals.filter(m => m.desc.trim().length > 0).length;
  const valid = filledMeals >= 1 && ultra !== null && bingeing !== null;

  // XP engine
  const xp = useMemo(() => {
    let total = 20;                       // base por registrar
    if (waterL >= 2.5)         total += 10;
    if (proteinG >= 100)       total += 15;
    if (ultra === false)       total += 10;
    if (bingeing === false)    total += 5;
    return total;
  }, [waterL, proteinG, ultra, bingeing]);

  // Projection
  const projection = useMemo(() => {
    const consistent = waterL >= 2.5 && proteinG >= 80 && ultra === false;
    if (consistent) {
      return {
        intent: 'positive' as const,
        text: 'Corpo recomposto, energia estável o dia inteiro, fome regulada e disciplina alimentar como segunda natureza.',
      };
    }
    if (ultra === true || bingeing === true) {
      return {
        intent: 'warning' as const,
        text: 'Inflamação crônica, dependência de açúcar e ciclos de culpa. Sua relação com comida vira inimigo silencioso.',
      };
    }
    return {
      intent: 'neutral' as const,
      text: 'Mais ciência sobre o que entra no seu corpo. Cada refeição registrada é uma decisão consciente sobre quem você está virando.',
    };
  }, [waterL, proteinG, ultra, bingeing]);

  const addMeal = () => {
    const used = meals.map(m => m.label);
    const next = MEAL_PRESETS.find(p => !used.includes(p)) ?? `Refeição ${meals.length + 1}`;
    setMeals([...meals, { id: `m${Date.now()}`, label: next, desc: '', kcal: '' }]);
  };
  const removeMeal = (id: string) => setMeals(meals.filter(m => m.id !== id));
  const updateMeal = (id: string, patch: Partial<MealRow>) =>
    setMeals(meals.map(m => m.id === id ? { ...m, ...patch } : m));

  const submit = () => {
    if (!valid) return;
    onSubmit(
      {
        meals: meals
          .filter(m => m.desc.trim())
          .map(m => ({ label: m.label, desc: m.desc.trim(), kcal: Number(m.kcal) || null })),
        total_kcal:    totalKcal,
        protein_g:     proteinG,
        water_l:       waterL,
        ultra_processed: ultra,
        bingeing,
      },
      xp,
    );
  };

  return (
    <div className="space-y-6">
      {/* Refeições */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={`text-[10px] font-mono tracking-widest uppercase ${T_LABEL}`}>
            Refeições do dia
          </label>
          <span className={`text-[10px] font-mono tabular-nums ${T_MUTED}`}>
            {totalKcal > 0 && <>{totalKcal} kcal · </>}{filledMeals}/{meals.length}
          </span>
        </div>
        <div className="space-y-2">
          {meals.map((m) => (
            <MealRowInput
              key={m.id}
              row={m}
              onChange={(patch) => updateMeal(m.id, patch)}
              onRemove={meals.length > 1 ? () => removeMeal(m.id) : undefined}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={addMeal}
          className={`mt-2 flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold
            ${T_LABEL} hover:text-emerald-600 dark:hover:text-emerald-400
            border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/40
            transition-colors`}
        >
          <Plus size={12} strokeWidth={2.4} /> Adicionar refeição
        </button>
      </div>

      {/* Proteína + Água em grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Proteína */}
        <div className={[
          'rounded-2xl p-3 border',
          'bg-white dark:bg-zinc-900',
          'border-zinc-200 dark:border-zinc-800',
        ].join(' ')}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame size={11} className="text-emerald-500" />
            <label className={`text-[9px] font-mono tracking-widest uppercase ${T_LABEL}`}>
              Proteína
            </label>
          </div>
          <div className="flex items-baseline gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={protein}
              onChange={(e) => setProtein(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0"
              className={`bg-transparent outline-none border-0 p-0 w-16
                text-[28px] font-bold tracking-tight tabular-nums ${T_STRONG}
                placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
            />
            <span className={`text-[12px] font-mono ${T_MUTED}`}>g</span>
          </div>
          <div className="mt-1 h-px bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 transition-all duration-300"
              style={{
                width: `${Math.min(100, (proteinG / 150) * 100)}%`,
                backgroundColor: EMERALD,
              }}
            />
          </div>
          <p className={`mt-1.5 text-[9px] font-mono tracking-wide ${T_MUTED}`}>
            meta · 100–150g
          </p>
        </div>

        {/* Água */}
        <div className={[
          'rounded-2xl p-3 border',
          'bg-white dark:bg-zinc-900',
          'border-zinc-200 dark:border-zinc-800',
        ].join(' ')}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Droplets size={11} className="text-sky-500 dark:text-sky-400" />
            <label className={`text-[9px] font-mono tracking-widest uppercase ${T_LABEL}`}>
              Água
            </label>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-[28px] font-bold tracking-tight tabular-nums ${T_STRONG}`}>
              {waterL.toFixed(1)}
            </span>
            <span className={`text-[12px] font-mono ${T_MUTED}`}>L</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setWaterL(Math.max(0, +(waterL - 0.5).toFixed(1)))}
              className={`w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL}
                hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[14px] font-bold transition-colors`}
            >−</button>
            <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-sky-500 dark:bg-sky-400 transition-all"
                style={{ width: `${Math.min(100, (waterL / 3) * 100)}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setWaterL(+(waterL + 0.5).toFixed(1))}
              className={`w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${T_NORMAL}
                hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[14px] font-bold transition-colors`}
            >+</button>
          </div>
        </div>
      </div>

      {/* Toggles binários */}
      <div className="space-y-2.5">
        <YesNoCard
          icon={<AlertTriangle size={14} />}
          label="Consumiu ultraprocessados?"
          hint="Refrigerante, biscoito recheado, fast-food etc."
          value={ultra}
          onChange={setUltra}
          inverted
        />
        <YesNoCard
          icon={<Flame size={14} />}
          label="Teve compulsão alimentar?"
          hint="Comer além da fome / descontrole emocional"
          value={bingeing}
          onChange={setBingeing}
          inverted
        />
      </div>

      <YearProjection text={projection.text} intent={projection.intent} />

      <SubmitBar
        disabled={!valid}
        xpPreview={xp}
        onSubmit={submit}
        bonus={
          waterL >= 2.5 && proteinG >= 100 && ultra === false
            ? 'Combo limpo · +35 bônus'
            : undefined
        }
      />
    </div>
  );
}

// =============================================================
// MealRowInput — uma linha de refeição
// =============================================================
function MealRowInput({
  row, onChange, onRemove,
}: {
  row: MealRow;
  onChange: (patch: Partial<MealRow>) => void;
  onRemove?: () => void;
}) {
  const filled = row.desc.trim().length > 0;
  return (
    <div className={[
      'rounded-xl p-2.5 border transition-colors',
      'bg-white dark:bg-zinc-900',
      filled
        ? 'border-emerald-300 dark:border-emerald-900/60'
        : 'border-zinc-200 dark:border-zinc-800',
    ].join(' ')}>
      <div className="flex items-center gap-2 mb-1.5">
        <input
          type="text"
          value={row.label}
          onChange={(e) => onChange({ label: e.target.value.slice(0, 20) })}
          className={`bg-transparent outline-none border-0 p-0 flex-1 min-w-0
            text-[10px] font-mono tracking-wider uppercase font-semibold
            ${T_LABEL}
            placeholder:text-zinc-400 dark:placeholder:text-zinc-600`}
          placeholder="REFEIÇÃO"
        />
        <input
          type="text"
          inputMode="numeric"
          value={row.kcal}
          onChange={(e) => onChange({ kcal: e.target.value.replace(/\D/g, '').slice(0, 4) })}
          placeholder="0"
          className={`bg-transparent outline-none border-0 p-0 w-12 text-right
            text-[11px] font-mono tabular-nums ${T_NORMAL}
            placeholder:text-zinc-300 dark:placeholder:text-zinc-700`}
        />
        <span className={`text-[10px] font-mono ${T_MUTED}`}>kcal</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className={`w-6 h-6 rounded-md flex items-center justify-center
              ${T_MUTED} hover:bg-zinc-100 dark:hover:bg-zinc-800
              hover:text-rose-500 transition-colors`}
            aria-label="Remover refeição"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <input
        type="text"
        value={row.desc}
        onChange={(e) => onChange({ desc: e.target.value })}
        placeholder="o que você comeu?"
        className={`w-full bg-transparent outline-none border-0 p-0
          text-[12px] ${T_STRONG}
          placeholder:text-zinc-400 dark:placeholder:text-zinc-500 placeholder:font-normal`}
      />
    </div>
  );
}

// =============================================================
// YesNoCard — toggle binário visual
// =============================================================
function YesNoCard({
  icon, label, hint, value, onChange, inverted,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  /** se inverted, "não" é a resposta positiva (emerald) e "sim" é warning */
  inverted?: boolean;
}) {
  const yesPositive = !inverted;
  const yesColor = yesPositive
    ? 'bg-emerald-500 text-white border-emerald-500'
    : 'bg-rose-500 text-white border-rose-500';
  const noColor = yesPositive
    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-800'
    : 'bg-emerald-500 text-white border-emerald-500';

  return (
    <div className={[
      'rounded-2xl p-3 border flex items-center gap-3',
      'bg-white dark:bg-zinc-900',
      'border-zinc-200 dark:border-zinc-800',
    ].join(' ')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0
        bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[12px] font-semibold ${T_STRONG}`}>{label}</p>
        {hint && <p className={`text-[10px] ${T_MUTED} truncate`}>{hint}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={[
            'h-8 px-3 rounded-full border text-[11px] font-semibold transition-all',
            value === false ? noColor : `bg-transparent ${T_LABEL} border-zinc-200 dark:border-zinc-700 hover:border-zinc-400`,
          ].join(' ')}
        >Não</button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={[
            'h-8 px-3 rounded-full border text-[11px] font-semibold transition-all',
            value === true ? yesColor : `bg-transparent ${T_LABEL} border-zinc-200 dark:border-zinc-700 hover:border-zinc-400`,
          ].join(' ')}
        >Sim</button>
      </div>
    </div>
  );
}

// =============================================================
// SubmitBar — duplicado pequeno (alinhado com OmniActionCenter)
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
