import React from 'react';
import { motion } from 'framer-motion';

const RadarChart = ({ data, lastWeekData, size = 300 }) => {
    // Pillars for ORVAX
    const pillars = [
        { key: 'BioFisico', label: 'BIO-FÍSICO' },
        { key: 'Cognitivo', label: 'COGNITIVO' },
        { key: 'Capital', label: 'CAPITAL' },
        { key: 'Social', label: 'SOCIAL' },
        { key: 'Espiritual', label: 'ESPIRITUAL' },
        { key: 'Digital', label: 'DIGITAL' }
    ];

    const center = size / 2;
    const radius = (size / 2) * 0.7; // Leave space for labels

    // Calculate coordinates for a specific score and angle
    const getCoordinates = (score, angleIdx) => {
        const angle = (angleIdx * (2 * Math.PI)) / pillars.length - Math.PI / 2;
        const r = (score / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    // Current data points
    const currentPoints = pillars.map((p, i) => getCoordinates(data[p.key] || 0, i));
    const currentPath = currentPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // Last week data points
    const lastWeekPoints = pillars.map((p, i) => {
        const score = lastWeekData ? (lastWeekData[p.key] ?? (data[p.key] || 0) * 0.9) : (data[p.key] || 0) * 0.9;
        return getCoordinates(score, i);
    });
    const lastWeekPath = lastWeekPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    return (
        <div className="flex flex-col items-center w-full my-8">
            <h3 className="text-[10px] font-mono font-bold tracking-[0.5em] uppercase opacity-40 mb-2">Mapa de Equilíbrio</h3>
            <div className="flex gap-4 mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#22c55e] rounded-full"></div>
                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-60">Atual</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-[1px] bg-current opacity-30 border-t border-dashed"></div>
                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-30">Semana Passada</span>
                </div>
            </div>

            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                {/* Concentric rings */}
                {[20, 40, 60, 80, 100].map(r => (
                    <circle
                        key={r}
                        cx={center}
                        cy={center}
                        r={(r / 100) * radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="opacity-[0.05]"
                    />
                ))}

                {/* Axis lines */}
                {pillars.map((_, i) => {
                    const { x, y } = getCoordinates(100, i);
                    return (
                        <line
                            key={i}
                            x1={center}
                            y1={center}
                            x2={x}
                            y2={y}
                            stroke="currentColor"
                            strokeWidth="0.5"
                            className="opacity-[0.1]"
                        />
                    );
                })}

                {/* Last Week Area (Dashed) */}
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.2 }}
                    d={lastWeekPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    className="opacity-20"
                />

                {/* Current Area */}
                <motion.path
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.15 }}
                    d={currentPath}
                    fill="#22c55e"
                    className="transition-all duration-1000"
                />
                <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.8 }}
                    d={currentPath}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    className="transition-all duration-1000"
                />

                {/* Data Points */}
                {currentPoints.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill="#22c55e"
                        stroke="white"
                        strokeWidth="1.5"
                        className="drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]"
                    />
                ))}

                {/* Labels */}
                {pillars.map((p, i) => {
                    const { x, y } = getCoordinates(115, i);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[9px] font-syncopate font-black uppercase tracking-tighter"
                            style={{ fill: 'var(--text-main)', opacity: 0.9 }}
                        >
                            {p.label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

export default RadarChart;
