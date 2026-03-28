import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MEAL_TYPES } from '../utils/macroCalc';

const FoodDiary = ({ entries, onAddMeal, onDeleteEntry }) => {
  return (
    <div className="space-y-3">
      {MEAL_TYPES.map((meal) => {
        const items = entries[meal.value] || [];
        const mealCals = items.reduce((sum, e) => sum + (e.calories ?? 0), 0);

        return (
          <div key={meal.value} className="rounded-sm border overflow-hidden"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>

            {/* Meal header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">{meal.icon}</span>
                <div>
                  <span className="text-[11px] font-bold tracking-wide block">{meal.label}</span>
                  {items.length > 0 && (
                    <span className="text-[9px] font-mono opacity-40">{Math.round(mealCals)} kcal</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onAddMeal?.(meal.value)}
                className="w-7 h-7 rounded-full flex items-center justify-center border transition-all hover:border-[#22c55e]/50"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <Plus size={14} className="opacity-50" />
              </button>
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {items.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold block truncate">
                        {entry.foods?.name || entry.notes || 'Alimento'}
                      </span>
                      <span className="text-[9px] font-mono opacity-40">
                        {entry.quantity_g}g
                        {entry.foods?.brand && ` · ${entry.foods.brand}`}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="text-[11px] font-bold font-mono block">{Math.round(entry.calories)}</span>
                        <span className="text-[8px] font-mono opacity-40">KCAL</span>
                      </div>
                      <button onClick={() => onDeleteEntry?.(entry.id)} className="opacity-20 hover:opacity-60 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length === 0 && (
              <button
                onClick={() => onAddMeal?.(meal.value)}
                className="w-full py-4 text-center opacity-30 hover:opacity-50 transition-all"
              >
                <span className="text-[10px] font-mono tracking-wider">+ ADICIONAR ALIMENTO</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FoodDiary;
