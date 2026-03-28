import React, { useState, useEffect } from 'react';
import { ChevronLeft, Lock, Sword, Sparkles, Flame, Anchor, Zap, Crosshair, Shield, Brain, Target, Heart, Lightbulb, TrendingUp, BookOpen, RefreshCw } from 'lucide-react';
import { updateSelectedMentor, getSelectedMentor } from '../services/db';

export const MENTORS = [
    {
        id: 'atlas',
        name: 'Atlas',
        subtitle: 'Mentor Masculino',
        archetype: 'O Estrategista Disciplinado',
        gender: 'M',
        image: '/atlas.png',
        accentColor: '#C9A96E',
        tags: ['Estratégia', 'Disciplina'],
        profile: 'Força mental, consistência e liderança silenciosa. Ele não grita motivação — ele mostra o caminho.',
        quote: 'Ninguém nasce extraordinário. Extraordinário é uma construção diária.',
        personality: [
            { label: 'Calmo', icon: Anchor },
            { label: 'Analítico', icon: Brain },
            { label: 'Estratégico', icon: Target },
            { label: 'Exigente', icon: Sword },
            { label: 'Focado', icon: Crosshair },
        ],
        stats: [
            { label: 'Disciplina', value: 98 },
            { label: 'Estratégia', value: 95 },
            { label: 'Intensidade', value: 80 },
            { label: 'Empatia', value: 65 },
        ],
        method: ['Estratégia de vida', 'Crescimento financeiro', 'Aprendizado estruturado', 'Disciplina extrema'],
        questions: [
            'Você está vivendo ou apenas reagindo?',
            'Qual habilidade hoje te aproxima da sua melhor versão?',
            'O que você fez hoje que o seu eu do futuro agradeceria?',
        ],
        phrases: [
            'Disciplina cria liberdade.',
            'Seu potencial é inútil sem ação.',
            'Pare de esperar motivação. Construa sistemas.',
        ],
        locked: false,
    },
    {
        id: 'aurora',
        name: 'Aurora',
        subtitle: 'Mentora Feminina',
        archetype: 'A Guia da Transformação',
        gender: 'F',
        image: '/aurora.png',
        accentColor: '#B87FD4',
        tags: ['Transformação', 'Propósito'],
        profile: 'Renascimento, energia e clareza emocional. Ela mistura ciência, psicologia e propósito para guiar sua evolução.',
        quote: 'A maior prisão do ser humano é a versão limitada que ele acredita ser.',
        personality: [
            { label: 'Empática', icon: Heart },
            { label: 'Inspiradora', icon: Sparkles },
            { label: 'Inteligente', icon: Brain },
            { label: 'Energética', icon: Zap },
            { label: 'Determinada', icon: TrendingUp },
        ],
        stats: [
            { label: 'Empatia', value: 98 },
            { label: 'Motivação', value: 95 },
            { label: 'Clareza', value: 90 },
            { label: 'Intensidade', value: 72 },
        ],
        method: ['Autoconhecimento', 'Clareza de propósito', 'Equilíbrio emocional', 'Energia e motivação'],
        questions: [
            'Quem você seria se não tivesse medo?',
            'Qual parte de você está esperando para despertar?',
            'Você está vivendo a vida que quer ou a que se acostumou?',
        ],
        phrases: [
            'Você não está atrasado. Você está despertando.',
            'Crescimento começa quando você decide se respeitar.',
            'A versão extraordinária de você já existe.',
        ],
        locked: false,
    },
    { id: 'goggins',  name: 'Comandante', archetype: 'Intensidade Absoluta',  icon: Flame,     locked: true },
    { id: 'aurelius', name: 'Monge',       archetype: 'Imperturbabilidade',    icon: Anchor,    locked: true },
    { id: 'robbins',  name: 'Visionário',  archetype: 'Energia & Abundância',  icon: Zap,       locked: true },
    { id: 'newport',  name: 'Foco',        archetype: 'Produtividade Máxima',  icon: Crosshair, locked: true },
    { id: 'willink',  name: 'Forjador',    archetype: 'Honra e Liderança',     icon: Shield,    locked: true },
];

/* ─── Stat Bar ──────────────────────────────────────────── */
const StatBar = ({ label, value, color }) => (
    <div>
        <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] font-mono uppercase tracking-widest opacity-50">{label}</span>
            <span className="text-[9px] font-mono font-bold opacity-70">{value}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${value}%`, backgroundColor: color }}
            />
        </div>
    </div>
);

/* ─── Mentor Detail View ────────────────────────────────── */
const MentorDetail = ({ mentor, isActive, onSelect, isSaving = false }) => {
    const accent = mentor.accentColor;

    return (
        <div className="animate-in fade-in duration-500">
            {/* Hero Image Card */}
            <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: '3/4', maxHeight: '65vw', borderRadius: '24px', boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)` }}
            >
                <img
                    src={mentor.image}
                    alt={mentor.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: 'top center' }}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)` }} />

                {/* Bottom info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    {/* Tags */}
                    <div className="flex gap-2 mb-3">
                        {mentor.tags.map(tag => (
                            <span key={tag} className="text-[8px] font-mono px-2.5 py-1 rounded-full border font-bold uppercase tracking-widest" style={{ borderColor: `${accent}60`, color: accent, backgroundColor: `${accent}15` }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                    <h2 className="text-3xl font-syncopate font-black text-white uppercase tracking-wider leading-none">{mentor.name}</h2>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-1 block">{mentor.archetype}</span>
                </div>
            </div>

            {/* Info below */}
            <div className="mt-5 flex flex-col gap-5">

                {/* Personality Skills */}
                <div>
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Traços</span>
                    <div className="flex gap-2 flex-wrap">
                        {mentor.personality.map(({ label, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0D` }}>
                                <Icon size={10} style={{ color: accent }} />
                                <span className="text-[8px] font-mono" style={{ color: accent }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div>
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Stats</span>
                    <div className="flex flex-col gap-3">
                        {mentor.stats.map(s => <StatBar key={s.label} label={s.label} value={s.value} color={accent} />)}
                    </div>
                </div>

                {/* Profile */}
                <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--glass-bg, rgba(128,128,128,0.04))' }}>
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-2">Perfil</span>
                    <p className="text-[11px] font-mono leading-relaxed opacity-70">{mentor.profile}</p>
                </div>

                {/* Quote */}
                <div className="pl-4" style={{ borderLeft: `2px solid ${accent}60` }}>
                    <p className="text-[12px] font-mono italic opacity-80">"{mentor.quote}"</p>
                </div>

                {/* Method */}
                <div>
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Foco de Trabalho</span>
                    <div className="grid grid-cols-2 gap-2">
                        {mentor.method.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 p-3 rounded-xl border text-[10px] font-mono opacity-70" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: accent }} />
                                {m}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Questions */}
                <div>
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Perguntas que provoca</span>
                    <div className="flex flex-col gap-2">
                        {mentor.questions.map((q, i) => (
                            <p key={i} className="text-[10px] font-mono opacity-60 italic pl-3 py-1 border-l" style={{ borderColor: `${accent}50` }}>"{q}"</p>
                        ))}
                    </div>
                </div>

                {/* Phrases */}
                <div className="p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${accent}15 0%, transparent 100%)`, border: `1px solid ${accent}30` }}>
                    <span className="text-[8px] font-mono uppercase tracking-[0.4em] block mb-3" style={{ color: accent, opacity: 0.7 }}>Frases Marcantes</span>
                    <div className="flex flex-col gap-2.5">
                        {mentor.phrases.map((f, i) => (
                            <p key={i} className="text-[11px] font-mono font-bold" style={{ color: accent }}>— {f}</p>
                        ))}
                    </div>
                </div>

                {/* Select Button */}
                <button
                    onClick={onSelect}
                    disabled={isSaving}
                    className="w-full py-4 rounded-2xl font-syncopate font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50"
                    style={{
                        backgroundColor: isActive ? 'var(--text-main)' : accent,
                        color: isActive ? 'var(--bg-color)' : '#000',
                        boxShadow: isActive ? 'none' : `0 8px 32px ${accent}50`,
                    }}
                >
                    {isSaving ? 'Sincronizando...' : isActive ? '✓ Mentor Ativo' : `Ativar ${mentor.name}`}
                </button>
            </div>
        </div>
    );
};

/* ─── Main Component ────────────────────────────────────── */
const MentorConfig = ({ onClose, selectedMentorId, onSelectMentor }) => {
    const [focusedId, setFocusedId] = useState(selectedMentorId || 'atlas');
    const [detailView, setDetailView] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const unlocked = MENTORS.filter(m => !m.locked);
    const locked   = MENTORS.filter(m => m.locked);
    const focused  = MENTORS.find(m => m.id === focusedId);

    // Carregar mentor salvo do Supabase ao abrir
    useEffect(() => {
        const loadMentor = async () => {
            const saved = await getSelectedMentor();
            if (saved && MENTORS.find(m => m.id === saved)) {
                setFocusedId(saved);
            }
        };
        loadMentor();
    }, []);

    const handleSelect = (id) => {
        const m = MENTORS.find(x => x.id === id);
        if (m?.locked) return;
        setFocusedId(id);
        setDetailView(true);
    };

    const handleActivate = async () => {
        setIsSaving(true);
        try {
            // Salvar no Supabase (para o agente WhatsApp usar)
            await updateSelectedMentor(focusedId);
            if (onSelectMentor) onSelectMentor(focusedId);
        } catch (err) {
            console.error('Erro ao salvar mentor:', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="absolute inset-0 z-50 flex flex-col overflow-hidden font-sans"
            style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
        >
            {/* Ambient glow */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.04] blur-[100px] pointer-events-none" style={{ backgroundColor: focused?.accentColor || '#fff' }} />
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-[0.04] blur-[100px] pointer-events-none" style={{ backgroundColor: focused?.accentColor || '#fff' }} />

            {/* Header */}
            <div className="pt-12 pb-4 px-6 flex justify-between items-center border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                    <span className="text-[9px] font-mono opacity-30 uppercase tracking-[0.5em] block mb-1">Arquitetura Base</span>
                    <h1 className="text-lg font-syncopate font-black tracking-widest uppercase">Mentor Interior</h1>
                </div>
                <button
                    onClick={detailView ? () => setDetailView(false) : onClose}
                    className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105"
                    style={{ borderColor: 'var(--border-color)' }}
                >
                    <ChevronLeft size={18} strokeWidth={1.5} className="opacity-60" />
                </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                {/* ── DETAIL VIEW ── */}
                {detailView && focused && !focused.locked ? (
                    <div className="pt-6">
                        <MentorDetail
                            mentor={focused}
                            isActive={selectedMentorId === focusedId}
                            onSelect={handleActivate}
                            isSaving={isSaving}
                        />
                    </div>
                ) : (
                    /* ── GRID VIEW ── */
                    <div className="pt-5 flex flex-col gap-6">
                        <p className="text-[10px] font-mono opacity-35 uppercase tracking-widest text-center">
                            "O mentor certo acelera a transformação exata."
                        </p>

                        {/* Unlocked — 2 col grid com cards hero */}
                        <div>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Disponíveis</span>
                            <div className="grid grid-cols-2 gap-3">
                                {unlocked.map(mentor => {
                                    const isActive = selectedMentorId === mentor.id;
                                    return (
                                        <button
                                            key={mentor.id}
                                            onClick={() => handleSelect(mentor.id)}
                                            className="relative overflow-hidden group active:scale-[0.96] transition-all duration-200"
                                            style={{ borderRadius: '20px', aspectRatio: '2/3', boxShadow: isActive ? `0 0 0 2px ${mentor.accentColor}, 0 12px 40px rgba(0,0,0,0.3)` : '0 4px 20px rgba(0,0,0,0.15)', border: `1px solid ${isActive ? mentor.accentColor : 'rgba(255,255,255,0.06)'}` }}
                                        >
                                            <img
                                                src={mentor.image}
                                                alt={mentor.name}
                                                className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700"
                                                style={{ objectPosition: 'top center' }}
                                            />
                                            {/* Dark gradient from bottom */}
                                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)' }} />

                                            {/* Active glow */}
                                            {isActive && (
                                                <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 50% 80%, ${mentor.accentColor}, transparent 70%)` }} />
                                            )}

                                            {/* Info */}
                                            <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                                                <span className="block text-[7px] font-mono uppercase tracking-widest mb-1" style={{ color: mentor.accentColor, opacity: 0.8 }}>{mentor.subtitle}</span>
                                                <span className="block text-[13px] font-syncopate font-black text-white uppercase drop-shadow-sm">{mentor.name}</span>
                                                <span className="block text-[7px] font-mono text-white/40 uppercase tracking-wide mt-0.5 truncate">{mentor.archetype}</span>
                                            </div>

                                            {/* Active badge */}
                                            {isActive && (
                                                <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[7px] font-mono font-bold uppercase tracking-wider" style={{ backgroundColor: mentor.accentColor, color: '#000' }}>ATIVO</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Locked — 3 col compact grid */}
                        <div>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-3">Em Breve</span>
                            <div className="grid grid-cols-3 gap-2">
                                {locked.map(mentor => {
                                    const MIcon = mentor.icon;
                                    return (
                                        <div
                                            key={mentor.id}
                                            className="relative flex flex-col items-center justify-center gap-2 p-4 rounded-[16px] cursor-not-allowed select-none"
                                            style={{ border: '1px dashed rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', opacity: 0.5 }}
                                        >
                                            <div className="relative">
                                                <MIcon size={22} strokeWidth={1} className="opacity-30" />
                                                <Lock size={9} className="absolute -top-1 -right-1 opacity-60" />
                                            </div>
                                            <span className="text-[8px] font-syncopate font-black uppercase tracking-wide opacity-50 text-center leading-tight">{mentor.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Atlas x Aurora dynamic table */}
                        <div className="rounded-2xl p-4 border" style={{ border: '1px solid rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <span className="text-[8px] font-mono opacity-30 uppercase tracking-[0.4em] block mb-4 text-center">Atlas × Aurora</span>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <span className="text-[9px] font-syncopate font-black uppercase" style={{ color: '#C9A96E' }}>Atlas</span>
                                <span className="text-[8px] font-mono opacity-20 self-center">vs</span>
                                <span className="text-[9px] font-syncopate font-black uppercase" style={{ color: '#B87FD4' }}>Aurora</span>
                                {[
                                    ['Estratégia', 'Emoção'],
                                    ['Disciplina', 'Consciência'],
                                    ['Execução', 'Transformação'],
                                    ['Racionalidade', 'Intuição'],
                                ].map(([a, b], i) => (
                                    <React.Fragment key={i}>
                                        <span className="text-[9px] font-mono opacity-55">{a}</span>
                                        <div className="flex items-center justify-center"><div className="w-px h-3 opacity-20" style={{ backgroundColor: 'var(--text-main)' }} /></div>
                                        <span className="text-[9px] font-mono opacity-55">{b}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Fade bottom */}
            <div className="absolute bottom-0 inset-x-0 h-24 pointer-events-none z-20" style={{ backgroundImage: 'linear-gradient(to top, var(--bg-color), transparent)' }} />
        </div>
    );
};

export default MentorConfig;
