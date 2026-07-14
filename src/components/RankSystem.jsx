import React, { useEffect, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getRankFromXP, RANK_DEFS as RANK_XP } from '../services/db';
import { useLang } from '../i18n/LanguageContext';
import { RANK_LORE_EN } from '../i18n/rankLoreEn';

// [ORVAX] Descrições/realidade por rank — o minXP vem do db.js (fórmula doubling).
const RANK_LORE = {
    'E-':  { name: 'Fase de Inércia',          desc: 'Sistemas offline. Operação meramente biológica.',        real: 'Zero consistência. Decisões baseadas em impulsos imediatos.' },
    'E':   { name: 'Observador Passivo',       desc: 'Início da telemetria. Consciência do caos instalado.',   real: 'Tentativas isoladas de organização sem sustentação.' },
    'E+':  { name: 'Despertar Técnico',        desc: 'Identificação de fricção cognitiva básica.',             real: 'Primeiros logs no sistema. Intenção de mudança.' },
    'D-':  { name: 'Iniciante Sistêmico',      desc: 'Fundação de rotina mínima (MVQ).',                       real: 'Execução de tarefas básicas em dias bons.' },
    'D':   { name: 'Operador de Baixa Frequência', desc: 'Consistência de 20% atingida.',                      real: 'Primeiros sinais de disciplina forçada.' },
    'D+':  { name: 'Candidato a Agente',       desc: 'Resistência ao piloto automático ativada.',              real: 'Manutenção de streak por 3-5 dias consecutivos.' },
    'C-':  { name: 'Módulo de Estabilidade',   desc: 'Estruturação de blocos de tempo.',                       real: 'Menos desculpas, mais telemetria.' },
    'C':   { name: 'Operador Disciplinado',    desc: 'Reset dopaminérgico em progresso.',                      real: 'O humor não dita mais a execução em 50% do tempo.' },
    'C+':  { name: 'Técnico de Performance',   desc: 'Otimização de ambiente concluída.',                      real: 'Sistemas de suporte impedem a falha total.' },
    'B-':  { name: 'Agente de Campo',          desc: 'Deep Work iniciado (1h diária).',                        real: 'Capacidade de foco sustentado sob pressão moderada.' },
    'B':   { name: 'Agente KAIROS',            desc: 'Domínio de Core Nodes. Capital em expansão.',            real: 'Isolamento emocional e foco em resultados numéricos.' },
    'B+':  { name: 'Agente Veterano',          desc: 'Sincronia neural estável. Alta resiliência.',            real: 'Consistência de 80% em todos os protocolos.' },
    'A-':  { name: 'Especialista em Fluxo',    desc: 'Entrada rápida em estado de flow.',                      real: 'Eliminação quase total de distrações digitais.' },
    'A':   { name: 'Elite Computacional',      desc: 'Execução de protocolos com baixa fricção.',              real: 'Alta performance é o estado base da consciência.' },
    'A+':  { name: 'Mestre da Execução',       desc: 'O cansaço não afeta a qualidade do output.',             real: 'Produtividade mecânica e precisa.' },
    'S-':  { name: 'Arquétipo Superior',       desc: 'Visão sistêmica absoluta de longo prazo.',               real: 'Antecipação de problemas antes da manifestação.' },
    'S':   { name: 'SOBERANO',                 desc: 'Domínio total da Matrix Orvax.',                         real: 'A realidade se molda à vontade do operador.' },
    'S+':  { name: 'Entidade de Performance',  desc: 'Ultraconsistência. Zero falhas operacionais.',           real: 'Operação em nível de perfeição técnica.' },
    'SS-': { name: 'Soberano Absoluto',        desc: 'Controle neural total. Sem ruído interno.',              real: 'Desconexão total de recompensas imediatas.' },
    'SS':  { name: 'DIVINDADE TÉCNICA',        desc: 'Singularidade operativa alcançada.',                     real: 'Capacidade criativa e produtiva ilimitada.' },
    'SS+': { name: 'Vanguarda Neural',         desc: 'Fronteira final do potencial humano.',                   real: 'Manifestação instantânea de objetivos complexos.' },
    'X-':  { name: 'Cifra do Sistema',         desc: 'Nível de existência puramente sistêmico.',               real: 'Ação pura. Sem pensamento, apenas execução.' },
    'X':   { name: 'DREADNOUGHT',              desc: 'A força imparável. Destruidor de obstáculos.',           real: 'Não há fricção. Só há progresso.' },
    'X+':  { name: 'NÊMESIS DO CAOS',          desc: 'Ordem absoluta em qualquer circunstância.',              real: 'Domínio sobre o tempo e o ambiente.' },
    'Ø':   { name: 'SINGULARIDADE OMEGA',      desc: 'O Fim e o Princípio. Deus ex Machina.',                  real: 'O Agente e o Sistema tornaram-se um só.' },
};

const fmtXP = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : `${n}`;

const buildRankDefs = (lore) => RANK_XP.map(r => ({
    id: r.rank,
    name: lore[r.rank]?.name || RANK_LORE[r.rank]?.name || r.title,
    desc: lore[r.rank]?.desc || RANK_LORE[r.rank]?.desc || '',
    real: lore[r.rank]?.real || RANK_LORE[r.rank]?.real || '',
    minXP: r.minXP,
    color: r.color || 'var(--text-main)'
}));

const RankHUD = ({ id, isCurrent, color }) => {
    return (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0 rounded-full" style={{ backgroundColor: 'var(--bg-color)', boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)' }}>
            {/* Minimalist Rank Background */}
            <div className="absolute inset-0 rounded-full border" style={{ borderColor: 'var(--border-color)', opacity: 0.3 }}></div>

            {/* Current Rank Special Glow */}
            {isCurrent && <div className="absolute inset-0 blur-xl rounded-full" style={{ backgroundColor: color, opacity: 0.2 }}></div>}

            {/* Rank Identity Letter */}
            <span className={`font-outfit font-black tracking-tighter ${isCurrent
                ? 'text-[40px] scale-110'
                : 'text-2xl opacity-40 hover:opacity-100'
                } transition-all duration-700 relative z-10`} style={isCurrent ? { color: color, filter: `drop-shadow(0 0 15px ${color})` } : { color: color }}>
                {id}
            </span>
        </div>
    );
};

const RankSystem = ({ onClose, userXP = 0 }) => {
    const { t, lang } = useLang();
    // Compute which rank is current based on XP
    const ranks = useMemo(() => {
        const defs = buildRankDefs(lang === 'en' ? RANK_LORE_EN : RANK_LORE);
        let currentIdx = 0;
        for (let i = defs.length - 1; i >= 0; i--) {
            if (userXP >= defs[i].minXP) {
                currentIdx = i;
                break;
            }
        }
        return defs.map((r, idx) => ({ ...r, current: idx === currentIdx }));
    }, [userXP, lang]);

    // Auto scroll to smooth land on current rank
    useEffect(() => {
        const currentRank = ranks.find(r => r.current);
        if (currentRank) {
            const currentEl = document.getElementById(`rank-${currentRank.id}`);
            if (currentEl) {
                currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [ranks]);

    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in duration-700 font-sans" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>

            {/* Immersive Vision Pro Glass Background Effects */}
            <div className="absolute top-[0%] right-[-20%] w-[400px] h-[400px] opacity-[0.02] blur-[120px] rounded-full pointer-events-none mix-blend-multiply" style={{ backgroundColor: 'var(--text-main)' }}></div>
            <div className="absolute bottom-[10%] left-[-20%] w-[500px] h-[500px] opacity-[0.03] blur-[140px] rounded-full pointer-events-none mix-blend-multiply" style={{ backgroundColor: 'var(--text-main)' }}></div>

            {/* Header - Floating Minimalist Glassmorphism */}
            <div className="pt-12 pb-6 px-8 flex justify-between items-center relative z-20 backdrop-blur-3xl border-b" style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}>
                <div>
                    <span className="text-[10px] font-mono opacity-40 uppercase tracking-[0.5em] block mb-2" style={{ color: 'var(--text-main)' }}>{t('mentorConfig.rankPanel')}</span>
                    <h1 className="text-xl font-outfit font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_15px_rgba(0,0,0,0.05)]" style={{ color: 'var(--text-main)' }}>{t('mentorConfig.rankStatus')}</h1>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full border flex items-center justify-center hover:scale-105 transition-all duration-500 backdrop-blur-md group"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'transparent' }}
                >
                    <ChevronLeft size={20} strokeWidth={1.5} className="opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }} />
                </button>
            </div>

            {/* Scrollable HUD Area */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 pb-32 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                <div className="relative flex flex-col gap-10 py-12 mt-2">

                    {/* The Continuous Timeline Spine */}
                    <div className="absolute top-12 bottom-12 left-[40px] sm:left-[48px] w-[1px] opacity-10" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, var(--text-main), transparent)' }}></div>

                    {ranks.map((rank, idx) => {
                        const isCurrent = rank.current;

                        return (
                            <div key={rank.id} id={`rank-${rank.id}`} className="flex gap-5 sm:gap-8 relative group z-10 items-stretch">

                                {/* Intense glowing section of the timeline if current */}
                                {isCurrent && (
                                    <div className="absolute left-[40px] sm:left-[48px] top-6 h-36 w-[2px] -translate-x-1/2 z-10 rounded-full" style={{ backgroundColor: rank.color, boxShadow: `0 0 20px ${rank.color}` }}></div>
                                )}

                                {/* HUD UI Module */}
                                <div className="relative z-20">
                                    <RankHUD id={rank.id} isCurrent={isCurrent} color={rank.color} idx={idx} />
                                </div>

                                {/* Floating Vision Pro Glass Content Card */}
                                <div className={`flex-1 rounded-[28px] p-6 sm:p-8 backdrop-blur-[40px] transition-all duration-1000 overflow-hidden relative flex flex-col justify-center
                                    ${isCurrent
                                        ? 'scale-[1.02] mr-2'
                                        : 'opacity-70 hover:opacity-100'}`}
                                    style={{
                                        backgroundColor: isCurrent ? 'var(--bg-color)' : 'var(--glass-bg)',
                                        border: '1px solid var(--border-color)',
                                        boxShadow: isCurrent ? 'var(--glass-shadow)' : 'none'
                                    }}
                                >
                                    {/* Shimmer sweep effect on Current Selection */}
                                    {isCurrent && (
                                        <div className="absolute inset-0 translate-x-[-150%] skew-x-[-25deg] opacity-20 bg-gradient-to-r from-transparent via-current to-transparent w-[150%] animate-[shimmer_3s_infinite] pointer-events-none z-0"></div>
                                    )}

                                    <div className="relative z-10">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
                                            <div className="flex flex-col">
                                                <h3 className={`text-[11px] font-mono tracking-[0.4em] uppercase ${isCurrent ? 'font-bold drop-shadow-[0_0_10px_rgba(0,0,0,0.05)] opacity-100' : 'opacity-50'}`} style={{ color: 'var(--text-main)' }}>
                                                    {rank.name}
                                                </h3>
                                                <span className="text-[9px] font-outfit font-bold opacity-60 mt-1" style={{ color: rank.color }}>
                                                    ≥ {fmtXP(rank.minXP)} XP
                                                </span>
                                            </div>

                                            {isCurrent && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full self-start shadow-[0_0_15px_rgba(0,0,0,0.1)] backdrop-blur-md" style={{ border: `1px solid ${rank.color}4D`, backgroundColor: `${rank.color}1A` }}>
                                                    <div className="w-1.5 h-1.5 rounded-full animate-pulse blur-[1px]" style={{ backgroundColor: rank.color, boxShadow: `0 0 8px ${rank.color}` }}></div>
                                                    <span className="text-[8px] font-mono font-bold uppercase tracking-[0.3em] pt-[1px]" style={{ color: rank.color }}>{t('mentorConfig.rankAllocated')}</span>
                                                </div>
                                            )}
                                        </div>

                                        <p className={`text-[12px] font-mono leading-loose mb-6 ${isCurrent ? 'opacity-90' : 'opacity-50'}`} style={{ color: 'var(--text-main)' }}>
                                            {rank.desc}
                                        </p>

                                        <div>
                                            <span className={`text-[8px] font-mono uppercase tracking-[0.4em] block mb-2 ${isCurrent ? 'opacity-60' : 'opacity-40'}`} style={{ color: 'var(--text-main)' }}>
                                                {t('mentorConfig.rankRealManifest')}
                                            </span>
                                            <p className={`text-[11px] font-mono leading-relaxed ${isCurrent ? 'font-outfit tracking-wide opacity-100' : 'opacity-50'}`} style={{ color: 'var(--text-main)' }}>
                                                {rank.real}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Deep Fade out bottom gradient to blend the scroll */}
            <div className="absolute bottom-0 inset-x-0 h-48 pointer-events-none z-20" style={{ backgroundImage: 'linear-gradient(to top, var(--bg-color), transparent)' }}></div>
        </div>
    );
};

export default RankSystem;
