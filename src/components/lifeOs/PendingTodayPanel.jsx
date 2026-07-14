// =============================================================
// ORVAX · Life OS — PendingTodayPanel (Módulo 1)
// Omni-Sync: tudo devido HOJE em uma única timeline.
// Checkboxes funcionais + animação/XP no complete.
// =============================================================
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLang } from '../../i18n/LanguageContext';
import {
  CheckSquare, Square, Repeat, Calendar, Bell, CreditCard, Clock, RefreshCw, Sparkles,
} from 'lucide-react';
import { getTodayPending } from '../../services/lifeOs';
import { supabase } from '../../lib/supabase';
import { toLocalDateStr } from '../../utils/dateUtils';

// MONO: toda a paleta colapsa em tinta única. Os tipos se distinguem
// exclusivamente pelo ícone e label. XP mantido por kind.
const KIND_META = {
  task:     { label: 'TAREFA',    Icon: CheckSquare, xp: 5 },
  habit:    { label: 'HÁBITO',    Icon: Repeat,      xp: 8 },
  event:    { label: 'EVENTO',    Icon: Calendar,    xp: 3 },
  meeting:  { label: 'REUNIÃO',   Icon: Calendar,    xp: 3 },
  reminder: { label: 'LEMBRETE',  Icon: Bell,        xp: 2 },
  payment:  { label: 'PAGAMENTO', Icon: CreditCard,  xp: 5 },
};

const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/** Awards XP to profile and dispatches toast event. */
async function awardXp(amount, reason) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: p } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
  const newXp = Math.max(0, (p?.xp || 0) + amount);
  await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id);
  window.dispatchEvent(new CustomEvent('orvax:xp-gain', {
    detail: { amount, reason, total: newXp },
  }));
}

export default function PendingTodayPanel({ date }) {
  const { t } = useLang();
  const dateKey = useMemo(() => {
    if (!date) return toLocalDateStr(new Date());
    if (typeof date === 'string') return date.slice(0, 10);
    return toLocalDateStr(date);
  }, [date]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flying, setFlying] = useState([]); // animação +XP
  const lastClickRef = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTodayPending(dateKey);
      setItems(data);
    } catch (e) {
      console.error('PendingTodayPanel:', e);
    } finally { setLoading(false); }
  }, [dateKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`pending-today-${dateKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universal_events' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  const toggleDone = useCallback(async (item) => {
    // debounce por id
    const now = Date.now();
    const lastAt = lastClickRef.current[item.source_id] || 0;
    if (now - lastAt < 400) return;
    lastClickRef.current[item.source_id] = now;

    const meta = KIND_META[item.kind] || KIND_META.event;
    try {
      // optimistic toggle
      setItems((prev) =>
        prev.map((i) => i.source_id === item.source_id && i.kind === item.kind
          ? { ...i, done: !i.done } : i));

      // marca no banco
      if (!item.done) {
        if (item.kind === 'task') {
          await supabase.from('tasks').update({ state: 'done' }).eq('id', item.source_id);
        } else if (item.kind === 'habit') {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('habit_logs').insert({
            user_id: user.id, habit_id: item.source_id, logged_at: new Date().toISOString(),
          });
        } else {
          await supabase.from('universal_events').update({ status: 'done' }).eq('id', item.source_id);
        }

        // animação XP (mono)
        const id = `${item.kind}-${item.source_id}-${now}`;
        setFlying((prev) => [...prev, { id, xp: meta.xp }]);
        setTimeout(() => setFlying((prev) => prev.filter((f) => f.id !== id)), 1100);

        // award no estado global (profiles.xp)
        await awardXp(meta.xp, `done:${item.kind}`);
      } else {
        // desfazer: só reverte tasks/events (habit_logs não desmarcam nesse MVP)
        if (item.kind === 'task') {
          await supabase.from('tasks').update({ state: 'pending' }).eq('id', item.source_id);
        } else if (item.kind !== 'habit') {
          await supabase.from('universal_events').update({ status: 'pending' }).eq('id', item.source_id);
        }
      }
    } catch (e) {
      console.error('toggleDone:', e);
      load(); // rollback do optimistic
    }
  }, [load]);

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <section className="w-full relative">
      {/* XP fly animations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {flying.map((f) => (
          <span
            key={f.id}
            className="absolute left-1/2 top-10 -translate-x-1/2 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 animate-[xpfly_1.1s_ease-out_forwards]"
          >
            +{f.xp} XP
          </span>
        ))}
        <style>{`
          @keyframes xpfly {
            0%   { transform: translate(-50%, 0)     scale(0.85); opacity: 0; }
            20%  { transform: translate(-50%, -6px)  scale(1.1);  opacity: 1; }
            100% { transform: translate(-50%, -44px) scale(0.95); opacity: 0; }
          }
        `}</style>
      </div>

      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-[12px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-800 dark:text-zinc-100 flex items-center gap-1.5">
            <Sparkles size={11} className="text-zinc-400" /> Tarefas Pendentes
          </h2>
          <span className="text-[9px] font-mono text-zinc-500 tracking-widest">
            {pending.length} pendentes · {done.length} concluídas · OMNI-SYNC
          </span>
        </div>
        <button onClick={load} className="opacity-40 hover:opacity-100 transition-opacity p-1" aria-label="Atualizar">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {loading && items.length === 0 ? (
        <p className="text-[10px] font-mono text-zinc-500 py-4 text-center">{t('common.pending.loading')}</p>
      ) : items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[11px] font-mono text-zinc-500">{t('common.pending.nothingToday')}</p>
          <p className="text-[9px] font-mono text-zinc-400 mt-1 tracking-widest">{t('common.pending.consistency')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {[...pending, ...done].map((it) => {
            const meta = KIND_META[it.kind] || KIND_META.event;
            const { Icon } = meta;
            return (
              <article
                key={`${it.kind}-${it.source_id}`}
                className={[
                  'group flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all',
                  'bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm',
                  it.done
                    ? 'border-zinc-200/50 dark:border-white/5 opacity-55'
                    : 'border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/25 hover:-translate-y-[1px]',
                ].join(' ')}
              >
                {/* Checkbox — mono */}
                <button
                  onClick={() => toggleDone(it)}
                  className="shrink-0 transition-transform active:scale-90"
                  aria-label={it.done ? t('common.pending.uncheck') : t('common.pending.complete')}
                >
                  {it.done ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.3)]">
                      <CheckSquare size={13} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-white/20 hover:border-zinc-600 dark:hover:border-white/60 transition-colors" />
                  )}
                </button>

                {/* Ícone tipo — chip neutro */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-zinc-200/70 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
                  <Icon size={12} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] font-mono font-semibold truncate ${it.done ? 'line-through opacity-70' : ''}`}>
                    {it.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 dark:text-zinc-500 tracking-widest">
                    <span className="text-zinc-700 dark:text-zinc-300">{t('common.kindLabels.' + it.kind)}</span>
                    {it.aspect_key && <><span>·</span><span className="uppercase">{it.aspect_key}</span></>}
                    {!it.all_day && it.starts_at && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock size={8} />{fmtTime(it.starts_at)}
                        </span>
                      </>
                    )}
                    {!it.done && <span className="ml-auto text-zinc-400">+{meta.xp}XP</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
