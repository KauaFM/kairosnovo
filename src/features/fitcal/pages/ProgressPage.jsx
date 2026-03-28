import React, { useState, useEffect } from 'react';
import { ArrowLeft, Scale, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useWeight } from '../hooks/useWeight';
import { logWeight } from '../services/weightService';
import { getWeeklySummary } from '../services/foodService';
import WeightChart from '../components/WeightChart';

const ProgressPage = ({ onBack }) => {
  const { history, loading: weightLoading, refresh: refreshWeight } = useWeight(60);
  const [newWeight, setNewWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await getWeeklySummary(session.user.id);
      setWeeklySummary(data);
      setSummaryLoading(false);
    };
    load();
  }, []);

  const handleSaveWeight = async () => {
    if (!newWeight) return;
    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await logWeight(session.user.id, parseFloat(newWeight));
      setNewWeight('');
      refreshWeight();
    } catch (err) {
      console.error('Weight save error:', err);
      setError('Erro ao salvar peso. Verifique sua conexao ou perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-sm font-bold tracking-wider">PROGRESSO</h2>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">PESO & NUTRICAO</span>
        </div>
      </div>
      
      {error && (
        <div className="px-3 py-2 rounded-sm border border-red-400/30 bg-red-400/10 text-red-500 text-[11px] font-mono">
          {error}
        </div>
      )}

      {/* Weight input */}
      <div className="p-3 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Scale size={14} className="text-[#22c55e]" />
          <span className="text-[10px] font-mono font-bold tracking-wider opacity-60">REGISTRAR PESO</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="Ex: 72.5"
            className="flex-1 text-[14px] font-mono bg-transparent border rounded-sm px-3 py-2 outline-none text-center transition-all focus:border-[#22c55e]/50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
          <span className="self-center text-[11px] font-mono opacity-40">kg</span>
          <button
            onClick={handleSaveWeight}
            disabled={!newWeight || saving}
            className="px-4 rounded-sm font-bold text-[11px] tracking-wider transition-all disabled:opacity-30"
            style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'SALVAR'}
          </button>
        </div>
      </div>

      {/* Weight chart */}
      {weightLoading ? (
        <div className="text-center py-6">
          <Loader2 size={20} className="animate-spin mx-auto opacity-30" />
        </div>
      ) : (
        <WeightChart data={history} />
      )}

      {/* Weekly summary */}
      <div>
        <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-60 mb-3">RESUMO SEMANAL</h3>
        {summaryLoading ? (
          <div className="text-center py-4">
            <span className="text-[10px] font-mono opacity-40 animate-pulse">CARREGANDO...</span>
          </div>
        ) : weeklySummary.length === 0 ? (
          <p className="text-center py-4 text-[10px] font-mono opacity-40">Nenhum dado esta semana</p>
        ) : (
          <div className="space-y-1">
            {weeklySummary.map((day) => (
              <div key={day.date} className="flex items-center justify-between px-3 py-2 rounded-sm border"
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] font-mono opacity-60">{day.date}</span>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="font-bold">{Math.round(day.calories)} kcal</span>
                  <span className="text-[#00B4D8]">P:{Math.round(day.protein)}g</span>
                  <span className="text-[#F59E0B]">C:{Math.round(day.carbs)}g</span>
                  <span className="text-[#EF4444]">G:{Math.round(day.fat)}g</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressPage;
