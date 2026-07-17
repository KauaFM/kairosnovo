import React, { useEffect, useState, useCallback } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { X, Search, UserPlus, Check, Clock, Trash2, Users, Inbox } from 'lucide-react';
import {
    listFriends,
    listFriendRequests,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
} from '../services/db';

// ============================================================
// ORVAX — Friends Manager
// Adicionar / aceitar / remover amigos. Tema preto-branco.
// ============================================================

const FriendsManager = ({ onClose, onChange }) => {
    const { t } = useLang();
    const [tab, setTab] = useState('friends'); // friends | requests | search
    const [friends, setFriends]   = useState([]);
    const [requests, setRequests] = useState([]);
    const [query, setQuery]       = useState('');
    const [results, setResults]   = useState([]);
    const [searching, setSearching] = useState(false);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        const [f, r] = await Promise.all([listFriends(), listFriendRequests()]);
        setFriends(f || []);
        setRequests(r || []);
        onChange?.();
    }, [onChange]);

    useEffect(() => { refresh(); }, [refresh]);

    // Debounce simples da busca
    useEffect(() => {
        if (tab !== 'search') return;
        if (query.trim().length < 2) { setResults([]); return; }
        setSearching(true);
        const t = setTimeout(async () => {
            const r = await searchUsers(query);
            setResults(r || []);
            setSearching(false);
        }, 300);
        return () => clearTimeout(t);
    }, [query, tab]);

    const handleSend = async (userId) => {
        setBusy(true);
        await sendFriendRequest(userId);
        // Atualiza localmente o status do item da busca
        setResults(rs => rs.map(r => r.id === userId ? { ...r, friend_status: 'pending_out' } : r));
        setBusy(false);
    };

    const handleAccept = async (friendshipId) => {
        setBusy(true);
        await acceptFriendRequest(friendshipId);
        await refresh();
        setBusy(false);
    };

    const handleReject = async (friendshipId) => {
        setBusy(true);
        await rejectFriendRequest(friendshipId);
        await refresh();
        setBusy(false);
    };

    const handleRemove = async (friendshipId) => {
        if (!confirm(t('common.friends.removeConfirm'))) return;
        setBusy(true);
        await removeFriend(friendshipId);
        await refresh();
        setBusy(false);
    };

    return (
        <div
            className="absolute inset-0 z-[60] flex flex-col animate-in slide-in-from-bottom-8 duration-400 font-sans overflow-hidden"
            style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
        >
            {/* Header */}
            <div className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-current/10">
                <h2 className="text-lg font-syncopate font-black tracking-widest uppercase">{t('common.friends.title')}</h2>
                <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center border transition-transform hover:scale-105"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-2">
                <TabBtn active={tab === 'friends'} onClick={() => setTab('friends')} Icon={Users}>
                    Amigos · {friends.length}
                </TabBtn>
                <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')} Icon={Inbox}>
                    Pedidos · {requests.length}
                </TabBtn>
                <TabBtn active={tab === 'search'} onClick={() => setTab('search')} Icon={Search}>
                    Buscar
                </TabBtn>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {tab === 'friends' && (
                    friends.length === 0 ? (
                        <EmptyState text={t('lo.noFriends')} />
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {friends.map(f => (
                                <Row
                                    key={f.friendship_id}
                                    name={f.full_name || t('common.agentDefault')}
                                    avatar={f.avatar_url}
                                    userId={f.friend_id}
                                    meta={`${Number(f.xp || 0).toLocaleString('pt-BR')} XP · ${f.streak_days || 0}d streak`}
                                    right={
                                        <button
                                            disabled={busy}
                                            onClick={() => handleRemove(f.friendship_id)}
                                            className="p-2 rounded-lg border border-current/15 hover:border-current/40 transition-colors"
                                        >
                                            <Trash2 size={12} className="opacity-70" />
                                        </button>
                                    }
                                />
                            ))}
                        </ul>
                    )
                )}

                {tab === 'requests' && (
                    requests.length === 0 ? (
                        <EmptyState text={t('lo.noRequests')} />
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {requests.map(r => (
                                <Row
                                    key={r.friendship_id}
                                    name={r.full_name || t('common.agentDefault')}
                                    avatar={r.avatar_url}
                                    userId={r.requester_id}
                                    meta={`${Number(r.xp || 0).toLocaleString('pt-BR')} XP`}
                                    right={
                                        <div className="flex gap-1">
                                            <button
                                                disabled={busy}
                                                onClick={() => handleAccept(r.friendship_id)}
                                                className="px-2 py-1 rounded-lg border border-current/40 flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-current/10"
                                            >
                                                <Check size={10} /> Aceitar
                                            </button>
                                            <button
                                                disabled={busy}
                                                onClick={() => handleReject(r.friendship_id)}
                                                className="p-1.5 rounded-lg border border-current/15 hover:border-current/40"
                                            >
                                                <X size={11} className="opacity-70" />
                                            </button>
                                        </div>
                                    }
                                />
                            ))}
                        </ul>
                    )
                )}

                {tab === 'search' && (
                    <>
                        <div
                            className="flex items-center gap-2 p-3 rounded-2xl border mb-4"
                            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
                        >
                            <Search size={14} className="opacity-50" />
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={t('common.friends.operatorPh')}
                                className="flex-1 bg-transparent outline-none text-[12px] font-mono placeholder:opacity-30"
                                autoFocus
                            />
                        </div>

                        {query.trim().length < 2 ? (
                            <EmptyState text="Digite ao menos 2 caracteres." />
                        ) : searching ? (
                            <div className="flex justify-center py-10 opacity-40">
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : results.length === 0 ? (
                            <EmptyState text={t('lo.noOperators')} />
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {results.map(u => (
                                    <Row
                                        key={u.id}
                                        name={u.full_name || t('common.agentDefault')}
                                        avatar={u.avatar_url}
                                        userId={u.id}
                                        meta={`${Number(u.xp || 0).toLocaleString('pt-BR')} XP`}
                                        right={renderSearchAction(u, handleSend, busy)}
                                    />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

function renderSearchAction(u, handleSend, busy) {
    switch (u.friend_status) {
        case 'self':
            return <span className="text-[9px] font-mono opacity-40 uppercase">{t('common.friends.you')}</span>;
        case 'accepted':
            return (
                <span className="px-2 py-1 rounded-lg border border-current/25 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                    <Check size={10} /> Amigos
                </span>
            );
        case 'pending_out':
            return (
                <span className="px-2 py-1 rounded-lg border border-current/20 text-[9px] font-mono font-bold uppercase opacity-60 flex items-center gap-1">
                    <Clock size={10} /> Enviado
                </span>
            );
        case 'pending_in':
            return (
                <span className="px-2 py-1 rounded-lg border border-current/25 text-[9px] font-mono font-bold uppercase flex items-center gap-1">
                    <Inbox size={10} /> Aguardando você
                </span>
            );
        default:
            return (
                <button
                    disabled={busy}
                    onClick={() => handleSend(u.id)}
                    className="px-2 py-1 rounded-lg border border-current/40 flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider hover:bg-current/10"
                >
                    <UserPlus size={10} /> Adicionar
                </button>
            );
    }
}

function TabBtn({ active, onClick, Icon, children }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-2 rounded-xl text-[9px] font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                active
                    ? 'border border-current/40 bg-current/10'
                    : 'border border-current/10 opacity-50 hover:opacity-100'
            }`}
        >
            <Icon size={11} /> {children}
        </button>
    );
}

function Row({ name, avatar, userId, meta, right }) {
    const src = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
    return (
        <li
            className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
        >
            <div className="w-10 h-10 rounded-full overflow-hidden border border-current/15 flex-shrink-0">
                <img src={src} alt={name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-syncopate font-bold tracking-wide truncate">{name}</p>
                <p className="text-[9px] font-mono opacity-50 tabular-nums">{meta}</p>
            </div>
            <div className="flex-shrink-0">{right}</div>
        </li>
    );
}

function EmptyState({ text }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 opacity-40">
            <Users size={28} className="mb-3" />
            <span className="text-[10px] font-mono uppercase tracking-widest">{text}</span>
        </div>
    );
}

export default FriendsManager;
