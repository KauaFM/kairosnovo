import React from 'react';
import { motion } from 'framer-motion';

const TimeSeriesChart = ({ data, goalValue, title, unit = 'h' }) => {
    const width = 400;
    const height = 150;
    const padding = { top: 20, right: 10, bottom: 30, left: 10 };

    const maxVal = Math.max(...data, goalValue || 0, 1) * 1.2;

    const points = data.map((val, i) => ({
        x: padding.left + (i * (width - padding.left - padding.right)) / (data.length - 1),
        y: height - padding.bottom - (val / maxVal) * (height - padding.top - padding.bottom),
        val
    }));

    const goalY = height - padding.bottom - (goalValue / maxVal) * (height - padding.top - padding.bottom);

    // Path for the area and line
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;

    return (
        <div className="w-full glass-panel p-6 rounded-[32px] mb-6 block relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-[10px] font-mono font-bold tracking-[0.4em] uppercase opacity-40 mb-1">{title}</h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-space font-black opacity-90">{data[data.length - 1]}</span>
                        <span className="text-[10px] font-mono opacity-30 uppercase">{unit} hoje</span>
                    </div>
                </div>
                {goalValue && (
                    <div className="text-right">
                        <span className="text-[8px] font-mono uppercase tracking-widest opacity-30 block mb-1">Meta Diária</span>
                        <span className="text-sm font-space font-bold opacity-60">{goalValue}{unit}</span>
                    </div>
                )}
            </div>

            <div className="w-full overflow-hidden">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                    {/* Goal Line */}
                    {goalValue && (
                        <line
                            x1={padding.left}
                            y1={goalY}
                            x2={width - padding.right}
                            y2={goalY}
                            stroke="#ef4444"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            className="opacity-40"
                        />
                    )}

                    {/* Area with Gradient */}
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        d={areaPath}
                        fill="url(#areaGradient)"
                    />

                    {/* Line */}
                    <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        d={linePath}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2.5"
                    />

                    {/* Meta/Alert logic: Highlight points above goal */}
                    {points.map((p, i) => (
                        p.val > goalValue ? (
                            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ef4444" className="shadow-lg" />
                        ) : null
                    ))}

                    {/* Current point */}
                    <circle
                        cx={points[points.length - 1].x}
                        cy={points[points.length - 1].y}
                        r="5"
                        fill="#22c55e"
                        stroke="white"
                        strokeWidth="2"
                        className="drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                    />

                    {/* X Axis Labels */}
                    <text x={padding.left} y={height - 10} className="text-[8px] font-mono fill-current opacity-20">Consistência 30D</text>
                    <text x={width - padding.right} y={height - 10} textAnchor="end" className="text-[8px] font-mono fill-current opacity-20">Hoje</text>
                </svg>
            </div>
        </div>
    );
};

export default TimeSeriesChart;
