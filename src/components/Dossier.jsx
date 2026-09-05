import React, { useState, useEffect } from 'react';
import { User, Crosshair, Fingerprint, ChevronRight, Activity, Clock, Wifi, Zap, Hexagon, Medal, Award, Camera, Settings } from 'lucide-react';
import AccountScreen from './AccountScreen';
import { alertDialog } from '../lib/dialog';
import RankSystem from './RankSystem';
import MentorConfig, { MENTORS } from './MentorConfig';
import GlobalRanking from './GlobalRanking';
import ScrollReveal from './ScrollReveal';
import { getProfile, updateAvatar, getRankFromXP, getAllAchievements, getDashboard, checkAndUnlockAchievements } from '../services/db';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompression';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';
// Conquistas · badges reais
import { AchievementBadges as OrvaxAchievementBadges } from '../features/achievements';
import TrustCard from './lifeOs/TrustCard';
import SeasonCard from './lifeOs/SeasonCard';
import { useLang } from '../i18n/LanguageContext';
import { locRankTitle, locRankStatus } from '../i18n/rankMetaEn';

const Dossier = ({ theme, toggleTheme }) => {
    const { t, lang } = useLang();
    const [isViewingRanks, setIsViewingRanks] = useState(false);
    const [isViewingMentors, setIsViewingMentors] = useState(false);
    const [isViewingGlobalRanking, setIsViewingGlobalRanking] = useState(false);
    const [isViewingAccount, setIsViewingAccount] = useState(false);
    const [selectedMentorId, setSelectedMentorId] = useState('atlas');
    const [activeProfileTab, setActiveProfileTab] = useState('stats'); // 'stats' | 'achievements'
    const [userName, setUserName] = useState('');
    const [userAvatar, setUserAvatar] = useState(null);
    const [achievementsData, setAchievementsData] = useState({ all: [], total: 0, completedCount: 0 });
    const [userStats, setUserStats] = useState({
        xp: 0,
        streak: 0,
        rank_index: 0,
        kIndex: 0,
        rank: 'E-',
        rankTitle: 'RECRUTA KRS',
        rankColor: '#ef4444',
        rankStatus: 'CRÍTICO',
        rankProgress: 0
    });

    const { subscribeToXpLog, subscribeToDailyMetrics } = useRealtimeSync();
    const unsubRef = React.useRef([]);

    const fetchUserData = React.useCallback(async () => {
        const profile = await getProfile();
        if (!profile) {
            // Fallback para estado zero se não houver perfil (raro)
            const rankInfo = getRankFromXP(0);
            setUserStats(prev => ({
                ...prev,
                rank: rankInfo.rank,
                rankTitle: rankInfo.title,
                rankColor: rankInfo.color,
                rankStatus: rankInfo.status
            }));
            return;
        }

        setUserName(profile.full_name || t('dossier.defaultName'));
        setUserAvatar(profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`);

        const dash = await getDashboard();
        const xp = dash?.xp_total ?? profile.xp ?? 0;
        const streak = dash?.streak ?? profile.streak_days ?? 0;
        const rankInfo = getRankFromXP(xp);

        setUserStats({
            xp: xp,
            streak: streak,
            rank_index: profile.rank_index || 0,
            kIndex: xp,
            rank: rankInfo.rank,
            rankTitle: rankInfo.title,
            rankProgress: rankInfo.progress,
            rankColor: rankInfo.color,
            rankStatus: rankInfo.status,
            nextAt: rankInfo.nextAt
        });

        // Desbloqueia conquistas recém-atingidas e busca a lista atualizada
        try { await checkAndUnlockAchievements(); } catch (e) { console.warn('check_achievements:', e?.message); }
        const achData = await getAllAchievements();
        setAchievementsData(achData);
    }, []);

    useEffect(() => {
        fetchUserData();

        // [ORVAX CORE] Realtime: qualquer ganho de XP ou métrica diária
        // atualiza o cartão do agente instantaneamente.
        const u1 = subscribeToXpLog(() => fetchUserData());
        const u2 = subscribeToDailyMetrics(() => fetchUserData());
        if (u1) unsubRef.current.push(u1);
        if (u2) unsubRef.current.push(u2);

        return () => {
            unsubRef.current.forEach(u => u?.());
            unsubRef.current = [];
        };
    }, [fetchUserData, subscribeToXpLog, subscribeToDailyMetrics]);

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Antes: o arquivo bruto subia direto pro Storage. Uma foto de iPhone
        // (HEIC por padrão de fábrica) ficava salva como "avatar.jpg" com os
        // bytes originais dentro — Chrome/Android/Firefox não decodificam
        // HEIC, então a imagem quebrava em silêncio: sem erro, sem foto.
        // Reaproveita a mesma compressão que já resolve isso no scanner do
        // FitCal — passa por canvas, então sempre sai como JPEG de verdade,
        // não importa o formato de entrada.
        let compressed;
        try {
            compressed = await compressImage(file, { maxDimension: 512, quality: 0.8 });
        } catch (err) {
            console.error('[Avatar] compressão falhou:', err);
            const foiHeic = /DECODE_FAILED/i.test(err?.message || '') && /hei[cf]/i.test(file.name || file.type || '');
            alertDialog({
                title: 'Não consegui usar essa foto',
                message: foiHeic
                    ? t('dossier.heicUnsupported')
                    : t('dossier.imageUnreadable'),
                danger: true,
            });
            return;
        }

        const path = `${session.user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(path, compressed.blob, { upsert: true, cacheControl: '3600', contentType: 'image/jpeg' });

        if (uploadError) {
            console.error('[Avatar] Upload error:', uploadError);
            alertDialog({ title: 'Falha no upload', message: t('dossier.uploadFail', { msg: uploadError.message }), danger: true });
            return;
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        // Cache-busting para forçar re-render da foto nova
        const finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        await updateAvatar(finalUrl);
        setUserAvatar(finalUrl);
    };

    const handleUserNameSave = async () => {
        if (!userName.trim()) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase.from('profiles').update({ full_name: userName.trim() }).eq('id', session.user.id);
    };

    const isAnySubViewOpen = isViewingRanks || isViewingMentors || isViewingGlobalRanking || isViewingAccount;
    const activeMentor = MENTORS.find(m => m.id === selectedMentorId) || MENTORS[1];

    return (
        <div className="relative w-full h-full">
            <ScrollContainer>
                <OrvaxHeader theme={theme} toggleTheme={toggleTheme} minimal />
                
                {/* Main Dossier Content */}
                <div className={`transition-all duration-500 ${isAnySubViewOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="animate-in slide-in-from-left-4 duration-700 delay-100 pb-20 w-full overflow-hidden">
                        
                        {/* Header */}
                        <div className="mb-6 px-4 pt-2 flex items-end justify-between">
                            <div>
                                <h2 className="text-[8px] font-mono opacity-30 tracking-[0.3em] uppercase mb-1">{t('dossier.centralRegistry')}</h2>
                                <h1 className="text-2xl font-outfit font-black tracking-wide uppercase">Dossier</h1>
                            </div>
                            <button onClick={() => setIsViewingAccount(true)}
                                className="w-10 h-10 rounded-full flex items-center justify-center border transition-all active:scale-95 hover:opacity-100 opacity-60"
                                style={{ borderColor: 'var(--border-color)' }}
                                aria-label={t('account.title')}>
                                <Settings size={16} />
                            </button>
                        </div>

                        {/* Identity Area */}
                        <ScrollReveal delay={0.1} className="flex flex-col items-center mb-8 w-full relative z-10 px-4 mt-4">
                            {/* Avatar */}
                            <div className="relative mb-5">
                                <div className="w-24 h-[104px] rounded-[28px] overflow-hidden relative group cursor-pointer transition-transform duration-300 hover:scale-[1.03]" style={{ backgroundColor: 'var(--glass-bg)', border: '2px solid var(--border-color)' }}>
                                    {!userAvatar && <div className="absolute inset-0 bg-gradient-to-br from-zinc-400/10 to-zinc-600/10" />}
                                    {userAvatar ? (
                                        <img src={userAvatar} alt="Profile" className="w-full h-full object-cover relative z-10" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-30"><User size={36} /></div>
                                    )}
                                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" title={t('dossier.profilePhoto')} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-300 z-20 backdrop-blur-sm rounded-[28px]">
                                        <Camera size={20} className="text-white mb-1.5" />
                                        <span className="text-[7px] font-mono tracking-widest text-white uppercase font-bold">{t('dossier.changePhoto')}</span>
                                    </div>
                                </div>
                                {/* Rank color ring indicator */}
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-outfit font-black z-30" style={{ backgroundColor: userStats.rankColor || '#ef4444', color: '#fff', boxShadow: `0 0 12px ${userStats.rankColor || '#ef4444'}40` }}>
                                    {userStats.rank}
                                </div>
                            </div>

                            {/* Name Input */}
                            <div className="relative mb-1 group w-full max-w-[260px]">
                                <input
                                    type="text"
                                    placeholder={t('dossier.namePlaceholder')}
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    onBlur={handleUserNameSave}
                                    className="w-full text-xl font-outfit font-black tracking-wide text-[var(--text-main)] text-center bg-transparent border-b-2 border-transparent hover:border-current/10 focus:border-[var(--text-main)] transition-colors focus:outline-none uppercase placeholder:opacity-20 placeholder:text-sm"
                                />
                            </div>

                            {/* Agent ID */}
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-current/5 border border-current/5 mb-5 mt-2">
                                <span className="text-[8px] font-mono tracking-[0.2em] font-semibold uppercase opacity-40">#0000-KRS</span>
                                <Fingerprint size={10} className="opacity-30" />
                            </div>

                            {/* Rank Progress */}
                            <div className="w-full max-w-[280px] flex flex-col gap-2 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider opacity-50 flex items-center gap-1.5">
                                        <span style={{ color: userStats.rankColor || '#ef4444' }}>{userStats.rank}</span>
                                        <span className="opacity-40 font-normal">{locRankTitle(userStats.rank, userStats.rankTitle, lang)}</span>
                                    </span>
                                    <span className="text-[8px] font-mono font-bold opacity-30">{userStats.nextAt ? `→ ${userStats.nextAt} XP` : 'MAX'}</span>
                                </div>
                                <div className="w-full flex items-center gap-2.5">
                                    <div className="flex-1 h-1.5 rounded-full bg-current/5 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.round(userStats.rankProgress || 0))}%`, backgroundColor: userStats.rankColor || '#ef4444' }} />
                                    </div>
                                    <span className="text-[9px] font-outfit font-bold py-0.5 px-2 rounded-lg shrink-0" style={{ backgroundColor: `${userStats.rankColor || '#ef4444'}15`, color: userStats.rankColor || '#ef4444' }}>{userStats.kIndex}</span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="w-full max-w-[320px] grid grid-cols-3 gap-2.5">
                                <div className="flex flex-col items-center p-3.5 rounded-[20px] border border-current/5 bg-current/[.02]">
                                    <Zap size={13} strokeWidth={2} className="text-[#38bdf8] mb-1.5" />
                                    <span className="font-outfit font-black text-lg leading-none mb-1">{userStats.xp}</span>
                                    <span className="text-[7px] font-mono uppercase tracking-widest opacity-30 text-center">{t('dossier.xpPoints')}</span>
                                </div>
                                <div className="flex flex-col items-center p-3.5 rounded-[20px] border border-current/5 bg-current/[.02]">
                                    <Activity size={13} strokeWidth={2} className="text-[#f59e0b] mb-1.5" />
                                    <span className="font-outfit font-black text-lg leading-none mb-1">{userStats.streak}</span>
                                    <span className="text-[7px] font-mono uppercase tracking-widest opacity-30 text-center">{t('dossier.streakDays')}</span>
                                </div>
                                <div className="flex flex-col items-center p-3.5 rounded-[20px] border border-current/5 bg-current/[.02]">
                                    <Hexagon size={13} strokeWidth={2} className="mb-1.5" style={{ color: userStats.rankColor || '#ef4444' }} />
                                    <span className="font-outfit font-black text-lg leading-none mb-1">{userStats.rank_index}</span>
                                    <span className="text-[7px] font-mono uppercase tracking-widest opacity-30 text-center">{t('dossier.rankIndex')}</span>
                                </div>
                            </div>
                        </ScrollReveal>

                        {/* Tabs */}
                        <ScrollReveal delay={0.2} className="w-full px-6 flex items-center justify-start gap-6 border-b border-current/5 mb-6 relative z-10">
                            <button onClick={() => setActiveProfileTab('stats')} className={`pb-3 relative transition-colors duration-300 text-[10px] font-outfit font-bold uppercase tracking-widest ${activeProfileTab === 'stats' ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}>
                                {t('dossier.tabStats')}
                                {activeProfileTab === 'stats' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] rounded-full" style={{ backgroundColor: userStats.rankColor || '#ef4444' }} />}
                            </button>
                            <button onClick={() => setActiveProfileTab('achievements')} className={`pb-3 relative transition-colors duration-300 text-[10px] font-outfit font-bold uppercase tracking-widest ${activeProfileTab === 'achievements' ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}>
                                {t('dossier.tabAchievements')}
                                {activeProfileTab === 'achievements' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] rounded-full" style={{ backgroundColor: userStats.rankColor || '#ef4444' }} />}
                            </button>
                        </ScrollReveal>

                        {/* VERITAS · Temporada (XP sazonal) + Índice de Integridade */}
                        <SeasonCard />
                        <TrustCard />

                        {/* Content */}
                        <div className="relative w-full px-4">
                            {/* Stats Tab */}
                            <div className={`transition-all duration-500 ${activeProfileTab === 'stats' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                {/* Classification Card */}
                                <div className="flex items-center justify-between mb-3 px-0.5 pt-2">
                                    <span className="text-[10px] font-mono font-black tracking-[0.25em] uppercase opacity-60">Rank & Status</span>
                                </div>
                                <ScrollReveal delay={0.25}>
                                    <button
                                        onClick={() => setIsViewingRanks(true)}
                                        className="w-full text-left p-6 rounded-[28px] mb-3 relative overflow-hidden group transition-all duration-300 block hover:scale-[1.01] active:scale-[0.99]"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    >
                                        <ChevronRight size={16} strokeWidth={1.5} className="absolute top-6 right-6 opacity-15 group-hover:opacity-40 group-hover:translate-x-0.5 transition-all" />
                                        <div className="flex justify-between items-center mb-8 relative z-10">
                                            <div>
                                                <h3 className="text-[8px] font-mono font-bold opacity-25 tracking-[0.3em] uppercase mb-3">{t('dossier.classification')}</h3>
                                                <span 
                                                    className="text-6xl font-outfit font-black tracking-tight block"
                                                    style={{ 
                                                        color: userStats.rankColor || 'var(--text-main)',
                                                        filter: `drop-shadow(0 0 20px ${userStats.rankColor || 'var(--text-main)'}30)`
                                                    }}
                                                >
                                                    {userStats.rank}
                                                </span>
                                            </div>
                                            <div className="relative w-20 h-20 flex items-center justify-center">
                                                <div className="absolute w-full h-full rounded-full border opacity-8" style={{ borderColor: 'var(--text-main)' }} />
                                                <div className="absolute w-[80%] h-[80%] rounded-full border opacity-20 group-hover:rotate-90 transition-transform duration-1000" style={{ borderColor: userStats.rankColor || '#ef4444' }} />
                                                <User size={28} className="opacity-60 relative z-10" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-t pt-5 relative z-10" style={{ borderColor: 'var(--border-color)' }}>
                                            <div>
                                                <span className="text-[7px] font-mono font-bold opacity-25 uppercase tracking-[0.2em] block mb-1.5">K-Index</span>
                                                <span className="text-xl font-outfit font-black">{userStats.kIndex}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[7px] font-mono font-bold opacity-25 uppercase tracking-[0.2em] block mb-1.5">Status</span>
                                                <span className="text-xl font-outfit font-black uppercase tracking-wide" style={{ color: userStats.rankColor || '#ef4444', opacity: 0.85 }}>{locRankStatus(userStats.rankStatus, lang) || t('dossier.critical')}</span>
                                            </div>
                                        </div>
                                    </button>
                                </ScrollReveal>

                                {/* Global Ranking Button */}
                                <div className="flex items-center justify-between mb-3 mt-6 px-0.5">
                                    <span className="text-[10px] font-mono font-black tracking-[0.25em] uppercase opacity-60">{t('dossier.community')}</span>
                                </div>
                                <ScrollReveal delay={0.3}>
                                    <button
                                        onClick={() => setIsViewingGlobalRanking(true)}
                                        className="w-full mb-3 p-4 rounded-[28px] flex justify-between items-center group transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-[#f59e0b]/8 border border-[#f59e0b]/15 flex items-center justify-center"><Medal size={18} strokeWidth={1.5} className="text-[#f59e0b]" /></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-[11px] font-outfit font-bold uppercase tracking-wider text-[#f59e0b]">{t('dossier.globalRanking')}</span>
                                                <span className="text-[8px] font-mono opacity-35 uppercase tracking-wider mt-0.5">{t('dossier.positionFriends')}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="opacity-20 group-hover:opacity-50 transition-opacity" />
                                    </button>
                                </ScrollReveal>

                                {/* Mentor Card */}
                                <div className="flex items-center justify-between mb-3 mt-6 px-0.5">
                                    <span className="text-[10px] font-mono font-black tracking-[0.25em] uppercase opacity-60">{t('dossier.innerMentor')}</span>
                                </div>
                                <ScrollReveal delay={0.4}>
                                    <button
                                        onClick={() => setIsViewingMentors(true)}
                                        className="w-full text-left p-6 rounded-[28px] group relative overflow-hidden mb-4 transition-all duration-300 block hover:scale-[1.01] active:scale-[0.99]"
                                        style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                    >
                                        <ChevronRight size={16} strokeWidth={1.5} className="absolute top-6 right-6 opacity-15 group-hover:opacity-40 transition-opacity" />
                                        <span className="text-[7px] font-mono font-bold opacity-25 uppercase tracking-[0.2em] block mb-2">{t('dossier.activeMentor')}</span>
                                        <h4 className="font-outfit text-base font-black tracking-wide uppercase">{activeMentor.name}</h4>
                                        <span className="text-[8px] font-mono opacity-30 uppercase tracking-wider mt-0.5 block">{activeMentor.style}</span>
                                        <p className="text-[10px] font-mono leading-relaxed opacity-40 my-4 line-clamp-2">{activeMentor.profile}</p>
                                        <div className="w-full h-10 rounded-2xl border flex items-center justify-center opacity-50 hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--border-color)' }}>
                                            <span className="text-[8px] font-mono tracking-[0.3em] uppercase font-semibold">{t('dossier.configure')}</span>
                                        </div>
                                    </button>
                                </ScrollReveal>
                            </div>

                            {/* Achievements Tab · BLOQUEADA — em desenvolvimento
                                O conteúdo real (resumo + OrvaxAchievementBadges) está
                                preservado no histórico do git; restaurar quando a feature
                                estiver pronta. */}
                            <div className={`transition-all duration-500 ${activeProfileTab === 'achievements' ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                                <div className="flex flex-col items-center justify-center text-center px-6 py-16 mt-2 rounded-[28px] border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                                    <div className="relative w-16 h-16 flex items-center justify-center mb-6">
                                        <div className="absolute w-full h-full rounded-full border opacity-10" style={{ borderColor: 'var(--text-main)' }} />
                                        <div className="absolute w-[78%] h-[78%] rounded-full border opacity-20" style={{ borderColor: 'var(--text-main)' }} />
                                        <Award size={26} className="opacity-40 relative z-10" />
                                    </div>
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-[0.35em] opacity-30 mb-3">{t('dossier.achievementsLabel')}</span>
                                    <h3 className="font-outfit font-black text-lg uppercase tracking-wide mb-2">{t('dossier.underDevelopment')}</h3>
                                    <p className="text-[11px] font-mono leading-relaxed opacity-40 max-w-[240px]">
                                        {t('dossier.achievementsSoon')}
                                    </p>
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

            {isViewingAccount && (
                <AccountScreen theme={theme} toggleTheme={toggleTheme} onClose={() => setIsViewingAccount(false)} />
            )}
        </div>
    );
};

export default Dossier;
