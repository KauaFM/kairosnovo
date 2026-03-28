import React from 'react';
import { motion } from 'framer-motion';

const WeeklyHeatmap = ({ data, title, subtitle }) => {
    // data should be an array of 7 arrays (days), each with 24 indices (hours)
    // Values 0-1 represent intensity

    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="w-full glass-panel p-6 rounded-[32px] mb-6 block relative overflow-hidden">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-[10px] font-mono font-bold tracking-[0.4em] uppercase opacity-40 mb-1">{title}</h3>
                    <p className="text-[8px] font-mono opacity-30 uppercase tracking-widest">{subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-40 scale-75">
                    <span className="text-[8px] font-mono">MIN</span>
                    <div className="flex gap-[1px]">
                        <div className="w-2 h-2 rounded-[1px] bg-current opacity-10"></div>
                        <div className="w-2 h-2 rounded-[1px] bg-current opacity-30"></div>
                        <div className="w-2 h-2 rounded-[1px] bg-current opacity-60"></div>
                        <div className="w-2 h-2 rounded-[1px] bg-current opacity-90"></div>
                    </div>
                    <span className="text-[8px] font-mono">MAX</span>
                </div>
            </div>

            <div className="w-full overflow-x-auto no-scrollbar">
                <div className="min-w-[400px]">
                    {/* Hour Labels */}
                    <div className="flex mb-1 ml-8">
                        {hours.map(h => (
                            <div key={h} className="flex-1 text-center">
                                <span className={`text-[6px] font-mono opacity-20 ${h % 4 === 0 ? 'opacity-50' : ''}`}>
                                    {h}h
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Heatmap Grid */}
                    <div className="flex flex-col gap-[2px]">
                        {days.map((day, dIdx) => (
                            <div key={day} className="flex items-center gap-2">
                                <span className="w-6 text-[8px] font-mono font-bold opacity-30 tracking-tighter text-right">{day}</span>
                                <div className="flex-1 flex gap-[2px]">
                                    {hours.map(hIdx => {
                                        const intensity = data?.[dIdx]?.[hIdx] || 0;
                                        return (
                                            <motion.div
                                                key={hIdx}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: (dIdx * 24 + hIdx) * 0.001 }}
                                                className="flex-1 aspect-square rounded-[1px] bg-[#22c55e]"
                                                style={{
                                                    opacity: intensity === 0 ? 0.05 : intensity * 0.9,
                                                    backgroundColor: intensity === 0 ? 'var(--text-main)' : '#22c55e'
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-between items-center border-t border-current/5 pt-4">
                <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Distribuição Cicardiana</span>
                <span className="text-[9px] font-space font-bold opacity-60">Pico: <span className="text-[#22c55e]">22h — 01h</span></span>
            </div>
        </div>
    );
};

export default WeeklyHeatmap;
