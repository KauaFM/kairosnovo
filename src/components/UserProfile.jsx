import React, { useEffect, useState } from 'react';
import { useLang } from '../i18n/LanguageContext';
import {
    ChevronLeft, Trophy, Flame, CheckSquare, Target,
    TrendingUp, Zap, Activity, Calendar,
} from 'lucide-react';
import { getPublicProfile, RANK_DEFS } from '../services/db';

// ============================================================
// ORVAX — Perfil público (visto do Ranking)
// Mostra o que AQUELE usuário está fazendo agora para
// motivar os outros. 100% dados reais via RPC get_public_profile.
// Tema preto-branco — sem cores fora da paleta.
// ============================================================

const PILLAR_LABELS = {
    disciplina: 'Disciplina',
    consistencia: 'Consistência',
    foco: 'Foco',
    energia: 'Energia',
    evolucao: 'Evolução',
};

const SOURCE_META = {
    task_done:     { label: 'TAREFA',  Icon: CheckSquare },
    habit_done:    { label: 'HÁBITO',  Icon: Flame },
    goal_progress: { label: 'META +',  Icon: Target },
    goal_complete: { label: 'META ✓',  Icon: Trophy },
};

function relTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)    return 'agora';
    if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800)return `${Math.floor(diff / 86400)}d`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function rankFromXP(xp) {
    const v = Number(xp || 0);
    let current = RANK_DEFS[0];
    for (const r of RANK_DEFS) {
        if (v >= r.minXP) current = r;
        else break;
    }
    return current;
}

const UserProfile = ({ user, onClose }) => {
    const { t } = useLang();
    const srcLabel = (src) => { const k = 'common.sources.' + src; const v = t(k); return v === k ? (SOURCE_META[src]?.label || t('common.sources.system')) : v; };
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            const result = await getPublicProfile(user.id);
            if (alive) {
                setData(result);
                setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [user.id]);

    const p = data || {};
    const pillars = p.pillars || {};
    const stats   = p.stats   || {};
    const recent  = Array.isArray(p.recent) ? p.recent : [];
    const rankObj = rankFromXP(p.xp);
    const position = p.rank_position ?? user.rank ?? '—';

    return (
        <div
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto animate-in slide-in-from-right-8 duration-500 font-sans pb-12"
            style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
        >
            {/* Nav Header */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-center">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md transition-transform hover:scale-105"
                    style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
                >
                    <ChevronLeft size={20} className="opacity-70" />
                </button>
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40">
                    Perfil Público
                </span>
                <div className="w-10" />
            </div>

            {/* Identity */}
            <div className="flex flex-col items-center px-6 mt-2">
                <div className="w-28 h-28 rounded-full overflow-hidden border border-current/20 shadow-[0_0_30px_var(--glass-shadow)] mb-4">
                    <img
                        src={p.avatar_url || user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                        alt={p.full_name || user.name}
                        className="w-full h-full object-cover"
                    />
                </div>
                <h1 className="text-2xl font-syncopate font-black tracking-widest uppercase text-glow text-center">
                    {p.full_name || user.name || t('common.agentDefault')}
                </h1>
                <div className="mt-2 flex items-center gap-2">
                    <span
                        className="px-2 py-[3px] rounded text-[9px] font-mono font-bold uppercase tracking-[0.14em] border"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        {rankObj?.rank || 'E-'} · {rankObj?.title || '—'}
                    </span>
                </div>
                <span className="mt-2 text-[10px] font-mono opacity-50 tabular-nums">
                    #{position} global · {Number(p.xp || 0).toLocaleString('pt-BR')} XP total
                </span>
            </div>

            {/* KPIs */}
            <div className="px-6 mt-8">
                <div className="grid grid-cols-3 gap-3">
                    <KPI label="Streak"   value={`${p.streak_days ?? 0}d`} Icon={Flame} />
                    <KPI label="Tasks 7d" value={pillars.tasks_7d ?? 0}    Icon={CheckSquare} />
                    <KPI label="Hábitos 7d" value={pillars.habits_7d ?? 0} Icon={Activity} />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                    <KPI label="XP 7d"   value={pillars.xp_7d ?? 0}    Icon={Zap} />
                    <KPI label="XP hoje" value={stats.today_xp ?? 0}   Icon={TrendingUp} />
                    <KPI label="Desde" value={
                        p.created_at
                          ? new Date(p.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
                          : '—'
                    } Icon={Calendar} />
                </div>
            </div>

            {/* Pilares */}
            <div className="px-6 mt-8">
                <div className="flex items-center gap-2 mb-3">
                    <Target size={12} className="opacity-50" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-60">
                        Pilares · 7 dias
                    </span>
                </div>
                <div className="flex flex-col gap-2">
                    {Object.keys(PILLAR_LABELS).map(k => (
                        <div key={k} className="flex items-center gap-3">
                            <span className="w-[88px] text-[10px] font-mono uppercase tracking-wider opacity-70">
                                {t('common.profileP.' + k)}
                            </span>
                            <div className="flex-1 h-[3px] rounded-full bg-current/10 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${pillars[k] || 0}%`,
                                        background: 'linear-gradient(90deg, var(--text-main), var(--text-main))',
                                        opacity: 0.85,
                                    }}
                                />
                            </div>
                            <span className="w-[34px] text-right text-[11px] font-space font-bold tabular-nums">
                                {pillars[k] || 0}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Atividade Recente — o "o que está fazendo" */}
            <div className="px-6 mt-8">
                <div className="flex items-center gap-2 mb-3">
                    <Activity size={12} className="opacity-50" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-60">
                        O que está fazendo
                    </span>
                </div>
                {loading ? (
                    <div className="py-8 flex justify-center opacity-40">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : recent.length === 0 ? (
                    <p className="text-[10px] font-mono opacity-40 py-4 text-center">
                        Nenhuma atividade recente registrada.
                    </p>
                ) : (
                    <ul className="flex flex-col">
                        {recent.map((it, idx) => {
                            const meta = SOURCE_META[it.source] || { label: 'SISTEMA', Icon: Zap };
                            const Icon = meta.Icon;
                            const isLast = idx === recent.length - 1;
                            return (
                                <li
                                    key={it.id}
                                    className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-current/10' : ''}`}
                                >
                                    <div className="w-7 h-7 rounded-lg border border-current/15 flex items-center justify-center">
                                        <Icon size={11} className="opacity-70" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[6px] font-mono font-bold uppercase tracking-[0.16em] opacity-50 px-1 py-[1px] rounded border border-current/15">
                                            {srcLabel(it.source)}
                                        </span>
                                        <p className="mt-0.5 text-[10px] font-mono font-bold truncate opacity-90">
                                            {it.title}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5">
                                        <span className="text-[11px] font-space font-black tabular-nums">
                                            +{it.amount}
                                            <span className="text-[7px] font-mono font-normal opacity-40 ml-0.5">XP</span>
                                        </span>
                                        <span className="text-[8px] font-mono opacity-40 tabular-nums">
                                            {relTime(it.created_at)}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <div className="h-10" />
        </div>
    );
};

function KPI({ label, value, Icon }) {
    return (
        <div
            className="rounded-2xl border p-3 flex flex-col gap-1 backdrop-blur-md"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg)' }}
        >
            <div className="flex items-center gap-1.5">
                {Icon && <Icon size={10} className="opacity-50" />}
                <span className="text-[7px] font-mono uppercase tracking-wider opacity-40">{label}</span>
            </div>
            <span className="text-[18px] font-space font-black tabular-nums leading-none">
                {value}
            </span>
        </div>
    );
}

export default UserProfile;
