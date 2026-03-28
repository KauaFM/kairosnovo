import React, { useState, useRef } from 'react';

const CalorieSummary = ({ consumed, goal, burned = 0, onGoalChange }) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  const remaining = Math.max(0, goal - consumed + burned);
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const isOver = consumed > goal;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const startEdit = () => {
    if (!onGoalChange) return;
    setInputVal(String(goal));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const confirmEdit = () => {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed > 0) onGoalChange(parsed);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="8" stroke="var(--border-color)" opacity="0.3" />
          <circle
            cx="70" cy="70" r={radius}
            fill="none" strokeWidth="8"
            stroke={isOver ? '#ef4444' : '#22c55e'}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-mono" style={{ color: 'var(--text-main)' }}>
            {remaining}
          </span>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">RESTANTES</span>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-4 text-[10px] font-mono">
        {/* META — tappable to edit */}
        <button
          onClick={startEdit}
          className={`text-center transition-opacity ${onGoalChange ? 'cursor-pointer hover:opacity-70 active:opacity-50' : 'cursor-default'}`}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={handleKeyDown}
              className="block w-16 text-[14px] font-bold text-center bg-transparent border-b outline-none"
              style={{ borderColor: '#22c55e', color: 'var(--text-main)' }}
              autoFocus
            />
          ) : (
            <span className="block text-[14px] font-bold">{goal}</span>
          )}
          <span className="opacity-40 tracking-wider">META</span>
        </button>

        <div className="text-center">
          <span className="block text-[14px] font-bold text-[#22c55e]">{Math.round(consumed)}</span>
          <span className="opacity-40 tracking-wider">CONSUMIDO</span>
        </div>

        {burned > 0 && (
          <div className="text-center">
            <span className="block text-[14px] font-bold text-[#f97316]">{burned}</span>
            <span className="opacity-40 tracking-wider">QUEIMADO</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalorieSummary;
