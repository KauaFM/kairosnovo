// =============================================================
// ORVAX · HOME
//
// A pergunta que este Home responde é "o que importa para esta
// pessoa AGORA?" — não "quais dados cabem na tela".
//
// O que saiu, e por quê:
//
//  · A entidade Symbiote. Ela virou a Simbiose do Centro do ORVAX,
//    onde tem função. Aqui ocupava a maior área da tela e não
//    dizia nada — decoração cara em espaço nobre.
//  · A frase motivacional rotativa. Genérica por construção; é o
//    tipo de texto que a pessoa para de ler na terceira vez.
//  · O card de Diretrizes. Texto fixo que não muda com nada.
//  · A faixa de tarefas legada (estava com `hidden`, código morto).
//
// O que ficou e por quê:
//
//  · PendingTodayPanel — a melhor parte do Home antigo: lista
//    unificada de hábitos e tarefas, em tempo real, com marcar
//    feito e timer de foco. É onde a pessoa EXECUTA.
//  · Sequência e semana, mas como linha densa, não como card
//    grande: é referência, não protagonista.
//
// O que entrou:
//
//  · AGORA — um único foco, vindo do MESMO motor de sinais que
//    alimenta as intervenções do ORVAX (features/orvax/engine).
//    Um cérebro só, duas superfícies: o que o mentor te diria ao
//    ser aberto é o que o Home destaca sozinho. Sem isso, seriam
//    dois sistemas dando conselhos diferentes na mesma tela.
// =============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Newspaper, ChevronRight, Loader2 } from 'lucide-react';
import { getProfile, getWeekActivity } from '../services/db';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import PendingTodayPanel from './lifeOs/PendingTodayPanel';
import { useLang } from '../i18n/LanguageContext';
import { coletarSinais } from '../features/orvax/engine/signals';
import { avaliarRegras } from '../features/orvax/engine/rules';
import { executarAcao } from '../features/orvax/engine/actions';
import { appEvents } from '../lib/events';

/** Saudação real pela hora — não "Olá!", que serve para qualquer momento. */
function saudacao(hora) {
    if (hora < 5) return 'Boa madrugada';
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
}

const Nexus = ({ theme, toggleTheme, onOpenMentor, onOpenBlog }) => {
    const { t } = useLang();

    // Frase rotativa da abertura. Eu tinha removido por achar genérica —
    // era decisão minha sobre identidade do produto, que não me cabia.
    // O dono quis manter o bloco de abertura como está.
    const [quoteIndex, setQuoteIndex] = useState(0);
    const quotes = t('nexus.quotes');
    useEffect(() => {
        const i = setInterval(() => setQuoteIndex((p) => (p + 1) % quotes.length), 6000);
        return () => clearInterval(i);
         
    }, [quotes.length]);

    const [sinais, setSinais] = useState(null);
    const [foco, setFoco] = useState(null);        // a intervenção de maior peso
    const [carregando, setCarregando] = useState(true);
    const [executando, setExecutando] = useState(null);
    const [feito, setFeito] = useState(null);
    const [stats, setStats] = useState({ streak: null, semana: [false, false, false, false, false, false, false] });

    const unsubscribeRef = useRef([]);
    const { subscribeToOrvaxAgenda } = useRealtimeSync();

    const carregar = useCallback(async () => {
        try {
            const s = await coletarSinais();
            setSinais(s);
            setFoco(s ? (avaliarRegras(s)[0] || null) : null);
            const [perfil, semana] = await Promise.all([
                getProfile().catch(() => null),
                getWeekActivity().catch(() => []),
            ]);
            setStats({
                streak: perfil?.streak_days ?? 0,
                semana: semana?.length === 7 ? semana : [false, false, false, false, false, false, false],
            });
        } catch (e) {
            console.warn('[nexus] carga falhou:', e?.message);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregar();
        // Marcar um hábito no painel abaixo muda o quadro: o AGORA
        // precisa acompanhar, senão fica dizendo para fazer algo que a
        // pessoa acabou de fazer.
        const desinscrever = appEvents.subscribe(() => carregar());
        unsubscribeRef.current.push(subscribeToOrvaxAgenda(() => carregar()));
        const refs = unsubscribeRef.current;
        return () => {
            desinscrever();
            refs.forEach((u) => { try { u?.(); } catch { /* já removido */ } });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const agir = async (acao) => {
        setExecutando(acao.tipo);
        try {
            const r = await executarAcao(acao, sinais, {});
            if (r?.mensagem) setFeito(r.mensagem);
            if (acao.tipo === 'dispensar') setFoco(null);
            await carregar();
        } finally {
            setExecutando(null);
        }
    };

    const hora = new Date().getHours();
    const tarefas = sinais?.tarefas;
    const habitosFeitos = sinais?.habitos?.filter((h) => h.feitoHoje).length ?? 0;
    const habitosTotal = sinais?.habitos?.length ?? 0;
    const totalDoDia = (habitosTotal || 0) + (tarefas?.total || 0);
    const feitosDoDia = habitosFeitos + (tarefas?.concluidas || 0);
    const pct = totalDoDia > 0 ? Math.round((feitosDoDia / totalDoDia) * 100) : null;

    return (
        <ScrollContainer>
            {/* Cabeçalho COMPLETO (sem `minimal`) e DENTRO do container,
                como no original: ele não é absoluto — é um bloco em fluxo
                que reserva o próprio espaço com mb-14. Tirá-lo daqui fez
                a marca ORVAX sobrepor o texto de abertura. */}
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />
            <div className="relative pb-10">
                {/* Trama pontilhada — a única decoração que sobrou */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(var(--text-main) 0.5px, transparent 0.5px)',
                        backgroundSize: '24px 24px',
                        opacity: 0.02,
                    }}
                />

                {/* ─── ABERTURA ─── intocada, como o dono pediu ──── */}
                <div className="mb-8 flex flex-col items-center justify-center relative w-full mt-4 z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }}></div>
                        <span className="text-[8px] font-mono tracking-[0.35em] uppercase font-bold text-[#22c55e] opacity-60">
                            {t('nexus.monitoringActive')}
                        </span>
                    </div>

                    <h2 className="text-[18px] font-outfit font-black tracking-tight text-center max-w-[85%] leading-relaxed mb-4 opacity-85">
                        {t('nexus.watching1')} <br />{t('nexus.watching2')}
                    </h2>

                    {/* A frase ganhou corpo. Antes era 8px com 30% de
                        opacidade — do tamanho de um rodapé, então ninguém
                        lia. Se ela existe para motivar, precisa ser vista;
                        se não merece ser vista, não deveria existir. */}
                    <div className="w-full px-8 mt-3 mb-1 flex items-center justify-center" style={{ minHeight: 52 }}>
                        <p
                            key={quoteIndex}
                            className="text-[15px] font-outfit font-bold text-center leading-snug animate-fade-in-up"
                            style={{ color: 'var(--text-main)', opacity: 0.75 }}
                        >
                            {quotes[quoteIndex]}
                        </p>
                    </div>

                    {/* Marcador de qual frase está no ar — dá ritmo e mostra
                        que há mais, sem gastar uma palavra a mais. */}
                    <div className="flex items-center gap-1.5 mb-7">
                        {quotes.map((_, i) => (
                            <span
                                key={i}
                                className="rounded-full transition-all duration-500"
                                style={{
                                    width: i === quoteIndex ? 14 : 4,
                                    height: 3,
                                    backgroundColor: 'var(--text-main)',
                                    opacity: i === quoteIndex ? 0.5 : 0.15,
                                }}
                            />
                        ))}
                    </div>

                    {/* Timeline: era uma pílula apagada de 9px que sumia na
                        tela. Virou um bloco de largura inteira, com a
                        hierarquia de quem quer ser tocado. */}
                    <button
                        onClick={() => onOpenBlog?.()}
                        className="w-[calc(100%-2.5rem)] rounded-[20px] border px-5 py-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                    >
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: 'var(--text-main)' }}>
                            <Newspaper size={17} style={{ color: 'var(--bg-color)' }} />
                        </div>
                        <div className="flex-1 text-left">
                            <span className="block text-[13px] font-outfit font-bold leading-tight"
                                style={{ color: 'var(--text-main)' }}>
                                {t('nexus.newsTimeline')}
                            </span>
                            <span className="block text-[10px] font-mono uppercase tracking-wider opacity-35 mt-0.5"
                                style={{ color: 'var(--text-main)' }}>
                                {t('nexus.newsSub')}
                            </span>
                        </div>
                        <ChevronRight size={18} className="opacity-30 shrink-0" style={{ color: 'var(--text-main)' }} />
                    </button>
                </div>

                {/* A saudação some quando não há dado a acrescentar: uma
                    linha que só diz "Bom dia" é enfeite ocupando altura. */}
                {pct !== null && (
                    <div className="px-6 mb-3 relative z-10">
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] opacity-35" style={{ color: 'var(--text-main)' }}>
                            {saudacao(hora)} · {feitosDoDia}/{totalDoDia} de hoje
                        </span>
                    </div>
                )}

                {/* ─── AGORA ─── o único destaque da tela ────────── */}
                <ScrollReveal delay={0.05} className="px-5 mb-7 relative z-10">
                    <div
                        className="rounded-[24px] border p-5"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                    >
                        <span className="block text-[8px] font-mono font-bold uppercase tracking-[0.3em] opacity-30 mb-3"
                            style={{ color: 'var(--text-main)' }}>
                            Agora
                        </span>

                        {carregando ? (
                            <div className="flex items-center gap-2 py-1">
                                <Loader2 size={14} className="animate-spin opacity-30" />
                                <span className="text-[12px] opacity-35" style={{ color: 'var(--text-main)' }}>lendo seus dados</span>
                            </div>
                        ) : feito ? (
                            <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-main)' }}>{feito}</p>
                        ) : foco ? (
                            // Só o SINAL e a AÇÃO. O parágrafo com o
                            // raciocínio saiu daqui e vive no Centro: no
                            // Home ele empurrava tudo o mais para baixo e
                            // exigia leitura antes de qualquer decisão.
                            <>
                                <h2 className="text-[17px] font-bold leading-snug mb-4" style={{ color: 'var(--text-main)' }}>
                                    {foco.titulo}
                                </h2>
                                {(() => {
                                    const a = foco.acoes.find((x) => x.primaria) || foco.acoes.find((x) => x.tipo !== 'dispensar');
                                    return a ? (
                                        <button
                                            onClick={() => agir(a)}
                                            disabled={!!executando}
                                            className="w-full h-11 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                        >
                                            {executando === a.tipo && <Loader2 size={13} className="animate-spin" />}
                                            {a.rotulo}
                                        </button>
                                    ) : null;
                                })()}
                                <button
                                    onClick={() => onOpenMentor?.()}
                                    className="w-full mt-2 h-9 text-[10px] font-mono uppercase tracking-[0.2em] opacity-40 transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    Por quê?
                                </button>
                            </>
                        ) : (
                            // Nada a apontar — e ele diz isso em uma linha,
                            // sem inventar urgência para parecer útil.
                            <>
                                <h2 className="text-[17px] font-bold leading-snug mb-4" style={{ color: 'var(--text-main)' }}>
                                    Nada exigindo sua atenção.
                                </h2>
                                <button
                                    onClick={() => onOpenMentor?.()}
                                    className="w-full h-11 rounded-xl border text-[11px] font-mono font-bold uppercase tracking-wider transition-all active:scale-[0.98]"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                >
                                    Falar com o ORVAX
                                </button>
                            </>
                        )}
                    </div>
                </ScrollReveal>

                {/* ─── HOJE ─── linha densa, não card grande ─────── */}
                <ScrollReveal delay={0.1} className="px-5 mb-7 relative z-10">
                    <div className="flex items-stretch gap-3">
                        {/* Sequência */}
                        <div
                            className="shrink-0 w-[78px] rounded-[20px] border flex flex-col items-center justify-center py-3"
                            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                        >
                            <Flame size={18} strokeWidth={1.6} className="text-[#ef4444] mb-1"
                                style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' }} />
                            <span className="text-[20px] font-outfit font-black leading-none" style={{ color: 'var(--text-main)' }}>
                                {stats.streak ?? '--'}
                            </span>
                            <span className="text-[7px] font-mono opacity-25 uppercase tracking-[0.2em] mt-1"
                                style={{ color: 'var(--text-main)' }}>{t('nexus.days')}</span>
                        </div>

                        {/* Progresso do dia + semana */}
                        <div
                            className="flex-1 rounded-[20px] border px-4 py-3 flex flex-col justify-center"
                            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                        >
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-30"
                                    style={{ color: 'var(--text-main)' }}>hoje</span>
                                <span className="text-[13px] font-outfit font-black" style={{ color: 'var(--text-main)' }}>
                                    {pct === null ? '--' : `${pct}%`}
                                </span>
                            </div>

                            <div className="h-1 rounded-full overflow-hidden mb-3" style={{ backgroundColor: 'var(--border-color)' }}>
                                <div className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${pct ?? 0}%`, backgroundColor: 'var(--text-main)', opacity: 0.55 }} />
                            </div>

                            <div className="flex items-center justify-between gap-1">
                                {stats.semana.map((ativo, i) => {
                                    const hoje = new Date().getDay() === (i + 1) % 7;
                                    return (
                                        <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                                            style={{
                                                backgroundColor: ativo ? 'var(--text-main)' : 'var(--border-color)',
                                                opacity: ativo ? 0.7 : 1,
                                                outline: hoje ? '1px solid var(--text-main)' : 'none',
                                                outlineOffset: '2px',
                                            }} />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {habitosTotal > 0 && (
                        <p className="text-[10px] font-mono uppercase tracking-wider opacity-30 mt-2.5 px-1"
                            style={{ color: 'var(--text-main)' }}>
                            {habitosFeitos}/{habitosTotal} hábitos · {tarefas?.concluidas ?? 0}/{tarefas?.total ?? 0} tarefas
                        </p>
                    )}
                </ScrollReveal>

                {/* ─── EXECUÇÃO ─── onde a pessoa realmente faz ─── */}
                <ScrollReveal delay={0.15} className="w-full max-w-sm mx-auto mb-8 px-5 z-10 relative">
                    <PendingTodayPanel />
                </ScrollReveal>

            </div>
        </ScrollContainer>
    );
};

export default Nexus;
