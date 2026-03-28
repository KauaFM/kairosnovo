import React from 'react';
import { ChevronLeft, Trophy, Hexagon } from 'lucide-react';

const UserProfile = ({ user, onClose }) => {
    // Generate mock stats based on the selected user
    const levelStr = user.score > 20000 ? "Elite Operacional" : user.score > 15000 ? "Operador Avançado" : "Iniciado Neural";
    const streaks = Math.floor(user.score / 800);
    const students = Math.floor(user.score / 60);

    return (
        <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto animate-in slide-in-from-right-8 duration-500 font-sans pb-12" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}>

            {/* Background Image / Blur Effect imitating the model */}
            <div className="absolute top-0 left-0 w-full h-[45%] opacity-10 pointer-events-none z-0">
                <img src={user.avatar} className="w-full h-full object-cover blur-md" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-color)]"></div>
            </div>

            {/* Nav Header */}
            <div className="px-6 pt-12 pb-4 flex justify-between items-center relative z-20">
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:scale-105 transition-all duration-300 border backdrop-blur-md"
                    style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-color)' }}
                >
                    <ChevronLeft size={20} className="opacity-70" />
                </button>
                <button className="w-10 h-10 flex items-center justify-center transition-all duration-300">
                    <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                    </span>
                </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col items-center px-6 relative z-10 mt-2">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-current/10 shadow-[0_0_30px_var(--glass-shadow)] mb-5 relative z-10">
                    <div className="absolute inset-0 bg-current/20 animate-pulse"></div>
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover relative z-10" />
                </div>

                <h1 className="text-3xl font-syncopate font-black tracking-widest text-glow mb-2">{user.name}</h1>
                <span className="text-[11px] font-mono opacity-50 uppercase tracking-[0.2em]">{levelStr}</span>

                {/* KPIs */}
                <div className="flex justify-between w-full max-w-[340px] mt-10">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Trophy size={18} fill="#ffca28" color="#ffca28" className="drop-shadow-[0_0_5px_#ffca28]" />
                            <span className="text-2xl font-space font-black">{user.rank}</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">Ranking</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-space font-black mb-2.5">{user.score.toLocaleString()}</span>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">PONTOS Totais</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-space font-black mb-2.5">{streaks}</span>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">Sequências de Metas</span>
                    </div>
                </div>
            </div>

            {/* Coach / Mentor Card */}
            <div className="px-6 mt-8 relative z-10 w-full max-w-[380px] mx-auto">
                <div className="glass-panel p-5 rounded-[24px] flex items-center gap-5 transition-all duration-300 overflow-hidden relative" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--glass-bg)' }}>
                    {/* The left image mimicking the reference */}
                    <div className="w-20 h-24 rounded-lg overflow-hidden relative shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center bg-current/10">
                            <Hexagon size={40} className="opacity-20 animate-[spin_10s_linear_infinite]" />
                        </div>
                        {/* A generic highly filtered cyberpunk image placeholder */}
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80')] bg-cover bg-center opacity-60 mix-blend-luminosity"></div>
                    </div>

                    <div className="flex flex-col w-full h-full py-1">
                        <h3 className="font-syncopate font-bold text-[13px] tracking-wider mb-1">Treinador MENTAL</h3>
                        <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest mb-3">Assistente Pessoal</span>

                        <div className="flex gap-6 mt-auto">
                            <div className="flex flex-col">
                                <span className="font-space font-black text-[16px]">{students}</span>
                                <span className="text-[8px] font-mono opacity-40 uppercase">Afinidade</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-space font-black text-[16px]">{Math.floor(streaks / 2)}</span>
                                <span className="text-[8px] font-mono opacity-40 uppercase">Conquistas</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Chart */}
            <div className="px-6 mt-12 mb-10 relative z-10 w-full max-w-[380px] mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-2xl font-syncopate font-black tracking-wider">Progresso</h2>
                    <div className="flex gap-4 text-[9px] font-mono uppercase pb-1">
                        <div className="flex items-center gap-1.5 opacity-80">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_5px_#38bdf8]"></div>
                            Atual
                        </div>
                        <div className="flex items-center gap-1.5 opacity-40">
                            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
                            Meta
                        </div>
                    </div>
                </div>

                {/* Simulated Chart SVG Container */}
                <div className="relative h-44 w-full">
                    {/* Y-axis grid lines */}
                    <div className="absolute inset-0 flex justify-between px-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(i => (
                            <div key={i} className="h-full w-[1px] bg-current opacity-[0.05]"></div>
                        ))}
                    </div>

                    <svg viewBox="0 0 300 120" className="absolute inset-0 w-full h-full preserve-3d" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="neonCyan" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Goal line (lower priority/opacity, gray) */}
                        <path
                            d="M 0 80 Q 25 30 50 60 T 100 90 T 150 50 T 200 80 T 250 100 T 300 70"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="opacity-[0.2]"
                        />

                        {/* Current Progress Line (Cyan #38bdf8) */}
                        <path
                            d="M 0 100 Q 25 80 50 40 T 130 50 T 160 30"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 4px 6px rgba(56,189,248,0.4))' }}
                        />

                        {/* Fill area beneath the Cyan line */}
                        <path
                            d="M 0 100 Q 25 80 50 40 T 130 50 T 160 30 L 160 120 L 0 120 Z"
                            fill="url(#neonCyan)"
                        />

                        {/* The current Point ring on the line */}
                        <circle cx="160" cy="30" r="4.5" fill="var(--bg-color)" stroke="#38bdf8" strokeWidth="2.5" className="shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                    </svg>

                    {/* X-axis labels */}
                    <div className="absolute -bottom-8 w-full flex justify-between px-[10px] text-[9px] font-mono tracking-wider opacity-40">
                        <span>DOM</span>
                        <span>SEG</span>
                        <span>TER</span>
                        <span className="font-bold opacity-100 uppercase" style={{ color: 'var(--text-main)' }}>QUA</span>
                        <span>QUI</span>
                        <span>SEX</span>
                        <span>SÁB</span>
                    </div>
                </div>
            </div>

            <div className="h-10"></div> {/* padding-bottom */}
        </div>
    );
};

export default UserProfile;
