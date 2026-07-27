// ============================================================
// ORVAX FitCal — VITALIS (nutricionista virtual · v3)
//
// NÃO é um chat. O app já tem Atlas/Aurora pra conversar.
// Aqui é o CONSULTÓRIO do VITALIS: você abre e vê o plano de
// hoje já montado por ele, o que já comeu marcado e o que falta.
//
// A barra de comando existe pro caso que quebra todo plano
// ("comi um x-tudo na rua") — você fala, ele EXECUTA e o painel
// se redesenha. Não há balões nem histórico: a resposta é a ação.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, Loader2, ChevronLeft, Utensils, Check, X, Repeat, Sparkles,
  Stethoscope, ShoppingBasket, History, Target,
} from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { useLang } from '../../../i18n/LanguageContext';
import { useBackHandler } from '../../../lib/backHandler';
import {
  getVitalisState, sendCommand, eatPlanItem, skipPlanItem,
  QUICK_ACTIONS, SLOT_LABEL, SLOT_ORDER,
} from '../services/nutriCoach';

const ACCENT = '#22c55e';

/* ── Cabeçalho de saldo: o número que importa agora ────────── */
function Balance({ state }) {
  const { t } = useLang();
  if (!state?.goals) return null;
  const r = state.remaining || { kcal: 0, protein_g: 0 };
  const pct = Math.min(100, Math.round((state.eaten.kcal / state.goals.kcal) * 100));

  return (
    <div className="rounded-[24px] border p-4 mb-4"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-[7px] font-mono uppercase tracking-[0.25em] opacity-30 block mb-1">
            {t('vitalis.stillToday')}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[30px] font-outfit font-black leading-none">{r.kcal}</span>
            <span className="text-[10px] font-mono opacity-30">kcal</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[7px] font-mono uppercase tracking-[0.2em] opacity-30 block mb-1">
            {t('vitalis.protein')}
          </span>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-[18px] font-outfit font-bold opacity-70">{r.protein_g}</span>
            <span className="text-[9px] font-mono opacity-25">g</span>
          </div>
        </div>
      </div>
      <div className="h-[4px] rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: ACCENT }} />
      </div>
      <span className="text-[8px] font-mono opacity-25 mt-1.5 block">
        {state.eaten.kcal} / {state.goals.kcal} kcal · {pct}%
      </span>
    </div>
  );
}

/* ── Um item do plano ──────────────────────────────────────── */
function PlanItem({ item, busy, onEat, onSkip, onSwap }) {
  const { t } = useLang();
  const done = item.status === 'eaten';
  const skipped = item.status === 'skipped';

  return (
    <div className="rounded-2xl border p-3.5 transition-all"
      style={{
        borderColor: done ? `${ACCENT}44` : 'var(--border-color)',
        backgroundColor: done ? `${ACCENT}0A` : 'var(--glass-bg)',
        opacity: skipped ? 0.35 : 1,
      }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-bold leading-snug ${skipped ? 'line-through' : ''}`}>{item.name}</p>
          {item.portion && <p className="text-[9px] font-mono opacity-45 mt-0.5">{item.portion}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold"
              style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}>{item.kcal} kcal</span>
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
              style={{ borderColor: 'var(--border-color)' }}>P {item.protein_g}g</span>
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
              style={{ borderColor: 'var(--border-color)' }}>C {item.carbs_g}g</span>
            <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
              style={{ borderColor: 'var(--border-color)' }}>G {item.fat_g}g</span>
          </div>
          {item.why && <p className="text-[9px] font-mono opacity-35 mt-2 leading-snug">▸ {item.why}</p>}
        </div>

        {/* Comi — o toque que fecha o ciclo */}
        <button
          onClick={() => onEat(item)}
          disabled={busy || done}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-70"
          style={done
            ? { backgroundColor: ACCENT, color: '#000' }
            : { border: '1px solid var(--border-color)' }}
          aria-label="Marcar como comido"
        >
          <Check size={16} strokeWidth={done ? 3 : 2} />
        </button>
      </div>

      {!done && !skipped && (
        <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => onSwap(item)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider opacity-55 hover:opacity-100 transition-all active:scale-95 disabled:opacity-25"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Repeat size={11} /> {t('vitalis.swap')}
          </button>
          <button
            onClick={() => onSkip(item)}
            disabled={busy}
            className="px-4 py-2 rounded-xl border text-[9px] font-mono opacity-30 hover:opacity-70 transition-all active:scale-95 disabled:opacity-15"
            style={{ borderColor: 'var(--border-color)' }}
            aria-label="Não vou comer"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Tela ──────────────────────────────────────────────────── */
export default function VitalisPanel({ theme, toggleTheme, onBack, onLogged }) {
  const { t } = useLang();
  const [state, setState] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [note, setNote] = useState(null);   // { reply, executed[] } — o resultado da última ação
  const [err, setErr] = useState('');
  const noteRef = useRef(null);

  useBackHandler(true, onBack);

  const load = useCallback(async () => {
    try {
      const res = await getVitalisState();
      setState(res.state);
      setActions(res.actions || []);
      setErr('');
    } catch (e) {
      setErr(e?.message || 'Não consegui carregar seu dia.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Roda um comando: o servidor executa e devolve o estado já novo
  const run = useCallback(async (command, forceTool = null) => {
    const clean = (command || '').trim();
    if (!clean || busy) return;
    setBusy(true); setErr(''); setNote(null); setInput('');
    try {
      const res = await sendCommand(clean, forceTool);
      if (res.state) setState(res.state);
      setNote({ reply: res.reply, executed: res.executed || [] });
      if (res.executed?.length) {
        onLogged?.();
        getVitalisState().then(r => setActions(r.actions || [])).catch(() => {});
      }
      requestAnimationFrame(() => noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (e) {
      setErr(e?.message || 'Não consegui executar agora.');
    } finally {
      setBusy(false);
    }
  }, [busy, onLogged]);

  const handleEat = async (item) => {
    setBusy(true);
    try { await eatPlanItem(item); onLogged?.(); await load(); }
    catch (e) { setErr(e?.message || 'Falha ao registrar.'); }
    finally { setBusy(false); }
  };

  const handleSkip = async (item) => {
    setBusy(true);
    try { await skipPlanItem(item.id); await load(); }
    catch (e) { setErr(e?.message || 'Falha ao descartar.'); }
    finally { setBusy(false); }
  };

  const handleSwap = (item) =>
    run(`Troca o item item_id=${item.id} ("${item.name}") por outra opção equivalente que eu vá comer de verdade.`, 'trocar_refeicao');

  const hasPlan = !!state?.items?.length;
  const bySlot = SLOT_ORDER
    .map(slot => ({ slot, items: (state?.items || []).filter(i => i.slot === slot) }))
    .filter(g => g.items.length);

  const lista = note?.executed?.find(e => e.tool === 'montar_lista_compras')?.data?.grupos;

  return (
    <div className="relative w-full h-full flex flex-col">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="px-5 pb-44" style={{ color: 'var(--text-main)' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center border shrink-0"
              style={{ borderColor: 'var(--border-color)' }} aria-label="Voltar">
              <ChevronLeft size={17} />
            </button>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ border: `1px solid ${ACCENT}44`, backgroundColor: `${ACCENT}0D` }}>
              <Utensils size={15} style={{ color: ACCENT }} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[14px] font-outfit font-black uppercase tracking-[0.15em] leading-none">VITALIS</h1>
              <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest mt-1">{t('vitalis.subtitle')}</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-24">
              <Loader2 size={20} className="animate-spin mx-auto opacity-20 mb-3" />
              <span className="text-[8px] font-mono opacity-20 tracking-[0.3em] uppercase">{t('vitalis.reading')}</span>
            </div>
          ) : (
            <>
              <Balance state={state} />

              {/* Sem metas: não dá pra planejar nada antes disso */}
              {!state?.hasPlan && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl border mb-4"
                  style={{ borderColor: '#eab30844', backgroundColor: '#eab3080D' }}>
                  <Target size={13} className="shrink-0 mt-0.5" style={{ color: '#eab308' }} />
                  <p className="text-[9px] font-mono leading-relaxed opacity-70">{t('vitalis.noGoals')}</p>
                </div>
              )}

              {/* ── O PLANO DE HOJE ── */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-25 font-bold">
                  {t('vitalis.todayPlan')}
                </span>
                {hasPlan && (
                  <button
                    onClick={() => run('Remonta meu plano de hoje com o que ainda falta.', 'montar_plano_do_dia')}
                    disabled={busy || !state?.hasPlan}
                    className="text-[8px] font-mono uppercase tracking-wider opacity-30 hover:opacity-70 transition-opacity disabled:opacity-15"
                  >
                    {t('vitalis.rebuild')}
                  </button>
                )}
              </div>

              {hasPlan ? (
                <div className="space-y-4">
                  {bySlot.map(({ slot, items }) => (
                    <div key={slot}>
                      <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-30 font-bold block mb-2 px-1">
                        {SLOT_LABEL[slot]}
                      </span>
                      <div className="space-y-2">
                        {items.map(it => (
                          <PlanItem key={it.id} item={it} busy={busy}
                            onEat={handleEat} onSkip={handleSkip} onSwap={handleSwap} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => run('Monta meu plano alimentar de hoje.', 'montar_plano_do_dia')}
                  disabled={busy || !state?.hasPlan}
                  className="w-full rounded-[24px] border border-dashed py-10 px-5 text-center transition-all active:scale-[0.99] disabled:opacity-40"
                  style={{ borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}08` }}
                >
                  {busy ? (
                    <Loader2 size={20} className="animate-spin mx-auto opacity-50" style={{ color: ACCENT }} />
                  ) : (
                    <>
                      <Sparkles size={20} className="mx-auto mb-3" style={{ color: ACCENT }} />
                      <p className="text-[12px] font-bold">{t('vitalis.buildDay')}</p>
                      <p className="text-[9px] font-mono opacity-45 mt-1.5 leading-relaxed">{t('vitalis.buildDaySub')}</p>
                    </>
                  )}
                </button>
              )}

              {/* ── RESULTADO DA ÚLTIMA AÇÃO (não é um chat: é o recibo) ── */}
              {note && (
                <div ref={noteRef} className="mt-5 rounded-2xl border p-4"
                  style={{ borderColor: `${ACCENT}44`, backgroundColor: `${ACCENT}0A` }}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] leading-relaxed flex-1">{note.reply}</p>
                    <button onClick={() => setNote(null)} className="opacity-25 hover:opacity-70 shrink-0" aria-label="Fechar">
                      <X size={13} />
                    </button>
                  </div>
                  {!!note.executed.length && (
                    <div className="mt-3 pt-3 border-t space-y-1.5" style={{ borderColor: `${ACCENT}22` }}>
                      {note.executed.map((e, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check size={11} className="shrink-0 mt-[3px]" style={{ color: ACCENT }} />
                          <span className="text-[9px] font-mono opacity-60 leading-snug">{e.summary}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Lista de compras vem dentro do resultado */}
                  {!!lista?.length && (
                    <div className="mt-3 pt-3 border-t space-y-3" style={{ borderColor: `${ACCENT}22` }}>
                      <div className="flex items-center gap-2">
                        <ShoppingBasket size={12} style={{ color: ACCENT }} />
                        <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-50 font-bold">
                          {t('vitalis.shoppingList')}
                        </span>
                      </div>
                      {lista.map((g, i) => (
                        <div key={i}>
                          <span className="text-[8px] font-mono uppercase tracking-wider opacity-35 font-bold block mb-1">{g.grupo}</span>
                          <p className="text-[10px] leading-relaxed opacity-70">{g.itens.join(' · ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {err && (
                <div className="mt-4 px-3 py-2.5 rounded-xl border text-[10px] font-mono"
                  style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>{err}</div>
              )}

              {/* ── O QUE O VITALIS FEZ (transparência) ── */}
              {!!actions.length && (
                <div className="mt-7">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <History size={11} className="opacity-25" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-25 font-bold">
                      {t('vitalis.whatHeDid')}
                    </span>
                  </div>
                  <div className="rounded-2xl border divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {actions.map((a, i) => (
                      <div key={i} className="px-3.5 py-2.5" style={{ borderColor: 'var(--border-color)' }}>
                        <p className="text-[10px] leading-snug opacity-60">{a.summary}</p>
                        <span className="text-[8px] font-mono opacity-20 mt-0.5 block">
                          {new Date(a.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 mt-8 px-2">
                <Stethoscope size={11} className="opacity-20 shrink-0 mt-0.5" />
                <p className="text-[8px] font-mono opacity-20 leading-relaxed">{t('vitalis.disclaimer')}</p>
              </div>
            </>
          )}
        </div>
      </ScrollContainer>

      {/* ── BARRA DE COMANDO (o que quebra o plano acontece aqui) ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-color)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}>
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {QUICK_ACTIONS.map(q => (
            <button key={q.key} onClick={() => run(q.command, q.tool)} disabled={busy}
              className="shrink-0 px-3 py-2 rounded-xl border text-[10px] font-mono font-bold whitespace-nowrap transition-all active:scale-95 disabled:opacity-40"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
              <span className="mr-1">{q.icon}</span>{q.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 pb-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(input); }}
            placeholder={t('vitalis.placeholder')}
            disabled={busy}
            className="flex-1 rounded-2xl px-4 py-3 text-[12px] outline-none border bg-transparent"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
          <button onClick={() => run(input)} disabled={busy || !input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ backgroundColor: ACCENT, color: '#000' }} aria-label={t('common.send')}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
