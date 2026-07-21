import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Check, Minus, Lock, Sparkles, Crown, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSubscription, startCheckout } from '../services/billing';
import { SUBSCRIPTION_GATE_ENABLED, PLANS, PLAN_ORDER } from '../config/billing';
import { useLang } from '../i18n/LanguageContext';
import LanguageToggle from './LanguageToggle';

const ACCENT = '#22c55e';

// ─── Tela de planos (paywall do app inteiro) ────────────────────
const PlansScreen = ({ processing }) => {
  const { t } = useLang();
  const [busy, setBusy] = useState(null); // plan em processamento
  const [err, setErr] = useState(null);

  const subscribe = async (planId) => {
    setErr(null); setBusy(planId);
    try {
      await startCheckout(planId); // redireciona pro Stripe
    } catch (e) {
      setErr(e?.message || t('paywall.startError'));
      setBusy(null);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', scrollbarWidth: 'none' }}>
      <div className="max-w-[400px] mx-auto px-5 pt-14 pb-24 flex flex-col items-center text-center">

        <div className="w-16 h-16 rounded-[22px] border flex items-center justify-center relative overflow-hidden mb-5"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: `0 0 40px ${ACCENT}22` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT}22, transparent 65%)` }} />
          <Lock size={26} strokeWidth={1.5} className="relative z-10" style={{ color: ACCENT }} />
        </div>

        <span className="text-[9px] font-mono tracking-[0.4em] uppercase opacity-30 mb-2 flex items-center gap-1.5">
          <Sparkles size={10} style={{ color: ACCENT }} /> {t('paywall.badge')}
        </span>
        <h1 className="text-[24px] font-outfit font-black tracking-tight leading-tight">{t('paywall.title')}</h1>
        <p className="text-[12px] font-space opacity-55 max-w-[300px] leading-relaxed mt-2">
          {t('paywall.subtitle')}
        </p>

        {/* Banner de preços de lançamento (beta) */}
        <div className="mt-4 w-full p-2.5 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider text-center leading-relaxed"
          style={{ borderColor: `${ACCENT}44`, backgroundColor: `${ACCENT}0D`, color: ACCENT }}>
          ⚠ {t('paywall.betaBanner')}
        </div>

        {processing && (
          <div className="mt-5 w-full p-3 rounded-xl border text-[11px] font-mono opacity-80 flex items-center gap-2 justify-center"
            style={{ borderColor: `${ACCENT}44`, backgroundColor: `${ACCENT}0D` }}>
            <Loader2 size={13} className="animate-spin" style={{ color: ACCENT }} />
            {t('paywall.processing')}
          </div>
        )}

        {/* Cards de plano (4: 2 tiers × mensal/trimestral) */}
        <div className="w-full mt-6 space-y-3.5">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            const isBusy = busy === id;
            const badgeLabel = p.badge === 'save' ? t('paywall.save') : p.badge === 'popular' ? t('paywall.mostChosen') : null;
            const equiv = t(`plans.${id}.equiv`);
            const tagline = t(`plans.${id}.tagline`);
            const excludes = t(`plans.${id}.excludes`);
            return (
              <div key={id} className="w-full rounded-[24px] border p-5 text-left relative overflow-hidden"
                style={{
                  borderColor: p.highlight ? `${ACCENT}66` : 'var(--border-color)',
                  backgroundColor: p.highlight ? `${ACCENT}0A` : 'var(--glass-bg)',
                  boxShadow: p.highlight ? `0 0 30px ${ACCENT}22` : 'none',
                }}>
                {badgeLabel && (
                  <span className="absolute top-4 right-4 text-[8px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1"
                    style={{ color: '#000', backgroundColor: ACCENT }}>
                    <Crown size={9} /> {badgeLabel}
                  </span>
                )}
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] opacity-40">
                  {t(`plans.${id}.name`)} · {t(`plans.${id}.badge`)}
                </span>
                <div className="flex items-baseline gap-1 mt-1.5 mb-0.5">
                  <span className="text-[30px] font-outfit font-black tracking-tight">{p.price}</span>
                  <span className="text-[11px] font-mono opacity-40">{t(`plans.${id}.period`)}</span>
                </div>
                {equiv && <p className="text-[9px] font-mono opacity-45 leading-snug mb-2">{equiv}</p>}
                {tagline && <p className="text-[10px] font-mono opacity-45 leading-snug mb-3">{tagline}</p>}

                <div className="space-y-1.5 mb-5">
                  {t(`plans.${id}.features`).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check size={13} strokeWidth={2.5} style={{ color: ACCENT }} className="shrink-0" />
                      <span className="text-[11px] opacity-70">{f}</span>
                    </div>
                  ))}
                  {Array.isArray(excludes) && excludes.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Minus size={13} strokeWidth={2.5} className="shrink-0 opacity-30" />
                      <span className="text-[11px] opacity-30 line-through">{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => subscribe(id)}
                  disabled={!!busy}
                  className="w-full py-3.5 rounded-2xl font-outfit font-black text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={p.highlight
                    ? { backgroundColor: ACCENT, color: '#000', boxShadow: `0 8px 24px ${ACCENT}40` }
                    : { border: '1px solid var(--border-color)', color: 'var(--text-main)', backgroundColor: 'transparent' }}
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <>{t('paywall.subscribeTo', { name: t(`plans.${id}.name`) })}</>}
                </button>
              </div>
            );
          })}
        </div>

        {err && (
          <div className="mt-4 w-full p-3 rounded-xl border text-[10px] font-mono text-center"
            style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>
            {err}
          </div>
        )}

        <p className="text-[8px] font-mono opacity-25 tracking-[0.15em] uppercase mt-5">
          {t('paywall.footer')}
        </p>

        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 text-[9px] font-mono uppercase tracking-widest opacity-30 hover:opacity-60 transition-opacity flex items-center gap-1.5"
        >
          <LogOut size={11} /> {t('paywall.signOut')}
        </button>

        {/* Botão de idioma no paywall também */}
        <div className="mt-4"><LanguageToggle variant="default" /></div>
      </div>
    </div>
  );
};

// ─── Gate ───────────────────────────────────────────────────────
const SubscriptionGate = ({ children, userRole, onUnlocked }) => {
  const [state, setState] = useState('loading'); // loading | locked | unlocked
  const [processing, setProcessing] = useState(false);
  const bypass = useRef(false);

  const evaluate = useCallback(async () => {
    // Gate desligado → libera geral
    if (!SUBSCRIPTION_GATE_ENABLED) { setState('unlocked'); return; }
    // Admin nunca é bloqueado (protege o dono durante a config do Stripe)
    if (userRole === 'admin') { bypass.current = true; setState('unlocked'); return; }

    // Bypass por email de admin (VITE_ADMIN_EMAIL) — dono não se tranca fora
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').toLowerCase();
    const { data: { session } } = await supabase.auth.getSession();
    if (adminEmail && session?.user?.email?.toLowerCase() === adminEmail) {
      bypass.current = true; setState('unlocked'); return;
    }

    const sub = await getSubscription();
    if (sub?.role === 'admin') { bypass.current = true; setState('unlocked'); return; }
    setState(sub?.isSubscribed ? 'unlocked' : 'locked');
  }, [userRole]);

  useEffect(() => { evaluate(); }, [evaluate]);

  // Avisa o App quando o acesso é liberado (assinou ou admin) — é o gatilho
  // do vídeo de boas-vindas no 1º acesso, garantindo que ele só toca pós-pagamento.
  useEffect(() => {
    if (state === 'unlocked') onUnlocked?.();
  }, [state, onUnlocked]);

  // Volta do Stripe: mostra "confirmando pagamento" enquanto o webhook processa.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setProcessing(true);
      // limpa o parâmetro da URL sem recarregar
      params.delete('checkout');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
      // segurança: para de "processar" depois de 20s se o webhook não vier
      const t = setTimeout(() => setProcessing(false), 20000);
      return () => clearTimeout(t);
    }
  }, []);

  // Realtime: quando o webhook marca is_subscribed, destrava na hora.
  useEffect(() => {
    if (bypass.current) return;
    let channel; let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !alive) return;
      channel = supabase
        .channel(`app-access-${session.user.id}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
          (payload) => {
            const ok = !!payload.new?.is_subscribed || payload.new?.role === 'admin';
            setState(ok ? 'unlocked' : 'locked');
            if (ok) setProcessing(false);
          }
        )
        .subscribe();
    })();
    return () => { alive = false; if (channel) channel.unsubscribe(); };
  }, [state]);

  if (state === 'loading') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
        <Loader2 size={22} className="animate-spin opacity-30 mb-3" />
        <span className="text-[8px] font-mono opacity-25 tracking-[0.3em] uppercase">verificando acesso</span>
      </div>
    );
  }

  if (state === 'locked') return <PlansScreen processing={processing} />;

  return children;
};

export default SubscriptionGate;
