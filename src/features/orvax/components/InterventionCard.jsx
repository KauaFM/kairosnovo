// =============================================================
// ORVAX · Painel do atalho
//
// Faz DUAS coisas, porque este atalho absorveu o botão de captura
// que existia ao lado dele:
//
//   1. Entrega a intervenção — o que o ORVAX observou, com números
//      reais e botões que EXECUTAM. A pessoa nunca precisa digitar
//      para agir.
//   2. Recebe o registro por escrito — "gastei 40 no almoço",
//      "treinei 1h". O mentor entende e grava no lugar certo.
//
// Quando não há intervenção, abre direto na captura: quem quer
// registrar algo não deveria depender de o ORVAX ter uma análise
// pronta naquele momento.
//
// Depois de agir, o painel não some na hora: mostra o que
// aconteceu. Ação sem retorno visível é indistinguível de nada ter
// acontecido.
// =============================================================
import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Check, ArrowUp } from 'lucide-react';
import NucleoOrvax from './NucleoOrvax';
import { sendMentorMessage } from '../../../services/mentorAgent';
import { appEvents } from '../../../lib/events';

const RUBRICA = {
    alerta: 'ORVAX detectou',
    recomendacao: 'ORVAX recomenda',
    analise: 'ORVAX analisou',
    pergunta: 'ORVAX pergunta',
    celebracao: 'ORVAX reconhece',
};

export default function InterventionCard({ intervencao, estado = 'SPEAKING', aoAgir, aoFechar }) {
    const [executando, setExecutando] = useState(null);
    const [resultado, setResultado] = useState(null);

    // ── captura por escrito ──────────────────────────────────
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [retorno, setRetorno] = useState(null); // { ok, texto }
    const inputRef = useRef(null);

    // Sem intervenção o painel É a captura, então o cursor já vai
    // para lá — um campo que exige um toque a mais para começar a
    // escrever é um campo que atrasa o registro.
    useEffect(() => {
        if (!intervencao) {
            const id = setTimeout(() => inputRef.current?.focus(), 150);
            return () => clearTimeout(id);
        }
    }, [intervencao]);

    const estadoAtual = executando || enviando ? 'THINKING'
        : resultado || retorno?.ok ? 'SUCCESS'
            : retorno && !retorno.ok ? 'WARNING'
                : estado;

    const clicar = async (acao) => {
        if (executando) return;
        setExecutando(acao.tipo);
        try {
            const r = await aoAgir(acao);
            if (r?.mensagem) setResultado(r);
        } finally {
            setExecutando(null);
        }
    };

    const registrar = async () => {
        const limpo = texto.trim();
        if (!limpo || enviando) return;
        setEnviando(true);
        setRetorno(null);
        try {
            const { reply, mode } = await sendMentorMessage(limpo, []);
            // A Edge Function responde 200 mesmo quando a AÇÃO lá dentro
            // falhou — ela devolve só o texto do mentor, sem resultado
            // estruturado. Sem esta checagem, um "houve um erro ao
            // registrar" apareceria como sucesso.
            const pareceFalha = /erro ao executar|não consegui|nao consegui|houve um erro|falhou|não foi possível|nao foi possivel/i.test(reply || '');
            if (mode === 'agent' && !pareceFalha) {
                // No caminho servidor nenhum evento do cliente dispara, e
                // as telas abertas ficariam desatualizadas.
                appEvents.emit({ type: 'TRANSACTION_CHANGED' });
                appEvents.emit({ type: 'TASK_CHANGED' });
                appEvents.emit({ type: 'HABIT_CHANGED' });
            }
            setRetorno({ ok: !pareceFalha, texto: reply });
            if (!pareceFalha) setTexto(''); // falhou: preserva o que foi escrito
        } catch (err) {
            setRetorno({ ok: false, texto: err?.message || 'Não consegui registrar agora.' });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[88] bg-black/40 backdrop-blur-[2px]" onClick={aoFechar} />
            <div
                className="fixed left-0 right-0 z-[90] mx-auto w-full max-w-[428px] px-4"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
                <div
                    className="rounded-2xl border shadow-2xl overflow-hidden"
                    style={{
                        backgroundColor: 'var(--bg-color)',
                        borderColor: 'var(--border-color)',
                        animation: 'compass-slide-up 0.26s ease-out',
                    }}
                >
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                        <div className="flex items-center gap-2.5">
                            <NucleoOrvax estado={estadoAtual} tamanho={30} />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-50"
                                style={{ color: 'var(--text-main)' }}>
                                {intervencao ? (RUBRICA[intervencao.tipo] || 'ORVAX') : 'ORVAX'}
                            </span>
                        </div>
                        <button
                            onClick={aoFechar}
                            aria-label="Fechar"
                            className="w-7 h-7 rounded-full flex items-center justify-center opacity-35 hover:opacity-100 transition-opacity"
                        >
                            <X size={15} style={{ color: 'var(--text-main)' }} />
                        </button>
                    </div>

                    <div className="px-4 pb-4">
                        {/* ── 1. A intervenção ────────────────────── */}
                        {intervencao && (resultado ? (
                            <div className="flex items-start gap-2.5 py-1 mb-1">
                                <Check size={15} className="mt-[3px] shrink-0" style={{ color: 'var(--text-main)' }} />
                                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                    {resultado.mensagem}
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-[15px] font-bold leading-snug mb-1.5" style={{ color: 'var(--text-main)' }}>
                                    {intervencao.titulo}
                                </h3>
                                <p className="text-[12.5px] leading-relaxed opacity-70 mb-4" style={{ color: 'var(--text-main)' }}>
                                    {intervencao.corpo}
                                </p>
                                <div className="flex flex-col gap-2">
                                    {intervencao.acoes.map((acao) => (
                                        <button
                                            key={acao.tipo + acao.rotulo}
                                            onClick={() => clicar(acao)}
                                            disabled={!!executando}
                                            className={[
                                                'w-full h-10 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider',
                                                'flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40',
                                                acao.primaria
                                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                                    : 'border',
                                            ].join(' ')}
                                            style={acao.primaria ? undefined : { borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                        >
                                            {executando === acao.tipo && <Loader2 size={13} className="animate-spin" />}
                                            {acao.rotulo}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ))}

                        {/* Separador só existe quando há as duas coisas */}
                        {intervencao && (
                            <div className="h-px my-4" style={{ backgroundColor: 'var(--border-color)' }} />
                        )}

                        {/* ── 2. A captura por escrito ────────────── */}
                        {retorno ? (
                            <div
                                className="flex items-start gap-2 rounded-xl px-3 py-2.5 border"
                                style={{
                                    borderColor: retorno.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
                                    backgroundColor: retorno.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                                }}
                            >
                                {retorno.ok
                                    ? <Check size={13} className="mt-[2px] shrink-0 text-[#22c55e]" />
                                    : <X size={13} className="mt-[2px] shrink-0 text-[#ef4444]" />}
                                <p className="text-[11px] leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap"
                                    style={{ color: 'var(--text-main)' }}>
                                    {retorno.texto}
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-end gap-2 border-b pb-1.5" style={{ borderColor: 'var(--border-color)' }}>
                                    <textarea
                                        ref={inputRef}
                                        rows={1}
                                        value={texto}
                                        onChange={(e) => setTexto(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); registrar(); }
                                        }}
                                        placeholder="gastei 40 no almoço..."
                                        disabled={enviando}
                                        className="flex-1 resize-none bg-transparent text-[13px] leading-snug focus:outline-none py-1 disabled:opacity-50"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                    <button
                                        onClick={registrar}
                                        disabled={enviando || !texto.trim()}
                                        aria-label="Registrar"
                                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                    >
                                        {enviando ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
                                    </button>
                                </div>
                                <p className="text-[9px] font-mono uppercase tracking-wider opacity-25 mt-2"
                                    style={{ color: 'var(--text-main)' }}>
                                    escreva do seu jeito · ele registra no lugar certo
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
