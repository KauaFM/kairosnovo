// ============================================================
// ORVAX — AccessGate (conta SEM plano ativo)
//
// NÃO é paywall: não vende, não mostra preço, não abre checkout.
// Apenas INFORMA que a conta não tem plano ativo (modelo Netflix) e
// oferece receber o link por E-MAIL — a contratação é feita no site.
// Só existem 2 planos, ambos pagos (Essencial | Completo).
// ============================================================
import React, { useState } from 'react';
import { KeyRound, MailCheck, Loader2, LogOut, RefreshCw, ArrowRight } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { requestUpgrade } from '../services/entitlements';
import { logout } from '../services/account';

const ACCENT = '#22c55e';

export default function AccessGate({ onRecheck }) {
  const { t } = useLang();
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [email, setEmail] = useState('');
  const [emailed, setEmailed] = useState(true);
  const [err, setErr] = useState('');

  const handleAsk = async () => {
    setState('sending'); setErr('');
    try {
      const res = await requestUpgrade('completo', 'access_gate');
      setEmail(res?.email || '');
      setEmailed(res?.emailed !== false);
      setState('sent');
    } catch (e) {
      setErr(e?.message || t('accessGate.error'));
      setState('error');
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', scrollbarWidth: 'none' }}>
      <div className="max-w-[400px] mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">

        <div className="w-16 h-16 rounded-[22px] border flex items-center justify-center relative overflow-hidden mb-6"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: `0 0 40px ${ACCENT}22` }}>
          <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 40%, ${ACCENT}22, transparent 65%)` }} />
          {state === 'sent'
            ? <MailCheck size={26} strokeWidth={1.5} className="relative z-10" style={{ color: ACCENT }} />
            : <KeyRound size={26} strokeWidth={1.5} className="relative z-10" style={{ color: ACCENT }} />}
        </div>

        {state === 'sent' ? (
          <>
            <h1 className="text-[22px] font-outfit font-black tracking-tight leading-tight">{t('accessGate.sentTitle')}</h1>
            <p className="text-[12px] font-space opacity-65 leading-relaxed mt-3">
              {emailed
                ? t('accessGate.sentBody', { email: email || t('accessGate.yourEmail') })
                : t('accessGate.sentNoEmail')}
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[22px] font-outfit font-black tracking-tight leading-tight">{t('accessGate.title')}</h1>
            <p className="text-[12px] font-space opacity-60 leading-relaxed mt-3 max-w-[300px]">
              {t('accessGate.subtitle')}
            </p>

            <div className="w-full mt-8">
              <button
                onClick={handleAsk}
                disabled={state === 'sending'}
                className="w-full py-4 rounded-2xl font-outfit font-black text-[11px] tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ backgroundColor: ACCENT, color: '#000', boxShadow: `0 10px 30px ${ACCENT}40` }}
              >
                {state === 'sending'
                  ? <Loader2 size={15} className="animate-spin" />
                  : <>{t('accessGate.sendLink')} <ArrowRight size={15} /></>}
              </button>

              {state === 'error' && (
                <div className="mt-4 p-3 rounded-xl border text-[10px] font-mono"
                  style={{ borderColor: '#ef444455', backgroundColor: '#ef44440D', color: '#ef4444' }}>
                  {err}
                </div>
              )}

              <p className="text-[9px] font-mono opacity-30 tracking-[0.1em] leading-relaxed mt-4">
                {t('accessGate.hint')}
              </p>
            </div>
          </>
        )}

        {/* Já contratou? Reconsulta o plano (útil logo após a compra) */}
        <button onClick={onRecheck}
          className="mt-8 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity flex items-center gap-1.5">
          <RefreshCw size={11} /> {t('accessGate.recheck')}
        </button>

        <button onClick={logout}
          className="mt-5 text-[9px] font-mono uppercase tracking-widest opacity-30 hover:opacity-60 transition-opacity flex items-center gap-1.5">
          <LogOut size={11} /> {t('accessGate.signOut')}
        </button>

        <div className="mt-6"><LanguageToggle variant="default" /></div>
      </div>
    </div>
  );
}
