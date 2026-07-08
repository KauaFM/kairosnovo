import { useState, useMemo, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Shield, Brain, BookOpen,
  Dumbbell, TrendingUp, Activity, Target, Calendar,
  Zap, Flame, Repeat, Crosshair, Sparkles, Check
} from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from 'recharts';
import type { DomainKey, GoalFrequency } from '../types/metrics.types';

/* ═══════════════════════════════════════════════════════════ */
/*  QUICK CREATE META — Progressive Disclosure Goal Creator   */
/*  2-Step: Templates → Configure + Preview → Confirm         */
/*  Black & white brutalista / Power BI aesthetic              */
/* ═══════════════════════════════════════════════════════════ */

interface QuickCreateMetaProps {
  isOpen: boolean;
  onClose: () => void;
  initialDomain?: DomainKey;
  onSubmit: (data: GoalPayload) => void;
}

export interface GoalPayload {
  title: string;
  description: string;
  category: DomainKey;
  target_value: number;
  unit: string;
  deadline: string;
  status: string;
  // Extended
  frequency: GoalFrequency;
  intensity: number;
}

/* ── Templates ── */
interface Template {
  id: string;
  title: string;
  domain: DomainKey;
  targetValue: number;
  unit: string;
  daysToDeadline: number;
  intensity: number;
  freq: GoalFrequency;
  icon: typeof Shield;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'cyber', title: 'Dominar Cybersecurity', domain: 'mind',
    targetValue: 100, unit: 'horas', daysToDeadline: 90, intensity: 4, freq: 'daily',
    icon: Shield, description: 'Estudo intensivo de segurança digital',
  },
  {
    id: 'meditar', title: 'Meditar Diariamente', domain: 'spirituality',
    targetValue: 30, unit: 'dias', daysToDeadline: 30, intensity: 3, freq: 'daily',
    icon: Brain, description: 'Protocolo de 30 dias de meditacao',
  },
  {
    id: 'ler', title: 'Ler 12 Livros/Ano', domain: 'mind',
    targetValue: 12, unit: 'livros', daysToDeadline: 365, intensity: 2, freq: 'monthly',
    icon: BookOpen, description: 'Leitura consistente e progressiva',
  },
  {
    id: 'perder', title: 'Perder 5kg', domain: 'body',
    targetValue: 5, unit: 'kg', daysToDeadline: 90, intensity: 4, freq: 'weekly',
    icon: Dumbbell, description: 'Deficit calorico e treino regular',
  },
  {
    id: 'poupar', title: 'Poupar R$ 10.000', domain: 'career',
    targetValue: 10000, unit: 'R$', daysToDeadline: 180, intensity: 3, freq: 'monthly',
    icon: TrendingUp, description: 'Acumulo financeiro estrategico',
  },
  {
    id: 'correr', title: 'Correr 5km', domain: 'body',
    targetValue: 5, unit: 'km', daysToDeadline: 60, intensity: 3, freq: 'weekly',
    icon: Activity, description: 'Do zero aos 5km sem parar',
  },
];

/* ── Intensity scale ── */
const INTENSITY_LABELS = ['', 'Exploracao', 'Comprometido', 'Intenso', 'Obsessao', 'Protocolo Extremo'];
const INTENSITY_DOTS = [1, 2, 3, 4, 5];

/* ── Domain map ── */
const DOMAIN_NAMES: Record<DomainKey, string> = {
  mind: 'Mente', body: 'Corpo', relationships: 'Relacionamentos',
  productivity: 'Produtividade', wellbeing: 'Bem-Estar',
  growth: 'Crescimento', career: 'Carreira', spirituality: 'Sentido',
};

const ALL_DOMAINS: DomainKey[] = ['mind', 'body', 'relationships', 'productivity', 'wellbeing', 'growth', 'career', 'spirituality'];

/* ── Frequency labels ── */
const FREQ_OPTIONS: { value: GoalFrequency; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

/* ── Projected curve generator ── */
function generateProjection(target: number, days: number, intensity: number): { value: number }[] {
  const points = 12;
  const curve = intensity >= 4 ? 1.4 : intensity >= 3 ? 1.0 : 0.7;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const progress = Math.pow(t, curve);
    return { value: Math.round(progress * target * 10) / 10 };
  });
}

/* ── Date helper ── */
function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDeadline(dateStr: string): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
}

/* ═══════════════════════════════════════════════════════ */
/*  COMPONENT                                             */
/* ═══════════════════════════════════════════════════════ */

export function QuickCreateMeta({ isOpen, onClose, initialDomain, onSubmit }: QuickCreateMetaProps) {
  // Step: 0 = templates, 1 = configure+preview
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState<DomainKey>(initialDomain || 'mind');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [frequency, setFrequency] = useState<GoalFrequency>('weekly');
  const [intensity, setIntensity] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Projected chart data
  const projection = useMemo(() => {
    const tv = Number(targetValue) || 100;
    const days = deadline ? Math.max(1, Math.round((new Date(deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)) : 90;
    return generateProjection(tv, days, intensity);
  }, [targetValue, deadline, intensity]);

  const resetForm = useCallback(() => {
    setStep(0);
    setTitle('');
    setDomain(initialDomain || 'mind');
    setTargetValue('');
    setUnit('');
    setDeadline('');
    setFrequency('weekly');
    setIntensity(3);
    setIsSubmitting(false);
  }, [initialDomain]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleTemplateSelect = useCallback((t: Template) => {
    setTitle(t.title);
    setDomain(t.domain);
    setTargetValue(String(t.targetValue));
    setUnit(t.unit);
    setDeadline(addDays(t.daysToDeadline));
    setFrequency(t.freq);
    setIntensity(t.intensity);
    setStep(1);
  }, []);

  const handleCustom = useCallback(() => {
    setTitle('');
    setDomain(initialDomain || 'mind');
    setTargetValue('');
    setUnit('');
    setDeadline(addDays(30));
    setFrequency('weekly');
    setIntensity(3);
    setStep(1);
  }, [initialDomain]);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !targetValue) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: `Intensidade: ${intensity}/5 | Frequencia: ${frequency}`,
        category: domain,
        target_value: Number(targetValue),
        unit: unit.trim(),
        deadline,
        status: 'ativo',
        frequency,
        intensity,
      });
      handleClose();
    } catch {
      setIsSubmitting(false);
    }
  }, [title, targetValue, domain, unit, deadline, frequency, intensity, onSubmit, handleClose]);

  const canSubmit = title.trim() && Number(targetValue) > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80"
        style={{ backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-[428px] rounded-t-[28px] border-t border-x border-neutral-200 dark:border-white/[0.06] bg-white dark:bg-[#0a0a0b] shadow-2xl dark:shadow-none"
        style={{ maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Drag handle */}
        <div className="sticky top-0 z-20 bg-white dark:bg-[#0a0a0b] pt-3 pb-2 px-5 rounded-t-[28px]">
          <div className="mx-auto mb-3 h-[3px] w-10 rounded-full bg-neutral-300 dark:bg-white/15" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {step === 1 && (
                <button
                  onClick={() => setStep(0)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-neutral-200 dark:border-white/[0.06] transition-colors hover:bg-neutral-50 dark:hover:bg-white/[0.03]"
                >
                  <ChevronLeft size={14} className="text-neutral-500 dark:text-white/40" />
                </button>
              )}
              <Crosshair size={15} className="text-neutral-400 dark:text-white/25" />
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-white/40">
                {step === 0 ? 'Nova Meta' : 'Configurar'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
            >
              <X size={14} className="text-neutral-400 dark:text-white/30" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-28">
          {/* ════════════════════════════════════════════ */}
          {/*  STEP 0: TEMPLATES                          */}
          {/* ════════════════════════════════════════════ */}
          {step === 0 && (
            <div className="space-y-3 pt-2">
              {/* Subtitle */}
              <p className="text-[9px] font-mono text-neutral-400 dark:text-white/25 tracking-wider uppercase mb-4">
                Selecione um template ou crie do zero
              </p>

              {/* Template grid */}
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTemplateSelect(t)}
                      className="group relative text-left rounded-2xl border border-neutral-200 dark:border-white/[0.06] p-3.5 transition-all hover:border-neutral-400 dark:hover:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/[0.02] active:scale-[0.97]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon size={14} className="text-neutral-400 dark:text-white/25" />
                        <span className="text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-300 dark:text-white/15 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-white/[0.06]">
                          {DOMAIN_NAMES[t.domain]}
                        </span>
                      </div>
                      <h3 className="text-[11px] font-bold text-neutral-800 dark:text-white/80 leading-tight mb-1">
                        {t.title}
                      </h3>
                      <p className="text-[8px] font-mono text-neutral-400 dark:text-white/20 leading-relaxed">
                        {t.description}
                      </p>
                      {/* Intensity dots */}
                      <div className="flex items-center gap-0.5 mt-2">
                        {INTENSITY_DOTS.map((d) => (
                          <div
                            key={d}
                            className={`w-1 h-1 rounded-full transition-colors ${
                              d <= t.intensity
                                ? 'bg-neutral-600 dark:bg-white/50'
                                : 'bg-neutral-200 dark:bg-white/[0.06]'
                            }`}
                          />
                        ))}
                        <span className="text-[7px] font-mono text-neutral-300 dark:text-white/15 ml-1">
                          {t.daysToDeadline}d
                        </span>
                      </div>
                      {/* Hover arrow */}
                      <ChevronRight
                        size={12}
                        className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-40 transition-opacity text-neutral-400 dark:text-white/30"
                      />
                    </button>
                  );
                })}
              </div>

              {/* Custom create */}
              <button
                onClick={handleCustom}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-dashed border-neutral-300 dark:border-white/[0.08] text-neutral-500 dark:text-white/30 transition-all hover:border-neutral-400 dark:hover:border-white/15 hover:text-neutral-700 dark:hover:text-white/50 active:scale-[0.98]"
              >
                <Sparkles size={13} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em]">
                  Criar do Zero
                </span>
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════ */}
          {/*  STEP 1: CONFIGURE + PREVIEW                */}
          {/* ════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4 pt-2">

              {/* ── Name ── */}
              <div>
                <label className="mb-1.5 block text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                  Nome da Meta
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Dominar Python em 90 dias"
                  className="w-full rounded-xl border border-neutral-200 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3.5 py-3 text-[13px] font-bold text-neutral-900 dark:text-white/85 placeholder:text-neutral-300 dark:placeholder:text-white/15 outline-none focus:border-neutral-400 dark:focus:border-white/20 transition-colors font-mono"
                  autoFocus
                />
              </div>

              {/* ── Domain Tags ── */}
              <div>
                <label className="mb-1.5 block text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                  Dominio
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DOMAINS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDomain(d)}
                      className={`px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider border transition-all ${
                        domain === d
                          ? 'bg-neutral-900 dark:bg-white/90 text-white dark:text-black border-neutral-900 dark:border-white/90'
                          : 'bg-transparent text-neutral-400 dark:text-white/25 border-neutral-200 dark:border-white/[0.06] hover:border-neutral-300 dark:hover:border-white/15'
                      }`}
                    >
                      {DOMAIN_NAMES[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Intensity Slider ── */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                  <Flame size={10} /> Intensidade
                </label>
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2 flex-1">
                    {INTENSITY_DOTS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setIntensity(d)}
                        className={`flex-1 h-3 rounded-full transition-all ${
                          d <= intensity
                            ? 'bg-neutral-800 dark:bg-white/70 scale-y-100'
                            : 'bg-neutral-200 dark:bg-white/[0.06] scale-y-75'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-mono font-bold text-neutral-500 dark:text-white/35 w-24 text-right tabular-nums">
                    {INTENSITY_LABELS[intensity]}
                  </span>
                </div>
              </div>

              {/* ── Target + Unit ── */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                    <Target size={10} /> Valor Alvo
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="100"
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5 text-[13px] font-bold text-neutral-900 dark:text-white/85 placeholder:text-neutral-300 dark:placeholder:text-white/15 outline-none focus:border-neutral-400 dark:focus:border-white/20 transition-colors font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="horas, kg, %"
                    className="w-full rounded-xl border border-neutral-200 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5 text-[13px] text-neutral-900 dark:text-white/85 placeholder:text-neutral-300 dark:placeholder:text-white/15 outline-none focus:border-neutral-400 dark:focus:border-white/20 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* ── Frequency ── */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                  <Repeat size={10} /> Frequencia
                </label>
                <div className="flex gap-2">
                  {FREQ_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      className={`flex-1 rounded-xl border py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                        frequency === opt.value
                          ? 'bg-neutral-900 dark:bg-white/90 text-white dark:text-black border-neutral-900 dark:border-white/90'
                          : 'border-neutral-200 dark:border-white/[0.06] text-neutral-400 dark:text-white/25 hover:border-neutral-300 dark:hover:border-white/15'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Deadline ── */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/25">
                  <Calendar size={10} /> Prazo
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5 text-[12px] font-mono text-neutral-700 dark:text-white/60 outline-none focus:border-neutral-400 dark:focus:border-white/20 transition-colors"
                />
              </div>

              {/* ════════════════════════════════════════ */}
              {/*  LIVE PREVIEW                            */}
              {/* ════════════════════════════════════════ */}
              <div className="rounded-2xl border border-neutral-200 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.015] p-4 mt-2">
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={10} className="text-neutral-400 dark:text-white/20" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-white/20">
                    Preview Projecao
                  </span>
                </div>

                {/* Mini chart */}
                <div className="h-[80px] w-full mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projection}>
                      <YAxis hide domain={[0, 'dataMax']} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#737373"
                        strokeWidth={2}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary strip */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="text-[14px] font-mono font-black text-neutral-800 dark:text-white/70 tabular-nums">
                      {targetValue || '0'}
                    </div>
                    <div className="text-[7px] font-mono text-neutral-400 dark:text-white/20 uppercase tracking-wider">
                      {unit || 'alvo'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-mono font-black text-neutral-800 dark:text-white/70 tabular-nums">
                      {intensity}/5
                    </div>
                    <div className="text-[7px] font-mono text-neutral-400 dark:text-white/20 uppercase tracking-wider">
                      Intensidade
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[14px] font-mono font-black text-neutral-800 dark:text-white/70 tabular-nums">
                      {deadline ? Math.max(0, Math.round((new Date(deadline + 'T12:00:00').getTime() - Date.now()) / 86400000)) : '--'}
                    </div>
                    <div className="text-[7px] font-mono text-neutral-400 dark:text-white/20 uppercase tracking-wider">
                      Dias
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono font-bold text-neutral-600 dark:text-white/40">
                      {formatDeadline(deadline)}
                    </div>
                    <div className="text-[7px] font-mono text-neutral-400 dark:text-white/20 uppercase tracking-wider">
                      Prazo
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Actions ── */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 rounded-xl border border-neutral-200 dark:border-white/[0.06] py-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-white/30 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="flex-[2] rounded-xl py-3 text-[10px] font-mono font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.97] bg-neutral-900 dark:bg-white/90 text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-white/80"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={13} strokeWidth={2.5} />
                      Ativar Meta
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
