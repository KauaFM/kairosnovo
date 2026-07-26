// ============================================================
// ORVAX FitCal — VITALIS (copiloto nutricional · N2)
//
// Não é um chat comum: cada resposta vem com OPÇÕES REGISTRÁVEIS
// em 1 toque. O momento de decisão ("tô na rua com fome") é onde
// a IA muda o resultado — por isso os chips de atalho existem.
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Loader2, ChevronLeft, Sparkles, Plus, Check, AlertTriangle,
  Stethoscope, Utensils, Star,
} from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { useLang } from '../../../i18n/LanguageContext';
import { useBackHandler } from '../../../lib/backHandler';
import {
  askVitalis, getVitalisHistory, acceptSuggestion, guessMealType, saveFavorite, QUICK_PROMPTS,
} from '../services/nutriCoach';

const ACCENT = '#22c55e';

const TAG_LABEL = { melhor: 'Melhor escolha', boa: 'Boa', alternativa: 'Alternativa' };

/* ── Card de sugestão (registrável) ───────────────────────── */
function OptionCard({ opt, suggestionId, onLogged }) {
  const [state, setState] = useState('idle'); // idle | saving | done
  const [faved, setFaved] = useState(false);
  const isBest = opt.tag === 'melhor';

  const register = async () => {
    setState('saving');
    try {
      await acceptSuggestion(opt, guessMealType(), suggestionId);
      setState('done');
      onLogged?.();
    } catch (e) {
      console.error('[vitalis] registrar:', e);
      setState('idle');
    }
  };

  // Salva na biblioteca: o que funciona vira reuso de 1 toque depois
  const favorite = async () => {
    if (faved) return;
    try { await saveFavorite(opt); setFaved(true); }
    catch (e) { console.error('[vitalis] favoritar:', e); }
  };

  return (
    <div className="rounded-2xl border p-3.5"
      style={{
        borderColor: isBest ? `${ACCENT}55` : 'var(--border-color)',
        backgroundColor: isBest ? `${ACCENT}0A` : 'var(--glass-bg)',
      }}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <span className="text-[7px] font-mono font-bold uppercase tracking-[0.2em] opacity-40">
            {TAG_LABEL[opt.tag] || 'Opção'}
          </span>
          <p className="text-[12px] font-bold leading-snug mt-0.5">{opt.name}</p>
          {opt.portion && <p className="text-[9px] font-mono opacity-45 mt-0.5">{opt.portion}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={favorite}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={faved
              ? { border: `1px solid ${ACCENT}55`, color: ACCENT }
              : { border: '1px solid var(--border-color)', opacity: 0.5 }}
            aria-label="Salvar nas minhas refeições"
          >
            <Star size={14} fill={faved ? ACCENT : 'none'} />
          </button>
          <button
            onClick={register}
            disabled={state !== 'idle'}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-60"
            style={state === 'done'
              ? { backgroundColor: ACCENT, color: '#000' }
              : { border: '1px solid var(--border-color)' }}
            aria-label="Registrar no diário"
          >
            {state === 'saving' ? <Loader2 size={14} className="animate-spin" />
              : state === 'done' ? <Check size={15} strokeWidth={3} />
              : <Plus size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold"
          style={{ backgroundColor: `${ACCENT}18`, color: ACCENT }}>{opt.kcal} kcal</span>
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
          style={{ borderColor: 'var(--border-color)' }}>P {opt.protein_g}g</span>
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
          style={{ borderColor: 'var(--border-color)' }}>C {opt.carbs_g}g</span>
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono opacity-55 border"
          style={{ borderColor: 'var(--border-color)' }}>G {opt.fat_g}g</span>
      </div>

      {opt.why && <p className="text-[9px] font-mono opacity-40 mt-2 leading-snug">▸ {opt.why}</p>}
    </div>
  );
}

/* ── Tela ─────────────────────────────────────────────────── */
export default function VitalisChat({ theme, toggleTheme, onBack, onLogged }) {
  const { t } = useLang();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [loadingHist, setLoadingHist] = useState(true);
  const endRef = useRef(null);

  useBackHandler(true, onBack);

  useEffect(() => {
    getVitalisHistory(20)
      .then((h) => setMsgs(h.map((m) => ({
        role: m.role, content: m.content, ...(m.payload || {}),
      }))))
      .catch(() => {})
      .finally(() => setLoadingHist(false));
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const send = useCallback(async (text, context = null) => {
    const clean = (text || '').trim();
    if (!clean || busy) return;
    setErr('');
    setInput('');
    setMsgs((p) => [...p, { role: 'user', content: clean }]);
    setBusy(true);
    try {
      const res = await askVitalis(clean, context);
      setMsgs((p) => [...p, {
        role: 'assistant',
        content: res.reply,
        options: res.options || [],
        avoid: res.avoid,
        needs_professional: res.needs_professional,
        suggestion_ids: res.suggestion_ids || [],
      }]);
    } catch (e) {
      setErr(e?.message || 'Não consegui responder agora.');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return (
    <div className="relative w-full h-full flex flex-col">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="px-5 pb-40" style={{ color: 'var(--text-main)' }}>
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

          {/* Estado inicial */}
          {!loadingHist && msgs.length === 0 && (
            <div className="text-center py-6 mb-2">
              <div className="w-14 h-14 rounded-[20px] mx-auto flex items-center justify-center mb-4"
                style={{ border: `1px solid ${ACCENT}33`, backgroundColor: `${ACCENT}0A` }}>
                <Sparkles size={20} style={{ color: ACCENT }} />
              </div>
              <p className="text-[13px] font-bold">{t('vitalis.emptyTitle')}</p>
              <p className="text-[10px] font-mono opacity-45 mt-2 leading-relaxed px-4">{t('vitalis.emptySub')}</p>
            </div>
          )}

          {/* Conversa */}
          <div className="space-y-4">
            {msgs.map((m, i) => (
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2.5"
                    style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
                    <p className="text-[12px] leading-snug">{m.content}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-2.5">
                  <div className="max-w-[88%] rounded-2xl rounded-tl-md px-3.5 py-2.5 border"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    <p className="text-[12px] leading-relaxed">{m.content}</p>
                  </div>

                  {m.needs_professional && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
                      style={{ borderColor: '#eab30844', backgroundColor: '#eab3080D' }}>
                      <Stethoscope size={13} className="shrink-0 mt-0.5" style={{ color: '#eab308' }} />
                      <p className="text-[9px] font-mono leading-relaxed opacity-70">{t('vitalis.clinical')}</p>
                    </div>
                  )}

                  {!!m.options?.length && (
                    <div className="space-y-2">
                      {m.options.map((o, k) => (
                        <OptionCard key={k} opt={o} suggestionId={m.suggestion_ids?.[k]} onLogged={onLogged} />
                      ))}
                    </div>
                  )}

                  {m.avoid && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
                      style={{ borderColor: 'var(--border-color)' }}>
                      <AlertTriangle size={12} className="shrink-0 mt-0.5 opacity-40" />
                      <p className="text-[9px] font-mono opacity-50 leading-relaxed">{m.avoid}</p>
                    </div>
                  )}
                </div>
              )
            ))}

            {busy && (
              <div className="flex items-center gap-2 opacity-40 px-1">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-[10px] font-mono uppercase tracking-widest">{t('vitalis.thinking')}</span>
              </div>
            )}
            {err && (
              <div className="px-3 py-2.5 rounded-xl border text-[10px] font-mono"
                style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>{err}</div>
            )}
            <div ref={endRef} />
          </div>

          <p className="text-[8px] font-mono opacity-20 leading-relaxed text-center mt-8 px-4">
            {t('vitalis.disclaimer')}
          </p>
        </div>
      </ScrollContainer>

      {/* Barra fixa: chips + input */}
      <div className="absolute bottom-0 left-0 right-0 z-20 border-t backdrop-blur-xl"
        style={{
          borderColor: 'var(--border-color)',
          backgroundColor: 'var(--bg-color)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
        }}>
        {/* Chips de atalho (decisão sem digitar) */}
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PROMPTS.map((q) => (
            <button key={q.key} onClick={() => send(q.text, q.context)} disabled={busy}
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
            onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
            placeholder={t('vitalis.placeholder')}
            disabled={busy}
            className="flex-1 rounded-2xl px-4 py-3 text-[12px] outline-none border bg-transparent"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
          <button onClick={() => send(input)} disabled={busy || !input.trim()}
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-30"
            style={{ backgroundColor: ACCENT, color: '#000' }} aria-label={t('common.send')}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
