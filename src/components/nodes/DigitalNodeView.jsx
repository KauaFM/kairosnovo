import React, { useState } from 'react';
import { ChevronLeft, Smartphone, Instagram, Youtube, Twitter, MessageSquare, Linkedin, Zap, Flame, Clock, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import ScrollReveal from '../ScrollReveal';
import WeeklyHeatmap from '../charts/WeeklyHeatmap';
import TimeSeriesChart from '../charts/TimeSeriesChart';

const PlatformCard = ({ name, icon: Icon, time, variation, percentage }) => {
    const isUp = variation.startsWith('+');
    return (
        <div className="w-full glass-panel p-4 rounded-2xl flex items-center justify-between mb-2 hover:bg-current/5 transition-all group">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl border border-current/10 opacity-60 group-hover:opacity-100 transition-opacity">
                    <Icon size={18} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-syncopate font-black uppercase tracking-wider">{name}</span>
                    <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">{time}</span>
                </div>
            </div>
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-16 h-1 bg-current opacity-10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#22c55e] opacity-80" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className={`text-[9px] font-mono font-bold ${isUp ? 'text-[#ef4444]' : 'text-[#22c55e]'}`}>{variation}</span>
                </div>
                <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.2em]">Sincronia Semanal</span>
            </div>
        </div>
    );
};

const DigitalNodeView = ({ node, onBack }) => {
    const [period, setPeriod] = useState('SEMANA');

    // Data strategy based on period
    const getPeriodData = (p) => {
        const data = {
            'HOJE': {
                score: 72,
                status: 'SINCRO EXCELENTE',
                statusColor: '#22c55e',
                totalTime: '3.2',
                unit: 'H/HOJE',
                variation: '-22.5',
                platforms: [
                    { name: 'Instagram', icon: Instagram, time: '45min', variation: '-15%', percentage: 38 },
                    { name: 'WhatsApp', icon: MessageSquare, time: '1.2h', variation: '+5%', percentage: 65 },
                    { name: 'YouTube', icon: Youtube, time: '20min', variation: '-40%', percentage: 15 },
                    { name: 'Twitter', icon: Twitter, time: '15min', variation: '-10%', percentage: 12 },
                    { name: 'LinkedIn', icon: Linkedin, time: '10min', variation: '0%', percentage: 8 }
                ],
                insights: [
                    { icon: Zap, color: '#22c55e', title: 'Foco Matinal Ativado', text: 'Você não abriu redes sociais nas primeiras 3h do dia. Alta performance.' },
                    { icon: Clock, color: '#eab308', title: 'Alerta de Fluxo', text: 'Uso concentrado no WhatsApp pós-almoço. Possível fadiga de decisão.' }
                ]
            },
            'SEMANA': {
                score: 64,
                status: 'DEPENDÊNCIA LEVE',
                statusColor: '#eab308',
                totalTime: '24.5',
                unit: 'H/SEM',
                variation: '+14.2',
                platforms: [
                    { name: 'Instagram', icon: Instagram, time: '2.4h/dia', variation: '+12%', percentage: 41 },
                    { name: 'TikTok', icon: Flame, time: '1.8h/dia', variation: '-8%', percentage: 32 },
                    { name: 'YouTube', icon: Youtube, time: '1.2h/dia', variation: '+4%', percentage: 20 },
                    { name: 'WhatsApp', icon: MessageSquare, time: '0.8h/dia', variation: '-15%', percentage: 15 },
                    { name: 'LinkedIn', icon: Linkedin, time: '0.4h/dia', variation: '+2%', percentage: 8 }
                ],
                insights: [
                    { icon: Zap, color: '#ef4444', title: 'Pico Noturno Detectado', text: '89% do uso entre 22h–01h. Impacto crítico na recuperação neural.' },
                    { icon: Clock, color: '#22c55e', title: 'Redução Matinal', text: '-32% de uso pela manhã vs. semana passada. Foco aumentado.' }
                ]
            },
            'MÊS': {
                score: 58,
                status: 'SINAL AMARELO',
                statusColor: '#f97316',
                totalTime: '98.2',
                unit: 'H/MÊS',
                variation: '+5.4',
                platforms: [
                    { name: 'Instagram', icon: Instagram, time: '3.1h/dia', variation: '+18%', percentage: 45 },
                    { name: 'YouTube', icon: Youtube, time: '2.5h/dia', variation: '+10%', percentage: 35 },
                    { name: 'TikTok', icon: Flame, time: '1.5h/dia', variation: '-20%', percentage: 25 },
                    { name: 'Twitter', icon: Twitter, time: '1.1h/dia', variation: '+2%', percentage: 18 },
                    { name: 'LinkedIn', icon: Linkedin, time: '0.9h/dia', variation: '+15%', percentage: 15 }
                ],
                insights: [
                    { icon: Flame, color: '#ef4444', title: 'Domínio de Vídeos Curtos', text: 'Você consumiu 42h de conteúdo vertical este mês. Risco de drenagem dopaminérgica.' },
                    { icon: Linkedin, color: '#3b82f6', title: 'Networking Ativo', text: 'Aumento de 25% no uso do LinkedIn. Foco em expansão profissional.' }
                ]
            },
            'ANO': {
                score: 79,
                status: 'SISTEMA CONTROLADO',
                statusColor: '#22c55e',
                totalTime: '1.1k',
                unit: 'H/ANO',
                variation: '-18.7',
                platforms: [
                    { name: 'Instagram', icon: Instagram, time: '1.8h/dia', variation: '-25%', percentage: 30 },
                    { name: 'YouTube', icon: Youtube, time: '1.4h/dia', variation: '-15%', percentage: 25 },
                    { name: 'WhatsApp', icon: MessageSquare, time: '1.2h/dia', variation: '-5%', percentage: 20 },
                    { name: 'LinkedIn', icon: Linkedin, time: '0.8h/dia', variation: '+40%', percentage: 15 },
                    { name: 'Outros', icon: Smartphone, time: '0.5h/dia', variation: '-10%', percentage: 10 }
                ],
                insights: [
                    { icon: Zap, color: '#22c55e', title: 'Evolução Sistêmica', text: 'Redução anual de 240h de tela vs. 2024. Ganho líquido de 10 dias de vida.' },
                    { icon: Target, color: '#3b82f6', title: 'Substituição de Hábito', text: 'Troca de consumo passivo por produção ativa detectada em 65% do tempo.' }
                ]
            }
        };
        return data[p];
    };

    const currentData = getPeriodData(period);
    const heatmapData = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.random() > 0.6 ? Math.random() : 0));
    const timeSeriesData = [1.2, 1.5, 2.8, 3.2, 2.1, 1.8, 1.4, 1.1, 2.2, 3.5, 4.2, 2.4, 1.7, 1.3, 2.0, 2.5, 2.8, 3.0, 1.9, 1.5, 1.2, 1.0, 0.8, 1.4, 2.1, 2.5, 2.9, 3.4, 2.1, 1.9];

    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>
            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                    <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">DIGITAL</h1>
                </div>
                <div className="p-2 border border-current/10 rounded-xl opacity-40">
                    <Smartphone size={24} />
                </div>
            </div>

            {/* Filter */}
            <div className="flex bg-current/5 p-1 rounded-2xl mb-8 border border-current/10">
                {['HOJE', 'SEMANA', 'MÊS', 'ANO'].map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-2 rounded-xl text-[8px] font-mono font-bold tracking-widest transition-all ${period === p 
                            ? 'bg-[var(--text-main)] text-[var(--bg-color)] shadow-lg' 
                            : 'opacity-40 hover:opacity-60'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* Component 1: Score Card Principal */}
            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-6 block relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-2">Score Digital</span>
                        <div className="flex items-baseline">
                            <span className="text-7xl font-space font-black tracking-tighter opacity-90">{currentData.score}</span>
                            <span className="text-xl font-space opacity-30 ml-2">/100</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold tracking-widest mt-2 block" style={{ color: currentData.statusColor }}>
                            {currentData.status}
                        </span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-current/10 pt-6">
                    <div>
                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest block mb-1">Tempo Total</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-space font-black opacity-90">{currentData.totalTime}</span>
                            <span className="text-[10px] font-mono opacity-40">{currentData.unit}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest block mb-1">vs. Anterior</span>
                        <div className="flex items-baseline gap-1 justify-end" style={{ color: currentData.variation.startsWith('+') ? '#ef4444' : '#22c55e' }}>
                            <span className="text-2xl font-space font-black">{currentData.variation}</span>
                            <span className="text-[10px] font-mono opacity-40">%</span>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            {/* Component 2: Breakdown by Platform */}
            <ScrollReveal delay={0.2} className="mb-8">
                <div className="flex items-center justify-between mb-6 pl-3 border-l-[3px] border-current opacity-40">
                    <h3 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Plataformas Dominantes</h3>
                    <span className="text-[8px] font-mono uppercase tracking-widest">Realtime</span>
                </div>
                <div className="flex flex-col gap-2">
                    {currentData.platforms.map(p => <PlatformCard key={p.name} {...p} />)}
                </div>
            </ScrollReveal>

            {/* Component 3: Heatmap */}
            <WeeklyHeatmap
                data={heatmapData}
                title="Saturação Horária"
                subtitle="Concentração de uso por período do dia"
            />

            {/* Component 4: Time Series */}
            <TimeSeriesChart
                data={timeSeriesData}
                goalValue={2.0}
                title="Evolução de Consumo"
                unit="h"
            />

            {/* Component 5: Insights */}
            <ScrollReveal delay={0.3} className="flex flex-col gap-6 p-6 rounded-[32px] border relative z-10 mb-8" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)', boxShadow: 'var(--glass-shadow)' }}>
                <span className="text-[9px] font-mono uppercase tracking-[0.3em] font-bold opacity-40 mb-2 border-b border-current/5 pb-2">Padrões de Comportamento</span>

                <div className="flex flex-col gap-4">
                    {currentData.insights.map((insight, idx) => {
                        const Icon = insight.icon;
                        return (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-current/5 border border-current/10 transition-all hover:bg-current/[0.08]">
                                <Icon size={16} style={{ color: insight.color }} className="shrink-0" />
                                <div>
                                    <h4 className="text-[9px] font-syncopate font-black uppercase tracking-wider mb-1" style={{ color: insight.color }}>{insight.title}</h4>
                                    <p className="text-[8px] font-mono opacity-60 uppercase tracking-widest leading-tight">{insight.text}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollReveal>
        </div>
    );
};

export default DigitalNodeView;
