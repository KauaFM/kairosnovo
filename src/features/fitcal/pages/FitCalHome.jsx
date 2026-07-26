import React, { useState, useEffect, useMemo } from 'react';
import {
  Camera, Search, Plus, Loader2, Minus, Droplets, Pencil, Check,
  Flame, Star, Trash2, Activity, Moon, Zap, ChevronRight, TrendingUp,
  Dumbbell, Heart, ArrowUpRight, ArrowDownRight, CalendarDays,
  ChevronLeft, X, Target
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { supabase } from '../../../lib/supabase';
import { useLang } from '../../../i18n/LanguageContext';
import { useFoodDiary } from '../hooks/useFoodDiary';
import { useNutritionPlan } from '../hooks/useNutritionPlan';
import { useStreak } from '../hooks/useStreak';
import { useWater } from '../hooks/useWeight';
import { useFitcalMetrics } from '../hooks/useFitcalMetrics';
import { addWater, deleteLastWater } from '../services/weightService';
import { updateStreak } from '../services/streakService';
import { updateCalorieGoal, updateWaterGoal } from '../services/foodService';
import { logFromAI, deleteLog } from '../services/foodServiceV2';
import { useNutritionSetup } from '../hooks/useNutritionSetup';
import AddMealModal from '../components/AddMealModal';
import FoodScanner from '../components/FoodScanner';
import NutritionOnboarding from '../components/NutritionOnboarding';
import ProgressPage from './ProgressPage';
import { MEAL_TYPES } from '../utils/macroCalc';

// ─── CHART TOOLTIP ──────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-2xl px-4 py-3 border backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--bg-color)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        minWidth: 160
      }}
    >
      <span className="text-[9px] font-mono uppercase tracking-[0.3em] opacity-30 block mb-2">{label}</span>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between items-center gap-4 py-0.5">
          <span className="text-[9px] font-mono uppercase tracking-wider opacity-40">{p.name}</span>
          <span className="text-[11px] font-mono font-bold" style={{ color: p.color }}>{p.value} kcal</span>
        </div>
      ))}
    </div>
  );
};

// ─── CALORIE RING ───────────────────────────────────────────────────────────────
const CalorieRing = ({ consumed, goal, onGoalChange }) => {
  const { t } = useLang();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const remaining = Math.max(0, goal - consumed);
  const pct = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const isOver = consumed > goal;

  const radius = 62;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const center = radius + stroke + 4;
  const viewBox = center * 2;

  const startEdit = () => {
    if (!onGoalChange) return;
    setInputVal(String(goal));
    setEditing(true);
  };

  const confirmEdit = () => {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed) && parsed > 0) onGoalChange(parsed);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: viewBox, height: viewBox }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${viewBox} ${viewBox}`}>
          {/* Track */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" strokeWidth={stroke}
            stroke="var(--border-color)" opacity="0.4"
          />
          {/* Progress */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" strokeWidth={stroke}
            stroke={isOver ? '#ef4444' : 'var(--text-main)'}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: isOver ? 'drop-shadow(0 0 6px rgba(239,68,68,0.4))' : 'drop-shadow(0 0 4px var(--accent-glow))'
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-outfit font-black leading-none opacity-90">{remaining}</span>
          <span className="text-[7px] font-mono opacity-25 tracking-[0.3em] uppercase mt-1">{t('fitcal.remaining')}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {/* Meta */}
        <button onClick={startEdit} className="text-left w-full group">
          {editing ? (
            <input
              type="number" value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditing(false); }}
              className="block w-24 text-[18px] font-outfit font-bold bg-transparent border-b outline-none"
              style={{ borderColor: 'var(--text-main)', color: 'var(--text-main)' }}
              autoFocus
            />
          ) : (
            <span className="text-[18px] font-outfit font-bold opacity-70 group-hover:opacity-100 transition-opacity">{goal}</span>
          )}
          <span className="text-[8px] font-mono opacity-20 tracking-[0.25em] uppercase block mt-0.5">{t('fitcal.kcalGoal')}</span>
        </button>
        {/* Consumido */}
        <div>
          <span className={`text-[18px] font-outfit font-bold ${isOver ? 'text-red-400' : ''}`}>{Math.round(consumed)}</span>
          <span className="text-[8px] font-mono opacity-20 tracking-[0.25em] uppercase block mt-0.5">{t('fitcal.consumed')}</span>
        </div>
        {/* Status */}
        <div className="flex items-center gap-2 pt-1">
          <div className={`w-2 h-2 rounded-full ${isOver ? 'bg-red-400 animate-pulse' : pct > 85 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className="text-[8px] font-mono opacity-25 tracking-[0.15em] uppercase">
            {isOver ? t('lo.over') : pct > 85 ? t('lo.nearLimit') : t('lo.onTrack')}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── MACRO PILL ─────────────────────────────────────────────────────────────────
const MacroPill = ({ label, current, goal, accentOpacity = 0.6 }) => {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isOver = current > goal;
  return (
    <div className="flex-1 rounded-2xl p-3 border relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
      {/* Progress fill behind */}
      <div
        className="absolute inset-0 transition-all duration-700 pointer-events-none"
        style={{
          width: `${pct}%`,
          backgroundColor: isOver ? 'rgba(239,68,68,0.06)' : 'var(--text-main)',
          opacity: isOver ? 1 : 0.03
        }}
      />
      <span className="text-[8px] font-mono uppercase tracking-[0.2em] opacity-25 block mb-1 relative z-10">{label}</span>
      <div className="flex items-baseline gap-1 relative z-10">
        <span className={`text-[16px] font-outfit font-bold ${isOver ? 'text-red-400' : ''}`} style={{ opacity: isOver ? 1 : accentOpacity }}>
          {Math.round(current)}
        </span>
        <span className="text-[9px] font-mono opacity-20">/{goal}g</span>
      </div>
      <span className="text-[8px] font-mono opacity-15 relative z-10">{Math.round(pct)}%</span>
    </div>
  );
};

// ─── HEATMAP (GREEN) ────────────────────────────────────────────────────────────
const Heatmap = ({ data }) => {
  const getCellColor = (val) => {
    if (val === 0) return 'rgba(34,197,94,0.06)';
    if (val === 1) return 'rgba(34,197,94,0.18)';
    if (val === 2) return 'rgba(34,197,94,0.35)';
    if (val === 3) return 'rgba(34,197,94,0.55)';
    return 'rgba(34,197,94,0.8)';
  };

  return (
    <div className="flex gap-[3px] overflow-hidden justify-center">
      {data.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((intensity, ci) => (
            <div
              key={ci}
              className="w-[10px] h-[10px] rounded-[3px] transition-all"
              style={{ backgroundColor: getCellColor(intensity) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── WATER CARD ─────────────────────────────────────────────────────────────────
const WaterCard = ({ totalMl, goalMl = 2000, onAdd, onRemove, onGoalChange }) => {
  const { t } = useLang();
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(goalMl));
  const [customMl, setCustomMl] = useState('');

  useEffect(() => {
    if (!editGoal) setGoalInput(String(goalMl));
  }, [goalMl, editGoal]);

  const pct = goalMl > 0 ? Math.min((totalMl / goalMl) * 100, 100) : 0;
  const liters = (totalMl / 1000).toFixed(1);
  const done = pct >= 100;

  const confirmGoal = () => {
    const v = parseInt(goalInput, 10);
    if (v > 0) onGoalChange?.(v);
    setEditGoal(false);
  };

  const handleAdd = () => {
    const v = parseInt(customMl, 10);
    if (v > 0) { onAdd?.(v); setCustomMl(''); }
  };

  return (
    <div className="rounded-[28px] border p-5 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
      {/* Water fill animation */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-1000 pointer-events-none rounded-b-[28px]"
        style={{
          height: `${pct}%`,
          background: 'linear-gradient(to top, rgba(96,165,250,0.12), rgba(59,130,246,0.04))',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets size={14} className="text-[#60a5fa]" style={{ opacity: 0.6 }} />
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-30 font-bold">{t('fitcal.hydration')}</span>
          </div>
          <div className="flex items-center gap-1">
            {editGoal ? (
              <div className="flex items-center gap-1">
                <input
                  type="number" value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmGoal(); if (e.key === 'Escape') setEditGoal(false); }}
                  className="w-14 text-[10px] font-mono font-bold text-right bg-transparent border-b outline-none"
                  style={{ borderColor: 'var(--text-main)', color: 'var(--text-main)' }}
                  autoFocus
                />
                <button onClick={confirmGoal} className="opacity-40 hover:opacity-100"><Check size={10} /></button>
              </div>
            ) : (
              <button onClick={() => { setGoalInput(String(goalMl)); setEditGoal(true); }} className="flex items-center gap-1 group">
                <span className="text-[9px] font-mono opacity-25 group-hover:opacity-50">{goalMl}ml</span>
                <Pencil size={8} className="opacity-0 group-hover:opacity-25" />
              </button>
            )}
          </div>
        </div>

        {/* Big Number */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[36px] font-outfit font-black leading-none opacity-85">{liters}</span>
          <span className="text-[12px] font-mono opacity-20">L</span>
          <span className="text-[10px] font-mono opacity-20 ml-auto">{Math.round(pct)}%</span>
        </div>

        {/* Progress */}
        <div className="h-[4px] rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'var(--border-color)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
        </div>

        {/* Quick add */}
        <div className="flex gap-1.5">
          {[150, 250, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => onAdd?.(ml)}
              className="flex-1 py-2 rounded-xl border text-[9px] font-mono font-bold opacity-30 hover:opacity-70 active:scale-95 transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              +{ml}
            </button>
          ))}
          <button
            onClick={() => onRemove?.()}
            disabled={totalMl <= 0}
            className="px-3 py-2 rounded-xl border text-[9px] font-mono opacity-15 hover:opacity-50 active:scale-95 transition-all disabled:opacity-5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <Minus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── STAT CARD ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, unit, sub }) => (
  <div className="rounded-[24px] border p-4 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
    <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.02] pointer-events-none" style={{ backgroundColor: 'var(--text-main)', filter: 'blur(20px)' }} />
    <Icon size={14} className="opacity-20 mb-3" />
    <span className="text-[7px] font-mono uppercase tracking-[0.25em] opacity-20 block mb-1">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-[22px] font-outfit font-black leading-none opacity-80">{value}</span>
      <span className="text-[10px] font-mono opacity-20">{unit}</span>
    </div>
    {sub && <span className="text-[8px] font-mono opacity-15 mt-1 block">{sub}</span>}
  </div>
);

// ─── FOOD DIARY ─────────────────────────────────────────────────────────────────
const DiarySection = ({ entries, onAddMeal, onDeleteEntry }) => {
  const { t } = useLang();
  return (
  <div className="space-y-3">
    {MEAL_TYPES.map((meal) => {
      const items = entries[meal.value] || [];
      const mealCals = items.reduce((sum, e) => sum + (e.calories ?? 0), 0);
      return (
        <div key={meal.value} className="rounded-[24px] border overflow-hidden"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
          {/* Meal Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] opacity-50">{meal.label}</span>
              {items.length > 0 && (
                <span className="text-[9px] font-mono opacity-20">{Math.round(mealCals)} kcal</span>
              )}
            </div>
            <button
              onClick={() => onAddMeal?.(meal.value)}
              className="w-6 h-6 rounded-full border flex items-center justify-center opacity-20 hover:opacity-60 transition-all"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <Plus size={11} />
            </button>
          </div>

          {/* Items */}
          {items.map((entry, idx) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-4 py-2.5 border-t transition-colors hover:bg-[var(--card-hover)]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="w-1 h-6 rounded-full opacity-10" style={{ backgroundColor: 'var(--text-main)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono font-bold block truncate opacity-65">
                  {entry.foods?.name || entry.notes || t('fitcal.food')}
                </span>
                <span className="text-[8px] font-mono opacity-20 block truncate">
                  {entry.quantity_g}g{entry.foods?.brand ? ` · ${entry.foods.brand}` : ''}
                </span>
              </div>
              <span className="text-[11px] font-outfit font-bold opacity-50 shrink-0">{Math.round(entry.calories)}</span>
              <button onClick={() => onDeleteEntry?.(entry.id)} className="opacity-10 hover:opacity-50 hover:text-red-400 transition-all shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <button
              onClick={() => onAddMeal?.(meal.value)}
              className="w-full py-4 text-center border-t transition-colors hover:bg-[var(--card-hover)]"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <span className="text-[8px] font-mono tracking-[0.2em] opacity-15">{t('lo.addBtn')}</span>
            </button>
          )}
        </div>
      );
    })}
  </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MONTH CALENDAR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAY_HDRS = ['D','S','T','Q','Q','S','S'];

const MonthCalendarModal = ({ selectedDate, onSelect, onClose }) => {
  const { t } = useLang();
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());

  const today = new Date();

  const cells = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const lastDate = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let d = 1; d <= lastDate; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [viewMonth, viewYear]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isSel = (d) => d && selectedDate.getDate() === d && selectedDate.getMonth() === viewMonth && selectedDate.getFullYear() === viewYear;
  const isTod = (d) => d && today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[428px] rounded-t-[32px] p-5 pb-10"
        style={{ backgroundColor: 'var(--bg-color)', borderTop: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4 opacity-20" style={{ backgroundColor: 'var(--text-main)' }} />

        {/* Month nav header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity opacity-40 hover:opacity-80"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[14px] font-outfit font-bold" style={{ color: 'var(--text-main)', opacity: 0.75 }}>
              {t('common.months')[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity opacity-40 hover:opacity-80"
              style={{ border: '1px solid var(--border-color)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl transition-opacity opacity-25 hover:opacity-55">
            <X size={16} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {t('common.weekdaysSun').map((h, i) => (
            <div key={i} className="text-center text-[8px] font-mono uppercase tracking-widest py-1.5" style={{ opacity: 0.2, color: 'var(--text-main)' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => (
            <button
              key={i}
              disabled={!d}
              onClick={() => d && onSelect(new Date(viewYear, viewMonth, d))}
              className={`h-9 w-full rounded-xl flex items-center justify-center text-[13px] font-outfit font-semibold transition-all
                ${!d ? 'invisible pointer-events-none' : ''}
                ${isSel(d) ? 'scale-105' : 'hover:opacity-80'}
              `}
              style={
                isSel(d)
                  ? { backgroundColor: '#22c55e', color: '#000', boxShadow: '0 0 14px rgba(34,197,94,0.4)', opacity: 1 }
                  : isTod(d)
                  ? { border: '1px solid rgba(34,197,94,0.55)', color: 'var(--text-main)', opacity: 0.85 }
                  : { color: 'var(--text-main)', opacity: 0.55 }
              }
            >
              {d}
            </button>
          ))}
        </div>

        {/* Jump to today */}
        <button
          onClick={() => onSelect(new Date())}
          className="w-full mt-4 py-2.5 rounded-2xl text-[9px] font-mono font-bold uppercase tracking-widest transition-opacity opacity-25 hover:opacity-55"
          style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
        >
          Hoje
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const FitCalHome = ({ theme, toggleTheme, onModalChange }) => {
  const { t } = useLang();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = current week, -1 = last week, etc.
  const [showCalendar, setShowCalendar] = useState(false);
  const { entries, totals, loading: diaryLoading, refresh: refreshDiary } = useFoodDiary(selectedDate);
  const { plan, loading: planLoading, refresh: refreshPlan } = useNutritionPlan();
  const { setup, needsOnboarding, refresh: refreshSetup } = useNutritionSetup();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { streak, refresh: refreshStreak } = useStreak();
  const { totalMl, refresh: refreshWater } = useWater();

  // Week calendar — navigable via weekOffset
  const week = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const weekArr = [];
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDayOfWeek + weekOffset * 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekArr.push({
        label: dayLabels[d.getDay()],
        num: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear(),
        isToday: d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear(),
        full: new Date(d)
      });
    }
    return weekArr;
  }, [weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (!week.length) return '';
    const first = week[0];
    const last = week[6];
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    if (first.month === last.month) return `${first.num}–${last.num} ${months[first.month]}`;
    return `${first.num} ${months[first.month]} – ${last.num} ${months[last.month]}`;
  }, [week]);

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    // Compute weekOffset so the week strip shows the week containing the picked date
    const today = new Date();
    const todayDow = today.getDay();
    const todayWeekMs = new Date(today.getFullYear(), today.getMonth(), today.getDate() - todayDow).getTime();
    const dateDow = date.getDay();
    const dateWeekMs = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dateDow).getTime();
    setWeekOffset(Math.round((dateWeekMs - todayWeekMs) / (7 * 24 * 60 * 60 * 1000)));
    setShowCalendar(false);
  };

  const [view, setView] = useState('home');
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [activeMealType, setActiveMealType] = useState('lunch');
  const [userId, setUserId] = useState(null);
  const [showFab, setShowFab] = useState(false);
  const [localCalorieGoal, setLocalCalorieGoal] = useState(null);
  const [localWaterGoal, setLocalWaterGoal] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('SEM');

  // Métricas REAIS — substituem os mocks
  const fitcalPeriod = chartPeriod === 'SEM' ? 'week' : chartPeriod === 'MES' ? 'month' : '3months';
  const { chartData: weeklyData, heatmap: heatmapData } = useFitcalMetrics(fitcalPeriod);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  // Realtime sync — atualiza diário/água/peso quando muda em outro dispositivo
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`fitcal-sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_logs' }, () => {
        refreshDiary();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_logs' }, () => {
        refreshWater();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_logs' }, () => {
        // hook useWeight já refetcha; se houver, é no-op
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nutrition_plans' }, () => {
        refreshPlan();
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddMeal = (mealType) => {
    setActiveMealType(mealType);
    setShowAddMeal(true);
    setShowFab(false);
    onModalChange?.(true);
  };

  const handleDeleteEntry = async (entryId) => {
    await deleteLog(entryId);
    refreshDiary();
  };

  const handleMealAdded = async () => {
    refreshDiary();
    if (userId) { await updateStreak(userId); refreshStreak(); }
  };

  const handleWaterAdd = async (ml) => {
    if (!userId) return;
    await addWater(userId, ml);
    refreshWater();
  };

  const handleWaterGoalChange = async (newGoal) => {
    setLocalWaterGoal(newGoal);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await updateWaterGoal(session.user.id, newGoal);
    refreshPlan();
  };

  const handleWaterRemove = async () => {
    if (!userId) return;
    await deleteLastWater(userId);
    refreshWater();
  };

  const handleScanResult = async (items, mealType, photoUrl) => {
    if (!userId || !items?.length) return;
    // Loga cada item via RPC log_food_from_ai (que valida ranges e cria no catálogo)
    await Promise.all(
      items.map(it =>
        logFromAI({
          name: it.name,
          mealType,
          grams: it.quantity_g || 100,
          calories: it.calories || 0,
          protein_g: it.protein_g || 0,
          carbs_g: it.carbs_g || 0,
          fat_g: it.fat_g || 0,
          confidence: it.confidence,
          photoUrl,
        }).catch(err => console.error('logFromAI falhou para', it.name, err))
      )
    );
    refreshDiary();
    await updateStreak(userId);
    refreshStreak();
  };

  const calorieGoal = localCalorieGoal ?? plan?.daily_calories ?? 2000;

  useEffect(() => {
    if (plan?.daily_calories) setLocalCalorieGoal(plan.daily_calories);
  }, [plan?.daily_calories]);

  useEffect(() => {
    if (plan?.water_ml) setLocalWaterGoal(plan.water_ml);
  }, [plan?.water_ml]);

  const handleGoalChange = async (newGoal) => {
    setLocalCalorieGoal(newGoal);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await updateCalorieGoal(session.user.id, newGoal);
    refreshPlan();
  };

  if (view === 'progress') {
    return (
      <div className="relative w-full h-full">
        <ScrollContainer>
          <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
          <ProgressPage onBack={() => setView('home')} />
        </ScrollContainer>
      </div>
    );
  }

  const isLoading = diaryLoading || planLoading;
  const isLight = theme === 'light';

  return (
    <div className="relative w-full h-full">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="pb-36 relative" style={{ color: 'var(--text-main)' }}>
          {/* Subtle dotted grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(var(--text-main) 0.5px, transparent 0.5px)',
              backgroundSize: '24px 24px',
              opacity: 0.02
            }}
          />

          {/* ═══ HEADER ═══ */}
          <div className="px-5 pt-4 pb-2 relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-[18px] font-outfit font-black tracking-tight opacity-90 leading-tight">{t('fitcal.title')}</h1>
                <p className="text-[9px] font-mono opacity-15 tracking-[0.25em] uppercase mt-1">{t('fitcal.subtitle')}</p>
              </div>

              {/* Streak + Points Badges */}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                  <Flame size={11} className="opacity-30" />
                  <span className="text-[10px] font-mono font-bold opacity-50">{streak?.streak_days || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                  <Star size={11} className="opacity-30" />
                  <span className="text-[10px] font-mono font-bold opacity-50">{streak?.total_points || 0}</span>
                </div>
              </div>
            </div>

            {/* ═══ METAS NÃO CONFIGURADAS — abre o cálculo real (VITALIS N1) ═══ */}
            {needsOnboarding && (
              <button
                onClick={() => setShowOnboarding(true)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border mb-3 text-left transition-all active:scale-[0.99]"
                style={{ borderColor: '#22c55e44', backgroundColor: '#22c55e0D' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ border: '1px solid #22c55e33', backgroundColor: '#22c55e14' }}>
                  <Target size={15} style={{ color: '#22c55e' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold leading-tight">{t('fitcal.setupTitle')}</p>
                  <p className="text-[9px] font-mono opacity-45 leading-snug mt-0.5">{t('fitcal.setupSub')}</p>
                </div>
                <ChevronRight size={14} className="opacity-40 shrink-0" />
              </button>
            )}

            {/* ═══ WEEK CALENDAR ═══ */}
            <div>
              {/* Week nav row */}
              <div className="flex items-center justify-between mb-2 px-1">
                <button
                  onClick={() => setWeekOffset(o => o - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl transition-all opacity-35 hover:opacity-70 active:scale-90"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[9px] font-mono font-semibold tracking-widest uppercase" style={{ opacity: 0.3, color: 'var(--text-main)' }}>
                  {weekRangeLabel}
                  {weekOffset === 0 && <span className="ml-1.5 text-[#22c55e] opacity-80">{t('fitcal.today')}</span>}
                </span>
                <button
                  onClick={() => setWeekOffset(o => o + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-xl transition-all opacity-35 hover:opacity-70 active:scale-90"
                  style={{ border: '1px solid var(--border-color)' }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Day pills + calendar icon */}
              <div
                className="glass-panel p-3 rounded-[24px] flex items-center justify-between gap-1 relative overflow-hidden"
                style={{ border: '1px solid var(--border-color)', boxShadow: 'var(--glass-shadow)' }}
              >
                {week.map((d, i) => {
                  const isSelected = selectedDate.getDate() === d.num &&
                    selectedDate.getMonth() === d.month &&
                    selectedDate.getFullYear() === d.year;

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(new Date(d.year, d.month, d.num))}
                      className={`relative flex flex-col items-center justify-center w-10 h-14 rounded-2xl transition-all duration-300
                        ${isSelected ? 'scale-110' : 'opacity-50 hover:opacity-90 hover:scale-105'}
                      `}
                      style={{
                        backgroundColor: isSelected ? '#22c55e' : 'transparent',
                        color: isSelected ? '#000' : 'var(--text-main)',
                        boxShadow: isSelected ? '0 0 16px rgba(34,197,94,0.3)' : 'none'
                      }}
                    >
                      <span className={`text-[8px] font-mono uppercase mb-0.5 tracking-widest ${isSelected ? 'opacity-70 font-bold' : 'opacity-40'}`}>
                        {d.label}
                      </span>
                      <span className={`text-[15px] font-outfit font-bold ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
                        {d.num}
                      </span>
                      {/* Today dot */}
                      {d.isToday && !isSelected && (
                        <div className="absolute bottom-1.5 w-1 h-1 bg-[#22c55e] rounded-full" style={{ boxShadow: '0 0 5px rgba(34,197,94,0.6)' }} />
                      )}
                    </button>
                  );
                })}

                {/* Calendar icon → open month picker */}
                <button
                  onClick={() => setShowCalendar(true)}
                  className="w-10 h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all shrink-0 opacity-30 hover:opacity-70 active:scale-95"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <CalendarDays size={14} />
                  <span className="text-[6px] font-mono uppercase opacity-60">{t('fitcal.month')}</span>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-28">
              <Loader2 size={22} className="animate-spin mx-auto opacity-15 mb-4" />
              <span className="text-[8px] font-mono opacity-15 tracking-[0.3em] uppercase">{t('fitcal.loadingData')}</span>
            </div>
          ) : (
            <div className="px-5 space-y-4 relative z-10">

              {/* ═══ CALORIE CARD ═══ */}
              <div className="rounded-[28px] border p-6 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)', boxShadow: 'var(--glass-shadow)' }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-[0.015] pointer-events-none" style={{ backgroundColor: 'var(--text-main)', filter: 'blur(40px)' }} />
                <CalorieRing consumed={totals.calories} goal={calorieGoal} onGoalChange={handleGoalChange} />
              </div>

              {/* ═══ MACROS (Bento) ═══ */}
              <div className="flex gap-2">
                <MacroPill label="Prot" current={totals.protein_g} goal={plan?.protein_g || 120} />
                <MacroPill label="Carb" current={totals.carbs_g} goal={plan?.carbs_g || 250} />
                <MacroPill label="Gord" current={totals.fat_g} goal={plan?.fat_g || 65} />
              </div>

              {/* ═══ HERO CHART (Inverted Contrast) ═══ */}
              <div
                className="rounded-[28px] p-5 relative overflow-hidden"
                style={{
                  backgroundColor: isLight ? '#0a0a0b' : '#f8f8f8',
                  color: isLight ? '#a1a1aa' : '#3f3f46',
                  boxShadow: isLight ? '0 20px 60px rgba(0,0,0,0.25)' : '0 20px 60px rgba(0,0,0,0.08)'
                }}
              >
                {/* Section Label */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={12} style={{ opacity: 0.3 }} />
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] font-bold" style={{ opacity: 0.4 }}>intake vs output</span>
                  </div>

                  {/* Period Pills */}
                  <div className="flex gap-0.5">
                    {['SEM', 'MES', '3M'].map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`px-2 py-0.5 rounded-full text-[7px] font-mono font-bold tracking-wider transition-all ${
                          chartPeriod === p ? 'opacity-100' : 'opacity-25 hover:opacity-50'
                        }`}
                        style={chartPeriod === p ? {
                          backgroundColor: isLight ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                        } : {}}
                      >
                        {t('capital.period.' + p)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={weeklyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 6"
                        stroke={isLight ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', fill: isLight ? '#52525b' : '#a1a1aa' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace', fill: isLight ? '#3f3f46' : '#d4d4d8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={false} />
                      <Bar
                        dataKey="intake"
                        name="Intake"
                        fill={isLight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
                        radius={[6, 6, 0, 0]}
                        barSize={24}
                      />
                      <Line
                        type="monotone"
                        dataKey="output"
                        name="Output"
                        stroke={isLight ? '#71717a' : '#71717a'}
                        strokeWidth={2}
                        dot={{ r: 3, fill: isLight ? '#0a0a0b' : '#f8f8f8', stroke: isLight ? '#71717a' : '#71717a', strokeWidth: 1.5 }}
                        activeDot={{ r: 5, stroke: isLight ? '#fff' : '#000', strokeWidth: 2 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 mt-3 pt-3" style={{ borderTop: `1px solid ${isLight ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-[3px]" style={{ backgroundColor: isLight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                    <span className="text-[7px] font-mono uppercase tracking-wider" style={{ opacity: 0.3 }}>intake</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-[2px] rounded-full" style={{ backgroundColor: '#71717a' }} />
                    <span className="text-[7px] font-mono uppercase tracking-wider" style={{ opacity: 0.3 }}>output</span>
                  </div>
                </div>
              </div>

              {/* ═══ BENTO GRID: Stats ═══ */}
              <div className="grid grid-cols-2 gap-2">
                <StatCard icon={Moon} label={t('fitcal.deepSleep')} value="2.1" unit="hrs" sub={t('fitcal.remCycle')} />
                <StatCard icon={Droplets} label={t('fitcal.hydrationCap')} value={((totalMl / 1000)).toFixed(1)} unit="L" sub={`${Math.min(Math.round((totalMl / (localWaterGoal ?? plan?.water_ml ?? 2000)) * 100), 100)}${t('fitcal.pctOfGoal')}`} />
              </div>

              {/* ═══ EXECUTION HEATMAP ═══ */}
              <div className="rounded-[28px] border p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={13} className="opacity-25" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-30 font-bold">execution map</span>
                  </div>
                  <span className="text-[7px] font-mono opacity-12 tracking-wider">{t('lo.weeks12')}</span>
                </div>
                <Heatmap data={heatmapData} />
                {/* Scale */}
                <div className="flex items-center justify-end gap-1.5 mt-3">
                  <span className="text-[7px] font-mono opacity-15">-</span>
                  {[0, 1, 2, 3, 4].map(v => (
                    <div
                      key={v}
                      className="w-[10px] h-[10px] rounded-[3px]"
                      style={{ backgroundColor: v === 0 ? 'rgba(34,197,94,0.06)' : `rgba(34,197,94,${v * 0.2})` }}
                    />
                  ))}
                  <span className="text-[7px] font-mono opacity-15">+</span>
                </div>
              </div>

              {/* ═══ WATER TRACKER ═══ */}
              <WaterCard
                totalMl={totalMl}
                goalMl={localWaterGoal ?? plan?.water_ml ?? 2000}
                onAdd={handleWaterAdd}
                onRemove={handleWaterRemove}
                onGoalChange={handleWaterGoalChange}
              />

              {/* ═══ PROGRESS LINK ═══ */}
              <button
                onClick={() => setView('progress')}
                className="w-full flex items-center justify-between px-5 py-4 rounded-[20px] border transition-all hover:bg-[var(--card-hover)] active:scale-[0.99]"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={14} className="opacity-25" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] opacity-40">{t('fitcal.progressWeight')}</span>
                </div>
                <ChevronRight size={14} className="opacity-15" />
              </button>

              {/* ═══ FOOD DIARY ═══ */}
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">{t('fitcal.foodDiary')}</span>
                </div>
                <DiarySection entries={entries} onAddMeal={handleAddMeal} onDeleteEntry={handleDeleteEntry} />
              </div>

            </div>
          )}
        </div>
      </ScrollContainer>

      {/* ═══ FAB ═══ */}
      <div className="fixed bottom-24 right-1/2 translate-x-[180px] z-40">
        {showFab && (
          <div className="absolute bottom-14 right-0 space-y-2 mb-2">
            <button
              onClick={() => { setShowScanner(true); setShowFab(false); onModalChange?.(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border whitespace-nowrap transition-all backdrop-blur-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
            >
              <Camera size={13} className="opacity-35" />
              <span className="text-[9px] font-mono font-bold tracking-wider opacity-50">{t('fitcal.aiScanner')}</span>
            </button>
            <button
              onClick={() => handleAddMeal('lunch')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border whitespace-nowrap transition-all backdrop-blur-xl hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
            >
              <Search size={13} className="opacity-35" />
              <span className="text-[9px] font-mono font-bold tracking-wider opacity-50">{t('fitcal.searchFood')}</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setShowFab(!showFab)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 ${showFab ? 'rotate-45' : ''}`}
          style={{
            backgroundColor: 'var(--text-main)',
            color: 'var(--bg-color)',
            boxShadow: '0 8px 24px var(--accent-glow)'
          }}
        >
          <Plus size={20} strokeWidth={1.5} />
        </button>
      </div>

      {/* ═══ MODALS ═══ */}
      <AddMealModal
        open={showAddMeal}
        mealType={activeMealType}
        onClose={() => { setShowAddMeal(false); onModalChange?.(false); }}
        onAdded={handleMealAdded}
      />
      {showScanner && userId && (
        <FoodScanner
          userId={userId}
          mealType={activeMealType}
          onResult={handleScanResult}
          onClose={() => { setShowScanner(false); onModalChange?.(false); }}
        />
      )}

      {/* ═══ MONTH CALENDAR MODAL ═══ */}
      {showCalendar && (
        <MonthCalendarModal
          selectedDate={selectedDate}
          onSelect={handleDateSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* ═══ ONBOARDING NUTRICIONAL (gera as metas reais) ═══ */}
      {showOnboarding && (
        <NutritionOnboarding
          initial={setup || {}}
          onClose={() => setShowOnboarding(false)}
          onDone={() => {
            setShowOnboarding(false);
            refreshSetup();
            refreshPlan();
          }}
        />
      )}
    </div>
  );
};

export default FitCalHome;
