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
import NucleoOrvax from './NucleoOrvax';

// O tipo da intervenção define o estado da Simbiose. É assim que o
// estado dela deixa de ser enfeite e passa a ser informação: dá pra
// saber que tipo de coisa ele tem antes de tocar.
const ESTADO_POR_TIPO = {
    alerta: 'ATTENTION',
    recomendacao: 'SPEAKING',
    analise: 'ANALYZING',
    pergunta: 'LISTENING',
    celebracao: 'SUCCESS',
};

// Espera antes da primeira avaliação: deixa o app abrir primeiro.
// Aparecer junto com a tela é o que faz parecer pop-up.
const ATRASO_INICIAL_MS = 4000;
// Reavalia de tempos em tempos enquanto o app está aberto.
const REAVALIAR_MS = 15 * 60 * 1000;

export default function OrvaxPresence({ oculto = false, irPara }) {
    const [intervencao, setIntervencao] = useState(null);
    const [aberto, setAberto] = useState(false);
    const [estado, setEstado] = useState('IDLE');
    const sinaisRef = useRef(null);
    const avaliandoRef = useRef(false);

    const avaliar = useCallback(async () => {
        if (avaliandoRef.current || intervencao) return;
        avaliandoRef.current = true;
        // Enquanto pensa, ele PARECE pensando. O estado não é enfeite:
        // é a diferença entre um sistema que responde e um que se vê
        // trabalhando.
        setEstado('THINKING');
        try {
            const sinais = await coletarSinais();
            if (!sinais) { setEstado('IDLE'); return; }
            sinaisRef.current = sinais;
            setEstado('ANALYZING');
            const { intervencao: escolhida } = decidirIntervencao(avaliarRegras(sinais));
            if (escolhida) {
                setIntervencao(escolhida);
                registrarExibicao(escolhida);
                setEstado(ESTADO_POR_TIPO[escolhida.tipo] || 'ATTENTION');
            } else {
                // Nada a dizer: volta a só observar. O silêncio tem
                // representação visual própria.
                setEstado('IDLE');
            }
        } catch (e) {
            console.warn('[orvax] avaliação falhou:', e?.message);
            setEstado('IDLE');
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
                onPointerEnter={() => !temAlgo && setEstado('LISTENING')}
                onPointerLeave={() => !temAlgo && setEstado('IDLE')}
                aria-label={temAlgo ? 'ORVAX tem algo para você' : 'ORVAX está acompanhando'}
                disabled={!temAlgo}
                className={[
                    'fixed left-3 z-[62] flex items-center justify-center rounded-full',
                    'transition-all duration-700',
                    temAlgo ? 'cursor-pointer' : 'cursor-default',
                    aberto ? 'opacity-0 pointer-events-none' : 'opacity-100',
                ].join(' ')}
                style={{
                    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10rem)',
                    // Quando está só observando ele encolhe e desbota:
                    // presente, mas sem pedir nada. Com algo a dizer,
                    // ocupa o espaço inteiro.
                    transform: temAlgo ? 'scale(1)' : 'scale(0.72)',
                    opacity: temAlgo ? 1 : 0.5,
                }}
            >
                <NucleoOrvax estado={estado} tamanho={62} />
            </button>

            {aberto && intervencao && (
                <InterventionCard
                    intervencao={intervencao}
                    estado={estado}
                    aoAgir={aoAgir}
                    aoFechar={fechar}
                />
            )}
        </>
    );
}
