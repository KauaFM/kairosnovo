import React, { useState } from 'react';
import { useLang } from '../../../i18n/LanguageContext';
import { ArrowLeft, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { createChallenge } from '../services/challengeService';
import ScoringConfig from '../components/ScoringConfig';

import { toLocalDateStr } from '../../../utils/dateUtils';

const CreateChallenge = ({ onBack, onCreated }) => {
  const { t } = useLang();
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

  // `new Date('2026-09-05')` é meia-noite UTC — em Brasília, 21h do
  // dia 4. Era o mesmo bug de fuso do gráfico financeiro, e aqui
  // custava caro: o desafio começava 3h antes e, pior, TERMINAVA às
  // 21h do dia anterior ao escolhido, encurtando-o em um dia inteiro.
  // Montando a data por partes, ela nasce no fuso local.
  const inicioDoDiaLocal = (yyyyMmDd) => {
    const [a, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(a, m - 1, d, 0, 0, 0, 0);
  };
  const fimDoDiaLocal = (yyyyMmDd) => {
    const [a, m, d] = yyyyMmDd.split('-').map(Number);
    // 23:59:59 do dia escolhido: quem marca "termina dia 30" espera
    // ter o dia 30 inteiro.
    return new Date(a, m - 1, d, 23, 59, 59, 999);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t('arena.errName')); return; }

    // Validações que faltavam — dava para criar um desafio que
    // termina antes de começar, ou com 0 participantes.
    if (endsAt && fimDoDiaLocal(endsAt) <= inicioDoDiaLocal(startsAt)) {
      setError('A data de fim precisa ser depois da de início.');
      return;
    }
    if (maxParticipants && parseInt(maxParticipants, 10) < 2) {
      setError('Um desafio precisa de pelo menos 2 participantes.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('arena.notAuth'));

      const challenge = await createChallenge(
        {
          name: name.trim(),
          description: description.trim() || null,
          scoring_type: scoringType,
          scoring_config: scoringConfig,
          allow_teams: allowTeams,
          max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
          starts_at: inicioDoDiaLocal(startsAt).toISOString(),
          ends_at: endsAt ? fimDoDiaLocal(endsAt).toISOString() : null,
        },
        session.user.id
      );
      onCreated?.(challenge);
    } catch (err) {
      if (err.code === '23503') {
        setError(t('arena.errProfile'));
      } else {
        setError(err.message || t('arena.errCreate'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-[12px] font-mono bg-transparent border rounded-sm px-3 py-2.5 outline-none transition-all focus:border-[#22c55e]/50";

  // Data por extenso, montada por partes pelo mesmo motivo das
  // outras: toLocaleDateString sobre `new Date('YYYY-MM-DD')` mostra
  // o dia anterior em Brasília.
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const formatarDia = (yyyyMmDd) => {
    if (!yyyyMmDd) return '';
    const [, m, d] = yyyyMmDd.split('-').map(Number);
    return `${d} de ${MESES[m - 1]}`;
  };
  const duracaoEmDias = endsAt
    ? Math.max(1, Math.round((inicioDoDiaLocal(endsAt) - inicioDoDiaLocal(startsAt)) / 86400000) + 1)
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-sm font-bold tracking-wider">{t('arena.createTitle')}</h2>
          <span className="text-[9px] font-mono opacity-40 tracking-widest">{t('arena.newBattlefield')}</span>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-sm border border-red-400/30 bg-red-400/10 text-red-400 text-[11px] font-mono">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('arena.challengeName')}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('arena.namePh')}
          className={inputClass}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('arena.descLabel')}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('arena.descPh')}
          rows={3}
          className={inputClass + " resize-none"}
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('arena.startLabel')}</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
        </div>
        <div>
          <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('arena.endLabel')}</label>
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
        <label className="text-[9px] font-mono opacity-50 tracking-wider block mb-1.5">{t('arena.maxLabel')}</label>
        <input
          type="number"
          value={maxParticipants}
          onChange={(e) => setMaxParticipants(e.target.value)}
          placeholder={t('arena.maxPh')}
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
        <span className="text-[11px] font-mono">{t('arena.allowTeams')}</span>
      </div>

      {/* Scoring */}
      <ScoringConfig
        scoringType={scoringType}
        setScoringType={setScoringType}
        config={scoringConfig}
        setConfig={setScoringConfig}
      />

      {/* Resumo — antes era só o botão: a pessoa configurava seis
          campos e apertava sem ver o que ia nascer. Datas em
          português, duração calculada, e o que ficou em aberto dito
          com todas as letras. */}
      {name.trim() && (
        <div className="rounded-sm border px-3 py-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] opacity-40 block mb-2">
            O que vai ser criado
          </span>
          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
            <strong>{name.trim()}</strong>, começando {formatarDia(startsAt)}
            {endsAt ? ` e terminando ${formatarDia(endsAt)} (${duracaoEmDias} ${duracaoEmDias === 1 ? 'dia' : 'dias'})` : ', sem data de fim'}.
            {' '}{maxParticipants ? `Até ${maxParticipants} participantes` : 'Sem limite de participantes'}
            {allowTeams ? ', em equipes' : ', individual'}.
          </p>
          <p className="text-[10px] font-mono opacity-40 mt-2">
            Você entra como admin e recebe um código para convidar.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!name.trim() || submitting}
        className="w-full py-3 rounded-sm font-bold text-[12px] tracking-wider transition-all disabled:opacity-30 flex items-center justify-center gap-2"
        style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
      >
        <Zap size={14} />
        {submitting ? t('arena.creating') + '...' : t('arena.createTitle')}
      </button>
    </div>
  );
};

export default CreateChallenge;
