import React, { useState, useEffect } from 'react';
import { User, Crosshair, Fingerprint, ChevronRight, Activity, Clock, Wifi, Zap, Hexagon, Medal, Award, Camera, Pencil } from 'lucide-react';
import RankSystem from './RankSystem';
import MentorConfig, { MENTORS } from './MentorConfig';
import GlobalRanking from './GlobalRanking';
import ScrollReveal from './ScrollReveal';
import { getProfile, updateAvatar, getRankFromXP, getAllAchievements } from '../services/db';
import { supabase } from '../lib/supabase';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';

const Dossier = ({ theme, toggleTheme }) => {
    const [isViewingRanks, setIsViewingRanks] = useState(false);
    const [isViewingMentors, setIsViewingMentors] = useState(false);
    const [isViewingGlobalRanking, setIsViewingGlobalRanking] = useState(false);
    const [selectedMentorId, setSelectedMentorId] = useState('peterson');
    const [activeProfileTab, setActiveProfileTab] = useState('stats'); // 'stats' | 'achievements'
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState(null);
    const [achievementsData, setAchievementsData] = useState({ all: [], total: 0, completedCount: 0 });
    const [userStats, setUserStats] = useState({
        xp: 0,
        streak: 0,
        rank_index: 0,
        kIndex: 850,
        rank: 'Ø',
        rankTitle: 'RECRUTA KRS'
    });

    useEffect(() => {
        const fetchUserData = async () => {
            const profile = await getProfile();
            if (profile) {
                setUserName(profile.full_name || 'Agente Orvax');
                setUserAvatar(profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`);
                
                const xp = profile.xp || 0;
                const rankInfo = getRankFromXP(xp);

                setUserStats({
                    xp: xp,
                    streak: profile.streak_days || 0,
                    rank_index: profile.rank_index || 0,
                    kIndex: 850 + (profile.rank_index || 0),
                    rank: rankInfo.rank,
                    rankTitle: rankInfo.title,
                    rankProgress: rankInfo.progress
                });

                // Fetch achievements
                const achData = await getAllAchievements();
                setAchievementsData(achData);
            }
        };

        fetchUserData();
    }, []);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const ext = file.name.split('.').pop();
        const path = `avatars/${session.user.id}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
        if (uploadError) { console.error('Upload error:', uploadError); return; }
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
        await updateAvatar(publicUrl);
        setUserAvatar(publicUrl);
    };

    const handleUserNameSave = async () => {
        if (!userName.trim()) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('profiles').update({ full_name: userName.trim() }).eq('id', session.user.id);
    };

    const isAnySubViewOpen = isViewingRanks || isViewingMentors || isViewingGlobalRanking;
    const activeMentor = MENTORS.find(m => m.id === selectedMentorId) || MENTORS[1];

    return (
        <div className="relative w-full h-full">
            <ScrollContainer>
                <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
                
                {/* Main Dossier Content */}
                <div className={`transition-all duration-500 ${isAnySubViewOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="animate-in slide-in-from-left-4 duration-700 delay-100 pb-20 w-full overflow-hidden">
                        
                        <div className="mb-8 px-4 pt-2">
                            <h2 className="text-[10px] font-mono opacity-40 tracking-[0.4em] uppercase mb-2 shadow-sm">Registro Central</h2>
                            <h1 className="text-3xl font-syncopate font-bold tracking-widest uppercase text-glow">DOSSIER</h1>
                        </div>

                        {/* Top Identity Area */}
                        <ScrollReveal delay={0.1} className="flex flex-col items-center mb-10 w-full relative z-10 px-4 mt-6">
                            <div className="w-28 h-32 rounded-3xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.4)] border-2 mb-6 relative group cursor-pointer transition-transform hover:scale-105" style={{ borderColor: 'var(--bg-color)', backgroundColor: 'var(--glass-bg)' }}>
                                {!userAvatar && <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-600/20" />}
                                {userAvatar ? (
                                    <img src={userAvatar} alt="User Profile" className="w-full h-full object-cover relative z-10" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-40"><User size={40} /></div>
                                )}
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" title="Definir Foto de Perfil" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300 z-20 backdrop-blur-sm">
                                    <Camera size={24} className="text-white mb-2" />
                                    <span className="text-[8px] font-mono tracking-widest text-white uppercase font-bold text-center px-2">Atualizar<br />Foto</span>
                                </div>
                                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none z-20" />
                            </div>

                            <div className="relative mb-2 group w-full max-w-[280px]">
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-30 transition-opacity"><Pencil size={14} /></div>
                                <input
                                    type="text"
                                    placeholder="INSERIR NOME"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    onBlur={handleUserNameSave}
                                    className="w-full text-3xl font-syncopate font-black tracking-widest text-[var(--text-main)] shadow-sm text-center bg-transparent border-b-2 border-transparent hover:border-current/20 focus:border-[#22c55e] transition-colors focus:outline-none uppercase placeholder:opacity-30"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-current/5 border border-current/10 mb-6 backdrop-blur-md text-[10px] font-mono tracking-widest font-bold uppercase opacity-80 mt-2">
                                <span>#0000-KRS</span>
                                <Fingerprint size={12} className="opacity-50" />
                            </div>

                            <div className="w-full max-w-[280px] flex flex-col items-start gap-2 mb-8">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-widest opacity-60 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    RANK {userStats.rank} <span className="opacity-40">{"// " + userStats.rankTitle}</span>
                                </span>
                                <div className="w-full flex items-center gap-3">
                                    <div className="flex-1 h-1.5 rounded-full bg-current/10 relative overflow-hidden border border-current/5">
                                        <div className="absolute top-0 left-0 h-full rounded-full bg-current opacity-80" style={{ width: `${Math.min(100, Math.round(userStats.rankProgress || 0))}%` }} />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold py-0.5 px-2 rounded-md bg-current/5 border border-current/10 opacity-70" style={{ color: 'var(--text-main)' }}>{userStats.kIndex}</span>
                                </div>
                            </div>

                            <div className="w-full max-w-[320px] grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center p-3 rounded-2xl border border-current/5 bg-current/5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Zap size={14} className="text-[#38bdf8] drop-shadow-[0_0_5px_#38bdf8]" />
                                        <span className="font-space font-black text-lg">{userStats.xp}</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-40 text-center leading-tight">Pontos<br />XP</span>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-2xl border border-current/5 bg-current/5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Activity size={14} className="text-[#ffca28] drop-shadow-[0_0_5px_#ffca28]" />
                                        <span className="font-space font-black text-lg">{userStats.streak}</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-40 text-center leading-tight">Dias<br />Streak</span>
                                </div>
                                <div className="flex flex-col items-center p-3 rounded-2xl border border-current/5 bg-current/5">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Hexagon size={14} fill="#a855f7" className="text-white drop-shadow-[0_0_5px_#a855f7]" />
                                        <span className="font-space font-black text-lg">{userStats.rank_index}</span>
                                    </div>
                                    <span className="text-[8px] font-mono uppercase tracking-widest opacity-40 text-center leading-tight">Índice<br />Rank</span>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Tabs Navigation */}
                        <ScrollReveal delay={0.2} className="w-full px-6 flex items-center justify-start gap-6 border-b border-current/10 mb-8 relative z-10 font-syncopate text-[10px] font-bold uppercase tracking-widest">
                            <button onClick={() => setActiveProfileTab('stats')} className={`pb-4 relative transition-colors duration-300 ${activeProfileTab === 'stats' ? 'text-[var(--text-main)]' : 'opacity-40 hover:opacity-100'}`}>
                                Estatísticas
                                {activeProfileTab === 'stats' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-t-full" />}
                            </button>
                            <button onClick={() => setActiveProfileTab('achievements')} className={`pb-4 relative transition-colors duration-300 ${activeProfileTab === 'achievements' ? 'text-[var(--text-main)]' : 'opacity-40 hover:opacity-100'}`}>
                                Conquistas
                                {activeProfileTab === 'achievements' && <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] rounded-t-full" />}
                            </button>
                        </ScrollReveal>

                        {/* Content Tabs */}
                        <div className="relative w-full">
                            {/* Stats Tab */}
                            <div className={`transition-all duration-500 ${activeProfileTab === 'stats' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                <ScrollReveal delay={0.25}>
                                    <button
                                        onClick={() => setIsViewingRanks(true)}
                                        className="w-full text-left p-8 rounded-[40px] mb-4 relative overflow-hidden group transition-all duration-500 backdrop-blur-2xl block hover:-translate-y-1"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--border-color)' }}
                                    >
                                        <div className="absolute top-8 right-8 opacity-20 group-hover:opacity-60 group-hover:translate-x-1 transition-all" style={{ color: 'var(--text-main)' }}><ChevronRight size={20} /></div>
                                        <div className="flex justify-between items-center mb-10 relative z-10">
                                            <div>
                                                <h3 className="text-[10px] font-mono font-bold opacity-30 tracking-[0.6em] uppercase mb-4">Classificação</h3>
                                                <div className="flex items-baseline relative mt-2">
                                                    <span 
                                                        className="text-7xl font-outfit font-black tracking-tighter"
                                                        style={{ 
                                                            color: userStats.rank === 'Ø' ? 'var(--text-main)' : '#a855f7',
                                                            filter: userStats.rank === 'Ø' ? 'drop-shadow(0 0 15px var(--text-main))' : 'drop-shadow(0 0 15px rgba(168,85,247,0.4))'
                                                        }}
                                                    >
                                                        {userStats.rank}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="relative w-24 h-24 flex items-center justify-center mr-6">
                                                <div className="absolute w-full h-full rounded-full border opacity-10" style={{ borderColor: 'var(--text-main)' }} />
                                                <div className="absolute w-[85%] h-[85%] rounded-full border opacity-40 group-hover:rotate-45 transition-transform duration-700" style={{ borderColor: 'var(--text-main)' }} />
                                                <User size={34} className="opacity-90 relative z-10" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-t pt-6 relative z-10" style={{ borderColor: 'var(--border-color)' }}>
                                            <div>
                                                <span className="text-[8px] font-mono font-bold opacity-30 uppercase tracking-[0.3em] block mb-2">K-Index_Atual</span>
                                                <span className="text-2xl font-space font-black">{userStats.kIndex}</span>
                                            </div>
                                            <div className="text-right pr-6">
                                                <span className="text-[8px] font-mono font-bold opacity-30 uppercase tracking-[0.3em] block mb-2">Status</span>
                                                <span className="text-2xl font-space font-black uppercase tracking-wider opacity-80">ESTÁVEL</span>
                                            </div>
                                        </div>
                                    </button>
                                </ScrollReveal>

                                <ScrollReveal delay={0.3}>
                                    <button
                                        onClick={() => setIsViewingGlobalRanking(true)}
                                        className="w-full mb-8 p-5 rounded-3xl flex justify-between items-center group transition-all duration-500 backdrop-blur-md border hover:-translate-y-1"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--border-color)' }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#ffca28]/10 border border-[#ffca28]/30 flex items-center justify-center shadow-[0_0_15px_rgba(255,202,40,0.15)]"><Medal size={20} className="text-[#ffca28]" /></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[12px] font-syncopate font-bold uppercase tracking-widest text-[#ffca28]">Ranking Global</span>
                                                <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest mt-0.5">Ranking Global & Amigos</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="opacity-40" />
                                    </button>
                                </ScrollReveal>



                                <ScrollReveal delay={0.4}>
                                    <button
                                        onClick={() => setIsViewingMentors(true)}
                                        className="w-full text-left p-8 rounded-[32px] group relative overflow-hidden mb-6 transition-all duration-500 block hover:-translate-y-1"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', boxShadow: 'var(--glass-shadow)', border: '1px solid var(--border-color)' }}
                                    >
                                        <div className="absolute top-8 right-8 opacity-20"><ChevronRight size={20} /></div>
                                        <h4 className="font-syncopate text-lg font-black tracking-wider uppercase">{activeMentor.name}</h4>
                                        <span className="text-[8px] font-mono opacity-40 uppercase tracking-[0.2em] mt-1 block">ESTILO // {activeMentor.style}</span>
                                        <p className="text-[11px] font-mono leading-relaxed opacity-60 my-6 uppercase tracking-wider">{activeMentor.profile}</p>
                                        <div className="w-full h-12 rounded-full border flex items-center justify-center opacity-70" style={{ borderColor: 'var(--border-color)' }}>
                                            <span className="text-[9px] font-mono tracking-[0.5em] uppercase">CONFIGURAR_MENTOR</span>
                                        </div>
                                    </button>
                                </ScrollReveal>
                            </div>

                            {/* Achievements Tab */}
                            <div className={`transition-all duration-500 ${activeProfileTab === 'achievements' ? 'opacity-100 block' : 'opacity-0 hidden'} px-6`}>
                                <div className="text-center text-[10px] font-mono tracking-widest font-bold uppercase opacity-50 mb-10 pt-4">
                                    Conquistas {achievementsData.completedCount}/{achievementsData.total}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {achievementsData.all.length > 0 ? achievementsData.all.map((ach, idx) => (
                                        <ScrollReveal key={ach.id} delay={0.1 + (idx * 0.02)}
                                            className={`h-44 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all duration-500
                                                ${ach.unlocked
                                                    ? 'border-[#22c55e]/30 bg-[#22c55e]/5 opacity-100 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                                                    : 'border-current/10 bg-current/5 opacity-40 hover:opacity-60'
                                                }`}
                                        >
                                            <span className="text-3xl">{ach.icon || '🏆'}</span>
                                            <span className={`text-[9px] font-syncopate font-bold uppercase tracking-widest text-center px-2 leading-tight ${ach.unlocked ? 'opacity-100' : 'opacity-60'}`}>
                                                {ach.title}
                                            </span>
                                            <span className="text-[7px] font-mono opacity-40 text-center px-3 leading-relaxed">
                                                {ach.unlocked ? ach.description : '???'}
                                            </span>
                                            {ach.unlocked && ach.xp_reward > 0 && (
                                                <span className="text-[8px] font-mono font-bold text-[#22c55e]">+{ach.xp_reward} XP</span>
                                            )}
                                        </ScrollReveal>
                                    )) : Array.from({ length: 25 }).map((_, idx) => (
                                        <ScrollReveal key={idx} delay={0.1 + (idx * 0.02)} className="h-44 rounded-3xl border border-current/10 bg-current/5 flex flex-col items-center justify-center gap-4 opacity-40 hover:opacity-60 transition-opacity">
                                            <Award size={32} />
                                            <span className="text-[8px] font-syncopate font-bold uppercase tracking-widest text-center mt-2 px-2">Bloqueado<br />{String(idx + 1).padStart(2, '0')}</span>
                                        </ScrollReveal>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </ScrollContainer>

            {/* Sub-Views Overlays */}
            {isViewingRanks && (
                <div className="fixed inset-0 z-[60] bg-[var(--bg-color)] overflow-y-auto px-8 pt-12 pb-32">
                    <RankSystem onClose={() => setIsViewingRanks(false)} userXP={userStats.xp} />
                </div>
            )}
            
            {isViewingGlobalRanking && (
                <div className="fixed inset-0 z-50 bg-[var(--bg-color)] animate-in slide-in-from-right-8 duration-500 overflow-y-auto px-8 pt-12 pb-32">
                    <div className="relative">
                        <button onClick={() => setIsViewingGlobalRanking(false)} className="absolute top-6 left-6 z-[60] w-10 h-10 rounded-full flex items-center justify-center bg-current/10 backdrop-blur-md border border-current/20 hover:scale-105 transition-all"><ChevronRight size={20} className="rotate-180 opacity-70" /></button>
                        <div className="pt-8">
                            <GlobalRanking />
                        </div>
                    </div>
                </div>
            )}

            {isViewingMentors && (
                <div className="fixed inset-0 z-50 bg-[var(--bg-color)] overflow-y-auto px-8 pt-12 pb-32">
                    <MentorConfig selectedMentorId={selectedMentorId} onSelectMentor={(id) => setSelectedMentorId(id)} onClose={() => setIsViewingMentors(false)} />
                </div>
            )}
        </div>
    );
};

export default Dossier;
