import React from 'react';
import { SCORING_TYPES, ACTIVITY_TYPES } from '../utils/formatters';

const ScoringConfig = ({ scoringType, setScoringType, config, setConfig }) => {
  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const inputClass = "w-full text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2 outline-none transition-all focus:border-[#22c55e]/50";

  return (
    <div className="space-y-4">
      <label className="text-[9px] font-mono opacity-50 tracking-wider block">TIPO DE PONTUACAO</label>

      <div className="space-y-1.5">
        {SCORING_TYPES.map((st) => (
          <button
            key={st.value}
            onClick={() => setScoringType(st.value)}
            className={`w-full text-left px-3 py-2.5 rounded-sm border transition-all ${scoringType === st.value ? 'border-[#22c55e]/40' : ''}`}
            style={{
              backgroundColor: scoringType === st.value ? 'rgba(34,197,94,0.08)' : 'var(--glass-bg)',
              borderColor: scoringType === st.value ? 'rgba(34,197,94,0.3)' : 'var(--border-color)',
            }}
          >
            <span className="text-[11px] font-bold block">{st.label}</span>
            <span className="text-[9px] font-mono opacity-50">{st.desc}</span>
          </button>
        ))}
      </div>

      {/* Config fields based on type */}
      {scoringType === 'workouts' && (
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PONTOS POR TREINO</label>
          <input
            type="number"
            value={config.per_workout ?? 1}
            onChange={(e) => handleConfigChange('per_workout', e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      )}

      {scoringType === 'minutes' && (
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PONTOS POR MINUTO</label>
          <input
            type="number"
            step="0.1"
            value={config.per_minute ?? 1}
            onChange={(e) => handleConfigChange('per_minute', e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      )}

      {scoringType === 'calories' && (
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PONTOS POR CALORIA</label>
          <input
            type="number"
            step="0.01"
            value={config.per_calorie ?? 0.1}
            onChange={(e) => handleConfigChange('per_calorie', e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      )}

      {scoringType === 'steps' && (
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">PONTOS POR 1000 PASSOS</label>
          <input
            type="number"
            value={config.per_1k_steps ?? 1}
            onChange={(e) => handleConfigChange('per_1k_steps', e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      )}

      {scoringType === 'custom' && (
        <div className="space-y-2">
          <label className="text-[9px] font-mono opacity-50 tracking-wider block">PONTOS POR ATIVIDADE</label>
          {ACTIVITY_TYPES.map((a) => (
            <div key={a.value} className="flex items-center gap-3">
              <span className="text-[11px] w-24">{a.icon} {a.label}</span>
              <input
                type="number"
                value={config[a.value] ?? 1}
                onChange={(e) => handleConfigChange(a.value, e.target.value)}
                className={inputClass + " flex-1"}
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScoringConfig;
