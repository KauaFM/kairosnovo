import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, Loader2, Eye, Scale, Activity,
  MessageCircle, Gavel, Sunrise, Zap, Timer, Flame, ListChecks, Moon,
} from 'lucide-react';
import { useLang } from '../../../i18n/LanguageContext';
import { useBackHandler } from '../../../lib/backHandler';
import { getTodayPending } from '../../../services/lifeOs';
import { getTodayReview, getRetroData, submitReview, setTomorrowIntent } from '../../../services/ritual';
import { reportXpEvent } from '../../../services/xp';
import { supabase } from '../../../lib/supabase';
import { toLocalDateStr } from '../../../utils/dateUtils';

/* ═══════════════════════════════════════════════════════════ */
/*  RITUAL "REGISTRAR DIA" 2.0 — Protocolo VERITAS · F3        */
/*  6 Atos: Retrospectiva → Acerto de Contas → Escaneamento →  */
/*  Interrogatório → Veredito (nota CALCULADA) → O Amanhã.     */
/*  Docs: docs/GDD_SISTEMA_EVOLUCAO.md §4                      */
/* ═══════════════════════════════════════════════════════════ */

interface RitualProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'loading' | 'already' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'done';

interface PendingItem {
  kind: string;
  source_id: string;
  title: string;
  done: boolean;
}

const EMOTIONS = [
  { key: 'e1', token: 'foco' }, { key: 'e2', token: 'calma' },
  { key: 'e3', token: 'ansiedade' }, { key: 'e4', token: 'cansaco' },
  { key: 'e5', token: 'energia' }, { key: 'e6', token: 'frustracao' },
  { key: 'e7', token: 'orgulho' }, { key: 'e8', token: 'gratidao' },
];

const ACT_ICONS: Record<string, typeof Eye> = {
  a1: Eye, a2: Scale, a3: Activity, a4: MessageCircle, a5: Gavel, a6: Sunrise,
};
const ACT_NUM: Record<string, number> = { a1: 1, a2: 2, a3: 3, a4: 4, a5: 5, a6: 6 };

export function RitualRegistrarDia({ isOpen, onClose }: RitualProps) {
  const { t } = useLang();
  const [step, setStep] = useState<Step>('loading');
  const [actsDone, setActsDone] = useState<Set<string>>(new Set());

  // Ato I
  const [retro, setRetro] = useState({ actions: 0, xpToday: 0, focusMin: 0, streak: 0 });
  const [alreadyScore, setAlreadyScore] = useState<number | null>(null);

  // Ato II
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [doneToday, setDoneToday] = useState<PendingItem[]>([]);
  const [pIdx, setPIdx] = useState(0);
  const [askWhy, setAskWhy] = useState(false);
  const [reconciled, setReconciled] = useState<{ migrated: string[]; abandoned: { id: string; reason: string }[] }>({ migrated: [], abandoned: [] });

  // Ato III
  const [energy, setEnergy] = useState(3);
  const [emotions, setEmotions] = useState<string[]>([]);
  const [sleepH, setSleepH] = useState(7);
  const [sleepQ, setSleepQ] = useState(3);

  // Ato IV
  const [victory, setVictory] = useState('');
  const [challenge, setChallenge] = useState('');
  const [learning, setLearning] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [selfScore, setSelfScore] = useState(7);

  // Ato V
  const [verdict, setVerdict] = useState<any>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ato VI
  const [tomorrowFirst, setTomorrowFirst] = useState('');
  const [intent, setIntent] = useState('');
  const [sealing, setSealing] = useState(false);

  useBackHandler(isOpen, onClose); // voltar fecha o ritual (não minimiza o app)

  const markAct = useCallback((a: string) => {
    setActsDone((prev) => new Set(prev).add(a));
  }, []);

  /* ── boot: já fez o ritual hoje? senão, carrega retro + pendências ── */
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      setStep('loading');
      setActsDone(new Set());
      setVerdict(null); setXpGained(null);
      setPIdx(0); setAskWhy(false);
      setReconciled({ migrated: [], abandoned: [] });
      try {
        const rev = await getTodayReview();
        if (!alive) return;
        if (rev?.completed) {
          setAlreadyScore(rev.computed_score != null ? Number(rev.computed_score) : null);
          setStep('already');
          return;
        }
        const [r, items] = await Promise.all([getRetroData(), getTodayPending(new Date())]);
        if (!alive) return;
        setRetro(r);
        const arr = (items || []) as PendingItem[];
        setPending(arr.filter((i) => !i.done));
        setDoneToday(arr.filter((i) => i.done));
        setStep('a1');
        setActsDone(new Set(['a1']));
      } catch (e) {
        console.error('ritual boot:', e);
        if (alive) { setStep('a1'); setActsDone(new Set(['a1'])); }
      }
    })();
    return () => { alive = false; };
  }, [isOpen]);

  /* ── Ato II: decisões ── */
  const tomorrowStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return toLocalDateStr(d);
  }, []);

  const advancePending = useCallback(() => {
    setAskWhy(false);
    setPIdx((i) => i + 1);
  }, []);

  const decideMigrate = useCallback(async (item: PendingItem) => {
    setReconciled((r) => ({ ...r, migrated: [...r.migrated, String(item.source_id)] }));
    try {
      if (item.kind === 'task') {
        await supabase.from('tasks').update({ scheduled_date: tomorrowStr }).eq('id', item.source_id);
      }
    } catch (e) { console.error('migrate:', e); }
    advancePending();
  }, [tomorrowStr, advancePending]);

  const decideAbandon = useCallback(async (item: PendingItem, reason: string) => {
    setReconciled((r) => ({ ...r, abandoned: [...r.abandoned, { id: String(item.source_id), reason }] }));
    try {
      if (item.kind === 'task') {
        await supabase.from('tasks').update({ state: 'failed' }).eq('id', item.source_id);
      }
    } catch (e) { console.error('abandon:', e); }
    advancePending();
  }, [advancePending]);

  /* ── Ato V: submete e recebe o veredito do servidor ── */
  const runVerdict = useCallback(async (acts: number) => {
    setSubmitting(true);
    try {
      const v = await submitReview({
        energy, emotions, sleepH, sleepQ,
        victory, challenge, learning, gratitude,
        selfScore, acts,
        reconciled,
      });
      setVerdict(v);
      const res = await reportXpEvent({ source_type: 'ritual', title: 'Ritual de encerramento' });
      setXpGained(res?.xp ?? null);
    } catch (e) {
      console.error('ritual verdict:', e);
    } finally {
      setSubmitting(false);
    }
  }, [energy, emotions, sleepH, sleepQ, victory, challenge, learning, gratitude, selfScore, reconciled]);

  const goVerdict = useCallback((extraActs: string[]) => {
    const acts = new Set(actsDone);
    extraActs.forEach((a) => acts.add(a));
    acts.add('a5');
    setActsDone(acts);
    setStep('a5');
    runVerdict(acts.size);
  }, [actsDone, runVerdict]);

  /* ── Ato VI: primeira missão de amanhã ── */
  useEffect(() => {
    if (step !== 'a6') return;
    (async () => {
      try {
        const items = await getTodayPending(tomorrowStr);
        const first = (items || []).find((i: PendingItem) => !i.done);
        if (first?.title) {
          setTomorrowFirst(first.title);
          setIntent(first.title);
        }
      } catch { /* sem missões amanhã ainda */ }
    })();
  }, [step, tomorrowStr]);

  const seal = useCallback(async (withIntent: boolean) => {
    setSealing(true);
    try {
      if (withIntent && intent.trim()) await setTomorrowIntent(intent.trim());
    } catch (e) { console.error('seal:', e); }
    setSealing(false);
    setStep('done');
    setTimeout(() => onClose(), 1600);
  }, [intent, onClose]);

  if (!isOpen) return null;

  const actNum = ACT_NUM[step] || 0;
  const ActIcon = ACT_ICONS[step] || Eye;
  const item = pending[pIdx];

  /* ── UI helpers ── */
  const chipCls = (on: boolean) =>
    `px-3 py-2 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wide transition-all active:scale-95 ${
      on ? 'bg-neutral-900 dark:bg-white text-white dark:text-black border-transparent'
         : 'bg-white dark:bg-black/20 border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-white/40'}`;

  const primaryBtn = 'w-full h-13 py-4 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-black font-outfit font-black text-[11px] uppercase tracking-[0.25em] transition-all active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-2';
  const ghostBtn = 'w-full py-3 rounded-2xl border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-white/40 font-mono text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]';

  const label = (txt: string) => (
    <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-white/30 mb-2">{txt}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/90" style={{ backdropFilter: 'blur(12px)' }} onClick={onClose} />

      <div className="relative z-10 w-full max-w-[428px] rounded-t-[32px] border-t border-x border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#080809] shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="sticky top-0 z-30 bg-white/85 dark:bg-[#080809]/85 backdrop-blur-md pt-4 pb-3 px-6 border-b border-neutral-100 dark:border-white/[0.04]">
          <div className="mx-auto mb-3 h-[4px] w-12 rounded-full bg-neutral-200 dark:bg-white/10" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center">
                <ActIcon size={14} />
              </div>
              <div>
                <h2 className="text-[11px] font-outfit font-black uppercase tracking-[0.2em] text-neutral-800 dark:text-white/80">
                  {t('ritual.title')}
                </h2>
                {actNum > 0 && (
                  <p className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-widest mt-0.5">
                    {t('ritual.act', { n: actNum })} / 6
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-white/5 text-neutral-400" aria-label={t('ritual.close')}>
              <X size={15} />
            </button>
          </div>
          {/* progress dots */}
          {actNum > 0 && (
            <div className="flex gap-1.5 mt-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className={`h-[3px] flex-1 rounded-full transition-all ${n <= actNum ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-white/10'}`} />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-6 pt-5 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 110px)' }}>

          {step === 'loading' && (
            <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin opacity-30" /></div>
          )}

          {/* ═ Já registrado ═ */}
          {step === 'already' && (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-[24px] bg-neutral-900 dark:bg-white flex items-center justify-center">
                <Check size={26} className="text-white dark:text-black" strokeWidth={3} />
              </div>
              <p className="text-[12px] font-mono font-bold dark:text-white/80">{t('ritual.alreadyDone')}</p>
              {alreadyScore != null && (
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 tracking-widest">
                  {t('ritual.alreadyScore', { score: alreadyScore.toFixed(1) })}
                </p>
              )}
              <button onClick={onClose} className={ghostBtn + ' mt-4'}>{t('ritual.close')}</button>
            </div>
          )}

          {/* ═ ATO I — Retrospectiva ═ */}
          {step === 'a1' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a1title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a1sub')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { Icon: ListChecks, v: retro.actions, l: t('ritual.a1actions') },
                  { Icon: Zap, v: retro.xpToday, l: t('ritual.a1xp') },
                  { Icon: Timer, v: retro.focusMin, l: t('ritual.a1focus') },
                  { Icon: Flame, v: retro.streak, l: t('ritual.a1streak') },
                ].map(({ Icon, v, l }, i) => (
                  <div key={i} className="rounded-2xl border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.03] p-4">
                    <Icon size={13} className="opacity-30 mb-2" />
                    <p className="text-[22px] font-outfit font-black tabular-nums leading-none dark:text-white">{v}</p>
                    <p className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-widest mt-1.5">{l}</p>
                  </div>
                ))}
              </div>
              {retro.actions === 0 && (
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 text-center px-4 leading-relaxed">{t('ritual.a1empty')}</p>
              )}
              <button onClick={() => { markAct('a2'); setStep(pending.length ? 'a2' : 'a3'); if (!pending.length) markAct('a3'); }} className={primaryBtn}>
                {t('ritual.next')} <ChevronRight size={14} />
              </button>
              <button onClick={() => { markAct('a3'); setStep('a3'); }} className={ghostBtn}>
                <Moon size={11} className="inline mr-1.5 -mt-0.5" />{t('ritual.tired')}
              </button>
            </div>
          )}

          {/* ═ ATO II — Acerto de Contas ═ */}
          {step === 'a2' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a2title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a2sub')}</p>
              </div>

              {pIdx < pending.length && item ? (
                <div className="rounded-2xl border border-neutral-200 dark:border-white/10 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-widest">
                      {t('ritual.a2left', { n: pending.length - pIdx })}
                    </span>
                    <span className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-widest">
                      {t('common.kindLabels.' + item.kind)}
                    </span>
                  </div>
                  <p className="text-[13px] font-mono font-bold dark:text-white/90 leading-snug">{item.title}</p>

                  {!askWhy ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => decideMigrate(item)} className={chipCls(false)}>{t('ritual.a2migrate')}</button>
                      <button onClick={() => setAskWhy(true)} className={chipCls(false)}>{t('ritual.a2abandon')}</button>
                      <button onClick={advancePending} className={chipCls(false)}>{t('ritual.a2keep')}</button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {label(t('ritual.a2why'))}
                      <div className="grid grid-cols-2 gap-2">
                        {['r1', 'r2', 'r3', 'r4'].map((r) => (
                          <button key={r} onClick={() => decideAbandon(item, t('ritual.' + r))} className={chipCls(false)}>
                            {t('ritual.' + r)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-mono text-neutral-500 dark:text-white/40 text-center py-6">{t('ritual.a2empty')}</p>
                  <button onClick={() => { markAct('a3'); setStep('a3'); }} className={primaryBtn}>
                    {t('ritual.next')} <ChevronRight size={14} />
                  </button>
                </>
              )}

              {pIdx < pending.length && (
                <button onClick={() => { markAct('a3'); setStep('a3'); }} className={ghostBtn}>
                  {t('ritual.next')}
                </button>
              )}
            </div>
          )}

          {/* ═ ATO III — Escaneamento ═ */}
          {step === 'a3' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a3title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a3sub')}</p>
              </div>

              <div>
                {label(t('ritual.a3energy'))}
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={5} step={1} value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="flex-1 accent-neutral-900 dark:accent-white" />
                  <span className="text-[18px] font-outfit font-black tabular-nums w-6 text-center dark:text-white">{energy}</span>
                </div>
              </div>

              <div>
                {label(t('ritual.a3emotions'))}
                <div className="grid grid-cols-4 gap-2">
                  {EMOTIONS.map(({ key, token }) => {
                    const on = emotions.includes(token);
                    return (
                      <button key={key} className={chipCls(on)}
                        onClick={() => setEmotions((prev) => on
                          ? prev.filter((x) => x !== token)
                          : prev.length >= 2 ? [prev[1], token] : [...prev, token])}>
                        {t('ritual.' + key)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                {label(`${t('ritual.a3sleep')} · ${t('ritual.a3hours', { h: sleepH })}`)}
                <input type="range" min={0} max={12} step={0.5} value={sleepH}
                  onChange={(e) => setSleepH(Number(e.target.value))}
                  className="w-full accent-neutral-900 dark:accent-white" />
              </div>

              <div>
                {label(t('ritual.a3sleepQ'))}
                <div className="flex items-center gap-3">
                  <input type="range" min={1} max={5} step={1} value={sleepQ}
                    onChange={(e) => setSleepQ(Number(e.target.value))}
                    className="flex-1 accent-neutral-900 dark:accent-white" />
                  <span className="text-[18px] font-outfit font-black tabular-nums w-6 text-center dark:text-white">{sleepQ}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { markAct('a4'); setStep('a4'); }} className={primaryBtn}>
                  {t('ritual.next')} <ChevronRight size={14} />
                </button>
              </div>
              {!actsDone.has('a2') && (
                /* modo exausto: III → V direto */
                <button onClick={() => goVerdict(['a3'])} className={ghostBtn}>
                  {t('ritual.a5title')} →
                </button>
              )}
            </div>
          )}

          {/* ═ ATO IV — Interrogatório Gentil ═ */}
          {step === 'a4' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a4title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a4sub')}</p>
              </div>

              <div>
                {label(t('ritual.a4victory'))}
                {doneToday.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {doneToday.slice(0, 4).map((d) => (
                      <button key={`${d.kind}-${d.source_id}`} onClick={() => setVictory(d.title)}
                        className={chipCls(victory === d.title)}>
                        {d.title.length > 24 ? d.title.slice(0, 24) + '…' : d.title}
                      </button>
                    ))}
                  </div>
                )}
                <textarea value={victory} onChange={(e) => setVictory(e.target.value)} placeholder={t('ritual.a4ph')}
                  className="w-full bg-neutral-100 dark:bg-white/5 rounded-2xl p-3.5 text-[12px] outline-none resize-none min-h-[56px] dark:text-white/80 border border-transparent focus:border-neutral-300 dark:focus:border-white/10" />
              </div>

              <div>
                {label(t('ritual.a4challenge'))}
                <textarea value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder={t('ritual.a4ph')}
                  className="w-full bg-neutral-100 dark:bg-white/5 rounded-2xl p-3.5 text-[12px] outline-none resize-none min-h-[56px] dark:text-white/80 border border-transparent focus:border-neutral-300 dark:focus:border-white/10" />
              </div>

              <div>
                {label(t('ritual.a4learning'))}
                <textarea value={learning} onChange={(e) => setLearning(e.target.value)} placeholder={t('ritual.a4ph')}
                  className="w-full bg-neutral-100 dark:bg-white/5 rounded-2xl p-3.5 text-[12px] outline-none resize-none min-h-[56px] dark:text-white/80 border border-transparent focus:border-neutral-300 dark:focus:border-white/10" />
              </div>

              <div>
                {label(t('ritual.a4gratitude'))}
                <input value={gratitude} onChange={(e) => setGratitude(e.target.value)} placeholder={t('ritual.a4ph')}
                  className="w-full bg-neutral-100 dark:bg-white/5 rounded-2xl p-3.5 text-[12px] outline-none dark:text-white/80 border border-transparent focus:border-neutral-300 dark:focus:border-white/10" />
              </div>

              <div>
                {label(t('ritual.a4self'))}
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={10} step={1} value={selfScore}
                    onChange={(e) => setSelfScore(Number(e.target.value))}
                    className="flex-1 accent-neutral-900 dark:accent-white" />
                  <span className="text-[18px] font-outfit font-black tabular-nums w-7 text-center dark:text-white">{selfScore}</span>
                </div>
              </div>

              <button onClick={() => goVerdict(['a4'])} className={primaryBtn}>
                {t('ritual.a5title')} <ChevronRight size={14} />
              </button>
              <button onClick={() => setStep('a3')} className={ghostBtn}>
                <ChevronLeft size={11} className="inline mr-1 -mt-0.5" />{t('ritual.back')}
              </button>
            </div>
          )}

          {/* ═ ATO V — O Veredito ═ */}
          {step === 'a5' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a5title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a5sub')}</p>
              </div>

              {submitting || !verdict ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 size={22} className="animate-spin opacity-30 mx-auto" />
                  <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 uppercase tracking-widest">{t('ritual.a5computing')}</p>
                </div>
              ) : (
                <>
                  <div className="text-center py-4">
                    <p className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-[0.3em] mb-2">{t('ritual.a5score')}</p>
                    <p className="text-[56px] font-outfit font-black tabular-nums leading-none dark:text-white">
                      {Number(verdict.score).toFixed(1)}
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-3">
                      {xpGained != null && xpGained > 0 && (
                        <span className="px-3 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-mono font-bold">
                          +{xpGained} XP
                        </span>
                      )}
                      <span className="text-[9px] font-mono text-neutral-400 dark:text-white/30 uppercase tracking-widest">
                        {t('ritual.a5streak', { n: verdict.streak })}
                      </span>
                    </div>
                  </div>

                  {/* breakdown — transparência total */}
                  <div className="space-y-2.5">
                    {[
                      { k: 'exec', l: t('ritual.a5exec'), w: 40 },
                      { k: 'balance', l: t('ritual.a5balance'), w: 20 },
                      { k: 'self', l: t('ritual.a5self'), w: 15 },
                      { k: 'quality', l: t('ritual.a5quality'), w: 15 },
                      { k: 'consistency', l: t('ritual.a5consistency'), w: 10 },
                    ].map(({ k, l, w }) => {
                      const val = Number(verdict.parts?.[k] ?? 0);
                      return (
                        <div key={k}>
                          <div className="flex justify-between text-[8px] font-mono text-neutral-400 dark:text-white/30 uppercase tracking-widest mb-1">
                            <span>{l} · {w}%</span><span>{val.toFixed(1)}</span>
                          </div>
                          <div className="h-[4px] rounded-full bg-neutral-100 dark:bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-700" style={{ width: `${val * 10}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={() => { markAct('a6'); setStep('a6'); }} className={primaryBtn}>
                    {t('ritual.next')} <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* ═ ATO VI — O Amanhã ═ */}
          {step === 'a6' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-[15px] font-outfit font-black uppercase tracking-wider dark:text-white">{t('ritual.a6title')}</h3>
                <p className="text-[10px] font-mono text-neutral-400 dark:text-white/30 mt-1">{t('ritual.a6sub')}</p>
              </div>

              {tomorrowFirst && (
                <div className="rounded-2xl border border-neutral-200 dark:border-white/10 p-4">
                  <p className="text-[8px] font-mono text-neutral-400 dark:text-white/25 uppercase tracking-widest mb-1.5">{t('ritual.a6first')}</p>
                  <p className="text-[13px] font-mono font-bold dark:text-white/90">{tomorrowFirst}</p>
                </div>
              )}

              <input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder={t('ritual.a6ph')}
                className="w-full bg-neutral-100 dark:bg-white/5 rounded-2xl p-3.5 text-[12px] outline-none dark:text-white/80 border border-transparent focus:border-neutral-300 dark:focus:border-white/10" />

              <button onClick={() => seal(true)} disabled={sealing || !intent.trim()} className={primaryBtn}>
                {sealing ? <Loader2 size={15} className="animate-spin" /> : <>{t('ritual.a6confirm')} <Check size={14} strokeWidth={3} /></>}
              </button>
              <button onClick={() => seal(false)} disabled={sealing} className={ghostBtn}>
                {t('ritual.a6skip')}
              </button>
            </div>
          )}

          {/* ═ Selo final ═ */}
          {step === 'done' && (
            <div className="py-14 text-center space-y-4 animate-in fade-in duration-500">
              <div className="w-20 h-20 mx-auto rounded-[32px] bg-neutral-900 dark:bg-white flex items-center justify-center shadow-2xl">
                <Check size={32} className="text-white dark:text-black" strokeWidth={3} />
              </div>
              <p className="text-[13px] font-outfit font-black uppercase tracking-widest dark:text-white">{t('ritual.a6done')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
