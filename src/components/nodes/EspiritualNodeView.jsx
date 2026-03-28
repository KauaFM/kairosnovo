import React from 'react';
import { ChevronLeft, Compass, Wind, Sunset, Moon, Sparkles } from 'lucide-react';
import ScrollReveal from '../ScrollReveal';

const EspiritualNodeView = ({ node, onBack }) => {
    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>
            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                    <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">ESPIRITUAL</h1>
                </div>
                <div className="p-2 border border-current/10 rounded-xl opacity-40">
                    <Compass size={24} />
                </div>
            </div>

            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-8 block relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-2">Alinhamento e Propósito</span>
                        <div className="flex items-baseline">
                            <span className="text-7xl font-space font-black tracking-tighter opacity-90">89</span>
                            <span className="text-xl font-space opacity-30 ml-2">/100</span>
                        </div>
                    </div>
                    <div className="p-3 bg-current/5 rounded-full animate-pulse-slow">
                        <Sparkles size={32} className="text-[#22c55e]" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 pt-6 border-t border-current/10">
                    <div>
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Meditação</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-space font-bold opacity-80">20</span>
                            <span className="text-xs font-mono opacity-50">min/dia</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[8px] font-mono tracking-[0.3em] uppercase opacity-30 block mb-1">Consistência</span>
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-space font-bold opacity-80">96</span>
                            <span className="text-xs font-mono opacity-50">%</span>
                        </div>
                    </div>
                </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 gap-4 mb-8">
                <div className="w-full glass-panel p-6 rounded-[32px] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/10">
                            <Wind size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-syncopate font-black uppercase tracking-wider block mb-1">Mindset Matinal</span>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest leading-none">Verificado às 06:15h</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#22c55e] uppercase tracking-widest">OK</span>
                </div>

                <div className="w-full glass-panel p-6 rounded-[32px] flex items-center justify-between opacity-50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/10">
                            <Sunset size={20} />
                        </div>
                        <div>
                            <span className="text-[10px] font-syncopate font-black uppercase tracking-wider block mb-1">Gratidão Noturna</span>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest leading-none">Aguardando registro</span>
                        </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">PENDENTE</span>
                </div>
            </div>
        </div>
    );
};

export default EspiritualNodeView;
