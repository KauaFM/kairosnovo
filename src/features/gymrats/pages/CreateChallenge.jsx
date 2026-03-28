import React, { useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createChallenge } from '../services/challengeService';
import ScoringConfig from '../components/ScoringConfig';

import { toLocalDateStr } from '../../../utils/dateUtils';

const CreateChallenge = ({ onBack, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scoringType, setScoringType] = useState('workouts');
  const [scoringConfig, setScoringConfig] = useState({});
  const [allowTeams, setAllowTeams] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [startsAt, setStartsAt] = useState(toLocalDateStr());
  const [endsAt, setEndsAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nome obrigatorio'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nao autenticado');

      const challenge = await createChallenge(
        {
          name: name.trim(),
          description: description.trim() || null,
          scoring_type: scoringType,
          scoring_config: scoringConfig,
          allow_teams: allowTeams,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        },
        session.user.id
      );
      onCreated?.(challenge);
    } catch (err) {
      if (err.code === '23503') {
        setError('Perfil não encontrado. Por favor, tente novamente ou contate o suporte.');
      } else {
        setError(err.message || 'Erro ao criar desafio');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2.5 outline-none transition-all focus:border-[#22c55e]/50";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-sm font-bold tracking-wider">CRIAR DESAFIO</h2>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">NOVO CAMPO DE BATALHA</span>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-sm border border-red-400/30 bg-red-400/10 text-red-400 text-[11px] font-mono">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">NOME DO DESAFIO *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Desafio Verao 2026"
          className={inputClass}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">DESCRICAO</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Regras e objetivos do desafio..."
          rows={3}
          className={inputClass + " resize-none"}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">INICIO *</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">FIM (OPCIONAL)</label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
      </div>

      {/* Max participants */}
      <div>
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">MAX PARTICIPANTES (OPCIONAL)</label>
        <input
          type="number"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          placeholder="Sem limite"
          className={inputClass}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
      </div>

      {/* Allow teams */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setAllowTeams(!allowTeams)}
          className={`w-10 h-5 rounded-full transition-all relative ${allowTeams ? 'bg-[#22c55e]' : ''}`}
          style={{ backgroundColor: allowTeams ? '#22c55e' : 'var(--glass-bg)', border: '1px solid var(--border-color)' }}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${allowTeams ? 'translate-x-5' : 'translate-x-0.5'}`}
            style={{ backgroundColor: 'var(--text-main)' }} />
        </button>
        <span className="text-[11px] font-mono">Permitir times</span>
      </div>

      {/* Scoring */}
      <ScoringConfig
        scoringType={scoringType}
        setScoringType={setScoringType}
        config={scoringConfig}
        setConfig={setScoringConfig}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || submitting}
        className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
      >
        <Zap size={14} />
        {submitting ? 'CRIANDO...' : 'CRIAR DESAFIO'}
      </button>
    </div>
  );
};

export default CreateChallenge;
