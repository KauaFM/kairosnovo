import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../../../i18n/LanguageContext';
import * as Icons from 'lucide-react';
import { Clock, CheckCircle2, X, Activity, Target, Zap, Plus, Timer, Flame, Trash2, BellRing, Repeat, CheckSquare } from 'lucide-react';
import { getTasks, updateTaskState, createTask, deleteTask } from '../../../services/db';
import { listHabitsWithTodayStatus, checkInHabit, deleteHabit, undoCheckInHabit, createHabit } from '../../../services/habits';
import { ASPECT_TO_PILLAR } from '../../../services/lifeOs';
import { PILLARS } from '../../lifeOs/pillars';
import { toLocalDateStr } from '../../../utils/dateUtils';
import { appEvents } from '../../../lib/events';
import { confirmDialog } from '../../../lib/dialog';
import { motion, AnimatePresence } from 'framer-motion';

// Vetores = os mesmos 10 pilares da vida do resto do sistema
// (CreationHub, Compass). category grava o rótulo curto; o pilar
// legado (PT) vai pro banco pra cair na área da vida certa.
const IconOf = (n: string) => (Icons as any)[n] || Icons.Circle;
const vectorToPillar = (short: string): string => {
  const p = PILLARS.find((x) => x.short === short);
  return p ? ((ASPECT_TO_PILLAR as Record<string, string>)[p.aspectKey] || 'disciplina') : 'disciplina';
};

interface ExecutionItem {
  id: string | number;
  time: string;
  title: string;
  type: 'T' | 'H' | 'G'; // Task, Habit, Goal
  status: 'pending' | 'done' | 'failed' | 'active';
  category?: string;
  raw: any;
}

export function ExecutionBoard() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', time_start: '09:00', category: 'EXEC', duration: '1h', is_important: false });
  // 'task' = diretriz única (hoje) · 'habit' = rotina recorrente
  const [mode, setMode] = useState<'task' | 'habit'>('task');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekly'>('daily');
  const [habitTimes, setHabitTimes] = useState(3);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);

    // 1. Fetch Tasks for today
    const tasks = await getTasks(toLocalDateStr());
    
    // 2. Fetch Habits with today status
    const habits = await listHabitsWithTodayStatus();

    // Map Tasks
    const mappedTasks: ExecutionItem[] = tasks.map((t: any) => ({
      id: `task_${t.id}`,
      time: t.time_start || '--:--',
      title: t.title,
      type: 'T',
      status: t.state === 'done' ? 'done' : t.state === 'failed' ? 'failed' : t.state === 'active' ? 'active' : 'pending',
      category: t.category,
      raw: t
    }));

    // Map Habits
    const mappedHabits: ExecutionItem[] = habits.map((h: any) => ({
      id: `habit_${h.id}`,
      time: h.cue || '--:--', // Habits often have cue like "08:00" or just a text
      title: h.title,
      type: 'H',
      status: h.done_today ? 'done' : 'pending',
      category: h.frequency === 'weekly' ? `${h.target_count || 1}×/${t('exec.weekAbbr')}` : t('exec.daily'),
      raw: h
    }));

    // Merge and sort
    // Sort logic: First by time (if standard HH:mm format), then 'DIÁRIO' or '--:--' at the top/bottom.
    // For now, let's just sort by time string roughly, but put done items at the bottom.
    const all = [...mappedTasks, ...mappedHabits].sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      return a.time.localeCompare(b.time);
    });

    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBoard();
    const unsub = appEvents.subscribe(() => {
      fetchBoard();
    });
    return unsub;
  }, [fetchBoard]);

  const handleToggle = async (item: ExecutionItem) => {
    // Para evitar conflito de cliques rápidos, calculamos o próximo estado com base no item recebido.
    // O Optimistic Update cuida da UI imediata.
    if (item.type === 'T') {
      let nextState = 'done';
      if (item.status === 'done') nextState = 'failed';
      else if (item.status === 'failed') nextState = 'pending';
      else if (item.status === 'active') nextState = 'done';
      
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextState as any } : i));
      await updateTaskState(item.raw.id, nextState);
      
    } else if (item.type === 'H') {
      if (item.status !== 'done') {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'done' } : i));
        await checkInHabit(item.raw.id, { quality: 3 });
      } else {
        // Hábito estava concluído e o usuário clicou de novo (Desfazer)
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'pending' } : i));
        await undoCheckInHabit(item.raw.id);
      }
    }
  };

  const resetForm = () => {
    setNewTask({ title: '', time_start: '09:00', category: 'EXEC', duration: '1h', is_important: false });
    setHabitFreq('daily');
    setHabitTimes(3);
    setFormErr(null);
  };

  const handleSubmit = async () => {
    if (!newTask.title.trim()) {
      setFormErr(t('exec.setTitle'));
      return;
    }
    setSaving(true);
    setFormErr(null);
    try {
      const pillar = vectorToPillar(newTask.category);

      if (mode === 'habit') {
        // Rotina recorrente → habits (XP estimado por IA no serviço).
        // O horário vira o cue: aparece na timeline e ancora a rotina.
        const { error } = await createHabit({
          title: newTask.title.trim(),
          cue: newTask.time_start || null,
          frequency: habitFreq,
          target_count: habitFreq === 'weekly' ? habitTimes : 1,
          pillar,
        });
        if (error) throw new Error(error.message || 'falha ao criar rotina');
      } else {
        const payload: Record<string, any> = {
          title: newTask.title.trim(),
          time_start: newTask.time_start,
          category: newTask.category,
          duration: newTask.duration,
          pillar,
          scheduled_date: toLocalDateStr(),
          ...(newTask.is_important ? { is_important: true } : {}),
        };
        let res: any = await createTask(payload);
        // Banco ainda sem a coluna is_important → salva sem a flag
        if (res?.error && String(res.error.message || '').includes('is_important')) {
          delete payload.is_important;
          res = await createTask(payload);
        }
        if (res?.error) throw new Error(res.error.message);
      }

      resetForm();
      setShowAddTask(false);
    } catch (e: any) {
      console.error('[ExecutionBoard]', e);
      setFormErr(e?.message || t('exec.logFail'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: ExecutionItem) => {
    e.stopPropagation();
    const msg = item.type === 'T'
      ? t('exec.confirmDelete')
      : t('lo.confirmDeleteHabit');

    if (await confirmDialog({ message: msg, danger: true, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) {
      // Optimistic Update
      setItems(prev => prev.filter(i => i.id !== item.id));
      if (item.type === 'T') {
        await deleteTask(item.raw.id);
      } else {
        await deleteHabit(item.raw.id);
      }
    }
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const missingCount = items.length - doneCount;

  // Insight generator
  let insight = t('exec.insight0');
  if (progress === 100) insight = t('exec.insight100');
  else if (progress > 50) insight = t('exec.insight50');
  else if (progress > 0) insight = t('exec.insightStarted');

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER: Date, Progress, Insight */}
      <div className="px-6 mb-8 mt-2">
        <div className="glass-panel rounded-[24px] p-6 border border-current/10 relative overflow-hidden">
          {/* Progress BG */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-[var(--orvax-green)]/10 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
          
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-[10px] font-mono tracking-widest uppercase opacity-50 mb-1">
                  {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                <div className="text-3xl font-syncopate font-black tracking-widest text-glow">
                  {progress}%
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono tracking-widest uppercase opacity-40">{t('exec.status')}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Activity size={14} className={progress > 0 ? "text-[var(--orvax-green)]" : "opacity-40"} />
                  <span className="text-[12px] font-space font-bold uppercase">{doneCount}/{items.length}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-current/[0.03] border border-current/10 rounded-xl p-3 flex items-center gap-3">
              <Zap size={14} className="text-yellow-500 shrink-0" />
              <span className="text-[9px] font-mono uppercase tracking-widest font-bold opacity-80 leading-relaxed">
                {insight}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ADD TASK FORM */}
      <div className="px-6 mb-8">
        <AnimatePresence mode="wait">
          {!showAddTask ? (
            <motion.button 
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTask(true)}
              className="w-full py-5 rounded-[24px] border border-dashed border-current/20 flex items-center justify-center gap-3 text-[10px] font-syncopate font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:border-current/40 transition-all bg-current/[0.02]"
            >
              <Plus size={16} /> {t('exec.newDirective')}
            </motion.button>
          ) : (
            <motion.div 
              key="add-form"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.99 }}
              className="glass-panel p-6 md:p-8 rounded-[32px] border border-current/10 shadow-2xl relative overflow-hidden bg-zinc-50 dark:bg-[#050507]"
            >
              <div className="absolute inset-0 bg-current opacity-[0.01] pointer-events-none"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[11px] font-syncopate font-black uppercase tracking-[0.2em] opacity-90">{t('vault.opRecord')}</h3>
                  <Clock size={16} className="opacity-20" />
                </div>

                {/* Modo: diretriz única ou rotina recorrente */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {([
                    { id: 'task' as const,  label: t('exec.singleTask'), sub: t('lo.subToday'),    Icon: CheckSquare },
                    { id: 'habit' as const, label: t('exec.routineHabit'), sub: t('lo.subRepeats'), Icon: Repeat },
                  ]).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setMode(m.id); setFormErr(null); }}
                      className={`flex items-center justify-center gap-2 py-4 rounded-[20px] border transition-all duration-300 ${
                        mode === m.id
                        ? 'bg-[var(--text-main)] text-[var(--bg-color)] border-[var(--text-main)] shadow-lg'
                        : 'bg-current/[0.02] border-current/10 opacity-50 hover:opacity-100 text-current'
                      }`}
                    >
                      <m.Icon size={14} />
                      <span className="flex flex-col items-start leading-tight">
                        <span className="text-[9px] font-syncopate font-black uppercase tracking-widest">{m.label}</span>
                        <span className="text-[7px] font-mono uppercase tracking-widest opacity-60">{m.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-6 md:gap-8">
                  {/* Título */}
                  <div className="flex flex-col gap-3 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <Target size={12} className="opacity-40" />
                      <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.primaryDirective')}</label>
                    </div>
                    <input 
                      type="text" 
                      placeholder={t('vault.titlePlaceholder')} 
                      className="w-full bg-current/[0.03] border border-current/10 p-4 md:p-5 rounded-[22px] text-xs md:text-sm font-syncopate font-black outline-none focus:border-current/50 focus:bg-current/5 transition-all uppercase placeholder:opacity-30 tracking-widest text-current"
                      value={newTask.title}
                      onChange={e => setNewTask({...newTask, title: e.target.value})}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-2">
                    {/* Categoria */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame size={12} className="opacity-40" />
                        <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.vector')}</label>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {PILLARS.map((p) => {
                          const Icon = IconOf(p.icon);
                          const active = newTask.category === p.short;
                          return (
                            <button
                              key={p.key}
                              type="button"
                              title={p.label}
                              aria-label={p.label}
                              onClick={() => setNewTask({...newTask, category: p.short})}
                              className={`aspect-square rounded-[16px] border flex items-center justify-center transition-all duration-300 active:scale-95 ${
                                active
                                ? 'shadow-lg bg-[var(--text-main)] text-[var(--bg-color)] border-[var(--text-main)]'
                                : 'bg-current/[0.02] border-current/10 opacity-50 hover:opacity-100 hover:bg-current/10 text-current'
                              }`}
                            >
                              <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
                            </button>
                          );
                        })}
                      </div>
                      {(() => {
                        const sel = PILLARS.find((p) => p.short === newTask.category);
                        return sel ? (
                          <p className="text-[8px] font-mono uppercase tracking-widest leading-relaxed px-1">
                            <span className="font-bold opacity-90">{sel.short}</span>
                            <span className="opacity-40"> · {sel.description}</span>
                          </p>
                        ) : null;
                      })()}
                    </div>

                    {/* Cronograma & Duração */}
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock size={12} className="opacity-40" />
                          <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">
                            {mode === 'habit' ? t('exec.anchorTime') : t('vault.startTime')}
                          </label>
                        </div>
                        <input 
                          type="time" 
                          className="w-full bg-current/[0.03] border border-current/10 py-3 md:py-4 px-5 rounded-[20px] text-sm font-space font-black outline-none focus:border-current/40 transition-all uppercase tracking-widest text-current"
                          value={newTask.time_start}
                          onChange={e => setNewTask({...newTask, time_start: e.target.value})}
                        />
                      </div>
                      {mode === 'task' ? (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Timer size={12} className="opacity-40" />
                            <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('vault.durationBlock')}</label>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {['15m', '30m', '1h', '2h+'].map((dur) => {
                              const currentDur = newTask.duration || '1h';
                              return (
                                <button
                                  key={dur}
                                  type="button"
                                  onClick={() => setNewTask({...newTask, duration: dur})}
                                  className={`py-3 text-[10px] font-space font-bold rounded-[16px] transition-all duration-300 border ${
                                    currentDur === dur
                                    ? 'bg-[var(--orvax-green)]/10 border-[var(--orvax-green)]/40 text-[var(--orvax-green)] shadow-inner'
                                    : 'bg-transparent border-current/10 opacity-40 hover:opacity-70 text-current'
                                  }`}
                                >
                                  {dur}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Repeat size={12} className="opacity-40" />
                            <label className="text-[9px] font-syncopate font-black uppercase tracking-widest opacity-60">{t('exec.repeatCycle')}</label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setHabitFreq('daily')}
                              className={`py-3 text-[9px] font-syncopate font-bold uppercase tracking-widest rounded-[16px] transition-all duration-300 border ${
                                habitFreq === 'daily'
                                ? 'bg-[var(--orvax-green)]/10 border-[var(--orvax-green)]/40 text-[var(--orvax-green)] shadow-inner'
                                : 'bg-transparent border-current/10 opacity-40 hover:opacity-70 text-current'
                              }`}
                            >
                              Todo Dia
                            </button>
                            <button
                              type="button"
                              onClick={() => setHabitFreq('weekly')}
                              className={`py-3 text-[9px] font-syncopate font-bold uppercase tracking-widest rounded-[16px] transition-all duration-300 border ${
                                habitFreq === 'weekly'
                                ? 'bg-[var(--orvax-green)]/10 border-[var(--orvax-green)]/40 text-[var(--orvax-green)] shadow-inner'
                                : 'bg-transparent border-current/10 opacity-40 hover:opacity-70 text-current'
                              }`}
                            >
                              {habitFreq === 'weekly' ? t('lo.perWeek', { n: habitTimes }) : t('lo.perWeekEmpty')}
                            </button>
                          </div>
                          {habitFreq === 'weekly' && (
                            <div className="grid grid-cols-7 gap-1">
                              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setHabitTimes(n)}
                                  className={`py-2.5 text-[10px] font-space font-bold rounded-[12px] transition-all border ${
                                    habitTimes === n
                                    ? 'bg-[var(--text-main)] text-[var(--bg-color)] border-[var(--text-main)]'
                                    : 'bg-transparent border-current/10 opacity-40 hover:opacity-70 text-current'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Priority Toggle (só tarefa) */}
                  {mode === 'task' && (
                    <div className="pb-2">
                      <button
                        type="button"
                        onClick={() => setNewTask({...newTask, is_important: !newTask.is_important})}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-[20px] transition-all border font-syncopate font-bold uppercase tracking-widest text-[9px] md:text-[10px] ${
                          newTask.is_important
                          ? 'border-red-500 bg-red-500/10 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : 'border-current/10 bg-current/[0.02] opacity-50 hover:opacity-100 text-current'
                        }`}
                      >
                        <BellRing size={14} className={newTask.is_important ? "animate-pulse" : ""} />
                        {newTask.is_important ? t('lo.priorityOn') : t('lo.priorityOff')}
                      </button>
                    </div>
                  )}

                  {/* Hint do modo rotina */}
                  {mode === 'habit' && (
                    <p className="text-[8px] font-mono uppercase tracking-widest opacity-40 leading-relaxed px-1 -mt-2">
                      A rotina entra na timeline todos os dias no horário definido.
                      XP calibrado automaticamente pela complexidade.
                    </p>
                  )}

                  {/* Erro visível — nada de falha silenciosa */}
                  {formErr && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-[16px] border border-red-500/40 bg-red-500/10 text-red-500">
                      <X size={12} className="shrink-0" />
                      <span className="text-[9px] font-mono uppercase tracking-widest">{formErr}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-current/10">
                    <button
                      onClick={handleSubmit}
                      disabled={saving}
                      className="flex-[2] py-4 md:py-5 rounded-[20px] text-[10px] md:text-[11px] font-syncopate font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl hover:brightness-110 bg-[var(--text-main)] text-[var(--bg-color)] disabled:opacity-40"
                    >
                      {saving ? t('exec.logging') : mode === 'habit' ? t('exec.logRoutine') : t('exec.logDirective')}
                    </button>
                    <button
                      onClick={() => { resetForm(); setShowAddTask(false); }}
                      className="flex-1 py-4 md:py-5 border border-current/20 rounded-[20px] opacity-60 text-[9px] md:text-[10px] font-mono uppercase tracking-widest hover:opacity-100 hover:bg-current/10 transition-all text-current"
                    >
                      Abortar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTIONS */}
      <div className="px-6 mb-6">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-40 mb-4 px-2">{t('exec.timeline')}</h4>
        
        <div className="flex flex-col gap-6 relative">
          {/* Vertical Line */}
          <div className="absolute left-[79px] md:left-[87px] top-4 bottom-8 w-[1px] border-l-2 border-dashed border-current/10 z-0" />

          {loading && items.length === 0 ? (
            <div className="py-10 text-center opacity-40 text-[10px] font-mono uppercase">{t('exec.syncingMatrix')}</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center opacity-40 text-[10px] font-mono uppercase">{t('exec.noDirectives')}</div>
          ) : (
            items.map((item, idx) => {
              const isDone = item.status === 'done';
              const isFailed = item.status === 'failed';
              const isActive = item.status === 'active';

              // Parse time format
              const timeStr = item.time && item.time.includes(':') ? item.time : '--:--';
              const [hour, minute] = timeStr.split(':');

              return (
                <div key={item.id} className="relative z-10 flex gap-4 md:gap-6 group items-start">
                  
                  {/* Time / Left col (Blog style date) */}
                  <div className="w-12 md:w-16 flex flex-col items-center shrink-0 pt-1 z-10 bg-[var(--bg-color)]">
                    <span className={`text-3xl md:text-4xl font-black font-space leading-none tracking-tighter ${isDone ? 'opacity-30' : 'text-zinc-900 dark:text-white'}`}>
                      {hour}
                    </span>
                    <span className={`text-[8px] md:text-[10px] font-mono font-bold tracking-[0.3em] uppercase mt-1 ${isDone ? 'opacity-20' : 'opacity-40'}`}>
                      {minute}
                    </span>
                  </div>

                  {/* Node */}
                  <div 
                    className="relative flex flex-col items-center mt-2.5 shrink-0 cursor-pointer bg-[var(--bg-color)] py-2"
                    onClick={() => handleToggle(item)}
                  >
                    <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isDone ? 'bg-[#22c55e] border-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                      isFailed ? 'bg-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]' :
                      isActive ? 'border-[var(--orvax-green)] bg-[var(--orvax-green)]/10 shadow-[0_0_8px_var(--orvax-green)]' :
                      'border-current/20 bg-[var(--bg-color)] hover:border-current/60'
                    }`}>
                      {isDone ? <CheckCircle2 size={12} className="text-white" /> : 
                       isFailed ? <X size={12} className="text-white" /> :
                       isActive ? <div className="w-2 h-2 bg-[var(--orvax-green)] rounded-full animate-pulse" /> :
                       <div className="w-1.5 h-1.5 rounded-full bg-current/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </div>

                  {/* Card */}
                  <div 
                    onClick={() => handleToggle(item)}
                    className={`flex-1 rounded-[20px] p-4 md:p-5 transition-all duration-300 cursor-pointer border ${
                      isDone ? 'border-dashed border-current/10 opacity-50 bg-transparent' :
                      isActive ? 'border-[var(--orvax-green)]/40 bg-[var(--orvax-green)]/[0.03] shadow-[0_0_15px_rgba(34,197,94,0.1)]' :
                      isFailed ? 'border-red-500/20 bg-red-500/5' :
                      item.raw.is_important ? 'border-red-500/40 bg-red-500/[0.03] shadow-[0_0_15px_rgba(239,68,68,0.05)]' :
                      'border-current/10 bg-current/[0.02] hover:bg-current/[0.04] hover:border-current/20'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.raw.is_important && !isDone && (
                          <span className="flex items-center gap-1 text-red-500 bg-red-500/10 px-2 py-0.5 rounded text-[7px] md:text-[8px] font-syncopate font-bold uppercase tracking-widest">
                            <BellRing size={10} /> Alerta
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[7px] md:text-[8px] font-syncopate font-bold uppercase tracking-widest ${isActive ? 'bg-[var(--orvax-green)] text-black' : 'bg-zinc-900 dark:bg-white text-white dark:text-black'}`}>
                          {item.type === 'T' ? 'TAREFA' : t('common.habitUpper')}
                        </span>
                        <span className={`text-[8px] font-mono uppercase tracking-[0.2em] font-bold ${isActive ? 'text-[var(--orvax-green)]' : 'opacity-40'}`}>
                          {item.category || 'GERAL'}
                        </span>
                      </div>
                      
                      {/* Delete Button (Visible for all) */}
                      <button 
                        onClick={(e) => handleDelete(e, item)}
                        className="opacity-40 hover:opacity-100 transition-opacity p-2 text-red-500 rounded-full hover:bg-red-500/10 active:scale-95"
                        title={t('lo.removeRecord')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className={`text-xs md:text-sm font-syncopate tracking-wider uppercase font-bold ${isDone ? 'line-through decoration-current/30' : ''}`}>
                      {item.title}
                    </h3>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
