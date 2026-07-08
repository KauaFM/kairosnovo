import { useState, useCallback } from 'react';
import { X, Target, Calendar, Flag, Repeat } from 'lucide-react';
import type { DomainKey, GoalFormData, GoalFrequency, GoalPriority } from '../types/metrics.types';
import { DOMAIN_CONFIGS } from '../data/mockData';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainKey: DomainKey;
  onSubmit: (data: GoalFormData) => void;
}

const FREQ_OPTIONS: { value: GoalFrequency; label: string }[] = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

const PRIORITY_OPTIONS: { value: GoalPriority; label: string; color: string }[] = [
  { value: 'high', label: 'Alta', color: 'bg-[#E53935]/10 text-[#E53935] border-[#E53935]/20' },
  { value: 'medium', label: 'Média', color: 'bg-[#FFB300]/10 text-[#FFB300] border-[#FFB300]/20' },
  { value: 'low', label: 'Baixa', color: 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-white/50 border-neutral-200 dark:border-white/10' },
];

export function CreateGoalModal({ isOpen, onClose, domainKey, onSubmit }: CreateGoalModalProps) {
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [frequency, setFrequency] = useState<GoalFrequency>('weekly');
  const [priority, setPriority] = useState<GoalPriority>('medium');
  const [actionPlan, setActionPlan] = useState('');

  const domain = DOMAIN_CONFIGS.find((d) => d.key === domainKey);

  const handleSubmit = useCallback(() => {
    if (!name.trim() || !targetValue) return;
    onSubmit({
      name: name.trim(),
      targetValue: Number(targetValue),
      targetUnit: targetUnit.trim(),
      deadline,
      frequency,
      priority,
      actionPlan: actionPlan.trim(),
      domainKey,
    });
    onClose();
  }, [name, targetValue, targetUnit, deadline, frequency, priority, actionPlan, domainKey, onSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-[420px] rounded-t-2xl border border-neutral-200 dark:border-white/[0.055] bg-white dark:bg-[#111111] px-5 pb-8 pt-4 shadow-xl dark:shadow-none animate-[slideUp_200ms_ease-out]">
        {/* Handle bar */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/20" />

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[#00E676]" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-white/90">
              Criar Meta
            </h2>
            {domain && (
              <span className="rounded-full bg-neutral-100 dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
                {domain.name}
              </span>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-white/[0.04] transition-colors">
            <X size={18} className="text-neutral-500 dark:text-white/50" />
          </button>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
              Nome da meta
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ler 2 livros por mês"
              className="w-full rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-900 dark:text-white/90 placeholder:text-neutral-400 dark:placeholder:text-white/[0.24] outline-none focus:border-[#00E676] transition-colors"
            />
          </div>

          {/* Target */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
                Valor alvo
              </label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="100"
                className="w-full rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-900 dark:text-white/90 placeholder:text-neutral-400 dark:placeholder:text-white/[0.24] outline-none focus:border-[#00E676] transition-colors"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
                Unidade
              </label>
              <input
                type="text"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                placeholder="livros, horas, %"
                className="w-full rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-900 dark:text-white/90 placeholder:text-neutral-400 dark:placeholder:text-white/[0.24] outline-none focus:border-[#00E676] transition-colors"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
              <Calendar size={11} /> Prazo
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-900 dark:text-white/90 outline-none focus:border-[#00E676] transition-colors"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
              <Repeat size={11} /> Frequência
            </label>
            <div className="flex gap-2">
              {FREQ_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFrequency(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    frequency === opt.value
                      ? 'border-[#00E676] bg-[#00E676]/10 text-[#00E676]'
                      : 'border-neutral-200 dark:border-white/[0.055] text-neutral-500 dark:text-white/50 hover:border-neutral-300 dark:hover:border-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
              <Flag size={11} /> Prioridade
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    priority === opt.value ? opt.color : 'border-neutral-200 dark:border-white/[0.055] text-neutral-500 dark:text-white/50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Plan */}
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
              Plano de ação
            </label>
            <textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="Passos concretos para alcançar esta meta..."
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-200 dark:border-white/[0.055] bg-neutral-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-neutral-900 dark:text-white/90 placeholder:text-neutral-400 dark:placeholder:text-white/[0.24] outline-none focus:border-[#00E676] transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-200 dark:border-white/[0.055] py-2.5 text-sm font-semibold text-neutral-600 dark:text-white/50 hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || !targetValue}
              className="flex-1 rounded-lg bg-[#00E676] py-2.5 text-sm font-bold text-neutral-900 hover:bg-[#00E676]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Criar Meta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
