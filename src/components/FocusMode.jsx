import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, Square, Sparkles } from 'lucide-react';
import { createFocusSession, completeFocusSession } from '../services/db';
import { ScrollContainer, OrvaxHeader } from './BaseLayout';

const FocusMode = ({ theme, toggleTheme }) => {
    // Timer State
    const [totalMinutes, setTotalMinutes] = useState(25);
    const TOTAL_SECONDS = totalMinutes * 60;
    const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const sessionIdRef = useRef(null);

    // Sync time left when changing total duration (if not active)
    useEffect(() => {
        if (!isTimerActive) {
            setTimeLeft(totalMinutes * 60);
        }
    }, [totalMinutes, isTimerActive]);

    const [quoteIndex, setQuoteIndex] = useState(0);
    const quotes = [
        "Foco absoluto no agora.",
        "Abrace o silêncio.",
        "Estado de flow ativado.",
        "Desconecte para reconectar.",
        "Uma tarefa por vez.",
        "Apenas respire e execute.",
        "Mergulho profundo."
    ];

    useEffect(() => {
        let quoteInterval = null;
        if (isTimerActive) {
            quoteInterval = setInterval(() => {
                setQuoteIndex(prev => (prev + 1) % quotes.length);
            }, 6000);
        }
        return () => clearInterval(quoteInterval);
    }, [isTimerActive, quotes.length]);

    useEffect(() => {
        let interval = null;
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
        } else if (timeLeft === 0) {
            setIsTimerActive(false);
            // Persist completed session
            if (sessionIdRef.current) {
                completeFocusSession(sessionIdRef.current, totalMinutes);
                sessionIdRef.current = null;
            }
        }
        return () => clearInterval(interval);
    }, [isTimerActive, timeLeft]);

    const handleTimerReset = () => {
        setIsTimerActive(false);
        setTimeLeft(TOTAL_SECONDS);
    };

    const toggleTimer = async () => {
        if (timeLeft === 0) setTimeLeft(TOTAL_SECONDS);
        if (!isTimerActive) {
            // Starting a new session - persist to DB
            try {
                const session = await createFocusSession({
                    duration_minutes: totalMinutes,
                    started_at: new Date().toISOString()
                });
                if (session) sessionIdRef.current = session.id;
            } catch (e) { /* continue even if DB fails */ }
        } else if (sessionIdRef.current) {
            // Pausing - save partial progress
            const elapsedMin = Math.round((TOTAL_SECONDS - timeLeft) / 60);
            completeFocusSession(sessionIdRef.current, elapsedMin);
            sessionIdRef.current = null;
        }
        setIsTimerActive(!isTimerActive);
    };

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');

    // Calculates elapsed time instead of remaining 
    const elapsedSeconds = TOTAL_SECONDS - timeLeft;
    const el_min = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const el_sec = String(elapsedSeconds % 60).padStart(2, '0');

    // Progress from 0 (start) to 1 (done)
    const progressPercentage = (TOTAL_SECONDS - timeLeft) / TOTAL_SECONDS;

    // Generate physical/digital fusion dotted track (Ref 3)
    const dotsCount = 72; // one every 5 degrees
    const dots = useMemo(() => {
        const generatedDots = [];
        for (let i = 0; i < dotsCount; i++) {
            const angle = (i * 360) / dotsCount;
            const threshold = i / dotsCount;

            // A dot is "passed" if it's below the current percentage.
            const isActive = threshold <= progressPercentage;

            // The leading edge of the active progress (head dot)
            let isHead = false;
            if (isTimerActive && progressPercentage > 0 && progressPercentage < 1) {
                const currentDotIndex = Math.floor(progressPercentage * dotsCount);
                if (i === currentDotIndex) isHead = true;
            }

            generatedDots.push(
                <div key={i}
                    className="absolute left-1/2 top-1/2"
                    style={{
                        // Rotate then translate radially outward
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-142px)`,
                        willChange: 'transform'
                    }}>
                    <div className={`w-[4px] h-[6px] rounded-[1.5px] transition-all duration-700 ease-out 
                         ${isActive ? 'bg-[var(--neo-accent)] shadow-[0_0_12px_var(--neo-accent)] opacity-100' : 'bg-[var(--neo-text)] opacity-10'} 
                         ${isHead ? 'scale-y-[2.5] scale-x-[2] bg-white shadow-[0_0_15px_#fff] opacity-100' : ''}
                     `} />
                </div>
            );
        }
        return generatedDots;
    }, [progressPercentage, isTimerActive]);

    return (
        <ScrollContainer>
            <OrvaxHeader theme={theme} toggleTheme={toggleTheme} />
            <div className="relative w-full flex justify-center flex-col items-center timer-neo-wrapper font-outfit overflow-hidden pb-32">
            <style>
                {`
                .timer-neo-wrapper {
                    /* Dark Mode Theme */
                    --neo-bg: var(--bg-color);
                    --neo-shadow-dark: rgba(0, 0, 0, 0.8);
                    --neo-shadow-light: rgba(255, 255, 255, 0.03);
                    --neo-text: var(--text-main);
                    --neo-accent: #10b981; /* Emerald Green */
                    --neo-glow: rgba(16, 185, 129, 0.15);
                    --neo-glow-strong: rgba(16, 185, 129, 0.3);
                    
                    background-color: var(--neo-bg);
                    color: var(--neo-text);
                    transition: background-color 0.5s ease, color 0.5s ease;
                }

                :root.light .timer-neo-wrapper {
                    /* Light Mode Soft Neumorphism */
                    --neo-bg: var(--bg-color);
                    --neo-shadow-dark: rgba(160, 175, 195, 0.3);
                    --neo-shadow-light: #ffffff;
                    --neo-text: var(--text-main);
                    --neo-accent: #059669; /* Deep Emerald */
                    --neo-glow: rgba(5, 150, 105, 0.15);
                    --neo-glow-strong: rgba(5, 150, 105, 0.3);
                }

                .neo-dial-outer {
                    background: var(--neo-bg);
                    border-radius: 50%;
                    box-shadow: 
                        25px 25px 50px var(--neo-shadow-dark),
                        -25px -25px 50px var(--neo-shadow-light);
                    transition: box-shadow 0.6s ease;
                }

                .neo-dial-inner {
                    background: var(--neo-bg);
                    border-radius: 50%;
                    box-shadow: 
                        inset 15px 15px 30px var(--neo-shadow-dark),
                        inset -15px -15px 30px var(--neo-shadow-light);
                    transition: box-shadow 0.6s ease;
                }
                
                .neo-btn {
                    background: var(--neo-bg);
                    box-shadow: 
                        8px 8px 16px var(--neo-shadow-dark),
                        -8px -8px 16px var(--neo-shadow-light);
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .neo-btn:hover {
                    border-color: rgba(255,255,255,0.05);
                }

                .neo-btn:active {
                    box-shadow: 
                        inset 6px 6px 12px var(--neo-shadow-dark),
                        inset -6px -6px 12px var(--neo-shadow-light);
                }

                .neo-pill {
                    background: var(--neo-bg);
                    box-shadow: 
                        6px 6px 14px var(--neo-shadow-dark),
                        -6px -6px 14px var(--neo-shadow-light);
                    transition: box-shadow 0.6s ease;
                }
                `}
            </style>

            {/* Inner Content Wrapper */}
            <div className="animate-in slide-in-from-bottom-8 duration-1000 w-full max-w-[428px] mx-auto flex flex-col items-center relative z-10 pt-4">

                {/* Ref 1: Top Status Pill */}
                <div className="neo-pill px-8 py-3.5 rounded-full flex flex-col items-center mb-16 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--neo-shadow-light)] to-transparent opacity-60" />
                    <span className="text-[12px] font-bold tracking-[0.25em] uppercase mb-0.5" style={{ color: 'var(--neo-text)' }}>Timer Orvax</span>
                    <span className="text-[9px] opacity-40 uppercase tracking-widest">{isTimerActive ? "Sincronização Profunda" : "Modo de Espera"}</span>
                </div>

                {/* Ref 2 & 3: The Zenith Dial Component */}
                <div className="neo-dial-outer w-[340px] h-[340px] flex items-center justify-center relative">

                    {/* Inner Rim Ambient Thermal Glow */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-[2000ms] pointer-events-none z-0 ${isTimerActive ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'}`}
                        style={{ boxShadow: 'inset 0 0 60px var(--neo-glow), inset 0 0 10px var(--neo-glow-strong)' }} />

                    {/* Dotted HUD Track (Ref 3) */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {dots}
                    </div>

                    {/* Deep Inner Core Typography */}
                    <div className="neo-dial-inner w-[240px] h-[240px] flex flex-col items-center justify-center pt-10 relative z-20 overflow-hidden">

                        <span className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase opacity-40 relative z-10 transition-colors">Restante</span>

                        <div className={`flex items-center justify-center relative z-10 transition-all duration-700 tabular-nums tracking-tighter mt-1 mb-2 ${isTimerActive ? 'drop-shadow-[0_0_15px_var(--neo-glow)] scale-105' : 'scale-100'}`}>
                            <span className="text-[64px] font-space font-bold" style={{ color: isTimerActive ? 'var(--neo-text)' : 'inherit' }}>{minutes}</span>
                            <span className={`text-[56px] font-space font-light pb-3 mx-1 transition-colors duration-500 ${isTimerActive ? 'animate-[pulse_1.5s_ease-in-out_infinite] text-[var(--neo-accent)] opacity-80' : 'opacity-20'}`}>:</span>
                            <span className="text-[64px] font-space font-light opacity-60">{seconds}</span>
                        </div>

                        <div className="flex flex-col items-center mt-3 relative z-10 border-t border-current/10 pt-4 w-[60%]">
                            <span className="text-[8px] font-mono font-bold tracking-[0.3em] uppercase opacity-30">Decorrido</span>
                            <span className="text-[12px] font-space font-medium opacity-60 mt-1 tabular-nums tracking-widest">{el_min}<span className="opacity-40 mx-0.5">:</span>{el_sec}</span>
                        </div>
                    </div>
                </div>

                {/* Phrase Section */}
                <div className="mt-10 h-10 flex items-center justify-center relative z-20">
                    <div className={`px-8 py-3 rounded-full transition-all duration-700 flex items-center gap-3 ${isTimerActive ? 'neo-pill scale-105' : 'opacity-40 scale-100'}`}>
                        {isTimerActive && <div className="w-2 h-2 rounded-full bg-[var(--neo-accent)] shadow-[0_0_10px_var(--neo-accent)] animate-pulse" />}
                        <p key={quoteIndex} className={`text-[11px] font-black uppercase tracking-[0.25em] mt-[1px] transition-all duration-500 text-[var(--neo-text)] ${isTimerActive ? 'opacity-90' : 'opacity-60'}`}>
                            {isTimerActive ? quotes[quoteIndex] : "Aguardando inicialização"}
                        </p>
                    </div>
                </div>

                {/* Tactical Controls & Adjustments */}
                <div className="mt-8 flex flex-col items-center w-full max-w-[320px] z-20">

                    {/* Time Setters (Only visible when paused) */}
                    <div className={`flex items-center justify-center gap-5 transition-all duration-500 ease-in-out ${isTimerActive ? 'opacity-0 h-0 mb-0 scale-95 overflow-hidden' : 'opacity-100 h-12 mb-6 scale-100'}`}>
                        <button
                            onClick={() => setTotalMinutes(Math.max(5, totalMinutes - 5))}
                            className="neo-btn w-12 h-12 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all active:scale-95"
                            title="- 5 Min"
                        >
                            <span className="font-space font-black text-xl mb-1">-</span>
                        </button>

                        <div className="flex flex-col items-center w-24">
                            <span className="text-[14px] font-space font-bold text-[var(--neo-text)] opacity-80">{totalMinutes} <span className="text-[10px] uppercase tracking-widest opacity-50 ml-0.5">MIN</span></span>
                        </div>

                        <button
                            onClick={() => setTotalMinutes(Math.min(180, totalMinutes + 5))}
                            className="neo-btn w-12 h-12 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition-all active:scale-95"
                            title="+ 5 Min"
                        >
                            <span className="font-space font-black text-xl mb-1">+</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-6 w-full">
                        {/* Reset Micro-Button */}
                        <button
                            onClick={handleTimerReset}
                            className="neo-btn w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all opacity-70 hover:opacity-100 group"
                            title="Reiniciar Timer"
                        >
                            <Square size={20} fill="currentColor" className="opacity-60 group-hover:text-[var(--neo-accent)] group-hover:opacity-100 transition-colors" />
                        </button>

                        {/* Main Engagement Button */}
                        <button
                            onClick={toggleTimer}
                            className="neo-btn flex-1 h-[64px] rounded-[32px] flex items-center justify-center gap-3 transition-all relative overflow-hidden group"
                        >
                            {/* Shimmer physical feedback */}
                            {!isTimerActive && (
                                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[var(--neo-shadow-light)] to-transparent opacity-30 skew-x-12"></div>
                            )}
                            {isTimerActive ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--neo-accent)] shadow-[0_0_10px_var(--neo-accent)] animate-pulse" />
                                    <span className="font-bold text-[14px] tracking-[0.2em] uppercase opacity-90 text-[var(--neo-text)]">Encerrar</span>
                                </>
                            ) : (
                                <>
                                    <Play size={20} fill="currentColor" className="text-[var(--neo-accent)] ml-1" />
                                    <span className="font-bold text-[14px] tracking-[0.2em] uppercase opacity-90 text-[var(--neo-text)]">Iniciar Foco</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Minimal Footer Signature */}
                <div className="mt-16 flex items-center gap-2 opacity-[0.25] justify-center transition-opacity hover:opacity-100 pb-10">
                    <Sparkles size={13} />
                    <span className="text-[9px] tracking-[0.3em] uppercase font-bold">Absolute Focus Neo</span>
                </div>
            </div>
            </div>
        </ScrollContainer>
    );
};

export default FocusMode;
