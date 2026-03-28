import React, { useState, useRef, useEffect } from 'react';
import { Droplets, Plus, Minus, Pencil, Check } from 'lucide-react';

const QUICK_ADD = [150, 250, 350, 500];

const WaterTracker = ({ totalMl, goalMl = 2000, onAdd, onRemove, onGoalChange }) => {
  const [customMl, setCustomMl] = useState('');
  const [selected, setSelected] = useState(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goalMl));
  const goalRef = useRef(null);

  useEffect(() => {
    if (!editingGoal) setGoalInput(String(goalMl));
  }, [goalMl, editingGoal]);

  useEffect(() => {
    if (editingGoal) goalRef.current?.select();
  }, [editingGoal]);

  const confirmGoal = () => {
    const parsed = parseInt(goalInput, 10);
    if (parsed > 0) onGoalChange?.(parsed);
    else setGoalInput(String(goalMl));
    setEditingGoal(false);
  };

  const pct = goalMl > 0 ? Math.min((totalMl / goalMl) * 100, 100) : 0;
  const glasses = Math.floor(totalMl / 250);
  const totalGlasses = Math.ceil(goalMl / 250);
  const done = pct >= 100;
  const color = done ? '#22c55e' : '#3b82f6';

  const handleQuickSelect = (ml) => {
    setSelected(ml);
    setCustomMl(String(ml));
  };

  const handleCustomChange = (e) => {
    setCustomMl(e.target.value);
    setSelected(null);
  };

  const handleAdd = () => {
    const amount = parseInt(customMl, 10);
    if (!amount || amount <= 0) return;
    onAdd?.(amount);
    setCustomMl('');
    setSelected(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div
      className="rounded-sm border overflow-hidden"
      style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Droplets size={14} style={{ color }} />
          <span className="text-[10px] font-mono font-bold tracking-wider opacity-60">HIDRATAÇÃO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold font-mono" style={{ color }}>{totalMl}</span>
          <span className="text-[10px] font-mono opacity-40">/</span>
          {editingGoal ? (
            <div className="flex items-center gap-1">
              <input
                ref={goalRef}
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmGoal(); if (e.key === 'Escape') setEditingGoal(false); }}
                className="w-16 text-[11px] font-mono font-bold text-right bg-transparent border-b outline-none"
                style={{ borderColor: color, color }}
              />
              <span className="text-[10px] font-mono opacity-40">ml</span>
              <button onClick={confirmGoal} className="ml-1" style={{ color }}>
                <Check size={12} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setGoalInput(String(goalMl)); setEditingGoal(true); }}
              className="flex items-center gap-1 group"
              title="Editar meta"
            >
              <span className="text-[10px] font-mono opacity-40 group-hover:opacity-70 transition-opacity">{goalMl}ml</span>
              <Pencil size={9} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-3">
        <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: done
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono opacity-30">0ml</span>
          <span className="text-[9px] font-mono font-bold" style={{ color }}>{Math.round(pct)}%</span>
          <span className="text-[9px] font-mono opacity-30">{goalMl}ml</span>
        </div>
      </div>

      {/* Copos visuais */}
      <div className="flex items-center justify-center gap-1 px-4 mb-3 flex-wrap">
        {Array.from({ length: totalGlasses }).map((_, i) => {
          const filled = i < glasses;
          return (
            <div
              key={i}
              className="relative flex flex-col items-center justify-end rounded-sm border transition-all duration-300"
              style={{
                width: 22,
                height: 28,
                backgroundColor: filled ? 'rgba(59,130,246,0.15)' : 'transparent',
                borderColor: filled ? 'rgba(59,130,246,0.5)' : 'var(--border-color)',
              }}
            >
              {filled && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-b-sm"
                  style={{
                    height: '65%',
                    background: 'linear-gradient(180deg, rgba(96,165,250,0.4), rgba(59,130,246,0.7))',
                  }}
                />
              )}
              {filled && <Droplets size={8} className="relative z-10 mb-1" style={{ color: '#60a5fa' }} />}
            </div>
          );
        })}
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 px-4 mb-3">
        {QUICK_ADD.map((ml) => (
          <button
            key={ml}
            onClick={() => handleQuickSelect(ml)}
            className="flex-1 py-1.5 rounded-sm border text-[9px] font-mono font-bold tracking-wide transition-all active:scale-95"
            style={{
              borderColor: selected === ml ? color : 'var(--border-color)',
              color: selected === ml ? color : 'var(--text-main)',
              backgroundColor: selected === ml ? `${color}15` : 'transparent',
              opacity: selected === ml ? 1 : 0.5,
            }}
          >
            {ml}ml
          </button>
        ))}
      </div>

      {/* Input customizado + ações */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-t"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div
          className="flex flex-1 items-center rounded-sm border overflow-hidden"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <input
            type="number"
            min="1"
            max="2000"
            placeholder="ml personalizado..."
            value={customMl}
            onChange={handleCustomChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-[11px] font-mono px-3 py-2 outline-none"
            style={{ color: 'var(--text-main)' }}
          />
          <span className="text-[9px] font-mono opacity-30 pr-2">ml</span>
        </div>

        <button
          onClick={() => onRemove?.()}
          disabled={totalMl <= 0}
          title="Desfazer última adição"
          className="w-8 h-8 rounded-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-20"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
        >
          <Minus size={13} strokeWidth={2.5} />
        </button>

        <button
          onClick={handleAdd}
          disabled={!customMl || parseInt(customMl) <= 0}
          title="Adicionar água"
          className="w-8 h-8 rounded-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-20"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default WaterTracker;
