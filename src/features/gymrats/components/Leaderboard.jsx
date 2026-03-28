import React from 'react';
import { Trophy, TrendingUp, Flame } from 'lucide-react';

const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

const Leaderboard = ({ leaderboard, currentUserId, loading }) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <span className="text-[10px] font-mono opacity-40 tracking-wider animate-pulse">CALCULANDO RANKING...</span>
      </div>
    );
  }

  if (!leaderboard.length) {
    return (
      <div className="text-center py-8 opacity-40">
        <Trophy size={24} className="mx-auto mb-2 opacity-30" />
        <p className="text-[11px] font-mono tracking-wider">SEM DADOS AINDA</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-2 mb-6 pt-4">
          {[1, 0, 2].map((idx) => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const heights = ['h-20', 'h-16', 'h-12'];
            const sizes = ['w-12 h-12', 'w-10 h-10', 'w-9 h-9'];
            return (
              <div key={entry.userId} className="flex flex-col items-center">
                <div className={`${sizes[idx]} rounded-full overflow-hidden border-2 mb-1`}
                  style={{ borderColor: rankColors[idx] }}>
                  {entry.avatar ? (
                    <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono opacity-40">
                      {entry.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-mono font-bold truncate max-w-[60px]">{entry.username}</span>
                <span className="text-[10px] font-bold" style={{ color: rankColors[idx] }}>
                  {Number(entry.points).toFixed(0)}
                </span>
                <div className={`${heights[idx]} w-14 rounded-t-sm mt-1`}
                  style={{ backgroundColor: rankColors[idx], opacity: 0.15 }} />
                <span className="text-[11px] font-bold" style={{ color: rankColors[idx] }}>
                  #{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-1">
        {leaderboard.map((entry) => {
          const isMe = entry.userId === currentUserId;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-all ${isMe ? 'border-[#22c55e]/30' : ''}`}
              style={{
                backgroundColor: isMe ? 'rgba(34,197,94,0.05)' : 'var(--glass-bg)',
                borderColor: isMe ? 'rgba(34,197,94,0.3)' : 'var(--border-color)',
              }}
            >
              {/* Rank */}
              <span className="text-[13px] font-bold font-mono w-6 text-center"
                style={{ color: entry.rank <= 3 ? rankColors[entry.rank - 1] : 'var(--text-main)', opacity: entry.rank <= 3 ? 1 : 0.5 }}>
                {entry.rank}
              </span>

              {/* Avatar */}
              <div className="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0"
                style={{ borderColor: 'var(--border-color)' }}>
                {entry.avatar ? (
                  <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-mono opacity-40">
                    {entry.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] font-bold tracking-wide truncate block ${isMe ? 'text-[#22c55e]' : ''}`}>
                  {entry.username} {isMe && '(voce)'}
                </span>
                <span className="text-[9px] font-mono opacity-40">{entry.workouts} treinos</span>
              </div>

              {/* Points */}
              <div className="text-right">
                <span className="text-[12px] font-bold font-mono">{Number(entry.points).toFixed(0)}</span>
                <span className="text-[8px] font-mono opacity-40 block">PTS</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
