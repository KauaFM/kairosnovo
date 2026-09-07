// =============================================================
// ORVAX · A SIMBIOSE — a matéria orgânica viva
//
// Esta É a entidade que já vivia no Home (Nexus.jsx a chamava de
// "Symbiote Matter — the organic liquid mass"): massa que se
// deforma continuamente, tentáculos internos, poeira sendo emitida
// e um núcleo vermelho pulsando no centro.
//
// A versão anterior deste arquivo era outra criatura — anéis
// concêntricos e um traço varrendo. Tecnicamente boa, mas errada:
// inventava uma identidade nova em vez de usar a que o produto já
// tinha. Aquela parecia instrumento; esta parece VIDA, que é o
// ponto.
//
// O que muda aqui em relação ao Home: a entidade ganhou ESTADOS.
// Lá ela era uma só, sempre igual. Aqui o mesmo organismo acelera,
// desacelera, se concentra ou se expande conforme o que o ORVAX
// está fazendo — deformação, giro, brilho e poeira respondem ao
// estado. Nenhuma forma nova é introduzida: é o mesmo ser, em outro
// estado de espírito.
//
// Reaproveita os keyframes `alien-morph` e `emit-dust` que já
// existem em index.css — a assinatura de movimento continua sendo a
// mesma do Home.
// =============================================================
import React, { useMemo } from 'react';

// morf  = duração base da deformação da massa (menor = mais agitado)
// giro  = rotação do conjunto
// massa = opacidade da matéria
// nucleo= intensidade do núcleo
// brilho= halo difuso ao redor
// poeira= quantidade/velocidade da emissão
// escala= tamanho relativo do organismo
const PERFIL = {
    IDLE:      { morf: 11, giro: 90, massa: 1.00, nucleo: 0.75, brilho: 0.85, poeira: 0.5, escala: 1.00 },
    LISTENING: { morf: 8,  giro: 60, massa: 1.05, nucleo: 1.00, brilho: 1.15, poeira: 0.8, escala: 1.04 },
    THINKING:  { morf: 4,  giro: 24, massa: 0.95, nucleo: 0.85, brilho: 1.00, poeira: 1.2, escala: 0.97 },
    ANALYZING: { morf: 2.4, giro: 12, massa: 0.90, nucleo: 1.15, brilho: 1.35, poeira: 1.6, escala: 0.94 },
    SPEAKING:  { morf: 6,  giro: 45, massa: 1.05, nucleo: 1.10, brilho: 1.25, poeira: 0.9, escala: 1.02 },
    ATTENTION: { morf: 5,  giro: 40, massa: 1.10, nucleo: 1.45, brilho: 1.50, poeira: 1.0, escala: 1.05 },
    SUCCESS:   { morf: 7,  giro: 34, massa: 1.05, nucleo: 1.30, brilho: 1.80, poeira: 1.4, escala: 1.10 },
    WARNING:   { morf: 9,  giro: 70, massa: 0.85, nucleo: 0.95, brilho: 0.70, poeira: 0.4, escala: 0.96 },
    EVOLUTION: { morf: 3.2, giro: 18, massa: 1.15, nucleo: 1.60, brilho: 2.00, poeira: 1.8, escala: 1.12 },
};

// Poeira fixa (não aleatória a cada render): posições sorteadas uma
// vez só. Aleatório dentro do render faria a nuvem inteira "saltar"
// a cada mudança de estado, e salto quebra a ilusão de continuidade.
const POEIRA = Array.from({ length: 22 }).map((_, i) => {
    const ang = (i * 137.5 * Math.PI) / 180; // ângulo áureo: espalha sem enfileirar
    const dist = 70 + ((i * 37) % 150);
    return {
        tx: (Math.cos(ang) * dist).toFixed(1),
        ty: (Math.sin(ang) * dist).toFixed(1),
        dur: (2.5 + ((i * 13) % 25) / 10).toFixed(2),
        atraso: (-((i * 7) % 60) / 10).toFixed(2),
        tam: i % 3 === 0 ? 3 : 2,
    };
});

export default function Simbiose({ estado = 'IDLE', tamanho = 224, className = '', style }) {
    const p = PERFIL[estado] || PERFIL.IDLE;

    // Poeira e anel externo são feitos para a presença GRANDE: têm
    // alcance fixo em pixels, então num avatar de 34px eles escapam da
    // caixa e ficam voando por cima do texto ao lado. No pequeno, a
    // criatura se reduz ao essencial — massa e núcleo.
    const compacta = tamanho < 90;

    // A massa: 4 camadas giradas e deformando em tempos diferentes.
    // É a sobreposição delas que cria o volume irregular — uma só
    // camada seria só uma bolha.
    const massa = useMemo(() => Array.from({ length: 4 }).map((_, i) => (
        <div
            key={`m-${i}`}
            className="absolute inset-0"
            style={{
                backgroundColor: 'var(--text-main)',
                opacity: (0.7 - i * 0.1) * p.massa,
                transform: `rotate(${i * 45}deg) scale(${0.85 + i * 0.05})`,
                animation: `alien-morph ${p.morf + i * 2}s ease-in-out -${i * 3}s infinite ${i % 2 === 0 ? 'alternate' : 'alternate-reverse'}`,
                willChange: 'border-radius, transform',
                transition: 'opacity .9s ease',
            }}
        />
    )), [p.morf, p.massa]);

    // Tentáculos internos: mesma deformação, menores e desfocados —
    // dão a sensação de que há coisa se movendo DENTRO da massa.
    const tentaculos = useMemo(() => Array.from({ length: 6 }).map((_, i) => (
        <div
            key={`t-${i}`}
            className="absolute"
            style={{
                inset: `${tamanho * 0.07}px`,
                backgroundColor: 'var(--text-main)',
                opacity: 0.4 * p.massa,
                transform: `rotate(${i * 60}deg) scale(${0.8 + (i % 3) * 0.07})`,
                animation: `alien-morph ${p.morf * 0.8 + (i % 4)}s ease-in-out -${i * 0.9}s infinite ${i % 2 === 0 ? 'alternate-reverse' : 'alternate'}`,
                willChange: 'border-radius, transform',
                filter: `blur(${Math.max(1, tamanho * 0.009)}px)`,
                transition: 'opacity .9s ease',
            }}
        />
    )), [p.morf, p.massa, tamanho]);

    const poeira = useMemo(() => POEIRA.map((d, i) => (
        <div
            key={`d-${i}`}
            className="absolute rounded-full"
            style={{
                backgroundColor: 'var(--text-main)',
                boxShadow: '0 0 6px var(--text-main)',
                width: d.tam, height: d.tam,
                '--tx': d.tx, '--ty': d.ty,
                animation: `emit-dust ${(d.dur / p.poeira).toFixed(2)}s ease-out ${d.atraso}s infinite`,
                willChange: 'transform, opacity',
                opacity: 0,
            }}
        />
    )), [p.poeira]);

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{ width: tamanho, height: tamanho, color: 'var(--text-main)', ...style }}
            data-estado={estado}
            aria-hidden="true"
        >
            {/* Anel externo tracejado — a órbita do organismo */}
            {!compacta && (
                <div
                    className="absolute rounded-full border-[0.5px] border-dashed pointer-events-none"
                    style={{
                        width: tamanho * 1.28, height: tamanho * 1.28,
                        borderColor: 'var(--text-main)',
                        opacity: 0.1 * p.brilho,
                        animation: `spin ${p.giro * 1.5}s linear infinite reverse`,
                        transition: 'opacity 1s ease',
                    }}
                />
            )}

            {/* Poeira emitida */}
            {!compacta && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    {poeira}
                </div>
            )}

            {/* Dois halos difusos: o de fora dá presença, o de dentro
                dá densidade. Ambos respondem ao estado. */}
            <div
                className="absolute rounded-full animate-pulse"
                style={{
                    inset: '-10%', backgroundColor: 'var(--text-main)',
                    opacity: 0.15 * p.brilho, filter: `blur(${tamanho * 0.13}px)`,
                    transition: 'opacity 1s ease',
                }}
            />
            <div
                className="absolute rounded-full animate-pulse"
                style={{
                    width: tamanho * 0.57, height: tamanho * 0.57,
                    backgroundColor: 'var(--text-main)',
                    opacity: 0.2 * p.brilho, filter: `blur(${tamanho * 0.067}px)`,
                    transition: 'opacity 1s ease',
                }}
            />

            {/* O NÚCLEO. É a única cor do app inteiro, e é assim de
                propósito: num sistema onde tudo é preto e branco, um
                ponto vermelho pulsando lê como sinal vital. */}
            <div
                className="absolute rounded-full animate-pulse z-30"
                style={{
                    width: Math.max(6, tamanho * 0.045),
                    height: Math.max(6, tamanho * 0.045),
                    backgroundColor: '#dc2626',
                    boxShadow: `0 0 ${tamanho * 0.09}px rgba(239,68,68,${Math.min(1, p.nucleo)})`,
                    opacity: Math.min(1, 0.9 * p.nucleo),
                    transition: 'opacity .8s ease, box-shadow .8s ease',
                }}
            />

            {/* A matéria — girando devagar como um todo */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                    animation: `spin ${p.giro}s linear infinite`,
                    transform: `scale(${p.escala})`,
                    transition: 'transform 1.1s cubic-bezier(.22,.61,.36,1)',
                    willChange: 'transform',
                }}
            >
                {massa}
                {tentaculos}
            </div>
        </div>
    );
}
