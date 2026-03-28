import React from 'react';
import { ChevronLeft, Users, MessageSquare, Heart, Coffee, ShieldAlert } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';
import WeeklyHeatmap from '../charts/WeeklyHeatmap';

const SocialNodeView = ({ node, onBack }) => {
    const heatmapData = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.random() > 0.8 ? Math.random() : 0));

    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>
            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                    <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">SOCIAL</h1>
                </div>
                <div className="p-2 border border-current/10 rounded-xl opacity-40">
                    <Users size={24} />
                </div>
            </div>

            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-6 block relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-2">Score de Conexão</span>
                        <div className="flex items-baseline">
                            <span className="text-7xl font-space font-black tracking-tighter opacity-90">72</span>
                            <span className="text-xl font-space opacity-30 ml-2">/100</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 pt-6 border-t border-current/10">
                    <div>
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Círculo Íntimo</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-space font-bold opacity-80">3</span>
                            <span className="text-xs font-mono opacity-50">vezes/sem</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Networking</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-space font-bold opacity-80">12</span>
                            <span className="text-xs font-mono opacity-50">conexões/mês</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Qualidade Média</span>
                        <div className="flex items-baseline gap-1 text-[#22c55e]">
                            <span className="text-2xl font-space font-bold">4.2</span>
                            <span className="text-xs font-mono opacity-50">/5</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Status</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-sm font-space font-bold opacity-80 uppercase tracking-widest leading-tight">Consistente</span>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            <WeeklyHeatmap
                data={heatmapData}
                title="Sincronia de Interação"
                subtitle="Frequência de contatos significativos"
            />

            <ScrollReveal delay={0.2} className="w-full glass-panel p-6 rounded-[32px] mb-6 block relative overflow-hidden">
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-6">Alertas de Isolamento</span>
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#ef4444]/5 border border-[#ef4444]/10">
                    <ShieldAlert size={16} className="text-[#ef4444] shrink-0" />
                    <div>
                        <h4 className="text-[9px] font-syncopate font-black uppercase tracking-wider text-[#ef4444] mb-1">Alerte de Retração</h4>
                        <p className="text-[8px] font-mono opacity-60 uppercase tracking-widest leading-tight">8 dias sem interação de alta qualidade detectada. Risco de queda no mindset.</p>
                    </div>
                </div>
            </ScrollReveal>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                    <Heart size={20} className="mb-2 opacity-40" />
                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-40">Família</span>
                    <span className="text-xl font-space font-black">2x <span className="text-[10px] opacity-30">/sem</span></span>
                </div>
                <div className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center text-center">
                    <Coffee size={20} className="mb-2 opacity-40" />
                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-40">Social Básico</span>
                    <span className="text-xl font-space font-black">4x <span className="text-[10px] opacity-30">/sem</span></span>
                </div>
            </div>
        </div>
    );
};

export default SocialNodeView;
