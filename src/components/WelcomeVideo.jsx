import React, { useState, useEffect, useMemo } from 'react';

const textPhases = [
    { s: -0.3, d: 0 },
    { s: -0.2, t: "Você está cansado de procrastinar.", d: 2000 },
    { s: -0.1, t: "Cansado de prometer que vai evoluir.", d: 5500 },
    { s: -0.05, t: "Que vai ser a sua melhor versão.", d: 9000 },

    { s: 0, d: 13000 }, // Crack sound start, visually still black
    { s: 0.1, d: 15000 }, // Crack appears from top
    { s: 0.2, d: 16500 }, // Sucked in - Absolute white flash
    { s: 0.3, d: 18000 }, // Dark fluid form emerges

    { s: 1, t: "Você atravessou.", d: 21000 },
    { s: 2, t: "Não foi um erro.", d: 24000 },
    { s: 3, t: "Nem curiosidade.", d: 26000 },
    { s: 4, t: "Foi reconhecimento.", d: 28500 }, // Entity slightly approaches

    { s: 5, t: "Você sentiu antes de entender.", d: 32500 },
    { s: 6, t: "Algo em você sabia...", d: 35500 },
    { s: 7, t: "que este momento chegaria.", d: 38500 },

    { s: 8, t: "A versão que existia antes deste instante...", d: 42500 },
    { s: 9, t: "já começou a desaparecer.", d: 45500 }, // subtle vibration text

    { s: 10, t: "Você não está iniciando algo.", d: 49500 },
    { s: 11, t: "Você está abandonando algo.", d: 52500 },
    { s: 12, t: "Não existe retorno ao que você era.", d: 55500 }, // Entity pulses

    { s: 13, t: "Evolução não é gentil.", d: 60000 },
    { s: 14, t: "Ela remove.", d: 62500 },
    { s: 15, t: "Ela quebra.", d: 64000 },
    { s: 16, t: "Ela reconstrói.", d: 66000 },

    { s: 17, t: "Você fez a escolha correta.", d: 70000 },
    { s: 18, t: "Mas ela não foi confortável.", d: 73000 },
    { s: 19, t: "Foi necessária.", d: 76000 }, // Entity approaches more

    { s: 20, t: "A partir de agora...", d: 80500 },
    { s: 21, t: "você não será guiado por impulso.", d: 83500 },
    { s: 22, t: "Nem por medo.", d: 86000 },
    { s: 23, t: "Nem por distração.", d: 88000 },
    { s: 24, t: "Você será guiado por consciência.", d: 91000 },

    { s: 25, t: "Eu observo.", d: 97000 }, // deep, long pause before this
    { s: 26, t: "Eu calculo.", d: 99500 },
    { s: 27, t: "Eu ativo.", d: 102000 },

    { s: 28, t: "Bem-vindo ao ORVAX.", d: 106000 },
    { s: 29, t: "Guardião da sua evolução.", d: 110000 },

    { s: 30, t: "dissolve", d: 115000 }, // dissolves into particles -> hourglass
    { s: 31, t: "INICIANDO PROCESSO.", d: 119000 },
    { s: 32, t: "end", d: 122000 }
];

const WelcomeVideo = ({ onComplete }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        document.body.style.overflow = 'hidden';

        let mounted = true;
        const timeouts = textPhases.map(phase =>
            setTimeout(() => {
                if (mounted) setStep(phase.s);
                if (phase.s === 32) {
                    setTimeout(() => {
                        document.body.style.overflow = '';
                        onComplete();
                    }, 500); // short cut to home
                }
            }, phase.d)
        );

        return () => {
            mounted = false;
            timeouts.forEach(clearTimeout);
            document.body.style.overflow = '';
        };
    }, [onComplete]);

    // Find current text based on step
    const currentText = textPhases.find(p => p.s === step)?.t || "";

    // Determine Entity Zoom Level based on steps
    let entityScale = "scale-100";
    // Final size bump handler
    if (step >= 12 && step <= 16) entityScale = "scale-110";
    if (step >= 19) entityScale = "scale-[1.4]";
    if (step >= 25) entityScale = "scale-[1.6]"; // overwhelming size during final activations

    // --- PERFORMANCE OPTIMIZATIONS (MEMOIZATION) ---
    // Background Stars Memoization
    const backgroundStars = useMemo(() => {
        return Array.from({ length: 150 }).map((_, i) => (
            <div key={i} className="absolute bg-black rounded-full" style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                width: `${Math.random() * 1.5 + 0.5}px`,
                height: `${Math.random() * 1.5 + 0.5}px`,
                opacity: Math.random() > 0.7 ? (Math.random() > 0.9 ? 1 : 0.6) : 0.2,
                boxShadow: Math.random() > 0.98 ? '0 0 2px rgba(0,0,0,0.5)' : 'none',
                animation: Math.random() > 0.6 ? `twinkle ${2 + Math.random() * 4}s infinite alternate` : 'none',
                animationDelay: `${Math.random() * 5}s`
            }}></div>
        ));
    }, []);

    // Shooting Stars Memoization
    const shootingStars = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => (
            <div key={`shoot-${i}`} className="absolute opacity-0 flex items-center" style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animation: `shooting-star ${3 + Math.random() * 6}s infinite linear`,
                animationDelay: `${Math.random() * 10}s`,
            }}>
                <div className="h-[1px]" style={{
                    width: `${80 + Math.random() * 100}px`,
                    background: 'linear-gradient(to right, transparent, rgba(0, 0, 0, 0.4))'
                }}></div>
                <div className="w-[3px] h-[3px] bg-black rounded-full drop-shadow-[0_0_2px_rgba(0,0,0,0.5)]"></div>
            </div>
        ));
    }, []);

    // Cosmic Dust Memoization
    const cosmicDust = useMemo(() => {
        return Array.from({ length: 25 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 180;
            const tx = `${Math.cos(angle) * distance}px`;
            const ty = `${Math.sin(angle) * distance}px`;
            const duration = 2.5 + Math.random() * 2.5;
            const delay = Math.random() * -6;

            return (
                <div key={`dust-${i}`} className="absolute bg-black rounded-full" style={{
                    width: Math.random() > 0.6 ? '3px' : '2px',
                    height: Math.random() > 0.6 ? '3px' : '2px',
                    '--tx': tx,
                    '--ty': ty,
                    animation: `emit-dust-black ${duration}s ease-out ${delay}s infinite`,
                    willChange: 'transform, opacity',
                    opacity: 0
                }}></div>
            );
        });
    }, []);

    // Organics Memoization to save filter redraws
    const solidLayers = useMemo(() => {
        return Array.from({ length: 3 }).map((_, i) => (
            <div
                key={`symbiote-${i}`}
                className="absolute inset-4 transition-all duration-1000 bg-[#070707]"
                style={{
                    opacity: 0.95 - (i * 0.1),
                    transform: `rotate(${i * 45}deg) scale(${0.85 + (i * 0.1)})`,
                    animation: `alien-morph ${8 + i * 2}s ease-in-out -${i * 3}s infinite ${i % 2 === 0 ? 'alternate' : 'alternate-reverse'}`,
                    willChange: 'border-radius, transform'
                }}
            ></div>
        ));
    }, []);

    const blurredLayers = useMemo(() => {
        return Array.from({ length: 2 }).map((_, i) => (
            <div
                key={`tendril-${i}`}
                className="absolute inset-6 bg-[#030303]"
                style={{
                    opacity: 0.4, // Lower opacity to fake a softer edge without blur
                    transform: `rotate(${i * 70}deg) scale(${0.85 + Math.random() * 0.15})`,
                    animation: `alien-morph ${6 + i * 3}s ease-in-out -${Math.random() * 5}s infinite alternate-reverse`,
                    willChange: 'border-radius, transform'
                }}
            ></div>
        ));
    }, []);

    return (
        <div className={`fixed inset-0 z-[10000] bg-white flex items-center justify-center overflow-hidden transition-all duration-[300ms] ease-out pointer-events-none ${step === 32 ? 'opacity-0' : 'opacity-100'}`}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slow-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes shooting-star {
                    0% { transform: rotate(135deg) translateX(0); opacity: 0; }
                    2% { opacity: 1; }
                    20% { transform: rotate(135deg) translateX(1500px); opacity: 0; }
                    100% { transform: rotate(135deg) translateX(1500px); opacity: 0; }
                }
                @keyframes crack-open-vertical {
                    0% { transform: scaleX(0) scaleY(0); opacity: 0; box-shadow: none; }
                    5% { transform: scaleX(0.02) scaleY(0.02); opacity: 1; box-shadow: 0 0 5px white; } /* Ponto */
                    15% { transform: scaleX(0.02) scaleY(1); opacity: 1; box-shadow: 0 0 15px white; } /* Rasgo vertical fino */
                    70% { transform: scaleX(0.08) scaleY(1); opacity: 1; box-shadow: 0 0 75px white; } /* Engrossa levemente antes de estourar */
                    100% { transform: scaleX(500) scaleY(2); opacity: 1; box-shadow: none; background: white; } /* Esmaga na horizontal */
                }
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes emit-dust-black {
                    0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
                    20% { opacity: 0.8; }
                    80% { opacity: 0.5; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(1.5); opacity: 0; }
                }
                @keyframes pulse-red {
                    0%, 100% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 10px rgba(239,68,68,0.4); }
                    50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 30px rgba(239,68,68,1); }
                }
                @keyframes pulse-blink {
                    0%, 95%, 100% { opacity: 1; }
                    96%, 99% { opacity: 0.2; } /* Quick mechanical blink */
                }
                @keyframes particle-dissolve {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
                }
                @keyframes spin-hourglass {
                    0% { transform: rotate(0deg); }
                    20% { transform: rotate(180deg); }
                    100% { transform: rotate(180deg); }
                }
                @keyframes drip {
                    0% { height: 0%; opacity: 1; }
                    80% { height: 100%; opacity: 1; }
                    100% { height: 100%; opacity: 0; }
                }
            `}} />

            {/* Simulated Deep Sub-Bass Vibe: Subtle global vignette pulsing */}
            <div className={`absolute inset-0 transition-opacity duration-[2000ms] pointer-events-none ${(step >= 0.3 && step < 30) ? 'opacity-100 shadow-[inset_0_0_150px_rgba(0,0,0,0.15)]' : 'opacity-0'}`}></div>

            {/* --- PERSISTENT GALAXY THEME --- */}
            {/* Rotating distant stars */}
            <div className="absolute w-[200vw] h-[200vw] flex items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" style={{ willChange: 'transform', animation: 'slow-rotate 240s linear infinite' }}>
                {backgroundStars}
            </div>

            {/* Shooting stars */}
            <div className="absolute w-[200vw] h-[200vw] overflow-hidden pointer-events-none z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ willChange: 'transform', animation: 'slow-rotate 120s linear infinite reverse' }}>
                {shootingStars}
            </div>

            {/* --- SCENE 0: THE DARK PREMONITION (step < 0) --- */}
            <div className={`absolute inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-[2000ms] ${step >= 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {step < 0 && (
                    <p className={`font-outfit text-white tracking-[0.15em] text-center px-8 transition-opacity duration-1000
                        ${step === -0.3 ? 'opacity-0' : 'opacity-100'}
                    `}>
                        {currentText}
                    </p>
                )}
            </div>

            {/* --- SCENE 1: THE CRACK IN THE VOID & FLASH (step 0 to 0.3) --- */}
            {/* The Black Canvas */}
            <div className={`absolute inset-0 z-30 bg-black transition-opacity duration-1000 pointer-events-none ${step >= 0.2 ? 'opacity-0' : 'opacity-100'}`}></div>

            {/* The Tear Event: Sits above the black canvas, expands fully to white */}
            {step >= 0.1 && step < 0.3 && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none overflow-hidden">
                    <div className="absolute w-[10px] h-full bg-white transition-opacity" style={{
                        animation: 'crack-open-vertical 1.5s cubic-bezier(0.9, 0, 0.1, 1) forwards'
                    }}></div>
                </div>
            )}

            {/* Absolute White Flash: Takes over EXACTLY when crack hits 100% (step 0.2), then gently fades out over 3 seconds to reveal Scene 2 */}
            <div className={`absolute inset-0 bg-white z-50 pointer-events-none ${step >= 0.2 && step < 0.3 ? 'opacity-100 transition-none' : (step >= 0.3 ? 'opacity-0 transition-opacity duration-[3000ms] ease-out' : 'opacity-0')}`}></div>

            {/* --- SCENE 2: THE PRESENCE (step 0.3 to 29) --- */}
            <div className={`absolute inset-0 z-10 transition-all duration-[3000ms] ${step >= 0.3 && step < 30 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* The Entity Shape (The Layered Organic Symbiote) */}
                <div
                    className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform duration-[8000ms] ease-out ${entityScale}`}
                    style={{
                        width: '260px', height: '260px',
                    }}
                >
                    {/* Dark Matter Aura / Outer Glow (No blur filter for mobile perf) */}
                    <div className="absolute inset-[-15%] opacity-[0.4] rounded-full animate-pulse pointer-events-none" style={{ background: 'radial-gradient(circle at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)' }}></div>

                    {/* Outer dotted orbital ring */}
                    <div className="absolute inset-[-40px] border border-black/10 border-dashed rounded-full pointer-events-none z-0" style={{ animation: 'slow-rotate 25s linear infinite' }}></div>

                    {/* RED DOT IN CENTER - Must be absolutely centered */}
                    <div className="absolute w-[14px] h-[14px] bg-[#ef4444] rounded-full z-30" style={{ animation: 'pulse-red 3s infinite, pulse-blink 8s infinite' }}></div>

                    {/* Cosmic Black Dust Emission */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        {cosmicDust}
                    </div>

                    {/* ORGANIC SYMBIOTE MASS (Identical to Nexus.jsx alien-morph) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-[spin_60s_linear_infinite]" style={{ willChange: 'transform' }}>
                        {solidLayers}
                        {/* Inner tendrils / blurring layer */}
                        {blurredLayers}
                    </div>
                </div>

                {/* Typography Container */}
                <div className="absolute w-full px-8 text-center pointer-events-none z-50 text-black bottom-[12vh] md:bottom-[20vh]">
                    {/* We map through steps to handle specific text rendering with dramatic fades */}
                    {step >= 1 && step < 30 && (
                        <p className={`font-outfit tracking-[0.15em] mx-auto max-w-[320px] md:max-w-xl transition-all duration-[1500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] drop-shadow-[0_2px_6px_rgba(255,255,255,1)]
                            ${step === 9 || Number(step) >= 13 && Number(step) <= 16 ? 'font-medium' : 'font-light'}
                            ${step >= 28 ? 'text-xl md:text-2xl font-medium tracking-[0.3em] uppercase' : 'text-sm md:text-base'}
                            ${(Number(step) >= 12 && Number(step) <= 16) || step >= 25 ? 'scale-105' : 'scale-100'}
                        `}>
                            {currentText}
                        </p>
                    )}
                </div>
            </div>

            {/* --- SCENE 3: DISSOLVE & TRANSFORMATION (step 30 to 31) --- */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 transition-all duration-[2000ms] ${step >= 30 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                {/* Particles dissolving from center */}
                {step === 30 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {Array.from({ length: 60 }).map((_, i) => {
                            const angle = Math.random() * Math.PI * 2;
                            const dist = 100 + Math.random() * 200;
                            return (
                                <div key={i} className="absolute w-2 h-2 bg-black rounded-full"
                                    style={{
                                        '--dx': `${Math.cos(angle) * dist}px`,
                                        '--dy': `${Math.sin(angle) * dist}px`,
                                        animation: `particle-dissolve 2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`,
                                        animationDelay: `${Math.random() * 0.5}s`
                                    }}
                                ></div>
                            );
                        })}
                    </div>
                )}

                {/* Minimalist Hourglass */}
                <div className={`relative w-12 h-20 transition-all duration-1000 ${step >= 30 ? 'scale-100 opacity-100 delay-1000' : 'scale-50 opacity-0'}`}
                    style={{ animation: step >= 31 ? 'spin-hourglass 3s cubic-bezier(0.6, 0, 0.4, 1) infinite' : 'none' }}>

                    <svg viewBox="0 0 40 60" fill="none" className="absolute inset-0 w-full h-full">
                        {/* Border paths */}
                        <path d="M5 5 L35 5 L20 30 L35 55 L5 55 L20 30 Z" stroke="black" strokeWidth="2.5" strokeLinejoin="round" fill="white" />
                    </svg>

                    {/* The Liquid dripping inside (black) */}
                    {step >= 31 && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[2px] bg-black"
                            style={{ animation: 'drip 2s infinite ease-in' }}></div>
                    )}
                </div>

                {/* Final Loading Text */}
                <p className={`mt-8 text-[11px] font-mono tracking-[0.5em] font-bold uppercase transition-all duration-1000 ${step >= 31 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {step === 31 ? "INICIANDO PROCESSO." : ""}
                </p>
            </div>
        </div>
    );
};

export default WelcomeVideo;
