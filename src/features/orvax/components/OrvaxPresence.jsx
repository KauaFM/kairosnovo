// =============================================================
// ORVAX · Presença — o núcleo visível
//
// Não é um botão de chat. É a evidência de que existe algo
// acompanhando: um núcleo pequeno e discreto que respira devagar
// quando está só observando, e ganha um anel quando tem algo a
// dizer. A pessoa aprende a ler o estado dele sem precisar tocar.
//
// A estética segue o app: preto e branco, sem cor fora da paleta,
// traço fino. Nada de balãozinho de chat.
// =============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { coletarSinais } from '../engine/signals';
import { avaliarRegras } from '../engine/rules';
import { decidirIntervencao, registrarExibicao, registrarDispensa, registrarAcao } from '../engine/policy';
import { executarAcao } from '../engine/actions';
import { appEvents } from '../../../lib/events';
import InterventionCard from './InterventionCard';

// Espera antes da primeira avaliação: deixa o app abrir primeiro.
// Aparecer junto com a tela é o que faz parecer pop-up.
const ATRASO_INICIAL_MS = 4000;
// Reavalia de tempos em tempos enquanto o app está aberto.
const REAVALIAR_MS = 15 * 60 * 1000;

export default function OrvaxPresence({ oculto = false, irPara }) {
    const [intervencao, setIntervencao] = useState(null);
    const [aberto, setAberto] = useState(false);
    const sinaisRef = useRef(null);
    const avaliandoRef = useRef(false);

    const avaliar = useCallback(async () => {
        if (avaliandoRef.current || intervencao) return;
        avaliandoRef.current = true;
        try {
            const sinais = await coletarSinais();
            if (!sinais) return;
            sinaisRef.current = sinais;
            const { intervencao: escolhida } = decidirIntervencao(avaliarRegras(sinais));
            if (escolhida) {
                setIntervencao(escolhida);
                registrarExibicao(escolhida);
            }
        } catch (e) {
            console.warn('[orvax] avaliação falhou:', e?.message);
        } finally {
            avaliandoRef.current = false;
        }
    }, [intervencao]);

    useEffect(() => {
        const t = setTimeout(avaliar, ATRASO_INICIAL_MS);
        const i = setInterval(avaliar, REAVALIAR_MS);
        // Quando a pessoa mexe em algo, o quadro muda — vale reavaliar,
        // mas sem pressa, para não reagir a cada clique.
        const desinscrever = appEvents.subscribe(() => {
            clearTimeout(t);
            setTimeout(avaliar, 8000);
        });
        return () => { clearTimeout(t); clearInterval(i); desinscrever(); };
    }, [avaliar]);

    const fechar = useCallback(() => {
        if (intervencao) registrarDispensa(intervencao);
        setAberto(false);
        setIntervencao(null);
    }, [intervencao]);

    const aoAgir = useCallback(async (acao) => {
        const r = await executarAcao(acao, sinaisRef.current, { irPara });
        if (intervencao) registrarAcao(intervencao, acao.tipo);
        if (acao.tipo === 'dispensar' || r.fechar) {
            setAberto(false);
            setIntervencao(null);
        }
        return r;
    }, [intervencao, irPara]);

    if (oculto) return null;

    const temAlgo = !!intervencao;

    return (
        <>
            {/* ─── O núcleo ─────────────────────────────────────
                Sem nada a dizer: pulsa devagar, quase imperceptível.
                Com algo: ganha anel e para de pulsar — mudança de
                estado que se lê de longe, sem texto. */}
            <button
                onClick={() => temAlgo && setAberto((v) => !v)}
                aria-label={temAlgo ? 'ORVAX tem algo para você' : 'ORVAX está acompanhando'}
                disabled={!temAlgo}
                className={[
                    'fixed left-4 z-[62] w-11 h-11 rounded-full flex items-center justify-center',
                    'transition-all duration-500',
                    temAlgo ? 'cursor-pointer scale-100' : 'cursor-default scale-90',
                    aberto ? 'opacity-0 pointer-events-none' : 'opacity-100',
                ].join(' ')}
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10.5rem)' }}
            >
                <span
                    className="absolute inset-0 rounded-full border transition-all duration-700"
                    style={{
                        borderColor: temAlgo ? 'var(--text-main)' : 'var(--border-color)',
                        opacity: temAlgo ? 0.9 : 0.35,
                        transform: temAlgo ? 'scale(1)' : 'scale(0.82)',
                    }}
                />
                {temAlgo && (
                    <span
                        className="absolute inset-0 rounded-full border animate-ping"
                        style={{ borderColor: 'var(--text-main)', opacity: 0.25, animationDuration: '2.6s' }}
                    />
                )}
                <span
                    className="rounded-full transition-all duration-700"
                    style={{
                        width: temAlgo ? 9 : 6,
                        height: temAlgo ? 9 : 6,
                        backgroundColor: 'var(--text-main)',
                        opacity: temAlgo ? 1 : 0.4,
                        animation: temAlgo ? 'none' : 'orvax-respirar 4.5s ease-in-out infinite',
                    }}
                />
            </button>

            {aberto && intervencao && (
                <InterventionCard
                    intervencao={intervencao}
                    aoAgir={aoAgir}
                    aoFechar={fechar}
                />
            )}

            <style>{`
                @keyframes orvax-respirar {
                    0%, 100% { opacity: .25; transform: scale(.85); }
                    50%      { opacity: .55; transform: scale(1.1); }
                }
            `}</style>
        </>
    );
}
