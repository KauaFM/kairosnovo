import React from 'react';
import { CORE_NODES, EXPANSION_NODES, SHADOW_METRICS } from './metricDefs';
import { ChevronLeft, Target, Zap, Clock, Shield, BrainCircuit, Activity } from 'lucide-react';

const MetricDetailModal = ({ metricId, onClose }) => {
    // Find the definition across all categories
    const allMetrics = [...CORE_NODES, ...EXPANSION_NODES, ...SHADOW_METRICS];
    const metric = allMetrics.find(m => m.id === metricId);

    if (!metric) return null;

    // Use a placeholder or the actual current value if exists
    // (In a real app, this would come from the user's data state)
    const currentValue = metric.value;

    const unit = metric.unit || '';

    return (
        <div className="absolute inset-0 z-[100] flex flex-col font-sans animate-in slide-in-from-right-8 duration-500 overflow-y-auto" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>

            {/* Ambient Background Gradient based on category colors */}
            <div className="absolute top-0 left-0 w-full h-[30%] opacity-[0.05] pointer-events-none bg-gradient-to-b from-current to-transparent"></div>

            {/* Nav Header */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-center relative z-20 sticky top-0 backdrop-blur-md mb-6" style={{ backgroundColor: 'var(--glass-bg)' }}>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition-all duration-300 border hover:bg-current/5"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <ChevronLeft size={20} className="opacity-70" />
                </button>
                <div className="flex items-center gap-1.5 opacity-50 bg-current/5 px-3 py-1 rounded-full border border-current/10">
                    <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-current">{metric.id}</span>
                </div>
            </div>

            <div className="px-6 relative z-10 flex flex-col items-center mb-10 w-full mt-4">

                {/* Elaborate Visual Data Ring */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-12 mt-4 mx-auto perspective-1000">
                    {/* Outer dashed orbit */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-current/20 animate-[spin_120s_linear_infinite]"></div>

                    {/* First Inner solid orbit with orbiting node */}
                    <div className="absolute inset-6 rounded-full border border-current/10 animate-[spin_60s_linear_infinite_reverse]">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-current rounded-full shadow-[0_0_8px_currentColor] opacity-60"></div>
                    </div>

                    {/* Second Inner solid orbit with glowing indicator */}
                    <div className="absolute inset-12 rounded-full border border-current/5 shadow-inner">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[#22c55e] rounded-full shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                    </div>

                    {/* Deep Core Glow */}
                    <div className="absolute inset-16 rounded-full bg-gradient-to-br from-current/5 to-transparent blur-xl pointer-events-none"></div>

                    {/* Sci-fi Crosshairs */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-current/30"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-current/30"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-current/30"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-current/30"></div>

                    {/* Central Data Block */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full pt-4">
                        <span className="text-[9px] font-mono tracking-[0.4em] uppercase opacity-60 mb-2 max-w-[150px] text-center leading-relaxed">
                            {metric.title}
                        </span>

                        <div className="flex items-baseline justify-center relative translate-x-2">
                            <span className="text-7xl sm:text-8xl font-space font-black tracking-tighter text-glow" style={{ textShadow: '0 0 30px var(--glass-shadow)' }}>
                                {currentValue}
                            </span>
                            {unit && <span className="text-2xl font-space opacity-50 ml-1">{unit}</span>}
                        </div>
                    </div>
                </div>

                {/* About the Metric */}
                <div className="w-full text-left relative z-10 p-6 rounded-[32px] glass-panel mb-8" style={{ border: '1px solid var(--border-color)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 border-b border-l border-current/10 pointer-events-none rounded-bl-3xl opacity-50"></div>

                    <h2 className="text-sm font-syncopate font-black uppercase tracking-wider mb-2">Definição</h2>
                    <p className="text-[12px] font-mono opacity-60 leading-relaxed tracking-wide uppercase mb-8">
                        {metric.description}
                    </p>

                    <h2 className="text-sm font-syncopate font-black uppercase tracking-wider mb-2">Lógica de Cálculo</h2>
                    <p className="text-[11px] font-mono font-bold opacity-80 leading-relaxed tracking-widest uppercase text-[#22c55e]">
                        {metric.logic}
                    </p>
                </div>

                {/* Historical Graph (Simulated) */}
                <div className="w-full text-left relative z-10 mb-10">
                    <div className="flex justify-between items-end mb-8 px-2">
                        <h2 className="text-[11px] font-syncopate font-black tracking-widest uppercase opacity-70">Histórico</h2>
                        <span className="text-[8px] font-mono opacity-40 uppercase tracking-widest">Últimos 7 dias</span>
                    </div>

                    <div className="w-full h-40 glass-panel rounded-3xl p-6 relative overflow-hidden flex items-end justify-between" style={{ border: '1px solid var(--border-color)' }}>
                        <div className="absolute inset-0 flex justify-between px-6 pt-6 opacity-[0.03]">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-full w-[1px] bg-current"></div>)}
                        </div>

                        {/* Faux Bars */}
                        {metric.history && metric.history.map((h, i) => {
                            const percent = (h / metric.max) * 100;
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer w-[10%] h-full justify-end relative z-10">
                                    <span className="text-[8px] font-mono opacity-0 group-hover:opacity-100 absolute -top-4 font-bold transition-all text-[#22c55e]">{h}</span>
                                    <div className="w-full rounded-t-sm bg-[#22c55e]/20 group-hover:bg-[#22c55e] transition-colors" style={{ height: `${percent}%` }}></div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MetricDetailModal;
