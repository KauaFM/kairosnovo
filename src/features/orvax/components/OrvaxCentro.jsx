// =============================================================
// ORVAX · CENTRO — o que o botão central abre agora
//
// SUBSTITUI o MentorAssistant (lista de balões + campo de texto).
// Não é "chat melhorado": a hierarquia inverteu.
//
//   antes:  CHAT ─▶ (e o resto, se você procurar)
//   agora:  SIMBIOSE ─▶ CONTEXTO ─▶ AÇÃO ─▶ conversa, se precisar
//
// DECISÃO QUE VALE EXPLICAR: aqui NÃO se usa a política de
// interrupção (policy.js). Ela existe para governar quando o ORVAX
// pode interromper alguém que não pediu nada — teto diário,
// intervalo, silêncio. Mas quem toca no botão central VEIO
// PROCURAR. Aplicar as travas de silêncio aqui faria o ORVAX
// responder "não tenho nada" para quem acabou de chamá-lo, que é o
// oposto de presença. Política governa interromper; não governa
// atender.
// =============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ArrowLeft, ArrowUp, PenLine, Mic, Square, X } from 'lucide-react';
import Simbiose from './Simbiose';
import NucleoOrvax from './NucleoOrvax';
import { coletarSinais } from '../engine/signals';
import { avaliarRegras } from '../engine/rules';
import { executarAcao } from '../engine/actions';
import { sendMentorMessage, getMentorHistory } from '../../../services/mentorAgent';
import { ScrollContainer } from '../../../components/BaseLayout';
import { useVoz } from '../useVoz';

const ESTADO_POR_TIPO = {
    alerta: 'ATTENTION', recomendacao: 'SPEAKING', analise: 'ANALYZING',
    pergunta: 'LISTENING', celebracao: 'SUCCESS',
};

// Ações rápidas SEMPRE disponíveis. As contextuais vêm da intervenção.
const RAPIDAS = [
    { rotulo: 'O que eu faço agora?', pergunta: 'Olhando meus dados de hoje, qual é a única coisa que eu deveria fazer agora? Responda curto e específico.' },
    { rotulo: 'Analisar meu progresso', pergunta: 'Analise meu progresso recente com base nos meus dados reais. Seja específico e cite números.' },
    { rotulo: 'Estou procrastinando', pergunta: 'Estou procrastinando e não consigo começar. Me ajude a destravar com um passo pequeno.' },
];

export default function OrvaxCentro({ theme, toggleTheme, irPara }) {
    const [estado, setEstado] = useState('IDLE');
    const [carregando, setCarregando] = useState(true);
    const [intervencao, setIntervencao] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [executando, setExecutando] = useState(null);
    const [modo, setModo] = useState('presenca'); // 'presenca' | 'conversa'
    const sinaisRef = useRef(null);

    // ── Despertar: ele analisa ANTES de a pessoa pedir ──────────
    useEffect(() => {
        let vivo = true;
        (async () => {
            setEstado('LISTENING');
            await new Promise((r) => setTimeout(r, 450)); // o despertar tem tempo
            if (!vivo) return;
            setEstado('THINKING');
            try {
                const sinais = await coletarSinais();
                if (!vivo) return;
                sinaisRef.current = sinais;
                setEstado('ANALYZING');
                await new Promise((r) => setTimeout(r, 550));
                if (!vivo) return;
                const candidatas = sinais ? avaliarRegras(sinais) : [];
                const melhor = candidatas[0] || null;
                setIntervencao(melhor);
                setEstado(melhor ? (ESTADO_POR_TIPO[melhor.tipo] || 'SPEAKING') : 'IDLE');
            } catch {
                setEstado('IDLE');
            } finally {
                if (vivo) setCarregando(false);
            }
        })();
        return () => { vivo = false; };
    }, []);

    const agir = useCallback(async (acao) => {
        setExecutando(acao.tipo);
        setEstado('THINKING');
        try {
            const r = await executarAcao(acao, sinaisRef.current, { irPara });
            if (r?.mensagem) {
                setResultado(r);
                setEstado(r.ok ? 'SUCCESS' : 'WARNING');
            } else if (acao.tipo === 'dispensar') {
                setIntervencao(null);
                setEstado('IDLE');
            }
        } finally {
            setExecutando(null);
        }
    }, [irPara]);

    if (modo === 'conversa') {
        return <Conversa aoVoltar={() => setModo('presenca')} theme={theme} toggleTheme={toggleTheme} />;
    }

    return (
        <>
            {/* Sem OrvaxHeader: aqui não há marca, tema nem idioma. O
                dock e os atalhos também somem (ver App.jsx). A tela
                inteira é o encontro com o mentor, e a única saída é o
                botão da barra de baixo. */}
            <ScrollContainer>
                <div className="min-h-full flex flex-col items-center px-6 pt-10 pb-40 text-center">

                    {/* ─── A SIMBIOSE ─── o primeiro e maior elemento */}
                    <div className="mt-6 mb-7">
                        <Simbiose estado={estado} tamanho={210} />
                    </div>

                    <span className="text-[10px] font-mono font-bold uppercase tracking-[0.42em] opacity-35 mb-6"
                        style={{ color: 'var(--text-main)' }}>
                        ORVAX
                    </span>

                    {carregando ? (
                        <p className="text-[12px] font-mono uppercase tracking-wider opacity-30"
                            style={{ color: 'var(--text-main)' }}>
                            analisando sua jornada
                        </p>
                    ) : resultado ? (
                        <ResultadoBloco resultado={resultado} aoContinuar={() => { setResultado(null); setIntervencao(null); setEstado('IDLE'); }} />
                    ) : intervencao ? (
                        <>
                            <h1 className="text-[21px] font-bold leading-tight mb-3 max-w-[300px]"
                                style={{ color: 'var(--text-main)' }}>
                                {intervencao.titulo}
                            </h1>
                            <p className="text-[13px] leading-relaxed opacity-65 mb-7 max-w-[310px]"
                                style={{ color: 'var(--text-main)' }}>
                                {intervencao.corpo}
                            </p>
                            <div className="w-full max-w-[300px] flex flex-col gap-2.5 mb-9">
                                {intervencao.acoes.map((a) => (
                                    <BotaoAcao key={a.tipo + a.rotulo} acao={a} executando={executando} aoClicar={agir} />
                                ))}
                            </div>
                        </>
                    ) : (
                        // Nada relevante — e ele diz isso sem inventar acontecimento.
                        <>
                            <h1 className="text-[21px] font-bold leading-tight mb-3"
                                style={{ color: 'var(--text-main)' }}>
                                Está tudo sob controle.
                            </h1>
                            <p className="text-[13px] leading-relaxed opacity-60 mb-9 max-w-[280px]"
                                style={{ color: 'var(--text-main)' }}>
                                Olhei seus dados agora e não encontrei nada que mereça sua atenção. Continue sua jornada.
                            </p>
                        </>
                    )}

                    {/* ─── Ações rápidas: usar a inteligência sem digitar ─── */}
                    {!carregando && !resultado && (
                        <div className="w-full max-w-[320px]">
                            <span className="block text-[8px] font-mono font-bold uppercase tracking-[0.3em] opacity-25 mb-3"
                                style={{ color: 'var(--text-main)' }}>
                                ou peça
                            </span>
                            <div className="flex flex-col gap-2">
                                {RAPIDAS.map((r) => (
                                    <button
                                        key={r.rotulo}
                                        onClick={() => { sessionStorage.setItem('orvax_pergunta_inicial', r.pergunta); setModo('conversa'); }}
                                        className="w-full h-10 rounded-xl border text-[11px] font-mono uppercase tracking-wider transition-all active:scale-[0.98]"
                                        style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)', opacity: 0.75 }}
                                    >
                                        {r.rotulo}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollContainer>

            {/* ─── BARRA ─── escrever · falar · sair ───────────────
                Três gestos, e nada mais. O dock não existe aqui, então
                esta barra é a única navegação — e a saída precisa estar
                sempre visível, senão a imersão vira armadilha. */}
            <BarraAcoes
                aoEscrever={() => setModo('conversa')}
                aoDitar={(texto) => {
                    sessionStorage.setItem('orvax_pergunta_inicial', texto);
                    setModo('conversa');
                }}
                aoSair={() => irPara?.('nexus')}
            />
        </>
    );
}

// ─── Barra de ações ───────────────────────────────────────────
function BarraAcoes({ aoEscrever, aoDitar, aoSair }) {
    const { suportado, ouvindo, parcial, erro, iniciar, parar, limparErro } = useVoz({ aoFinalizar: aoDitar });

    return (
        <div
            className="absolute left-0 right-0 flex flex-col items-center gap-3 px-6 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.75rem)' }}
        >
            {/* O que ele está ouvindo, enquanto ouve. Sem isso a pessoa
                fala no escuro e não sabe se está sendo captada. */}
            {(ouvindo || parcial) && (
                <div className="pointer-events-auto max-w-[300px] px-4 py-2 rounded-2xl border text-center"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                    <p className="text-[12px] leading-snug" style={{ color: 'var(--text-main)', opacity: parcial ? 0.85 : 0.4 }}>
                        {parcial || 'ouvindo...'}
                    </p>
                </div>
            )}

            {erro && (
                <button
                    onClick={limparErro}
                    className="pointer-events-auto px-4 py-2 rounded-2xl border text-[11px]"
                    style={{ borderColor: 'rgba(239,68,68,0.4)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                >
                    {erro}
                </button>
            )}

            {/* Fundo sólido, não translúcido: a barra flutua sobre
                conteúdo que rola, e com --glass-bg os botões de trás
                vazavam através dela. */}
            <div
                className="pointer-events-auto flex items-center gap-3 rounded-full border px-3 py-2.5 shadow-2xl"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
            >
                {/* Escrever */}
                <button
                    onClick={aoEscrever}
                    aria-label="Escrever para o ORVAX"
                    className="w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                    <PenLine size={18} strokeWidth={1.8} />
                </button>

                {/* Falar — o gesto principal, por isso é o maior.
                    Só existe quando o navegador realmente reconhece fala:
                    um microfone que não funciona faz a pessoa achar que o
                    problema é ela. */}
                {suportado && (
                    <button
                        onClick={ouvindo ? parar : iniciar}
                        aria-label={ouvindo ? 'Parar de ouvir' : 'Falar com o ORVAX'}
                        className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 relative"
                    >
                        {ouvindo && (
                            <span className="absolute inset-0 rounded-full animate-ping"
                                style={{ backgroundColor: 'var(--text-main)', opacity: 0.25, animationDuration: '1.6s' }} />
                        )}
                        {ouvindo ? <Square size={18} strokeWidth={2.4} className="relative" />
                            : <Mic size={22} strokeWidth={1.8} className="relative" />}
                    </button>
                )}

                {/* Sair */}
                <button
                    onClick={aoSair}
                    aria-label="Sair do ORVAX"
                    className="w-12 h-12 rounded-full flex items-center justify-center border transition-all active:scale-95"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                    <X size={18} strokeWidth={1.8} />
                </button>
            </div>
        </div>
    );
}

function BotaoAcao({ acao, executando, aoClicar }) {
    return (
        <button
            onClick={() => aoClicar(acao)}
            disabled={!!executando}
            className={[
                'w-full h-11 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider',
                'flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40',
                acao.primaria ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'border',
            ].join(' ')}
            style={acao.primaria ? undefined : { borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
            {executando === acao.tipo && <Loader2 size={13} className="animate-spin" />}
            {acao.rotulo}
        </button>
    );
}

function ResultadoBloco({ resultado, aoContinuar }) {
    return (
        <>
            <p className="text-[15px] leading-relaxed mb-7 max-w-[300px]" style={{ color: 'var(--text-main)' }}>
                {resultado.mensagem}
            </p>
            <button
                onClick={aoContinuar}
                className="px-6 h-10 rounded-xl border text-[11px] font-mono font-bold uppercase tracking-wider mb-9"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
                Continuar
            </button>
        </>
    );
}

// ─── Camada de conversa ───────────────────────────────────────
// Existe, mas é secundária. E não imita mensageiro: sem balão, sem
// avatar repetido, sem separador. A fala do ORVAX tem peso
// tipográfico; a da pessoa fica menor e recuada — quem lê entende de
// quem é cada voz pela hierarquia, não por uma bolha colorida.
function Conversa({ aoVoltar, theme, toggleTheme }) {
    const [mensagens, setMensagens] = useState([]);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [estado, setEstado] = useState('LISTENING');
    const fimRef = useRef(null);

    const enviar = useCallback(async (conteudo) => {
        const limpo = (conteudo ?? texto).trim();
        if (!limpo || enviando) return;
        setTexto('');
        setMensagens((m) => [...m, { role: 'user', content: limpo }]);
        setEnviando(true);
        setEstado('THINKING');
        try {
            const { reply } = await sendMentorMessage(limpo, mensagens.slice(-10));
            setEstado('SPEAKING');
            setMensagens((m) => [...m, { role: 'assistant', content: reply }]);
        } catch (e) {
            setEstado('WARNING');
            setMensagens((m) => [...m, { role: 'assistant', content: e?.message || 'Não consegui responder agora.' }]);
        } finally {
            setEnviando(false);
        }
    }, [texto, enviando, mensagens]);

    // Histórico + pergunta que veio de uma ação rápida
    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const hist = await getMentorHistory(20);
                if (vivo && hist?.length) setMensagens(hist);
            } catch { /* sem histórico, começa limpo */ }
            const inicial = sessionStorage.getItem('orvax_pergunta_inicial');
            if (inicial && vivo) {
                sessionStorage.removeItem('orvax_pergunta_inicial');
                enviar(inicial);
            }
        })();
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensagens, enviando]);

    return (
        <>
            {/* Imersivo também aqui: sem cabeçalho de marca/tema. A seta
                de voltar abaixo já é a saída desta camada. */}

            {/* A Simbiose CONTINUA presente — reduzida, no topo, reagindo.
                Precisa ser absoluta com fundo próprio: o ScrollContainer é
                `absolute inset-0` e passaria por baixo, fazendo o texto da
                conversa subir por cima do cabeçalho. */}
            <div
                className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-5 pt-3 pb-3 border-b backdrop-blur-sm"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}
            >
                <button onClick={aoVoltar} aria-label="Voltar à presença"
                    className="w-8 h-8 rounded-full flex items-center justify-center opacity-45 hover:opacity-100 transition-opacity">
                    <ArrowLeft size={16} style={{ color: 'var(--text-main)' }} />
                </button>
                <NucleoOrvax estado={enviando ? 'THINKING' : estado} tamanho={34} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] opacity-40"
                    style={{ color: 'var(--text-main)' }}>ORVAX</span>
            </div>

            <ScrollContainer>
                <div className="px-5 pt-8 pb-32 flex flex-col gap-6">
                    {mensagens.length === 0 && !enviando && (
                        <p className="text-[12px] font-mono uppercase tracking-wider opacity-25 text-center py-10"
                            style={{ color: 'var(--text-main)' }}>
                            fale com ele
                        </p>
                    )}
                    {mensagens.map((m, i) => (
                        m.role === 'user' ? (
                            <p key={i} className="text-[12.5px] leading-relaxed self-end text-right max-w-[80%] opacity-45"
                                style={{ color: 'var(--text-main)' }}>
                                {m.content}
                            </p>
                        ) : (
                            <p key={i} className="text-[14.5px] leading-relaxed whitespace-pre-wrap max-w-[92%]"
                                style={{ color: 'var(--text-main)' }}>
                                {m.content}
                            </p>
                        )
                    ))}
                    {enviando && (
                        <span className="text-[10px] font-mono uppercase tracking-[0.25em] opacity-30"
                            style={{ color: 'var(--text-main)' }}>pensando</span>
                    )}
                    <div ref={fimRef} />
                </div>
            </ScrollContainer>

            {/* Campo: uma linha, não uma caixa de mensageiro */}
            <div className="absolute left-0 right-0 px-5"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 5.5rem)' }}>
                <div className="flex items-end gap-2 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
                    <textarea
                        rows={1}
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                        placeholder="escreva..."
                        className="flex-1 resize-none bg-transparent text-[13.5px] leading-snug focus:outline-none py-1"
                        style={{ color: 'var(--text-main)' }}
                    />
                    <button
                        onClick={() => enviar()}
                        disabled={enviando || !texto.trim()}
                        aria-label="Enviar"
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    >
                        {enviando ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </>
    );
}
