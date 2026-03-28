import React from 'react';
import { ChevronRight, Target, BrainCircuit, Activity, Clock, Shield } from 'lucide-react';

// Common reusable UI components for the Telemetry list view

export const MetricGroup = ({ title, icon: Icon, children }) => {
    return (
        <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 opacity-50 pl-2 border-l-2 border-current/20">
                <Icon size={16} />
                <h2 className="text-[10px] font-syncopate font-bold uppercase tracking-widest">{title}</h2>
            </div>
            <div className="flex flex-col gap-3">
                {children}
            </div>
        </div>
    );
};

export const MetricCard = ({ id, title, subtitle, value, unit, trend, isGood, onClick }) => {
    return (
        <button
            onClick={() => onClick(id)}
            className="w-full text-left glass-panel p-5 rounded-3xl flex justify-between items-center group relative overflow-hidden transition-all duration-300 hover:bg-current/10"
            style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-current opacity-10 group-hover:opacity-30 transition-opacity"></div>

            <div className="flex flex-col gap-1 pr-4">
                <span className="text-[12px] font-syncopate font-black uppercase tracking-wider">{title}</span>
                <span className="text-[9px] font-mono opacity-50 uppercase tracking-[0.1em]">{subtitle}</span>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-space font-black">{value}</span>
                        {unit && <span className="text-[10px] font-mono opacity-50 uppercase">{unit}</span>}
                    </div>
                    {trend && (
                        <span className={`text-[8px] font-mono font-bold uppercase tracking-widest mt-1 ${isGood ? 'text-[#22c55e]' : 'text-current opacity-40'}`}>
                            {trend}
                        </span>
                    )}
                </div>

                <ChevronRight size={16} className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>
        </button>
    );
};
