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
// A composição final, em ordem de prioridade:
//
//   1. IDENTIDADE — marca, lema e a frase que muda
//   2. TIMELINE   — o destino de conteúdo, com peso de destino
//   3. HOJE       — sequência, progresso e semana, em linha densa
//   4. EXECUÇÃO   — PendingTodayPanel, onde a pessoa age
//
// Cheguei a colocar aqui um bloco AGORA, com a intervenção de maior
// peso vinda do motor de sinais. Saiu a pedido do dono, e nada se
// perdeu: a mesma intervenção continua chegando pela presença do
// ORVAX no canto e pelo Centro. O Home ficou sendo sobre o DIA da
// pessoa; a análise tem lugar próprio.
// =============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flame, Newspaper, ChevronRight } from 'lucide-react';
import { getProfile, getWeekActivity } from '../services/db';
import ScrollReveal from './ScrollReveal';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import PendingTodayPanel from './lifeOs/PendingTodayPanel';
import { useLang } from '../i18n/LanguageContext';
import { coletarSinais } from '../features/orvax/engine/signals';
import { appEvents } from '../lib/events';

const Nexus = ({ theme, toggleTheme, onOpenBlog }) => {
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

    // Os sinais alimentam a linha HOJE. O bloco AGORA saiu do Home a
    // pedido do dono — a entrega de intervenção segue pela presença do
    // ORVAX no canto e pelo Centro, então nada se perdeu.
    const [sinais, setSinais] = useState(null);
    const [stats, setStats] = useState({ streak: null, semana: [false, false, false, false, false, false, false] });

    const unsubscribeRef = useRef([]);
    const { subscribeToOrvaxAgenda } = useRealtimeSync();

    const carregar = useCallback(async () => {
        try {
            const s = await coletarSinais();
            setSinais(s);
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

                {/* ─── ABERTURA ────────────────────────────────────
                    O problema desta área era hierarquia, não tamanho:
                    duas frases motivacionais empilhadas, ambas centradas
                    e em peso parecido, disputando o mesmo papel. Quando
                    tudo grita, nada é ouvido.

                    A solução foi dar PAPÉIS diferentes em vez de tamanhos
                    diferentes: o lema é fixo e ancora a tela; a frase
                    rotativa é a voz que muda, e ganha um registro próprio
                    (alinhada à esquerda, com um traço vertical) para se
                    ler como outra coisa — não como um segundo título. */}
                <div className="mb-9 flex flex-col items-center relative w-full mt-4 z-10 px-7">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }}></div>
                        <span className="text-[8px] font-mono tracking-[0.35em] uppercase font-bold text-[#22c55e] opacity-60">
                            {t('nexus.monitoringActive')}
                        </span>
                    </div>

                    {/* O lema — a âncora. Maior e mais firme que tudo. */}
                    <h2 className="text-[22px] font-outfit font-black tracking-tight text-center leading-[1.25] mb-8"
                        style={{ color: 'var(--text-main)' }}>
                        {t('nexus.watching1')} <br />{t('nexus.watching2')}
                    </h2>

                    {/* A voz que muda. Traço vertical + alinhamento à
                        esquerda: o olho entende na hora que é outra
                        natureza de texto, sem precisar de rótulo. */}
                    <div className="w-full flex items-stretch gap-3.5" style={{ minHeight: 54 }}>
                        <div className="w-[2px] rounded-full shrink-0"
                            style={{ backgroundColor: 'var(--text-main)', opacity: 0.18 }} />
                        <div className="flex-1 flex items-center">
                            <p
                                key={quoteIndex}
                                className="text-[15px] font-outfit font-medium leading-snug animate-fade-in-up"
                                style={{ color: 'var(--text-main)', opacity: 0.7 }}
                            >
                                {quotes[quoteIndex]}
                            </p>
                        </div>
                    </div>

                    {/* Marcadores alinhados ao mesmo eixo do traço. */}
                    <div className="w-full flex items-center gap-1.5 mt-3.5 mb-8 pl-[14px]">
                        {quotes.map((_, i) => (
                            <span
                                key={i}
                                className="rounded-full transition-all duration-500"
                                style={{
                                    width: i === quoteIndex ? 16 : 4,
                                    height: 3,
                                    backgroundColor: 'var(--text-main)',
                                    opacity: i === quoteIndex ? 0.45 : 0.13,
                                }}
                            />
                        ))}
                    </div>

                </div>

                {/* ─── TIMELINE ─────────────────────────────────────
                    Era uma pílula apagada de 9px que sumia na tela; virou
                    bloco com a hierarquia de quem quer ser tocado.

                    Fica FORA do bloco de identidade e no mesmo px-5 das
                    seções de baixo: é um destino, não parte da abertura —
                    e dentro do px-7 da abertura o subtítulo quebrava em
                    duas linhas por falta de largura. */}
                <ScrollReveal delay={0.05} className="px-5 mb-7 relative z-10">
                    <button
                        onClick={() => onOpenBlog?.()}
                        className="w-full rounded-[20px] border px-5 py-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                            <span className="block text-[10px] font-mono uppercase tracking-wider opacity-35 mt-0.5 whitespace-nowrap"
                                style={{ color: 'var(--text-main)' }}>
                                {t('nexus.newsSub')}
                            </span>
                        </div>
                        <ChevronRight size={18} className="opacity-30 shrink-0" style={{ color: 'var(--text-main)' }} />
                    </button>
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
