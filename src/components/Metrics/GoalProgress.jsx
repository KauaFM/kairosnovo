import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const GoalProgress = ({ title, deadline, progress, status, lastUpdate = 'Recentemente' }) => {

    const getStatusColor = () => {
        switch (status) {
            case 'NO CAMINHO': return 'text-[#22c55e]';
            case 'EM RISCO': return 'text-[#eab308]';
            case 'ATRASADO': return 'text-[#ef4444]';
            default: return 'opacity-40';
        }
    };

    const getStatusBg = () => {
        switch (status) {
            case 'NO CAMINHO': return 'bg-[#22c55e]';
            case 'EM RISCO': return 'bg-[#eab308]';
            case 'ATRASADO': return 'bg-[#ef4444]';
            default: return 'bg-current opacity-20';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'NO CAMINHO': return <CheckCircle2 size={12} />;
            case 'EM RISCO': return <Clock size={12} />;
            case 'ATRASADO': return <AlertTriangle size={12} />;
            default: return null;
        }
    };

    return (
        <div className="w-full glass-panel p-5 rounded-3xl mb-4 relative overflow-hidden group hover:translate-x-1 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                    <h4 className="text-[11px] font-syncopate font-black uppercase tracking-wider opacity-90">{title}</h4>
                    <div className="flex items-center gap-2 opacity-30 text-[9px] font-mono">
                        <Calendar size={10} />
                        <span>Prazo: {deadline}</span>
                    </div>
                </div>
                <div className={`flex items-center gap-1.5 text-[8px] font-mono font-bold tracking-[0.2em] uppercase ${getStatusColor()}`}>
                    {getStatusIcon()}
                    {status}
                </div>
            </div>

            <div className="w-full h-1.5 bg-current opacity-5 rounded-full overflow-hidden mb-3">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full opacity-80 ${getStatusBg()}`}
                />
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono uppercase tracking-widest opacity-40">
                <span>Progresso: <span className="font-bold opacity-100">{progress}%</span></span>
                <span>Última ativ: {lastUpdate}</span>
            </div>
        </div>
    );
};

export default GoalProgress;
