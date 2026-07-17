// =============================================================
// ORVAX · Life OS — Creation Hub (MONO + humano)
// Modal universal pra criar qualquer item da vida.
// Design preto-no-branco, toques grandes, texto em PT-BR amigável
// (entendível por criança e por idoso).
// =============================================================
import React, { useEffect, useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import {
  X, CheckSquare, Target, Bell, Calendar, Repeat, CreditCard,
  ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react';
import { PILLARS, getPillar } from '../../pillars';
import { useLang } from '../../../../i18n/LanguageContext';
import { PILLARS_EN } from '../../../../i18n/pillarsEn';
import type { CreateKind, CreatePayload, PillarKey } from '../../types';
import { supabase } from '../../../../lib/supabase';
import { createTransaction, createGoal as createFinancialGoal } from '../../services/finance';
import { createHabit as createHabitSvc } from '../../../../services/habits';
import { ASPECT_TO_PILLAR } from '../../../../services/lifeOs';
import { todayLocalStr } from '../../../../utils/dateUtils';
import { useXpAward } from '../../hooks/useXpAward';

const IconOf = (n: string) => (Icons as any)[n] || Icons.Circle;

type KindOpt = {
  kind: CreateKind;
  label: string;         // UPPERCASE curto
  friendly: string;      // PT-BR natural
  Icon: typeof CheckSquare;
  xp: number;
  desc: string;
};

const KIND_OPTIONS: KindOpt[] = [
  { kind: 'task',        label: 'Tarefa',    friendly: 'Algo pra fazer',     Icon: CheckSquare, xp: 5,  desc: 'Algo pra fazer hoje ou essa semana' },
  { kind: 'habit',       label: 'Hábito',    friendly: 'Rotina diária',      Icon: Repeat,      xp: 8,  desc: 'Algo que você quer repetir sempre' },
  { kind: 'goal',        label: 'Meta',      friendly: 'Objetivo com prazo', Icon: Target,      xp: 20, desc: 'Um sonho com data pra virar real' },
  { kind: 'event',       label: 'Evento',    friendly: 'Compromisso',        Icon: Calendar,    xp: 5,  desc: 'Reunião, aula, consulta, encontro' },
  { kind: 'reminder',    label: 'Lembrete',  friendly: 'Aviso pontual',      Icon: Bell,        xp: 3,  desc: 'Um alerta pra não esquecer' },
  { kind: 'payment',     label: 'Pagar',     friendly: 'Conta a pagar',      Icon: CreditCard,  xp: 3,  desc: 'Boleto, fatura, assinatura' },
  { kind: 'transaction', label: 'Dinheiro',  friendly: 'Entrou ou saiu',     Icon: ArrowUpRight, xp: 4, desc: 'Registrar receita ou despesa real' },
];

// Sugestões de unidade pra metas (chips de 1 toque)
const UNIT_SUGGESTIONS = ['R$', 'kg', 'km', 'horas', 'livros', '%'];

// Opções de antecedência do lembrete (minutos)
const REMIND_OPTIONS = [
  { min: 0,    label: 'Na hora' },
  { min: 15,   label: '15 min' },
  { min: 60,   label: '1 hora' },
  { min: 1440, label: '1 dia' },
];

// "1.234,56" · "1234,56" · "1234.56" → número
const parseNum = (s: string) => {
  let clean = String(s).trim();
  if (clean.includes(',')) clean = clean.replace(/\./g, '').replace(',', '.');
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (payload: CreatePayload) => void;
  defaultPillar?: PillarKey;
  defaultKind?: CreateKind;
}

export function CreationHub({ open, onClose, onCreated, defaultPillar, defaultKind }: Props) {
  const { t, lang } = useLang();
  const pL = (p: any, f: string) => (lang === 'en' && PILLARS_EN[p.key]) ? PILLARS_EN[p.key][f] : p[f];
  const [kind, setKind] = useState<CreateKind>(defaultKind || 'task');
  const [pillar, setPillar] = useState<PillarKey>(defaultPillar || 'productivity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<string>(() => todayLocalStr());
  const [time, setTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [target, setTarget] = useState('');
  // hábito
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [habitTimes, setHabitTimes] = useState(3);
  const [habitCue, setHabitCue] = useState('');
  const [habitReward, setHabitReward] = useState('');
  // meta
  const [unit, setUnit] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  // evento
  const [timeEnd, setTimeEnd] = useState('');
  const [location, setLocation] = useState('');
  // lembrete
  const [remindBefore, setRemindBefore] = useState(15);
  // pagamento
  const [recurring, setRecurring] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const awardXp = useXpAward();

  // Reset quando abre
  useEffect(() => {
    if (open) {
      setKind(defaultKind || 'task');
      setPillar(defaultPillar || 'productivity');
      setTitle(''); setDescription(''); setAmount(''); setTxType('expense');
      setCategory(''); setTime(''); setDeadline(''); setTarget('');
      setDate(todayLocalStr());
      setHabitFreq('daily'); setHabitTimes(3); setHabitCue(''); setHabitReward('');
      setUnit(''); setCurrentValue(''); setPriority('normal');
      setTimeEnd(''); setLocation('');
      setRemindBefore(15);
      setRecurring(false);
      setErr(null);
    }
  }, [open, defaultKind, defaultPillar]);

  const currentKind = useMemo(() => KIND_OPTIONS.find((k) => k.kind === kind)!, [kind]);
  const pillarCfg = getPillar(pillar);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    if (!title.trim() && kind !== 'transaction') {
      setErr(t('create.errTitle'));
      return;
    }
    if ((kind === 'transaction' || kind === 'payment') && !amount) {
      setErr(t('create.errAmount'));
      return;
    }
    if (kind === 'goal' && target && parseNum(target) <= 0) {
      setErr(t('create.errTarget'));
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('create.errSession'));

      // Pilar legado (PT-BR) — é o que os triggers SQL entendem pra
      // vincular o item à área da vida certa (pillar_to_aspect).
      const legacyPillar =
        (ASPECT_TO_PILLAR as Record<string, string>)[pillarCfg.aspectKey] || 'disciplina';

      switch (kind) {
        case 'task': {
          const { error } = await supabase.from('tasks').insert({
            user_id: user.id, title, category: description || category || null,
            scheduled_date: date, pillar: legacyPillar, state: 'pending',
          });
          if (error) throw error;
          break;
        }
        case 'habit': {
          // Serviço oficial: estima o XP pela complexidade (IA) e
          // dispara HABIT_CHANGED pra UI atualizar em tempo real.
          const { error } = await createHabitSvc({
            title,
            cue: habitCue.trim() || null,
            reward: habitReward.trim() || null,
            frequency: habitFreq,
            target_count: habitFreq === 'weekly' ? habitTimes : 1,
            pillar: legacyPillar,
          });
          if (error) throw new Error(error.message || 'erro ao criar hábito');
          break;
        }
        case 'goal': {
          if (pillar === 'finance') {
            await createFinancialGoal({
              title,
              target_amount: parseNum(target) || 0,
              current_amount: parseNum(currentValue) || 0,
              deadline: deadline || undefined,
            });
          } else {
            // status 'ativo' = default do banco e filtro das listagens
            const { error } = await supabase.from('goals').insert({
              user_id: user.id, title, description: description || null,
              deadline: deadline || null, status: 'ativo', priority,
              category: pillarCfg.aspectKey, aspect_key: pillarCfg.aspectKey,
              target_value: target ? parseNum(target) : null,
              current_value: currentValue ? parseNum(currentValue) : 0,
              unit: unit.trim() || null,
            });
            if (error) throw error;
          }
          break;
        }
        case 'event':
        case 'reminder':
        case 'payment': {
          const startsAt = time
            ? new Date(`${date}T${time}:00`)
            : new Date(`${date}T09:00:00`);
          let endsAt: Date | null = null;
          if (kind === 'event' && time && timeEnd) {
            const candidate = new Date(`${date}T${timeEnd}:00`);
            if (candidate > startsAt) endsAt = candidate;
          }
          const { error } = await supabase.from('universal_events').insert({
            user_id: user.id, title, description: description || null,
            aspect_key: pillarCfg.aspectKey,
            event_type: kind, starts_at: startsAt.toISOString(), all_day: !time,
            ends_at: endsAt ? endsAt.toISOString() : null,
            location: kind === 'event' ? (location.trim() || null) : null,
            remind_before_min: kind === 'reminder' ? remindBefore : null,
            recurrence: kind === 'payment' && recurring ? 'monthly' : null,
            metadata: kind === 'payment' && amount ? { amount: parseNum(amount) } : {},
          });
          if (error) throw error;
          break;
        }
        case 'transaction': {
          await createTransaction({
            amount: parseNum(amount),
            type: txType,
            category: category || null,
            description: description || title || null,
            date,
          });
          break;
        }
      }

      await awardXp({ amount: currentKind.xp, reason: `create:${kind}`, pillar });

      onCreated?.({
        kind, pillar, title, description, amount: amount ? parseNum(amount) : undefined,
        txType, category, date, time, deadline,
        target: target ? parseNum(target) : undefined, unit: unit || undefined,
      });
      onClose();
    } catch (e: any) {
      console.error('[CreationHub]', e);
      setErr(e?.message || t('lo.saveFailFallback'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.3)] sm:shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-white/10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-zinc-400" />
              <h2 className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                Criar algo novo
              </h2>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              escolha o tipo, depois a área da vida
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('create.f.close')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* kind picker */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
                {t('create.step1')}
              </label>
              <span className="text-[9px] font-mono text-zinc-400">+{currentKind.xp} XP</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {KIND_OPTIONS.map((k) => {
                const active = k.kind === kind;
                return (
                  <button
                    key={k.kind}
                    onClick={() => setKind(k.kind)}
                    className={[
                      'flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border text-[9px] font-mono transition-all active:scale-95',
                      active
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.35)]'
                        : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500 dark:hover:border-white/30',
                    ].join(' ')}
                  >
                    <k.Icon size={16} strokeWidth={active ? 2.4 : 2} />
                    <span className="tracking-wider font-bold">{t('create.kinds.' + k.kind + '.label').toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
              <span className="font-semibold">{t('create.kinds.' + kind + '.friendly')}.</span>{' '}
              <span className="text-zinc-500">{t('create.kinds.' + kind + '.desc')}</span>
            </p>
          </div>

          {/* pillar picker — MONO */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 block mb-2">
              {t('create.step2')}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PILLARS.map((p) => {
                const Icon = IconOf(p.icon);
                const active = pillar === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPillar(p.key)}
                    title={pL(p, 'label')}
                    aria-label={pL(p, 'label')}
                    className={[
                      'aspect-square rounded-2xl border flex items-center justify-center transition-all active:scale-95',
                      active
                        ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900 shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)]'
                        : 'bg-transparent border-zinc-200 dark:border-white/10 text-zinc-500 dark:text-zinc-400 hover:border-zinc-500 dark:hover:border-white/30',
                    ].join(' ')}
                  >
                    <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
              <span className="font-semibold uppercase tracking-wider">{pL(pillarCfg, 'label')}</span>
              <span className="text-zinc-500"> · {pL(pillarCfg, 'description')}</span>
            </p>
          </div>

          {/* separador visual entre "o quê/onde" e "detalhes" */}
          <div className="border-t border-zinc-200 dark:border-white/10" />

          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 block mb-3">
              {t('create.step3')}
            </label>

            <div className="space-y-3">
              {/* campos variáveis por tipo */}
              {kind !== 'transaction' && (
                <Field label={t('create.f.title')} help={t('create.f.titleHelp')}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      kind === 'habit' ? t('create.exTask')
                      : kind === 'goal' ? t('create.exHabit')
                      : kind === 'event' ? t('create.exEvent')
                      : kind === 'payment' ? t('create.exPayment')
                      : t('create.exGoal')
                    }
                    className={inputCls}
                  />
                </Field>
              )}

              {/* ── HÁBITO ── */}
              {kind === 'habit' && (
                <>
                  <Field label={t('create.f.freq')} help={t('create.f.freqHelp')}>
                    <div className="grid grid-cols-2 gap-2">
                      <SegButton active={habitFreq === 'daily'} onClick={() => setHabitFreq('daily')}>
                        {t('create.everyDay')}
                      </SegButton>
                      <SegButton active={habitFreq === 'weekly'} onClick={() => setHabitFreq('weekly')}>
                        {habitFreq === 'weekly' ? t('create.perWeekN', { n: habitTimes }) : t('create.perWeek')}
                      </SegButton>
                    </div>
                    {habitFreq === 'weekly' && (
                      <div className="grid grid-cols-7 gap-1 mt-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                          <button
                            key={n}
                            onClick={() => setHabitTimes(n)}
                            className={[
                              'h-9 rounded-lg border text-[11px] font-mono font-bold transition-all active:scale-95',
                              habitTimes === n
                                ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                            ].join(' ')}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    )}
                  </Field>

                  <Field label={t('create.f.trigger')} help={t('create.f.triggerHelp')}>
                    <input
                      value={habitCue}
                      onChange={(e) => setHabitCue(e.target.value)}
                      placeholder={t('create.cuePh')}
                      className={inputCls}
                    />
                  </Field>

                  <Field label={t('create.f.reward')} help={t('create.f.rewardHelp')}>
                    <input
                      value={habitReward}
                      onChange={(e) => setHabitReward(e.target.value)}
                      placeholder={t('create.rewardPh')}
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* ── DINHEIRO (transação) ── */}
              {kind === 'transaction' && (
                <>
                  <Field label={t('create.f.inOut')} help={t('create.f.inOutHelp')}>
                    <div className="grid grid-cols-2 gap-2">
                      <SegButton active={txType === 'expense'} onClick={() => setTxType('expense')}>
                        <ArrowDownRight size={16} strokeWidth={txType === 'expense' ? 2.6 : 2} />
                        {t('create.outFlow')}
                      </SegButton>
                      <SegButton active={txType === 'income'} onClick={() => setTxType('income')}>
                        <ArrowUpRight size={16} strokeWidth={txType === 'income' ? 2.6 : 2} />
                        {t('create.inFlow')}
                      </SegButton>
                    </div>
                  </Field>

                  <Field label={t('create.f.amount')} help={t('create.f.amountHelpReais')}>
                    <MoneyInput value={amount} onChange={setAmount} />
                  </Field>

                  <Field label={t('create.f.category')} help={t('create.f.categoryHelp')}>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder={t('create.categoryPh')}
                      className={inputCls}
                    />
                  </Field>

                  <Field label={t('create.f.description')} help={t('create.f.descHelp')}>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('create.txNamePh')}
                      className={inputCls}
                    />
                  </Field>
                </>
              )}

              {/* ── PAGAR ── */}
              {kind === 'payment' && (
                <>
                  <Field label={t('create.f.amount')} help={t('create.f.amountHelpCost')}>
                    <MoneyInput value={amount} onChange={setAmount} />
                  </Field>
                  <Field label={t('create.f.monthly')} help={t('create.f.monthlyHelp')}>
                    <div className="grid grid-cols-2 gap-2">
                      <SegButton active={!recurring} onClick={() => setRecurring(false)}>
                        SÓ UMA VEZ
                      </SegButton>
                      <SegButton active={recurring} onClick={() => setRecurring(true)}>
                        <Repeat size={14} strokeWidth={recurring ? 2.6 : 2} />
                        TODO MÊS
                      </SegButton>
                    </div>
                  </Field>
                </>
              )}

              {/* descrição livre (tipos que salvam esse campo) */}
              {(kind === 'task' || kind === 'goal' || kind === 'event' || kind === 'reminder' || kind === 'payment') && (
                <Field
                  label={t('create.f.description')}
                  help={kind === 'goal' ? t('lo.goalHelp') : t('create.descOptional')}
                >
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder={kind === 'goal' ? t('lo.goalPlaceholder') : t('lo.descPlaceholder')}
                    className={`${inputCls} resize-none`}
                  />
                </Field>
              )}

              {/* ── META ── */}
              {kind === 'goal' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t('create.f.target')} help={t('create.f.targetHelp')}>
                      <input
                        value={target}
                        onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder={pillar === 'finance' ? '10000' : '10'}
                        inputMode="decimal"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('create.f.unit')} help={t('create.f.unitHelp')}>
                      <input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="km"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-1.5 -mt-1">
                    {UNIT_SUGGESTIONS.map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnit(u)}
                        className={[
                          'h-7 px-2.5 rounded-full border text-[10px] font-mono font-bold transition-all active:scale-95',
                          unit === u
                            ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                        ].join(' ')}
                      >
                        {lang === 'en' ? (u === 'horas' ? 'hours' : u === 'livros' ? 'books' : u) : u}
                      </button>
                    ))}
                  </div>

                  <Field label={t('create.f.haveToday')} help={t('create.f.haveTodayHelp')}>
                    <input
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0"
                      inputMode="decimal"
                      className={inputCls}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t('create.f.deadline')} help={t('create.f.deadlineHelp')}>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t('create.f.priority')} help={t('create.f.priorityHelp')}>
                      <div className="grid grid-cols-3 gap-1">
                        {([
                          { v: 'low',    l: '−' },
                          { v: 'normal', l: '=' },
                          { v: 'high',   l: '!' },
                        ] as const).map((p) => (
                          <button
                            key={p.v}
                            onClick={() => setPriority(p.v)}
                            title={p.v === 'low' ? t('create.prioLow') : p.v === 'normal' ? t('create.prioNormal') : t('create.prioHigh')}
                            className={[
                              'h-[42px] rounded-xl border text-[13px] font-mono font-bold transition-all active:scale-95',
                              priority === p.v
                                ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                            ].join(' ')}
                          >
                            {p.l}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                </>
              )}

              {/* ── data/hora ── */}
              {(kind === 'task' || kind === 'event' || kind === 'reminder' || kind === 'payment' || kind === 'transaction') && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('create.dateLabel')} help={kind === 'payment' ? t('create.dueDate') : t('create.when')}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  {(kind === 'event' || kind === 'reminder' || kind === 'payment') && (
                    <Field label={t('create.f.time')} help={t('create.f.optional')}>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  )}
                </div>
              )}

              {/* ── EVENTO: término + local ── */}
              {kind === 'event' && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('create.f.endsAt')} help={t('create.f.optional')}>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      disabled={!time}
                      className={`${inputCls} disabled:opacity-40`}
                    />
                  </Field>
                  <Field label={t('create.f.location')} help={t('create.f.optional')}>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('create.eventLocationPh')}
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

              {/* ── LEMBRETE: avisar antes ── */}
              {kind === 'reminder' && (
                <Field label={t('create.f.remindBefore')} help={t('create.f.remindBeforeHelp')}>
                  <div className="grid grid-cols-4 gap-1.5">
                    {REMIND_OPTIONS.map((o) => (
                      <button
                        key={o.min}
                        onClick={() => setRemindBefore(o.min)}
                        className={[
                          'h-9 rounded-lg border text-[10px] font-mono font-bold transition-all active:scale-95',
                          remindBefore === o.min
                            ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                            : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                        ].join(' ')}
                      >
                        {(o.min === 0 ? t('create.remindNow') : o.min === 15 ? t('create.remind15') : o.min === 60 ? t('create.remind1h') : t('create.remind1d')).toUpperCase()}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </div>

          {err && (
            <p className="text-[12px] font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-white/5 border border-zinc-300 dark:border-white/15 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <span className="font-bold">!</span>
              <span>{err}</span>
            </p>
          )}
        </div>

        {/* footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-white/10 flex gap-2 bg-white dark:bg-zinc-900">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-white/10 text-[11px] font-mono font-bold tracking-wider text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors active:scale-[0.98]"
          >
            CANCELAR
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[2] py-3 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-mono font-bold tracking-wider hover:opacity-90 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {saving ? t('create.creating') : t('create.createBtn', { xp: currentKind.xp })}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400';

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-300 font-bold">
          {label}
        </label>
        {help && <span className="text-[9px] text-zinc-500 dark:text-zinc-500">{help}</span>}
      </div>
      {children}
    </div>
  );
}

function SegButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-mono font-bold tracking-wider transition-all active:scale-95',
        active
          ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
          : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 border border-zinc-200 dark:border-white/10 rounded-xl px-3 focus-within:border-zinc-900 dark:focus-within:border-white">
      <span className="text-[12px] font-mono font-bold text-zinc-500">R$</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
        placeholder="0,00"
        inputMode="decimal"
        className="flex-1 bg-transparent py-2.5 text-sm font-mono focus:outline-none placeholder:text-zinc-400"
      />
    </div>
  );
}
