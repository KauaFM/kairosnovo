import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trophy, MessageCircle, Users, Activity, Copy, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useChallengeDetail } from '../hooks/useChallenges';
import { useCheckin } from '../hooks/useCheckin';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { checkIn } from '../services/checkinService';
import WorkoutFeed from '../components/WorkoutFeed';
import Leaderboard from '../components/Leaderboard';
import CheckInModal from '../components/CheckInModal';
import ChatWindow from '../components/ChatWindow';

const TABS = [
  { key: 'feed', label: 'FEED', icon: Activity },
  { key: 'ranking', label: 'RANKING', icon: Trophy },
  { key: 'chat', label: 'CHAT', icon: MessageCircle },
  { key: 'members', label: 'MEMBROS', icon: Users },
];

const ChallengeDetail = ({ challengeId, onBack }) => {
  const { challenge, members, loading: detailLoading } = useChallengeDetail(challengeId);
  const { workouts, refresh: refreshWorkouts } = useCheckin(challengeId);
  const { leaderboard, loading: lbLoading, refresh: refreshLb } = useLeaderboard(challengeId);
  const [activeSubTab, setActiveSubTab] = useState('feed');
  const [showCheckin, setShowCheckin] = useState(false);
  const [userId, setUserId] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const handleCheckin = async (workoutData, file) => {
    if (!userId || !challenge) return;
    await checkIn(challengeId, userId, workoutData, challenge.scoring_type, challenge.scoring_config || {}, file);
    refreshWorkouts();
    refreshLb();
  };

  const handleDeleteWorkout = (workoutId) => {
    refreshWorkouts();
    refreshLb();
  };

  const handleCopyCode = () => {
    if (challenge?.code) {
      navigator.clipboard.writeText(challenge.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (detailLoading || !challenge) {
    return (
      <div className="text-center py-16">
        <span className="text-[10px] font-mono opacity-40 animate-pulse tracking-wider">CARREGANDO DESAFIO...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="opacity-50 hover:opacity-100 transition-opacity">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold tracking-wider truncate">{challenge.name}</h2>
            <span className="text-[9px] font-mono opacity-40 tracking-widest">
              {members.length} MEMBROS
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-mono border transition-all"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
          >
            {copied ? <Check size={10} className="text-[#22c55e]" /> : <Copy size={10} />}
            {challenge.code}
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 p-1 rounded-sm" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-sm text-[9px] font-mono font-bold tracking-wider transition-all ${activeSubTab === tab.key ? 'text-[#22c55e]' : 'opacity-40'}`}
              style={{
                backgroundColor: activeSubTab === tab.key ? 'rgba(34,197,94,0.1)' : 'transparent',
                border: activeSubTab === tab.key ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
              }}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {activeSubTab === 'feed' && (
          <WorkoutFeed workouts={workouts} currentUserId={userId} onDelete={handleDeleteWorkout} />
        )}
        {activeSubTab === 'ranking' && (
          <Leaderboard leaderboard={leaderboard} currentUserId={userId} loading={lbLoading} />
        )}
        {activeSubTab === 'chat' && (
          <div className="h-[400px]">
            <ChatWindow challengeId={challengeId} userId={userId} />
          </div>
        )}
        {activeSubTab === 'members' && (
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-sm border"
                style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
                <div className="w-7 h-7 rounded-full overflow-hidden border flex-shrink-0"
                  style={{ borderColor: 'var(--border-color)' }}>
                  {m.profiles?.avatar_url ? (
                    <img src={m.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-current opacity-10" />
                  )}
                </div>
                <span className="text-[11px] font-bold tracking-wide flex-1 truncate">
                  {m.profiles?.username}
                </span>
                {m.role !== 'member' && (
                  <span className="text-[8px] font-mono tracking-widest opacity-50 px-1.5 py-0.5 rounded-sm border"
                    style={{ borderColor: 'var(--border-color)' }}>
                    {m.role.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Check-in button */}
      {activeSubTab === 'feed' && (
        <button
          onClick={() => setShowCheckin(true)}
          className="fixed bottom-24 right-1/2 translate-x-[180px] w-12 h-12 rounded-full flex items-center justify-center z-40 shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{
            backgroundColor: '#22c55e',
            color: '#000',
            boxShadow: '0 0 20px rgba(34,197,94,0.4)',
          }}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Check-in Modal */}
      <CheckInModal
        open={showCheckin}
        onClose={() => setShowCheckin(false)}
        onSubmit={handleCheckin}
        scoringType={challenge.scoring_type}
      />
    </div>
  );
};

export default ChallengeDetail;
