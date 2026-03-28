import React from 'react';
import { Flame, Star } from 'lucide-react';

const StreakBadge = ({ days, points }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border"
        style={{ backgroundColor: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.2)' }}>
        <Flame size={14} className="text-[#f97316]" />
        <span className="text-[11px] font-mono font-bold text-[#f97316]">{days}</span>
        <span className="text-[8px] font-mono opacity-40 tracking-wider">DIAS</span>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border"
        style={{ backgroundColor: 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.2)' }}>
        <Star size={14} className="text-[#eab308]" />
        <span className="text-[11px] font-mono font-bold text-[#eab308]">{points}</span>
        <span className="text-[8px] font-mono opacity-40 tracking-wider">PTS</span>
      </div>
    </div>
  );
};

export default StreakBadge;
