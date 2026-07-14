import React, { useState } from 'react';
import { useLang } from '../../../i18n/LanguageContext';
import { Users, Calendar, Trophy, Copy, Check, ChevronRight } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const ChallengeCard = ({ challenge, onPress }) => {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const memberCount = challenge.challenge_members?.[0]?.count ?? 0;
  const isActive = challenge.is_active && (!challenge.ends_at || new Date(challenge.ends_at) > new Date());

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(challenge.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={() => onPress(challenge)}
      className="w-full text-left rounded-[24px] border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group cursor-pointer"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--border-color)',
      }}
    >
      {/* Status glow bar */}
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{
        background: isActive
          ? 'linear-gradient(90deg, #22c55e, transparent 60%)'
          : 'linear-gradient(90deg, rgba(239,68,68,0.4), transparent 60%)',
      }} />

      <div className="p-4">
        {/* Top row: Name + Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-[12px] font-outfit font-bold tracking-tight truncate opacity-80">
              {challenge.name}
            </h3>
            {challenge.description && (
              <p className="text-[9px] font-mono opacity-25 mt-1 line-clamp-1 tracking-wider">
                {challenge.description}
              </p>
            )}
          </div>
          <div
            className={`shrink-0 px-2 py-1 rounded-xl text-[7px] font-mono font-bold tracking-[0.15em] uppercase ${
              isActive ? 'text-[#22c55e]' : 'text-red-400 opacity-50'
            }`}
            style={{
              backgroundColor: isActive ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'}`,
            }}
          >
            {isActive ? 'ATIVO' : 'FIM'}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-30">
            <Users size={11} /> {memberCount}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-30">
            <Calendar size={11} /> {formatDate(challenge.starts_at)}
          </span>
          <span className="flex items-center gap-1.5 text-[9px] font-mono opacity-30">
            <Trophy size={11} /> {challenge.scoring_type}
          </span>
        </div>

        {/* Code + Arrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono opacity-15 tracking-[0.2em] uppercase">{t('arena.code')}</span>
            <span
              className="text-[10px] font-mono font-bold tracking-[0.25em] px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}
            >
              {challenge.code}
            </span>
            <button onClick={handleCopy} className="opacity-20 hover:opacity-60 transition-opacity">
              {copied ? <Check size={11} className="text-[#22c55e]" /> : <Copy size={11} />}
            </button>
          </div>
          <ChevronRight size={14} className="opacity-10 group-hover:opacity-30 transition-opacity" />
        </div>
      </div>

      {/* Admin badge */}
      {challenge.myRole === 'admin' && (
        <div className="absolute top-3 right-12 opacity-0 group-hover:opacity-30 transition-opacity">
          <span className="text-[7px] font-mono tracking-[0.2em] uppercase">admin</span>
        </div>
      )}
    </div>
  );
};

export default ChallengeCard;
