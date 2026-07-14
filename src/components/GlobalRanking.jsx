import React, { useState, useEffect, useCallback } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { Trophy, Star, Users, Globe, Gem, UserPlus } from 'lucide-react';
import UserProfile from './UserProfile';
import FriendsManager from './FriendsManager';
import { supabase } from '../lib/supabase';
import { listFriends, listFriendRequests } from '../services/db';

const GlobalRanking = () => {
    const { t } = useLang();
    const [rankMode, setRankMode] = useState('global'); // 'global' | 'friends'
    const [selectedUser, setSelectedUser] = useState(null);
    const [globalUsers, setGlobalUsers] = useState([]);
    const [friendUsers, setFriendUsers] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showManager, setShowManager] = useState(false);

    const formatProfile = (p, index) => {
        const xp = p.xp || 0;
        let badgeText = 'RECRUTA';
        if (xp >= 10000)      badgeText = 'OMEGA';
        else if (xp >= 5000)  badgeText = 'MESTRE';
        else if (xp >= 2000)  badgeText = 'ELITE';
        else if (xp >= 1000)  badgeText = 'SENIOR';
        else if (xp >= 500)   badgeText = 'ALPHA';

        const streakDays = p.streak_days || 0;
        const delta = streakDays > 0 ? `+${streakDays}` : '0';

        return {
            id: p.id,
            rank: index + 1,
            name: p.full_name || t('dossier.defaultName'),
            handle: `@${(p.full_name || 'user').toLowerCase().replace(/\s/g, '')}`,
            avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
            score: xp,
            delta,
            badgeText,
            // Paleta preto-branco: badge só com borda, sem cor fora da paleta
            badgeColor: 'var(--text-main)',
        };
    };

    const fetchRankings = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const myId = session?.user?.id || null;
        setCurrentUserId(myId);

        const [{ data: profiles }, friends, requests] = await Promise.all([
            supabase.from('profiles').select('*').order('xp', { ascending: false }),
            listFriends(),
            listFriendRequests(),
        ]);

        if (profiles) {
            setGlobalUsers(profiles.map(formatProfile));
        }

        // Para o tab "Amigos" — inclui o próprio usuário para ele se ver no ranking
        const myProfile = profiles?.find(p => p.id === myId);
        const friendProfiles = (friends || []).map(f => ({
            id: f.friend_id,
            full_name: f.full_name,
            avatar_url: f.avatar_url,
            xp: f.xp,
            streak_days: f.streak_days,
        }));
        const friendCircle = myProfile ? [myProfile, ...friendProfiles] : friendProfiles;
        friendCircle.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setFriendUsers(friendCircle.map(formatProfile));

        setPendingCount((requests || []).length);
        setLoading(false);
    }, []);

    useEffect(() => { fetchRankings(); }, [fetchRankings]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[var(--text-main)] border-t-transparent rounded-full animate-spin opacity-40"></div>
        </div>
    );

    const usersList = rankMode === 'global' ? globalUsers : friendUsers;

    // Split Top 3 and the rest
    const top3 = usersList.slice(0, 3);
    const rest = usersList.slice(3);

    // Reorder Top 3 for the podium: [2nd, 1st, 3rd]
    let podium = [];
    if (top3.length === 3) {
        podium = [top3[1], top3[0], top3[2]];
    } else if (top3.length === 2) {
        podium = [top3[1], top3[0]];
    } else {
        podium = top3;
    }

    return (
        <div className="animate-in slide-in-from-bottom-8 duration-700 delay-100 pb-32 font-sans w-full max-w-[428px] mx-auto overflow-hidden" style={{ color: 'var(--text-main)' }}>

            {/* Header */}
            <div className="mb-6 px-6 pt-6 flex flex-col items-center">
                <h1 className="text-2xl font-syncopate font-black tracking-widest text-glow uppercase mb-6">Ranking</h1>

                {/* Custom Toggle Switch */}
                <div className="flex bg-current/5 p-1 rounded-2xl border backdrop-blur-md w-full max-w-[300px]" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setRankMode('global')}
                        className={`flex-1 py-3 pl-3 pr-3 text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-2
                            ${rankMode === 'global' ? 'bg-[var(--bg-color)] shadow-[0_0_15px_var(--glass-shadow)] font-bold opacity-100 text-glow scale-100' : 'opacity-40 hover:opacity-100 scale-95'}
                        `}
                    >
                        <Globe size={12} />
                        Global
                    </button>
                    <button
                        onClick={() => setRankMode('friends')}
                        className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all duration-300 flex justify-center items-center gap-2
                            ${rankMode === 'friends' ? 'bg-[var(--bg-color)] shadow-[0_0_15px_var(--glass-shadow)] font-bold opacity-100 text-glow scale-100' : 'opacity-40 hover:opacity-100 scale-95'}
                        `}
                    >
                        <Users size={12} />
                        Amigos
                    </button>
                </div>

                {/* Gerenciar amigos */}
                <button
                    onClick={() => setShowManager(true)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl border border-current/20 text-[10px] font-mono uppercase tracking-widest hover:bg-current/5 transition-all"
                >
                    <UserPlus size={12} />
                    Gerenciar amigos
                    {pendingCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-current/15 text-[9px] font-bold tabular-nums">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Podium Section */}
            <div className="px-6 flex items-end justify-center w-full mt-10 mb-8 min-h-[220px]">
                {podium.map((user, index) => {
                    const isFirst = user.rank === 1;
                    const isSecond = user.rank === 2;
                    const isThird = user.rank === 3;

                    // Height mappings for podium blocks
                    const blockHeight = isFirst ? '120px' : isSecond ? '90px' : '70px';
                    const blockBg = isFirst ? 'bg-current/15 border-t border-current/30' :
                        isSecond ? 'bg-current/10 border-t border-current/20' :
                            'bg-current/5 border-t border-current/10';

                    return (
                        <div key={user.id} className="flex flex-col items-center flex-1 relative z-10 cursor-pointer" onClick={() => setSelectedUser(user)}>
                            {/* Avatar & Info */}
                            <div className={`flex flex-col items-center transition-transform duration-500 hover:scale-105 ${isFirst ? 'z-20 -mb-2' : 'z-10 -mb-1'}`}>
                                <div className="relative mb-2">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-[var(--bg-color)] shadow-xl relative z-10">
                                        <div className="absolute inset-0 bg-current/20 animate-pulse"></div>
                                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    </div>
                                    {isFirst && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_8px_#ffca28]">
                                            <Trophy size={18} fill="#ffca28" color="#ffca28" />
                                        </div>
                                    )}
                                    {isSecond && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_8px_#e0e0e0]">
                                            <Trophy size={14} fill="#e0e0e0" color="#e0e0e0" />
                                        </div>
                                    )}
                                    {isThird && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_8px_#ff8a65]">
                                            <Trophy size={14} fill="#ff8a65" color="#ff8a65" />
                                        </div>
                                    )}
                                </div>
                                <span className={`font-syncopate font-bold text-[9px] sm:text-[10px] tracking-wider uppercase mb-1 ${isFirst ? 'text-glow' : 'opacity-80'}`}>
                                    {user.name}
                                </span>
                                <div
                                    className="px-3 py-1 rounded-md mb-2 flex items-center justify-center font-space font-black text-[11px] sm:text-[12px] border"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                >
                                    {user.badgeText}
                                </div>
                            </div>

                            {/* Podium Block */}
                            <div
                                className={`w-[95%] rounded-t-[16px] flex justify-center items-start pt-3 sm:pt-4 transition-all duration-700 shadow-[0_-5px_20px_var(--glass-shadow)] ${blockBg}`}
                                style={{ height: blockHeight, backdropFilter: 'blur(10px)' }}
                            >
                                <span className="font-space font-black text-4xl sm:text-5xl opacity-20">
                                    {user.rank}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* List Section */}
            <div className="px-6 flex flex-col gap-4 relative z-20">
                {rest.map((user) => {
                    const isMe = user.id === currentUserId;

                    return (
                        <div
                            key={user.id}
                            className={`flex items-center justify-between p-4 rounded-[20px] transition-all duration-300 group cursor-pointer
                                ${isMe ? 'bg-current/10 border border-current/30 shadow-[0_0_15px_var(--glass-shadow)] scale-[1.02]' : 'bg-transparent border border-current/10 hover:bg-current/5'}
                            `}
                            onClick={() => setSelectedUser(user)}
                        >
                            <div className="flex items-center gap-4">
                                {/* Rank Number */}
                                <div className="flex items-center gap-1 w-8 sm:w-10 opacity-70">
                                    <Trophy size={12} />
                                    <span className="font-space font-bold text-[14px]">{user.rank}</span>
                                </div>

                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-current/20 relative shrink-0">
                                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                                    {isMe && (
                                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#22c55e]/80 to-transparent flex justify-center">
                                            <Gem size={8} className="text-white drop-shadow-[0_0_5px_#fff]" />
                                        </div>
                                    )}
                                </div>

                                {/* Name & Handle */}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <span className={`font-syncopate font-bold text-[11px] sm:text-[12px] tracking-wide ${isMe ? 'text-[#22c55e] text-glow' : 'opacity-90'}`}>
                                            {user.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono opacity-40 mt-0.5">{user.handle}</span>
                                </div>
                            </div>

                            {/* Score & Delta */}
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 opacity-90">
                                    <Star size={10} fill="#ffca28" color="#ffca28" className="drop-shadow-[0_0_5px_#ffca28]" />
                                    <span className="font-space font-black text-[14px] sm:text-[16px]">{user.score.toLocaleString()}</span>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-[#22c55e] drop-shadow-[0_0_5px_rgba(34,197,94,0.4)] mt-0.5">
                                    {user.delta}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {usersList.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[300px] opacity-40 px-6 text-center">
                    {rankMode === 'friends' ? (
                        <>
                            <Users size={40} className="mb-4" />
                            <span className="text-[10px] font-mono tracking-widest uppercase">{t('ranking.emptyNetwork')}</span>
                            <span className="text-[8px] font-mono tracking-widest uppercase mt-2">{t('ranking.addFriends')}</span>
                            <button
                                onClick={() => setShowManager(true)}
                                className="mt-5 px-4 py-2 rounded-xl border border-current/40 text-[10px] font-mono uppercase tracking-widest opacity-100 hover:bg-current/5"
                            >
                                + Adicionar amigos
                            </button>
                        </>
                    ) : (
                        <>
                            <Trophy size={40} className="mb-4" />
                            <span className="text-[10px] font-mono tracking-widest uppercase">{t('ranking.noData')}</span>
                            <span className="text-[8px] font-mono tracking-widest uppercase mt-2">{t('ranking.awaitingSync')}</span>
                        </>
                    )}
                </div>
            )}

            {/* Profile Modal */}
            {selectedUser && (
                <UserProfile user={selectedUser} onClose={() => setSelectedUser(null)} />
            )}

            {/* Friends Manager */}
            {showManager && (
                <FriendsManager
                    onClose={() => setShowManager(false)}
                    onChange={fetchRankings}
                />
            )}
        </div>
    );
};

export default GlobalRanking;
