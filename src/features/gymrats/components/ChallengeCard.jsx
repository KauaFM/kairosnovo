import React from 'react';
import { Users, Calendar, Trophy, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '../utils/formatters';

const ChallengeCard = ({ challenge, onPress }) => {
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
    <button
      onClick={() => onPress(challenge)}
      className="w-full text-left p-4 rounded-sm border transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--border-color)',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{
        background: isActive
          ? 'linear-gradient(90deg, #22c55e, transparent)'
          : 'linear-gradient(90deg, #ef4444, transparent)',
      }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold tracking-wide truncate" style={{ color: 'var(--text-main)' }}>
            {challenge.name}
          </h3>
          {challenge.description && (
            <p className="text-[11px] opacity-50 mt-1 line-clamp-2 font-mono">
              {challenge.description}
            </p>
          )}
        </div>
        <div className={`ml-2 px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold tracking-wider ${isActive ? 'text-[#22c55e]' : 'text-red-400 opacity-60'}`}
          style={{ backgroundColor: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
          {isActive ? 'ATIVO' : 'ENCERRADO'}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-mono opacity-60">
        <span className="flex items-center gap-1">
          <Users size={12} /> {memberCount}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} /> {formatDate(challenge.starts_at)}
        </span>
        <span className="flex items-center gap-1">
          <Trophy size={12} /> {challenge.scoring_type}
        </span>
      </div>

      {/* Code badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[9px] font-mono opacity-40 tracking-wider">CODIGO:</span>
        <span className="text-[11px] font-mono font-bold tracking-[0.2em] px-2 py-0.5 rounded-sm"
          style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
          {challenge.code}
        </span>
        <button onClick={handleCopy} className="opacity-40 hover:opacity-100 transition-opacity">
          {copied ? <Check size={12} className="text-[#22c55e]" /> : <Copy size={12} />}
        </button>
      </div>

      {/* Role badge */}
      {challenge.myRole === 'admin' && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-40 transition-opacity">
          <span className="text-[8px] font-mono tracking-widest">ADMIN</span>
        </div>
      )}
    </button>
  );
};

export default ChallengeCard;
