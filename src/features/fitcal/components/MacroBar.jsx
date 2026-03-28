import React from 'react';

const MacroBar = ({ label, current, goal, color, unit = 'g' }) => {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOver = current > goal;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <div className="w-16 text-right">
        <span className="text-[9px] font-mono font-bold tracking-wider opacity-60">{label}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: isOver ? '#ef4444' : color }}
        />
      </div>

      {/* Values */}
      <div className="w-20 text-right">
        <span className="text-[10px] font-mono font-bold" style={{ color: isOver ? '#ef4444' : color }}>
          {current.toFixed(0)}
        </span>
        <span className="text-[10px] font-mono opacity-30">/{goal}{unit}</span>
      </div>
    </div>
  );
};

export default MacroBar;
