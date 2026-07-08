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
import type { CreateKind, CreatePayload, PillarKey } from '../../types';
import { supabase } from '../../../../lib/supabase';
import { createTransaction, createGoal as createFinancialGoal } from '../../services/finance';
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

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (payload: CreatePayload) => void;
  defaultPillar?: PillarKey;
  defaultKind?: CreateKind;
}

export function CreationHub({ open, onClose, onCreated, defaultPillar, defaultKind }: Props) {
  const [kind, setKind] = useState<CreateKind>(defaultKind || 'task');
  const [pillar, setPillar] = useState<PillarKey>(defaultPillar || 'productivity');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [target, setTarget] = useState('');
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
      setDate(new Date().toISOString().slice(0, 10));
      setErr(null);
    }
  }, [open, defaultKind, defaultPillar]);

  const currentKind = useMemo(() => KIND_OPTIONS.find((k) => k.kind === kind)!, [kind]);
  const pillarCfg = getPillar(pillar);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    if (!title.trim() && kind !== 'transaction') {
      setErr('preencha o título pra continuar');
      return;
    }
    if (kind === 'transaction' && !amount) {
      setErr('informe o valor em reais');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('sem sessão — entre de novo');

      switch (kind) {
        case 'task': {
          await supabase.from('tasks').insert({
            user_id: user.id, title, category: description || category || null,
            scheduled_date: date, pillar: pillarCfg.aspectKey, state: 'pending',
          });
          break;
        }
        case 'habit': {
          await supabase.from('habits').insert({
            user_id: user.id, title, pillar: pillarCfg.aspectKey,
            active: true, xp_reward: 10,
          });
          break;
        }
        case 'goal': {
          if (pillar === 'finance') {
            await createFinancialGoal({
              title,
              target_amount: Number(target) || 0,
              deadline: deadline || undefined,
            });
          } else {
            await supabase.from('goals').insert({
              user_id: user.id, title, description: description || null,
              deadline: deadline || null, progress: 0, status: 'active',
              category: pillarCfg.aspectKey, aspect_key: pillarCfg.aspectKey,
              target_value: Number(target) || null,
            });
          }
          break;
        }
        case 'event':
        case 'reminder':
        case 'payment': {
          const startsAt = time
            ? new Date(`${date}T${time}:00`).toISOString()
            : new Date(`${date}T09:00:00`).toISOString();
          await supabase.from('universal_events').insert({
            user_id: user.id, title, description: description || null,
            aspect_key: pillarCfg.aspectKey,
            event_type: kind, starts_at: startsAt, all_day: !time,
          });
          break;
        }
        case 'transaction': {
          await createTransaction({
            amount: Number(amount),
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
        kind, pillar, title, description, amount: amount ? Number(amount) : undefined,
        txType, category, date, time, deadline, target: target ? Number(target) : undefined,
      });
      onClose();
    } catch (e: any) {
      console.error('[CreationHub]', e);
      setErr(e?.message || 'não deu pra salvar. tenta de novo.');
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
            aria-label="Fechar"
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
                1. O que você vai criar?
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
                    <span className="tracking-wider font-bold">{k.label.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-zinc-600 dark:text-zinc-300 leading-snug">
              <span className="font-semibold">{currentKind.friendly}.</span>{' '}
              <span className="text-zinc-500">{currentKind.desc}</span>
            </p>
          </div>

          {/* pillar picker — MONO */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 block mb-2">
              2. Qual área da vida?
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {PILLARS.map((p) => {
                const Icon = IconOf(p.icon);
                const active = pillar === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setPillar(p.key)}
                    title={p.label}
                    aria-label={p.label}
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
              <span className="font-semibold uppercase tracking-wider">{pillarCfg.label}</span>
              <span className="text-zinc-500"> · {pillarCfg.description}</span>
            </p>
          </div>

          {/* separador visual entre "o quê/onde" e "detalhes" */}
          <div className="border-t border-zinc-200 dark:border-white/10" />

          <div>
            <label className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500 block mb-3">
              3. Detalhes
            </label>

            <div className="space-y-3">
              {/* campos variáveis por tipo */}
              {kind !== 'transaction' && (
                <Field label="Título" help="Dê um nome curto e claro">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Viagem de fim de ano"
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400"
                  />
                </Field>
              )}

              {kind === 'transaction' && (
                <>
                  <Field label="Entrou ou saiu?" help="Dinheiro que entrou na conta (receita) ou saiu (despesa)">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setTxType('expense')}
                        className={[
                          'flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-mono font-bold tracking-wider transition-all active:scale-95',
                          txType === 'expense'
                            ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                            : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                        ].join(' ')}
                      >
                        <ArrowDownRight size={16} strokeWidth={txType === 'expense' ? 2.6 : 2} />
                        SAIU
                      </button>
                      <button
                        onClick={() => setTxType('income')}
                        className={[
                          'flex items-center justify-center gap-2 py-3 rounded-xl border text-[11px] font-mono font-bold tracking-wider transition-all active:scale-95',
                          txType === 'income'
                            ? 'border-zinc-900 dark:border-white bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md'
                            : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:border-zinc-500',
                        ].join(' ')}
                      >
                        <ArrowUpRight size={16} strokeWidth={txType === 'income' ? 2.6 : 2} />
                        ENTROU
                      </button>
                    </div>
                  </Field>

                  <Field label="Valor" help="Em reais">
                    <div className="flex items-center gap-2 border border-zinc-200 dark:border-white/10 rounded-xl px-3 focus-within:border-zinc-900 dark:focus-within:border-white">
                      <span className="text-[12px] font-mono font-bold text-zinc-500">R$</span>
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="0,00"
                        inputMode="decimal"
                        className="flex-1 bg-transparent py-2.5 text-sm font-mono focus:outline-none placeholder:text-zinc-400"
                      />
                    </div>
                  </Field>

                  <Field label="Categoria" help="Pra onde foi / de onde veio">
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="mercado, transporte, salário…"
                      className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400"
                    />
                  </Field>

                  <Field label="Descrição" help="Opcional — onde foi feito">
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Mercado Extra"
                      className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400"
                    />
                  </Field>
                </>
              )}

              {(kind === 'task' || kind === 'habit' || kind === 'event' || kind === 'reminder' || kind === 'payment') && (
                <Field label="Descrição" help="Opcional — detalhes que ajudam a lembrar">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="detalhes adicionais…"
                    className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white resize-none placeholder:text-zinc-400"
                  />
                </Field>
              )}

              {kind === 'goal' && (
                <>
                  <Field label="Alvo (valor)" help="Número a alcançar">
                    <input
                      value={target}
                      onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder={pillar === 'finance' ? '10000' : '100'}
                      inputMode="decimal"
                      className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white placeholder:text-zinc-400"
                    />
                  </Field>
                  <Field label="Prazo" help="Data limite pra realizar">
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                    />
                  </Field>
                </>
              )}

              {(kind === 'task' || kind === 'event' || kind === 'reminder' || kind === 'payment' || kind === 'transaction') && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Data" help="Quando">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                    />
                  </Field>
                  {(kind === 'event' || kind === 'reminder' || kind === 'payment') && (
                    <Field label="Hora" help="Opcional">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full bg-transparent border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-white"
                      />
                    </Field>
                  )}
                </div>
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
            {saving ? 'CRIANDO…' : `CRIAR · +${currentKind.xp} XP`}
          </button>
        </div>
      </div>
    </div>
  );
}

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
