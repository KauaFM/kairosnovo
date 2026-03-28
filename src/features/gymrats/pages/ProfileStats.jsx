import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Flame, Clock, Dumbbell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getWorkoutHistory } from '../services/checkinService';
import { timeAgo, formatDuration, ACTIVITY_TYPES } from '../utils/formatters';

const ProfileStats = ({ onBack }) => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, totalPoints: 0, totalMinutes: 0, totalCalories: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getWorkoutHistory(session.user.id, 50);
      setWorkouts(data);

      const total = data.length;
      const totalPoints = data.reduce((sum, w) => sum + Number(w.points || 0), 0);
      const totalMinutes = data.reduce((sum, w) => sum + (w.duration_min || 0), 0);
      const totalCalories = data.reduce((sum, w) => sum + (w.calories || 0), 0);
      setStats({ total, totalPoints, totalMinutes, totalCalories });
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-sm font-bold tracking-wider">MEU HISTORICO</h2>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">MARCAS PESSOAIS</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'TOTAL TREINOS', value: stats.total, icon: Dumbbell, color: '#22c55e' },
          { label: 'PONTOS TOTAIS', value: stats.totalPoints.toFixed(0), icon: Trophy, color: '#FFD700' },
          { label: 'MINUTOS TOTAIS', value: formatDuration(stats.totalMinutes), icon: Clock, color: '#3b82f6' },
          { label: 'CALORIAS', value: stats.totalCalories.toLocaleString(), icon: Flame, color: '#ef4444' },
        ].map((s, i) => (
          <div key={i} className="p-3 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} style={{ color: s.color }} />
              <span className="text-[8px] font-mono opacity-50 tracking-widest">{s.label}</span>
            </div>
            <span className="text-lg font-bold font-mono">{loading ? '--' : s.value}</span>
          </div>
        ))}
      </div>

      {/* Workout list */}
      <div>
        <h3 className="text-[10px] font-mono opacity-50 tracking-wider mb-3">TREINOS RECENTES</h3>
        {loading ? (
          <div className="text-center py-8">
            <span className="text-[10px] font-mono opacity-40 animate-pulse">CARREGANDO...</span>
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-8 opacity-40">
            <p className="text-[11px] font-mono">Nenhum treino registrado ainda</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {workouts.map((w) => {
              const activity = ACTIVITY_TYPES.find(a => a.value === w.activity_type) || ACTIVITY_TYPES[7];
              return (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2.5 rounded-sm border"
                  style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                  <span className="text-lg">{activity.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold block truncate">{w.title}</span>
                    <span className="text-[9px] font-mono opacity-40">
                      {w.challenges?.name && `${w.challenges.name} · `}{timeAgo(w.created_at)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#22c55e]">+{Number(w.points).toFixed(0)}</span>
                    <span className="text-[8px] font-mono opacity-40 block">PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileStats;
