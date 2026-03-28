import React, { useState } from 'react';
import { Plus, LogIn, Swords, Trophy, History, Loader2 } from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { supabase } from '../../../lib/supabase';
import { useChallenges } from '../hooks/useChallenges';
import { joinChallenge } from '../services/challengeService';
import ChallengeCard from '../components/ChallengeCard';
import ChallengeDetail from './ChallengeDetail';
import CreateChallenge from './CreateChallenge';
import ProfileStats from './ProfileStats';

const GymRatsHome = ({ theme, toggleTheme }) => {
  const { challenges, loading, refresh } = useChallenges();
  const [view, setView] = useState('home'); // 'home' | 'detail' | 'create' | 'stats' | 'join'
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  const activeChallenges = challenges.filter(c => c.is_active);
  const endedChallenges = challenges.filter(c => !c.is_active);

  const handleOpenChallenge = (challenge) => {
    setSelectedChallengeId(challenge.id);
    setView('detail');
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nao autenticado');
      await joinChallenge(joinCode.trim(), session.user.id);
      setJoinCode('');
      setView('home');
      refresh();
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  // Sub-views
  if (view === 'detail' && selectedChallengeId) {
    return (
      <div className="relative w-full h-full">
        <ScrollContainer>
          <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
          <ChallengeDetail
            challengeId={selectedChallengeId}
            onBack={() => { setView('home'); refresh(); }}
          />
        </ScrollContainer>
      </div>
    );
  }

  if (view === 'create') {
    return (
      <div className="relative w-full h-full">
        <ScrollContainer>
          <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
          <CreateChallenge
            onBack={() => setView('home')}
            onCreated={() => { setView('home'); refresh(); }}
          />
        </ScrollContainer>
      </div>
    );
  }

  if (view === 'stats') {
    return (
      <div className="relative w-full h-full">
        <ScrollContainer>
          <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
          <ProfileStats onBack={() => setView('home')} />
        </ScrollContainer>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ScrollContainer>
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />

        {/* Title area */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Swords size={16} className="text-[#22c55e]" />
            <h2 className="text-xs font-bold tracking-[0.2em] uppercase opacity-60">Arena</h2>
          </div>
          <p className="text-[10px] font-mono opacity-30 tracking-wider">
            COMPETICOES FITNESS EM TEMPO REAL
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setView('create')}
            className="flex flex-col items-center gap-2 p-3 rounded-sm border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
          >
            <Plus size={18} className="text-[#22c55e]" />
            <span className="text-[9px] font-mono font-bold tracking-wider">CRIAR</span>
          </button>
          <button
            onClick={() => setView('join')}
            className="flex flex-col items-center gap-2 p-3 rounded-sm border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
          >
            <LogIn size={18} className="text-[#3b82f6]" />
            <span className="text-[9px] font-mono font-bold tracking-wider">ENTRAR</span>
          </button>
          <button
            onClick={() => setView('stats')}
            className="flex flex-col items-center gap-2 p-3 rounded-sm border transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
          >
            <History size={18} className="text-[#a855f7]" />
            <span className="text-[9px] font-mono font-bold tracking-wider">HISTORICO</span>
          </button>
        </div>

        {/* Join modal inline */}
        {view === 'join' && (
          <div className="mb-6 p-4 rounded-sm border" style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold tracking-wider">ENTRAR COM CODIGO</h3>
              <button onClick={() => { setView('home'); setJoinError(''); }} className="text-[9px] font-mono opacity-40 hover:opacity-100">FECHAR</button>
            </div>
            {joinError && (
              <div className="mb-3 px-3 py-2 rounded-sm border border-red-400/30 bg-red-400/10 text-red-400 text-[11px] font-mono">
                {joinError}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="CODIGO"
                maxLength={6}
                className="flex-1 text-center text-[16px] font-mono font-bold tracking-[0.4em] bg-transparent border rounded-sm px-3 py-2.5 outline-none uppercase transition-all focus:border-[#22c55e]/50"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim() || joining}
                className="px-4 rounded-sm font-bold text-[11px] tracking-wider transition-all disabled:opacity-30"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
              >
                {joining ? <Loader2 size={14} className="animate-spin" /> : 'ENTRAR'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader2 size={24} className="animate-spin mx-auto opacity-30 mb-3" />
            <span className="text-[10px] font-mono opacity-40 tracking-wider">SINCRONIZANDO ARENA...</span>
          </div>
        )}

        {/* Active challenges */}
        {!loading && activeChallenges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-60">DESAFIOS ATIVOS ({activeChallenges.length})</h3>
            </div>
            <div className="space-y-2">
              {activeChallenges.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onPress={handleOpenChallenge} />
              ))}
            </div>
          </div>
        )}

        {/* Ended challenges */}
        {!loading && endedChallenges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-mono font-bold tracking-wider opacity-40 mb-3">ENCERRADOS ({endedChallenges.length})</h3>
            <div className="space-y-2">
              {endedChallenges.map((c) => (
                <ChallengeCard key={c.id} challenge={c} onPress={handleOpenChallenge} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && challenges.length === 0 && view !== 'join' && (
          <div className="text-center py-16">
            <Swords size={32} className="mx-auto mb-4 opacity-20" />
            <p className="text-[12px] font-bold tracking-wider mb-1">NENHUM DESAFIO</p>
            <p className="text-[10px] font-mono opacity-40 mb-6">Crie ou entre em um desafio para comecar!</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 rounded-sm text-[10px] font-mono font-bold tracking-wider transition-all"
                style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-color)' }}
              >
                CRIAR DESAFIO
              </button>
              <button
                onClick={() => setView('join')}
                className="px-4 py-2 rounded-sm text-[10px] font-mono font-bold tracking-wider border transition-all"
                style={{ borderColor: 'var(--border-color)' }}
              >
                ENTRAR COM CODIGO
              </button>
            </div>
          </div>
        )}
      </ScrollContainer>
    </div>
  );
};

export default GymRatsHome;
