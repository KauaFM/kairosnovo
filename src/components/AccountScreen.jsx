// ============================================================
// ORVAX — Conta & Configurações
// Logout, trocar senha, gerenciar assinatura, idioma, tema e
// EXCLUSÃO DE CONTA (requisito de política da Google Play).
// Tema preto-branco; sem alert/confirm nativos.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  ChevronLeft, LogOut, KeyRound, Crown, Trash2, Globe, Sun, Moon,
  ShieldCheck, Loader2, Check, AlertTriangle, FileText, RotateCcw,
} from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import { useBackHandler } from '../lib/backHandler';
import { confirmDialog } from '../lib/dialog';
import LanguageToggle from './LanguageToggle';
import {
  logout, changePassword, deleteAccount, getAccountEmail,
} from '../services/account';
import { getEntitlement, tierLabel } from '../services/entitlements';

const PRIVACY_URL = 'https://orvaxapp.com.br/privacidade';
const TERMS_URL = 'https://orvaxapp.com.br/termos';

export default function AccountScreen({ theme, toggleTheme, onClose }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');

  // trocar senha
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState(null); // {ok, text}

  // excluir conta
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState('');

  const [plan, setPlan] = useState(null); // tier atual (read-only)

  useEffect(() => { getAccountEmail().then(setEmail).catch(() => {}); }, []);
  useEffect(() => { getEntitlement().then((e) => setPlan(e.tier)).catch(() => setPlan('none')); }, []);
  useBackHandler(true, onClose); // botão voltar fecha a tela de Conta

  const CONFIRM_WORD = t('account.deleteWord'); // "EXCLUIR" / "DELETE"

  const handleChangePw = async () => {
    setPwBusy(true); setPwMsg(null);
    try {
      await changePassword(pw);
      setPwMsg({ ok: true, text: t('account.pwChanged') });
      setPw(''); setTimeout(() => { setPwOpen(false); setPwMsg(null); }, 1500);
    } catch (e) {
      setPwMsg({ ok: false, text: e?.message || t('account.pwError') });
    } finally { setPwBusy(false); }
  };

  // Reset de dados (mantém a conta) — antes vivia como um card com
  // 1 toque no Compass (audit P13). Agora exige confirmação forte aqui.
  const [resetBusy, setResetBusy] = useState(false);
  const handleReset = async () => {
    const ok = await confirmDialog({
      title: t('account.resetTitle'),
      message: t('account.resetWarn'),
      danger: true, confirmLabel: t('account.resetConfirm'), cancelLabel: t('account.cancel'),
    });
    if (!ok) return;
    setResetBusy(true);
    try {
      const { wipeEntireSystem } = await import('../services/seedVisualization');
      const res = await wipeEntireSystem();
      if (res?.success) {
        try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignora */ }
        window.location.reload();
      } else {
        setResetBusy(false);
      }
    } catch { setResetBusy(false); }
  };

  const handleDelete = async () => {
    if (delText.trim().toUpperCase() !== CONFIRM_WORD.toUpperCase()) return;
    setDelBusy(true); setDelErr('');
    try {
      await deleteAccount();
      // signOut dispara onAuthStateChange → volta pro Login sozinho
    } catch (e) {
      setDelErr(e?.message || t('account.deleteError'));
      setDelBusy(false);
    }
  };

  const Row = ({ icon: Icon, label, sub, onClick, danger, right }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border transition-all active:scale-[0.99] text-left"
      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'text-red-500' : ''}`}
        style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-[12px] font-mono font-bold ${danger ? 'text-red-500' : ''}`}>{label}</p>
        {sub && <p className="text-[9px] font-mono opacity-40 truncate mt-0.5">{sub}</p>}
      </div>
      {right}
    </button>
  );

  const sectionLabel = (txt) => (
    <p className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] opacity-30 px-1 mb-2 mt-6">{txt}</p>
  );

  return (
    <div className="fixed inset-0 z-[75] overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>
      <div className="w-full max-w-[428px] mx-auto min-h-full px-5 pb-24"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center border"
            style={{ borderColor: 'var(--border-color)' }} aria-label={t('account.back')}>
            <ChevronLeft size={18} />
          </button>
          <h1 className="text-lg font-outfit font-black uppercase tracking-widest">{t('account.title')}</h1>
        </div>

        {/* E-mail */}
        <div className="rounded-2xl border px-4 py-4 mb-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
          <p className="text-[8px] font-mono uppercase tracking-widest opacity-30 mb-1">{t('account.loggedAs')}</p>
          <p className="text-[13px] font-mono font-bold truncate">{email || '—'}</p>
        </div>

        {/* Seu Plano (read-only — a contratação é feita fora do app) */}
        {sectionLabel(t('account.yourPlan'))}
        <div className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            <Crown size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-mono uppercase tracking-widest opacity-40">{t('account.currentPlan')}</p>
            <p className="text-[14px] font-outfit font-black mt-0.5">
              {!plan ? '—' : plan === 'none' ? t('account.noPlan') : tierLabel(plan)}
            </p>
          </div>
        </div>

        {/* Segurança */}
        {sectionLabel(t('account.security'))}
        <div className="space-y-2">
          <Row icon={KeyRound} label={t('account.changePw')} onClick={() => setPwOpen((v) => !v)} />
          {pwOpen && (
            <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
              <input
                type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder={t('account.newPwPh')} autoComplete="new-password"
                className="w-full rounded-xl px-3 py-2.5 text-[12px] font-mono outline-none border bg-transparent"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              {pwMsg && (
                <p className={`text-[10px] font-mono ${pwMsg.ok ? 'text-green-500' : 'text-red-500'} flex items-center gap-1`}>
                  {pwMsg.ok ? <Check size={11} /> : <AlertTriangle size={11} />}{pwMsg.text}
                </p>
              )}
              <button onClick={handleChangePw} disabled={pwBusy || pw.length < 8}
                className="w-full py-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest disabled:opacity-30 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}>
                {pwBusy ? <Loader2 size={14} className="animate-spin" /> : t('account.savePw')}
              </button>
            </div>
          )}
        </div>

        {/* Preferências */}
        {sectionLabel(t('account.prefs'))}
        <div className="space-y-2">
          <div className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl border"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
              <Globe size={16} />
            </div>
            <p className="text-[12px] font-mono font-bold flex-1">{t('account.language')}</p>
            <LanguageToggle variant="default" className="h-8" />
          </div>
          <Row icon={theme === 'dark' ? Moon : Sun} label={t('account.theme')}
            sub={theme === 'dark' ? t('account.themeDark') : t('account.themeLight')}
            onClick={toggleTheme} />
        </div>

        {/* Legal */}
        {sectionLabel(t('account.legal'))}
        <div className="space-y-2">
          <Row icon={ShieldCheck} label={t('account.privacy')} onClick={() => window.open(PRIVACY_URL, '_blank')} />
          <Row icon={FileText} label={t('account.terms')} onClick={() => window.open(TERMS_URL, '_blank')} />
        </div>

        {/* Sair */}
        <div className="mt-6">
          <Row icon={LogOut} label={t('account.logout')} onClick={logout} />
        </div>

        {/* Zona de perigo */}
        {sectionLabel(t('account.dangerZone'))}
        <div className="mb-2">
          <Row icon={resetBusy ? Loader2 : RotateCcw} label={t('account.resetData')} sub={t('account.resetSub')}
            danger onClick={resetBusy ? undefined : handleReset} />
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
          {!delOpen ? (
            <Row icon={Trash2} label={t('account.deleteAccount')} sub={t('account.deleteSub')}
              danger onClick={() => setDelOpen(true)} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-red-500">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-[11px] font-mono leading-snug">{t('account.deleteWarn')}</p>
              </div>
              <p className="text-[10px] font-mono opacity-60">{t('account.deleteType', { word: CONFIRM_WORD })}</p>
              <input
                value={delText} onChange={(e) => setDelText(e.target.value)}
                placeholder={CONFIRM_WORD}
                className="w-full rounded-xl px-3 py-2.5 text-[12px] font-mono outline-none border bg-transparent"
                style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--text-main)' }}
              />
              {delErr && <p className="text-[10px] font-mono text-red-500">{delErr}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setDelOpen(false); setDelText(''); setDelErr(''); }}
                  className="flex-1 py-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest border"
                  style={{ borderColor: 'var(--border-color)' }}>
                  {t('account.cancel')}
                </button>
                <button onClick={handleDelete}
                  disabled={delBusy || delText.trim().toUpperCase() !== CONFIRM_WORD.toUpperCase()}
                  className="flex-1 py-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-widest bg-red-600 text-white disabled:opacity-30 flex items-center justify-center gap-2">
                  {delBusy ? <Loader2 size={14} className="animate-spin" /> : t('account.deleteConfirm')}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
