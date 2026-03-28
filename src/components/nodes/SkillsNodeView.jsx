import React from 'react';
import { ChevronLeft, GraduationCap, Cpu, Palette, Globe, BookOpen, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import ScrollReveal from '../ScrollReveal';

const SkillProgress = ({ name, icon: Icon, progress, color = "#22c55e" }) => (
    <div className="w-full glass-panel p-5 rounded-3xl mb-4 relative overflow-hidden group">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl border border-current/10 opacity-60">
                    <Icon size={18} />
                </div>
                <span className="text-[11px] font-syncopate font-black uppercase tracking-wider">{name}</span>
            </div>
            <span className="text-[10px] font-mono font-black opacity-80">{progress}%</span>
        </div>
        <div className="w-full h-1 bg-current opacity-10 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full opacity-80"
                style={{ backgroundColor: color }}
            />
        </div>
    </div>
);

const SkillsNodeView = ({ node, onBack }) => {
    return (
        <div className="animate-in slide-in-from-right-8 duration-500 w-full pb-10 block font-sans" style={{ color: 'var(--text-main)' }}>
            <button onClick={onBack} className="flex items-center gap-2 mb-8 opacity-40 hover:opacity-100 transition-opacity">
                <ChevronLeft size={16} />
                <span className="text-[10px] font-syncopate font-bold uppercase tracking-widest">VOLTAR</span>
            </button>

            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2">Node Expandido</h2>
                    <h1 className="text-3xl font-syncopate font-black tracking-widest uppercase">SKILLS</h1>
                </div>
                <div className="p-2 border border-current/10 rounded-xl opacity-40">
                    <GraduationCap size={24} />
                </div>
            </div>

            <ScrollReveal delay={0.1} className="w-full glass-panel p-8 rounded-[32px] mb-8 block relative overflow-hidden">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-2">Score de Crescimento</span>
                        <div className="flex items-baseline">
                            <span className="text-7xl font-space font-black tracking-tighter opacity-90">81</span>
                            <span className="text-xl font-space opacity-30 ml-2">/100</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 text-[#22c55e] mb-1">
                            <Flame size={14} />
                            <span className="text-[10px] font-mono font-bold tracking-widest">STREAK: 14D</span>
                        </div>
                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">Consistência de estudo</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-current/10">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest mb-1">Horas Totais</span>
                        <span className="text-2xl font-space font-black opacity-90">42.5h</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest mb-1">Cursos / Livros</span>
                        <span className="text-2xl font-space font-black opacity-90">03 <span className="text-xs opacity-30">concluídos</span></span>
                    </div>
                </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2} className="mb-8">
                <div className="flex items-center gap-3 mb-6 opacity-40 pl-3 border-l-[3px] border-current">
                    <BookOpen size={16} />
                    <h2 className="text-[11px] font-syncopate font-bold uppercase tracking-widest">Vetor de Aprendizado</h2>
                </div>

                <SkillProgress name="Cibersegurança" icon={Cpu} progress={64} />
                <SkillProgress name="UX / UI Design" icon={Palette} progress={82} color="#a855f7" />
                <SkillProgress name="Inglês Técnico" icon={Globe} progress={91} color="#3b82f6" />
            </ScrollReveal>

            <ScrollReveal delay={0.3} className="w-full glass-panel p-6 rounded-[32px] block relative overflow-hidden bg-current/5">
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase opacity-40 block mb-6">Frequência Por Área</span>

                <div className="flex items-end gap-4 h-32 pt-4">
                    {[
                        { label: 'SEG', val: 0.8, color: '#ef4444' },
                        { label: 'DSN', val: 0.6, color: '#a855f7' },
                        { label: 'LNG', val: 0.4, color: '#3b82f6' },
                        { label: 'OTH', val: 0.2, color: '#eab308' }
                    ].map(bar => (
                        <div key={bar.label} className="flex-1 flex flex-col items-center group">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${bar.val * 100}%` }}
                                className="w-full rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: bar.color }}
                            />
                            <span className="text-[8px] font-mono opacity-30 mt-3">{bar.label}</span>
                        </div>
                    ))}
                </div>
            </ScrollReveal>
        </div>
    );
};

export default SkillsNodeView;
