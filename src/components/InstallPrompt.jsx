// ============================================================
// ORVAX — Convite de instalação
//
// O ORVAX é distribuído como app instalável pelo navegador. Este é
// o convite: no Android/desktop abre o diálogo nativo de instalação;
// no iPhone, que não tem esse diálogo, ensina o caminho manual.
//
// Fica quieto quando não faz sentido: dentro do APK, quando já está
// instalado, ou quando a pessoa dispensou (volta a perguntar só
// depois de uma semana).
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import {
    getPrompt,
    subscribe,
    showPrompt,
    isStandalone,
    isIOS,
    isNativeApp,
} from '../lib/installPrompt';

const DISMISS_KEY = 'orvax_install_dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
// Respira antes de aparecer: convite em cima do primeiro render é o
// tipo de coisa que a pessoa fecha no reflexo, sem ler.
const DELAY_MS = 4000;

const wasDismissed = () => {
    try {
        const at = Number(localStorage.getItem(DISMISS_KEY));
        return Boolean(at) && Date.now() - at < SNOOZE_MS;
    } catch {
        return false; // localStorage bloqueado (aba anônima) não impede o convite
    }
};

export default function InstallPrompt() {
    const { t } = useLang();
    const [mode, setMode] = useState(null); // null | 'prompt' | 'ios'

    useEffect(() => {
        if (isNativeApp() || isStandalone() || wasDismissed()) return;

        let timer;
        const show = (m) => { timer = setTimeout(() => setMode(m), DELAY_MS); };

        if (isIOS()) {
            show('ios');
            return () => clearTimeout(timer);
        }

        // Android/desktop: só convida quando o navegador confirma que
        // dá pra instalar. O evento pode ter chegado antes deste mount,
        // por isso a checagem imediata além da inscrição.
        if (getPrompt()) show('prompt');
        const unsub = subscribe((evt) => {
            if (evt) show('prompt');
            else { clearTimeout(timer); setMode(null); } // instalou
        });

        return () => { clearTimeout(timer); unsub(); };
    }, []);

    const dismiss = useCallback(() => {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* sem persistência, tudo bem */ }
        setMode(null);
    }, []);

    const install = useCallback(async () => {
        const outcome = await showPrompt();
        // 'dismissed' = recusou no diálogo nativo. Insistir depois disso
        // é assédio; trata igual a dispensar o convite.
        if (outcome !== 'accepted') dismiss();
        else setMode(null);
    }, [dismiss]);

    if (!mode) return null;

    const ios = mode === 'ios';

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 w-full max-w-[428px] px-5 z-[60] pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 116px)' }}
            role="dialog"
            aria-label={ios ? t('common.install.iosTitle') : t('common.install.title')}
        >
            <div
                className="pointer-events-auto rounded-3xl border px-4 py-3.5 flex items-start gap-3 backdrop-blur-2xl"
                style={{
                    backgroundColor: 'var(--bg-color)',
                    borderColor: 'var(--border-color)',
                    boxShadow: 'var(--glass-shadow)',
                    color: 'var(--text-main)',
                }}
            >
                <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center border"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    {ios ? <Share size={15} strokeWidth={1.5} /> : <Download size={15} strokeWidth={1.5} />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase leading-tight">
                        {ios ? t('common.install.iosTitle') : t('common.install.title')}
                    </p>
                    <p className="text-[12px] leading-snug mt-1 opacity-60">
                        {ios ? t('common.install.iosBody') : t('common.install.body')}
                    </p>

                    {!ios && (
                        <button
                            type="button"
                            onClick={install}
                            className="mt-2.5 px-4 py-2 rounded-full font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-opacity hover:opacity-80"
                            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
                        >
                            {t('common.install.cta')}
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t('common.install.dismiss')}
                    className="shrink-0 p-1 -mt-0.5 -mr-0.5 opacity-40 hover:opacity-100 transition-opacity"
                >
                    <X size={15} strokeWidth={1.5} />
                </button>
            </div>
        </div>
    );
}
