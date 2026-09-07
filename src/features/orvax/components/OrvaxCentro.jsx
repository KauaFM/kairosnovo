// =============================================================
// ORVAX · CENTRO — o que o botão central abre
//
// SUBSTITUI o MentorAssistant (lista de balões + campo de texto).
// A hierarquia inverteu:
//
//   antes:  CHAT ─▶ (e o resto, se você procurar)
//   agora:  SIMBIOSE ─▶ PALAVRA ─▶ ação, e o chat quando pedido
//
// A tela de presença tem TRÊS coisas e nada mais: a Simbiose (o
// protagonista, grande e acima do centro), uma frase, e a barra.
// Tudo que era parágrafo de análise e lista de sugestões saiu — em
// tela de presença, texto acumulado rouba justamente o silêncio que
// faz a entidade parecer viva.
//
// O raciocínio completo não sumiu: vive na conversa, a um toque.
//
// DECISÃO QUE VALE EXPLICAR: aqui NÃO se usa a política de
// interrupção (policy.js). Ela governa quando o ORVAX pode
// interromper alguém que não pediu nada — teto diário, silêncio.
// Quem abriu esta tela VEIO PROCURAR: aplicar as travas aqui faria
// ele responder "não tenho nada" a quem acabou de chamá-lo.
// =============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, ArrowLeft, ArrowUp, PenLine, Mic, Square, X } from 'lucide-react';
import Simbiose from './Simbiose';
import NucleoOrvax from './NucleoOrvax';
import { coletarSinais } from '../engine/signals';
import { avaliarRegras } from '../engine/rules';
import { executarAcao } from '../engine/actions';
import { sendMentorMessage, getMentorHistory } from '../../../services/mentorAgent';
import { useVoz } from '../useVoz';

const ESTADO_POR_TIPO = {
    alerta: 'ATTENTION', recomendacao: 'SPEAKING', analise: 'ANALYZING',
    pergunta: 'LISTENING', celebracao: 'SUCCESS',
};

export default function OrvaxCentro({ irPara }) {
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
                const melhor = (sinais ? avaliarRegras(sinais) : [])[0] || null;
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
                setResultado(r.mensagem);
                setEstado(r.ok ? 'SUCCESS' : 'WARNING');
            }
            setIntervencao(null);
        } finally {
            setExecutando(null);
        }
    }, [irPara]);

    if (modo === 'conversa') {
        return <Conversa aoVoltar={() => setModo('presenca')} />;
    }

    // A palavra: uma frase, escolhida pelo estado real. Nunca um
    // parágrafo — parágrafo é conversa, e conversa tem lugar próprio.
    const palavra = carregando ? 'analisando sua jornada'
        : resultado || (intervencao ? intervencao.titulo : 'Está tudo sob controle.');

    const acaoPrincipal = intervencao?.acoes?.find((a) => a.primaria)
        || intervencao?.acoes?.find((a) => a.tipo !== 'dispensar');

    return (
        <div className="absolute inset-0 flex flex-col items-center overflow-hidden">
            {/* A SIMBIOSE — protagonista. Acima do centro (justify-center
                com um empurrão para cima), grande, sem nada competindo. */}
            <div className="flex-1 w-full flex flex-col items-center justify-center px-8" style={{ paddingBottom: '11rem' }}>
                <Simbiose estado={estado} tamanho={290} />

                {/* A palavra, abaixo dela. Uma linha, respirando. */}
                <p
                    key={palavra}
                    className={[
                        'mt-10 text-center max-w-[290px] animate-fade-in-up',
                        carregando
                            ? 'text-[11px] font-mono uppercase tracking-[0.25em] opacity-30'
                            : 'text-[19px] font-outfit font-bold leading-snug opacity-90',
                    ].join(' ')}
                    style={{ color: 'var(--text-main)' }}
                >
                    {palavra}
                </p>

                {/* Uma ação, quando existe. Não é texto: é o que a pessoa
                    pode FAZER com o que acabou de ler. */}
                {!carregando && acaoPrincipal && (
                    <button
                        onClick={() => agir(acaoPrincipal)}
                        disabled={!!executando}
                        className="mt-7 h-11 px-7 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    >
                        {executando && <Loader2 size={13} className="animate-spin" />}
                        {acaoPrincipal.rotulo}
                    </button>
                )}
            </div>

            <BarraAcoes
                aoEscrever={() => setModo('conversa')}
                aoDitar={(texto) => {
                    sessionStorage.setItem('orvax_pergunta_inicial', texto);
                    setModo('conversa');
                }}
                aoSair={() => irPara?.('nexus')}
            />
        </div>
    );
}

// ─── Barra de ações ───────────────────────────────────────────
// Três gestos, e nada mais. O dock não existe aqui, então a SAÍDA
// precisa estar sempre visível — imersão sem saída é armadilha.
function BarraAcoes({ aoEscrever, aoDitar, aoSair }) {
    const { suportado, ouvindo, preparando, parcial, erro, iniciar, parar, limparErro } = useVoz({ aoFinalizar: aoDitar });

    return (
        <div
            className="absolute left-0 right-0 flex flex-col items-center gap-4 px-6 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.25rem)' }}
        >
            {/* O que ele está ouvindo, enquanto ouve — sem isso a pessoa
                fala no escuro sem saber se está sendo captada. */}
            {(ouvindo || parcial) && (
                <div className="pointer-events-auto max-w-[300px] px-4 py-2.5 rounded-2xl border text-center"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)' }}>
                    <p className="text-[12px] leading-snug" style={{ color: 'var(--text-main)', opacity: parcial ? 0.85 : 0.4 }}>
                        {parcial || 'ouvindo...'}
                    </p>
                </div>
            )}

            {/* O aviso de permissão precisa ser LEGÍVEL: quando o
                microfone está bloqueado, esta mensagem é a única coisa
                que separa a pessoa de achar que o app está quebrado. */}
            {erro && (
                <div className="pointer-events-auto max-w-[300px] px-4 py-3 rounded-2xl border"
                    style={{ borderColor: 'rgba(239,68,68,0.45)', backgroundColor: 'var(--bg-color)' }}>
                    <p className="text-[12px] leading-relaxed mb-2" style={{ color: 'var(--text-main)' }}>{erro}</p>
                    <button onClick={limparErro}
                        className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50"
                        style={{ color: 'var(--text-main)' }}>
                        entendi
                    </button>
                </div>
            )}

            {/* Os três botões SOLTOS, sem cápsula em volta: amontoados
                dentro de uma pílula eles pareciam um único controle
                repartido. Separados, cada um se lê como um gesto. */}
            <div className="pointer-events-auto flex items-center gap-7">
                <BotaoRedondo onClick={aoEscrever} rotulo="Escrever para o ORVAX">
                    <PenLine size={19} strokeWidth={1.7} />
                </BotaoRedondo>

                {/* Falar — o gesto principal, e por isso o maior. Só
                    existe onde o navegador reconhece fala de verdade: um
                    microfone que não funciona faz a pessoa achar que o
                    problema é ela. */}
                {suportado && (
                    <button
                        onClick={ouvindo ? parar : iniciar}
                        disabled={preparando}
                        aria-label={ouvindo ? 'Parar de ouvir' : 'Falar com o ORVAX'}
                        className="w-[70px] h-[70px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl relative bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    >
                        {ouvindo && (
                            <span className="absolute inset-0 rounded-full animate-ping"
                                style={{ backgroundColor: 'var(--text-main)', opacity: 0.25, animationDuration: '1.6s' }} />
                        )}
                        {preparando ? <Loader2 size={22} className="animate-spin relative" />
                            : ouvindo ? <Square size={20} strokeWidth={2.4} className="relative" />
                                : <Mic size={25} strokeWidth={1.7} className="relative" />}
                    </button>
                )}

                <BotaoRedondo onClick={aoSair} rotulo="Sair do ORVAX">
                    <X size={19} strokeWidth={1.7} />
                </BotaoRedondo>
            </div>
        </div>
    );
}

function BotaoRedondo({ onClick, rotulo, children }) {
    return (
        <button
            onClick={onClick}
            aria-label={rotulo}
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center border transition-all active:scale-95"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
        >
            {children}
        </button>
    );
}

// ─── Conversa ─────────────────────────────────────────────────
// Aqui SIM pode parecer conversa: é o lugar dela. A Simbiose segue
// presente no topo, reduzida e reagindo — some do protagonismo, não
// da tela.
function Conversa({ aoVoltar }) {
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

    const { suportado, ouvindo, parcial, iniciar, parar } = useVoz({ aoFinalizar: (t) => enviar(t) });

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
        <div className="absolute inset-0 flex flex-col">
            {/* Topo: voltar + a Simbiose reduzida, ainda reagindo */}
            <div className="shrink-0 flex items-center gap-3 px-4 pt-4 pb-3 border-b"
                style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={aoVoltar} aria-label="Voltar para a Simbiose"
                    className="w-9 h-9 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
                    <ArrowLeft size={18} style={{ color: 'var(--text-main)' }} />
                </button>
                <NucleoOrvax estado={enviando ? 'THINKING' : estado} tamanho={32} />
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] opacity-45"
                    style={{ color: 'var(--text-main)' }}>ORVAX</span>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4"
                style={{ scrollbarWidth: 'none' }}>
                {mensagens.length === 0 && !enviando && (
                    <p className="text-[11px] font-mono uppercase tracking-[0.2em] opacity-25 text-center py-12"
                        style={{ color: 'var(--text-main)' }}>
                        fale com ele
                    </p>
                )}

                {mensagens.map((m, i) => (
                    m.role === 'user' ? (
                        <div key={i} className="self-end max-w-[82%] px-4 py-2.5 rounded-[18px] rounded-br-[6px]"
                            style={{ backgroundColor: 'var(--text-main)' }}>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--bg-color)' }}>
                                {m.content}
                            </p>
                        </div>
                    ) : (
                        <div key={i} className="flex items-start gap-2.5 max-w-[92%]">
                            <div className="shrink-0 mt-0.5">
                                <NucleoOrvax estado="IDLE" tamanho={24} />
                            </div>
                            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap pt-0.5"
                                style={{ color: 'var(--text-main)' }}>
                                {m.content}
                            </p>
                        </div>
                    )
                ))}

                {enviando && (
                    <div className="flex items-center gap-2.5">
                        <NucleoOrvax estado="THINKING" tamanho={24} />
                        <span className="text-[10px] font-mono uppercase tracking-[0.25em] opacity-30"
                            style={{ color: 'var(--text-main)' }}>pensando</span>
                    </div>
                )}
                <div ref={fimRef} />
            </div>

            {/* Campo */}
            <div className="shrink-0 px-4 pt-2"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
                {ouvindo && (
                    <p className="text-[11px] text-center mb-2 opacity-60" style={{ color: 'var(--text-main)' }}>
                        {parcial || 'ouvindo...'}
                    </p>
                )}
                <div className="flex items-end gap-2 rounded-[24px] border px-4 py-2"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    <textarea
                        rows={1}
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                        placeholder="escreva..."
                        className="flex-1 resize-none bg-transparent text-[13.5px] leading-snug focus:outline-none py-2 max-h-24"
                        style={{ color: 'var(--text-main)' }}
                    />
                    {suportado && !texto.trim() && (
                        <button onClick={ouvindo ? parar : iniciar}
                            aria-label={ouvindo ? 'Parar de ouvir' : 'Falar'}
                            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
                            style={{ color: 'var(--text-main)', opacity: ouvindo ? 1 : 0.5 }}>
                            {ouvindo ? <Square size={15} strokeWidth={2.4} /> : <Mic size={17} strokeWidth={1.8} />}
                        </button>
                    )}
                    <button
                        onClick={() => enviar()}
                        disabled={enviando || !texto.trim()}
                        aria-label="Enviar"
                        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-20 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    >
                        {enviando ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={16} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
