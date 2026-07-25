// ============================================================
// ORVAX — FeatureLocked (upsell conforme Google Play)
//
// Recurso fora do plano do usuário. Vende o DESEJO (preview do que
// ele ganha), NUNCA o preço. O botão dispara um E-MAIL com o link
// da Landing Page (venda 100% fora do app). Nada de preço, checkout
// ou link de compra dentro do app — à prova de reprovação anti-steering.
// ============================================================
import React, { useState } from 'react';
import { Lock, Check, Sparkles, Loader2, MailCheck, ArrowRight } from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
import { useLang } from '../i18n/LanguageContext';
import { requestUpgrade, tierLabel } from '../services/entitlements';

const ACCENT = '#22c55e';

/**
 * @param {object} p
 * @param {string} p.feature       chave do recurso (ex.: 'fitcal') — vai no analytics/backend
 * @param {string} p.tier          plano necessário ('completo' | 'essencial')
 * @param {string} p.badge         rótulo pequeno no topo
 * @param {string} p.title
 * @param {string} p.subtitle
 * @param {Array}  p.features       [{ icon, title, desc }]
 */
export default function FeatureLocked({ feature, tier = 'completo', badge, title, subtitle, features = [], theme, toggleTheme }) {
  const { t } = useLang();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [email, setEmail] = useState('');
  const [emailed, setEmailed] = useState(true);
  const [err, setErr] = useState('');

  const label = tierLabel(tier);

  const handleUpgrade = async () => {
    setState('sending'); setErr('');
    try {
      const res = await requestUpgrade(tier, feature);
      setEmail(res?.email || '');
      setEmailed(res?.emailed !== false);
      setState('sent');
    } catch (e) {
      setErr(e?.message || t('featureLocked.error'));
      setState('error');
    }
  };

  return (
    <div className="relative w-full h-full">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="pb-32 flex flex-col items-center text-center" style={{ color: 'var(--text-main)' }}>

          {/* Emblema */}
          <div className="relative mt-6 mb-6">
            <div className="w-24 h-24 rounded-[28px] border flex items-center justify-center relative overflow-hidden"
              style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: `0 0 40px ${ACCENT}22` }}>
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT}22, transparent 65%)` }} />
              {state === 'sent'
                ? <MailCheck size={34} strokeWidth={1.4} className="relative z-10" style={{ color: ACCENT }} />
                : <Lock size={34} strokeWidth={1.4} className="relative z-10" style={{ color: ACCENT }} />}
            </div>
          </div>

          {state === 'sent' ? (
            /* ── Confirmação (link enviado por e-mail) ── */
            <div className="w-full max-w-[340px] px-3">
              <h1 className="text-[24px] font-outfit font-black tracking-tight leading-tight">{t('featureLocked.sentTitle')}</h1>
              <p className="text-[12px] font-space opacity-65 leading-relaxed mt-3">
                {emailed
                  ? t('featureLocked.sentBody', { email: email || t('featureLocked.yourEmail'), tier: label })
                  : t('featureLocked.sentNoEmail', { tier: label })}
              </p>
              <p className="text-[9px] font-mono opacity-30 tracking-[0.15em] uppercase mt-6">
                {t('featureLocked.footer')}
              </p>
            </div>
          ) : (
            /* ── Oferta de valor (sem preço) ── */
            <>
              <span className="text-[9px] font-mono tracking-[0.4em] uppercase opacity-30 mb-2 flex items-center gap-1.5">
                <Sparkles size={10} style={{ color: ACCENT }} /> {badge || t('featureLocked.badge')}
              </span>
              <h1 className="text-[26px] font-outfit font-black tracking-tight leading-tight max-w-[300px]">{title}</h1>
              {subtitle && (
                <p className="text-[12px] font-space opacity-55 max-w-[300px] leading-relaxed mt-3">{subtitle}</p>
              )}

              {features.length > 0 && (
                <div className="w-full max-w-[340px] mt-8 space-y-2.5 px-2">
                  {features.map(({ icon: Icon, title: ft, desc }, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl border text-left"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ border: `1px solid ${ACCENT}33`, backgroundColor: `${ACCENT}0D` }}>
                        {Icon ? <Icon size={15} style={{ color: ACCENT }} /> : <Check size={15} style={{ color: ACCENT }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold block leading-tight">{ft}</span>
                        {desc && <span className="text-[9px] font-mono opacity-40 leading-snug block mt-0.5">{desc}</span>}
                      </div>
                      <Check size={14} className="shrink-0 opacity-40" style={{ color: ACCENT }} />
                    </div>
                  ))}
                </div>
              )}

              {/* CTA — dispara e-mail, NÃO abre pagamento */}
              <div className="w-full max-w-[340px] px-2 mt-8">
                <button
                  onClick={handleUpgrade}
                  disabled={state === 'sending'}
                  className="w-full py-4 rounded-2xl font-outfit font-black text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: ACCENT, color: '#000', boxShadow: `0 10px 30px ${ACCENT}40` }}
                >
                  {state === 'sending'
                    ? <Loader2 size={15} className="animate-spin" />
                    : <>{t('featureLocked.unlock', { tier: label })} <ArrowRight size={15} /></>}
                </button>

                {state === 'error' && (
                  <div className="mt-4 p-3 rounded-xl border text-[10px] font-mono text-center"
                    style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>
                    {err}
                  </div>
                )}

                <p className="text-[8px] font-mono opacity-25 tracking-[0.15em] uppercase mt-4 leading-relaxed">
                  {t('featureLocked.hint')}
                </p>
              </div>
            </>
          )}
        </div>
      </ScrollContainer>
    </div>
  );
}
