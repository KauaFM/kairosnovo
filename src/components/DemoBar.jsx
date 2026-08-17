// ============================================================
// ORVAX — HUD da amostra de 15 minutos
//
// Mostra quanto falta e, no fim, encerra com um convite. O botão que
// leva à Landing Page só existe DENTRO da demonstração: o app normal
// continua sem nenhum caminho de venda, que é a regra do projeto — e
// modo demo nunca vai junto num build de loja.
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { emDemo, msRestantes, encerrarDemo, DEMO_MS } from '../lib/demoSession';

const LP = 'https://orvaxapp.com.br';

const relogio = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function DemoBar() {
    const [restante, setRestante] = useState(() => (emDemo() ? msRestantes() : 0));
    const [acabou, setAcabou] = useState(false);

    useEffect(() => {
        if (!emDemo()) return;
        const t = setInterval(() => {
            const ms = msRestantes();
            setRestante(ms);
            if (ms <= 0) { setAcabou(true); clearInterval(t); }
        }, 1000);
        return () => clearInterval(t);
    }, []);

    const sair = useCallback(async () => {
        await encerrarDemo();
        window.location.replace('/');
    }, []);

    if (!emDemo()) return null;

    if (acabou) {
        return (
            <div
                className="fixed inset-0 z-[210] flex items-center justify-center px-7"
                style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                role="dialog"
                aria-label="Amostra encerrada"
            >
                <div className="w-full max-w-[360px] text-center">
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase opacity-40">
                        amostra encerrada
                    </p>
                    <h2 className="text-[22px] font-black tracking-tight leading-tight mt-3">
                        Seus 15 minutos acabaram.
                    </h2>
                    <p className="text-[13px] leading-relaxed mt-3 opacity-60">
                        Isso foi só a vitrine. Com o seu plano, os dados passam a ser
                        seus — e o mentor de IA, que ficou de fora da amostra, entra
                        para te acompanhar todo dia.
                    </p>

                    <a
                        href={LP}
                        className="mt-7 inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-full font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-opacity hover:opacity-80"
                        style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
                    >
                        Ver os planos <ArrowRight size={14} />
                    </a>

                    <button
                        type="button"
                        onClick={sair}
                        className="mt-3 w-full py-2 font-mono text-[9px] tracking-[0.2em] uppercase opacity-40 hover:opacity-80 transition-opacity"
                    >
                        Sair da demonstração
                    </button>
                </div>
            </div>
        );
    }

    // Últimos 2 minutos: passa a pulsar de leve, para não terminar de surpresa.
    const acabando = restante <= 2 * 60 * 1000;

    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 z-[105] pointer-events-none"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
        >
            <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border backdrop-blur-2xl ${acabando ? 'animate-pulse' : ''}`}
                style={{
                    backgroundColor: 'var(--bg-color)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                    boxShadow: 'var(--glass-shadow)',
                }}
            >
                <Clock size={11} strokeWidth={2} className="opacity-50" />
                <span className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase opacity-50">
                    demonstração
                </span>
                <span className="font-mono text-[11px] font-bold tabular-nums">
                    {relogio(restante || DEMO_MS)}
                </span>
            </div>
        </div>
    );
}
