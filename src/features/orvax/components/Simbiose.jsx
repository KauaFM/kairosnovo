// =============================================================
// ORVAX · A SIMBIOSE — a manifestação viva da inteligência
//
// Não é um avatar nem um ícone de chat: é um organismo. Um núcleo,
// um halo, campos concêntricos e partículas em órbita. A pessoa
// aprende a ler o estado dele sem legenda — do mesmo jeito que se
// percebe que alguém ao lado ficou atento, sem que ele diga nada.
//
// RESTRIÇÃO QUE VIROU LINGUAGEM: o app é preto e branco, sem cor
// fora da paleta. Então a Simbiose não tem verde de sucesso nem
// vermelho de alerta. Tudo é dito com LUZ, ESCALA, RITMO e
// DIREÇÃO — o que acaba parecendo mais caro do que se tivesse cor:
// um alerta que muda de cor é interface; um alerta que muda de
// respiração é presença.
//
// Feito em SVG + CSS (não canvas nem rAF): animação composta na GPU,
// não segura a thread principal e não gasta bateria à toa em um app
// que fica aberto o dia inteiro no celular.
// =============================================================
import React, { useMemo } from 'react';

// Os nove estados. Mantido aqui como documentação da criatura —
// não exportado, para não quebrar o fast-refresh do componente.
 
const ESTADOS = [
    'IDLE',       // observando — respiração quase imperceptível
    'LISTENING',  // a pessoa interage: ele se aproxima
    'THINKING',   // movimento interno, contra-rotação
    'ANALYZING',  // concentração: órbitas fecham e aceleram
    'SPEAKING',   // cadência rítmica, como fala
    'ATTENTION',  // um anel parte do centro para fora, insistente
    'SUCCESS',    // expansão que abre e assenta
    'WARNING',    // oscilação assimétrica, desconforto
    'EVOLUTION',  // camadas expandindo em série — passagem de patamar
];

// Cada estado é um ajuste de RITMO e INTENSIDADE sobre a mesma
// criatura. Nada aqui troca a forma: é sempre o mesmo ser, em outro
// estado de espírito.
// `arco` é o traço do anel de leitura (dasharray sobre 220 de
// perímetro). Ele é o que dá diferença mesmo com tudo PARADO: pouco
// traço = observando de longe; muito traço = varrendo tudo. Assim o
// estado se lê num quadro congelado, não só em movimento.
const PERFIL = {
    IDLE:      { resp: '7s',   rot: '46s',  halo: 0.20, nucleo: 1.00, campo: 0.14, particulas: 0.28, arco: '10 210' },
    LISTENING: { resp: '3.4s', rot: '24s',  halo: 0.36, nucleo: 1.08, campo: 0.26, particulas: 0.55, arco: '34 186' },
    THINKING:  { resp: '2.2s', rot: '7s',   halo: 0.30, nucleo: 0.90, campo: 0.36, particulas: 0.75, arco: '18 26' },
    ANALYZING: { resp: '1.5s', rot: '3.4s', halo: 0.48, nucleo: 0.84, campo: 0.52, particulas: 0.95, arco: '8 10' },
    SPEAKING:  { resp: '1.1s', rot: '16s',  halo: 0.54, nucleo: 1.08, campo: 0.30, particulas: 0.60, arco: '60 30' },
    ATTENTION: { resp: '1.8s', rot: '20s',  halo: 0.58, nucleo: 1.06, campo: 0.42, particulas: 0.50, arco: '110 110' },
    SUCCESS:   { resp: '2.6s', rot: '13s',  halo: 0.66, nucleo: 1.18, campo: 0.46, particulas: 0.80, arco: '220 0' },
    WARNING:   { resp: '2.9s', rot: '26s',  halo: 0.34, nucleo: 0.92, campo: 0.30, particulas: 0.40, arco: '4 16' },
    EVOLUTION: { resp: '3.2s', rot: '9s',   halo: 0.74, nucleo: 1.24, campo: 0.60, particulas: 1.00, arco: '200 20' },
};

// Partículas em raios/ângulos irregulares de propósito: distribuição
// perfeita lê como gráfico, irregular lê como coisa viva.
const PARTICULAS = [
    { a: 12, r: 40, t: 1.6 }, { a: 74, r: 33, t: 1.1 }, { a: 133, r: 43, t: 1.9 },
    { a: 196, r: 30, t: 1.0 }, { a: 248, r: 38, t: 1.4 }, { a: 310, r: 35, t: 1.2 },
    { a: 341, r: 45, t: 0.9 },
];

export default function Simbiose({ estado = 'IDLE', tamanho = 120, className = '', style }) {
    const p = PERFIL[estado] || PERFIL.IDLE;

    const pontos = useMemo(
        () => PARTICULAS.map(({ a, r, t }) => {
            const rad = (a * Math.PI) / 180;
            return { x: 50 + Math.cos(rad) * r, y: 50 + Math.sin(rad) * r, t };
        }),
        []
    );

    return (
        <div
            className={`orv-simbiose ${className}`}
            data-estado={estado}
            style={{
                width: tamanho,
                height: tamanho,
                '--resp': p.resp,
                '--rot': p.rot,
                '--halo': p.halo,
                '--nucleo': p.nucleo,
                '--campo': p.campo,
                '--part': p.particulas,
                '--dir': p.dir,
                color: 'var(--text-main)',
                ...style,
            }}
            aria-hidden="true"
        >
            <svg viewBox="0 0 100 100" width="100%" height="100%">
                <defs>
                    {/* Queda rápida: um centro denso com borda curta lê
                        como matéria concentrada. Gradiente longo demais
                        vira algodão — e algodão não parece inteligência. */}
                    <radialGradient id="orv-nucleo-grad">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                        <stop offset="34%" stopColor="currentColor" stopOpacity="0.82" />
                        <stop offset="62%" stopColor="currentColor" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="orv-halo-grad">
                        <stop offset="60%" stopColor="currentColor" stopOpacity="0" />
                        <stop offset="88%" stopColor="currentColor" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Campos externos — a borda do organismo */}
                <g className="orv-campo">
                    <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="0.4" />
                    <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" strokeWidth="0.3" />
                </g>

                {/* Anel que sai do centro — só existe quando ele quer ser notado */}
                <circle className="orv-pulso" cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <circle className="orv-pulso orv-pulso-2" cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.4" />

                {/* Anel de leitura — o traço que varre. É o elemento que
                    faz a criatura parecer um instrumento observando, e
                    não uma bolha bonita. */}
                <circle
                    className="orv-arco" cx="50" cy="50" r="35"
                    fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"
                    strokeDasharray={p.arco}
                />

                {/* Órbita das partículas */}
                <g className="orv-orbita">
                    {pontos.map((pt, i) => (
                        <circle key={i} cx={pt.x} cy={pt.y} r={0.7 * pt.t} fill="currentColor" style={{ opacity: 0.5 * pt.t }} />
                    ))}
                </g>

                {/* Halo e núcleo */}
                <circle className="orv-halo" cx="50" cy="50" r="30" fill="url(#orv-halo-grad)" />
                <circle className="orv-nucleo" cx="50" cy="50" r="17" fill="url(#orv-nucleo-grad)" />
                <circle className="orv-semente" cx="50" cy="50" r="3.2" fill="currentColor" />
            </svg>

            <style>{`
.orv-simbiose { position: relative; display: inline-block; line-height: 0; }
.orv-simbiose svg { overflow: visible; }

/* Respiração do núcleo — a batida base da criatura */
.orv-simbiose .orv-nucleo,
.orv-simbiose .orv-semente {
  transform-box: fill-box; transform-origin: center;
  animation: orv-respirar var(--resp) ease-in-out infinite;
}
.orv-simbiose .orv-semente { animation-delay: .25s; }

.orv-simbiose .orv-halo {
  transform-box: fill-box; transform-origin: center;
  opacity: var(--halo);
  animation: orv-halo calc(var(--resp) * 1.6) ease-in-out infinite;
}

.orv-simbiose .orv-campo { opacity: var(--campo); transform-box: fill-box; transform-origin: center;
  animation: orv-campo calc(var(--resp) * 2.4) ease-in-out infinite; }

.orv-simbiose .orv-orbita {
  opacity: var(--part);
  transform-box: fill-box; transform-origin: center;
  animation: orv-girar var(--rot) linear infinite;
}
.orv-simbiose[data-estado="THINKING"] .orv-orbita,
.orv-simbiose[data-estado="ANALYZING"] .orv-orbita { animation-direction: reverse; }

/* O anel de leitura gira em sentido CONTRÁRIO às partículas. Duas
   camadas indo para lados opostos é o que dá sensação de mecanismo
   com profundidade, em vez de figura girando inteira. */
.orv-simbiose .orv-arco {
  transform-box: fill-box; transform-origin: center;
  opacity: calc(var(--campo) + .28);
  animation: orv-girar calc(var(--rot) * .7) linear infinite reverse;
}
.orv-simbiose[data-estado="THINKING"] .orv-arco,
.orv-simbiose[data-estado="ANALYZING"] .orv-arco { animation-direction: normal; }

@keyframes orv-respirar {
  0%, 100% { transform: scale(calc(var(--nucleo) * .93)); opacity: .85; }
  50%      { transform: scale(calc(var(--nucleo) * 1.07)); opacity: 1; }
}
@keyframes orv-halo {
  0%, 100% { transform: scale(.96); }
  50%      { transform: scale(1.06); }
}
@keyframes orv-campo {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}
@keyframes orv-girar { to { transform: rotate(360deg); } }

/* O anel que parte do centro. Desligado por padrão: um organismo que
   pulsa o tempo todo vira alarme, e alarme constante a pessoa aprende
   a ignorar. */
.orv-simbiose .orv-pulso { opacity: 0; transform-box: fill-box; transform-origin: center; }
.orv-simbiose[data-estado="ATTENTION"] .orv-pulso,
.orv-simbiose[data-estado="SUCCESS"] .orv-pulso,
.orv-simbiose[data-estado="EVOLUTION"] .orv-pulso {
  animation: orv-emitir 2.8s cubic-bezier(.22,.61,.36,1) infinite;
}
.orv-simbiose[data-estado="EVOLUTION"] .orv-pulso-2 { animation-delay: .9s; }
.orv-simbiose[data-estado="SUCCESS"] .orv-pulso-2 { animation-delay: .5s; }

@keyframes orv-emitir {
  0%   { transform: scale(.55); opacity: .55; }
  70%  { opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
}

/* WARNING: oscilação assimétrica. Não é tremor nervoso — é o
   desconforto de quem percebeu algo fora do lugar. */
.orv-simbiose[data-estado="WARNING"] svg {
  animation: orv-inquieto 4.2s ease-in-out infinite;
  transform-origin: center;
}
@keyframes orv-inquieto {
  0%, 100%  { transform: translate(0,0) rotate(0deg); }
  22%       { transform: translate(.6px,-.3px) rotate(.5deg); }
  46%       { transform: translate(-.4px,.5px) rotate(-.7deg); }
  68%       { transform: translate(.3px,.4px) rotate(.3deg); }
}

/* EVOLUTION: o campo inteiro sobe de patamar. */
.orv-simbiose[data-estado="EVOLUTION"] .orv-campo {
  animation: orv-ascender 3.6s cubic-bezier(.33,1,.68,1) infinite;
}
@keyframes orv-ascender {
  0%, 100% { transform: scale(1); opacity: var(--campo); }
  50%      { transform: scale(1.09); opacity: calc(var(--campo) * 1.6); }
}

/* Quem pediu menos movimento no sistema recebe menos movimento.
   A Simbiose continua legível: ela ainda muda de intensidade. */
@media (prefers-reduced-motion: reduce) {
  .orv-simbiose *, .orv-simbiose svg { animation: none !important; }
}
            `}</style>
        </div>
    );
}
