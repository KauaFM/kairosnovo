import React, { useState } from 'react';
import { Plus, LogIn, Swords, Trophy, History, Loader2, ChevronRight, Users, Zap, Shield, Crown } from 'lucide-react';
import { ScrollContainer, OrvaxHeader } from '../../../components/BaseLayout';
import { supabase } from '../../../lib/supabase';
import { useChallenges } from '../hooks/useChallenges';
import { joinChallenge } from '../services/challengeService';
import ChallengeCard from '../components/ChallengeCard';
import ChallengeDetail from './ChallengeDetail';
import CreateChallenge from './CreateChallenge';
import ProfileStats from './ProfileStats';
import { useLang } from '../../../i18n/LanguageContext';

const GymRatsHome = ({ theme, toggleTheme }) => {
    const { t } = useLang();
  const { challenges, loading, refresh } = useChallenges();
  const [view, setView] = useState('home');
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
      if (!session) throw new Error(t('arena.notAuth'));
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
        <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />

        <div className="pb-32 relative" style={{ color: 'var(--text-main)' }}>
          {/* Dotted grid bg */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(var(--text-main) 0.5px, transparent 0.5px)',
              backgroundSize: '24px 24px',
              opacity: 0.02
            }}
          />

          {/* ═══ HEADER ═══ */}
          <div className="px-5 pt-4 pb-5 relative z-10">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h1 className="text-[22px] font-outfit font-black tracking-tight opacity-90 leading-tight">{t('arena.title')}</h1>
                <p className="text-[9px] font-mono opacity-15 tracking-[0.25em] uppercase mt-1">{t('arena.subtitle')}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                  <Trophy size={11} className="opacity-30" />
                  <span className="text-[10px] font-mono font-bold opacity-50">{challenges.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 space-y-4 relative z-10">
            {/* ═══ ACTION CARDS (Bento) ═══ */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setView('create')}
                className="rounded-[24px] border p-4 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
              >
                <div className="absolute inset-0 bg-[#22c55e] opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none rounded-[24px]" />
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                  <Plus size={18} className="text-[#22c55e]" style={{ opacity: 0.7 }} />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase opacity-40">{t('arena.create')}</span>
              </button>

              <button
                onClick={() => setView('join')}
                className="rounded-[24px] border p-4 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
              >
                <div className="absolute inset-0 bg-[#3b82f6] opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none rounded-[24px]" />
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <LogIn size={18} className="text-[#3b82f6]" style={{ opacity: 0.7 }} />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase opacity-40">{t('arena.join')}</span>
              </button>

              <button
                onClick={() => setView('stats')}
                className="rounded-[24px] border p-4 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none rounded-[24px]" style={{ backgroundColor: 'var(--text-main)' }} />
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                  <History size={18} style={{ opacity: 0.35 }} />
                </div>
                <span className="text-[8px] font-mono font-bold tracking-[0.2em] uppercase opacity-40">{t('arena.profile')}</span>
              </button>
            </div>

            {/* ═══ JOIN INLINE ═══ */}
            {view === 'join' && (() => {
              const chars = joinCode.split('');
              return (
                <div className="rounded-[28px] border p-6 relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #3b82f6, #60a5fa, transparent)' }} />
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)' }} />

                  <div className="flex items-center justify-between mb-5 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        <LogIn size={14} className="text-[#3b82f6]" style={{ opacity: 0.7 }} />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-outfit font-bold tracking-tight opacity-70">{t('arena.joinChallenge')}</h3>
                        <p className="text-[7px] font-mono opacity-20 tracking-[0.2em] uppercase">{t('arena.enterCode')}</p>
                      </div>
                    </div>
                    <button onClick={() => { setView('home'); setJoinError(''); setJoinCode(''); }} className="text-[8px] font-mono opacity-15 hover:opacity-50 transition-opacity px-2 py-1 rounded-lg hover:bg-[var(--card-hover)]">X</button>
                  </div>

                  {joinError && (
                    <div className="mb-4 px-3 py-2 rounded-xl border border-red-400/15 bg-red-400/5 text-red-400 text-[9px] font-mono relative z-10">{joinError}</div>
                  )}

                  <div className="flex gap-2 justify-center mb-4 relative z-10">
                    {[0, 1, 2, 3, 4, 5].map((i) => {
                      const c = chars[i] || '';
                      const filled = c !== '';
                      const isNext = i === chars.length && chars.length < 6;
                      return (
                        <div
                          key={i}
                          className="w-11 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200"
                          style={{
                            borderColor: filled ? 'rgba(59,130,246,0.35)' : isNext ? 'rgba(59,130,246,0.2)' : 'var(--border-color)',
                            backgroundColor: filled ? 'rgba(59,130,246,0.06)' : 'transparent',
                            boxShadow: filled ? '0 0 12px rgba(59,130,246,0.1)' : 'none'
                          }}
                        >
                          <span className="text-[20px] font-mono font-black" style={{ opacity: filled ? 0.8 : 0 }}>{c || '-'}</span>
                        </div>
                      );
                    })}
                  </div>

                  <input
                    value={joinCode}
                    onChange={(e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (v.length <= 6) setJoinCode(v); }}
                    placeholder={t('arena.codePh')}
                    maxLength={6}
                    autoFocus
                    className="w-full text-center text-[14px] font-mono font-bold tracking-[0.5em] bg-transparent border rounded-2xl px-4 py-3 outline-none uppercase transition-all focus:border-[#3b82f6]/30 mb-4 relative z-10 placeholder:text-[10px] placeholder:tracking-[0.15em] placeholder:opacity-20 placeholder:normal-case"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />

                  <button
                    onClick={handleJoin}
                    disabled={joinCode.length < 6 || joining}
                    className="w-full py-3.5 rounded-2xl font-bold text-[10px] font-mono tracking-[0.2em] uppercase transition-all disabled:opacity-15 hover:brightness-110 active:scale-[0.98] relative z-10 flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#3b82f6', color: '#fff', boxShadow: joinCode.length >= 6 ? '0 4px 20px rgba(59,130,246,0.3)' : 'none' }}
                  >
                    {joining ? <Loader2 size={14} className="animate-spin" /> : <><LogIn size={14} /> {t('gym.joinChallenge')}</>}
                  </button>
                </div>
              );
            })()}


            {/* ═══ LOADING ═══ */}
            {loading && (
              <div className="text-center py-20">
                <Loader2 size={20} className="animate-spin mx-auto opacity-15 mb-4" />
                <span className="text-[8px] font-mono opacity-15 tracking-[0.3em] uppercase">{t('arena.syncing')}</span>
              </div>
            )}

            {/* ═══ ACTIVE CHALLENGES ═══ */}
            {!loading && activeChallenges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-30 font-bold">{t('arena.activeChallenges')}</span>
                  <span className="text-[8px] font-mono opacity-15">{activeChallenges.length}</span>
                </div>
                <div className="space-y-2">
                  {activeChallenges.map((c) => (
                    <ChallengeCard key={c.id} challenge={c} onPress={handleOpenChallenge} />
                  ))}
                </div>
              </div>
            )}

            {/* ═══ ENDED CHALLENGES ═══ */}
            {!loading && endedChallenges.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] opacity-20 font-bold">{t('arena.ended')}</span>
                  <span className="text-[8px] font-mono opacity-10">{endedChallenges.length}</span>
                </div>
                <div className="space-y-2">
                  {endedChallenges.map((c) => (
                    <ChallengeCard key={c.id} challenge={c} onPress={handleOpenChallenge} />
                  ))}
                </div>
              </div>
            )}

            {/* ═══ EMPTY STATE ═══ */}
            {!loading && challenges.length === 0 && view !== 'join' && (
              <div className="rounded-[28px] border p-8 text-center relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                {/* Decorative background */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <Swords size={120} className="opacity-[0.015]" />
                </div>

                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-3xl mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                    <Swords size={28} className="opacity-20" />
                  </div>

                  <h3 className="text-[14px] font-outfit font-bold tracking-tight opacity-70 mb-1">{t('arena.noChallenges')}</h3>
                  <p className="text-[9px] font-mono opacity-20 tracking-wider mb-6">{t('arena.noChallengesSub')}</p>

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setView('create')}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-mono font-bold tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{ backgroundColor: '#22c55e', color: '#000' }}
                    >
                      <Plus size={13} />
                      CRIAR DESAFIO
                    </button>
                    <button
                      onClick={() => setView('join')}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[9px] font-mono font-bold tracking-[0.15em] border transition-all hover:scale-[1.02] active:scale-[0.98] hover:bg-[var(--card-hover)]"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <LogIn size={13} className="opacity-40" />
                      ENTRAR
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollContainer>
    </div>
  );
};

export default GymRatsHome;
