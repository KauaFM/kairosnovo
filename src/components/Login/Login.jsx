import React, { useState, useMemo } from 'react';
import { Loader2, Check, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginStatus, setLoginStatus] = useState(null);
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [touchStartY, setTouchStartY] = useState(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Statically generating array of stars so they don't jump around on renders
    const stars = useMemo(() => {
        return Array.from({ length: 80 }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            // Mostly tiny stars, some medium, rarely larger ones
            size: Math.random() > 0.95 ? 3 : (Math.random() > 0.7 ? 2 : 1),
            delay: `${Math.random() * 5}s`,
            duration: `${1 + Math.random() * 3}s`
        }));
    }, []);

    const shootingStars = useMemo(() => {
        // Increased from 6 to 15 shooting stars for a more active sky
        return Array.from({ length: 15 }).map((_, i) => ({
            id: `shooting-${i}`,
            // Start organically near top-right so they cross diagonally downwards
            top: `${-10 + Math.random() * 30}%`,
            left: `${30 + Math.random() * 70}%`,
            delay: `${Math.random() * 15}s`, // Varied delays
            duration: `${7 + Math.random() * 10}s`, // Shorter loops so they appear more frequently
            width: `${100 + Math.random() * 100}px` // Visible tail length
        }));
    }, []);

    // Supabase Authentication
    const handleLogin = async (e) => {
        e.preventDefault();
        if (email && password) {
            setIsSubmitting(true);
            setLoginStatus(null);
            setErrorMessage('');

            try {
                if (isSignUp) {
                    const { error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { full_name: email.split('@')[0] }
                        }
                    });
                    if (error) throw error;
                    setLoginStatus('success');
                } else {
                    const { error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });
                    if (error) throw error;
                    setLoginStatus('success');
                }
            } catch (err) {
                console.error(err);
                if (err.message.includes('Invalid login credentials')) {
                    setErrorMessage('Credenciais inválidas.');
                } else if (err.message.includes('email rate limit exceeded')) {
                    setErrorMessage('Muitas tentativas. Tente novamente em 1 hora.');
                } else {
                    setErrorMessage(err.message || 'Erro de conexão.');
                }
                setLoginStatus('error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleModalClose = () => {
        if (loginStatus === 'success') {
            onLoginSuccess();
        }
        setLoginStatus(null);
    };

    // Swipe up detection logic
    const handleTouchStart = (e) => {
        setTouchStartY(e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
        if (touchStartY === null) return;
        const touchEndY = e.changedTouches[0].clientY;
        const swipeDistance = touchStartY - touchEndY; // Positive if swiped UP

        if (swipeDistance > 50) { // 50px threshold for swipe up
            setShowLoginForm(true);
        }
        setTouchStartY(null);
    };

    // For desktop mouse drag testing (optional, makes it feel good on PC too)
    const handleMouseDown = (e) => {
        setTouchStartY(e.clientY);
    };

    const handleMouseUp = (e) => {
        if (touchStartY === null) return;
        const swipeDistance = touchStartY - e.clientY;
        if (swipeDistance > 50) {
            setShowLoginForm(true);
        }
        setTouchStartY(null);
    };

    return (
        <React.Fragment>
            {/* Custom keyframes for gorgeous blinking & shooting star effects */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes star-pulse {
                    0%, 100% { opacity: 0.1; transform: scale(0.5); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                
                @keyframes shooting-star-anim {
                    0% { transform: rotate(135deg) translateX(0); opacity: 0; }
                    2% { opacity: 1; }
                    30% { transform: rotate(135deg) translateX(2500px); opacity: 0; }
                    100% { transform: rotate(135deg) translateX(2500px); opacity: 0; }
                }
                
                @keyframes text-shine {
                    to { background-position: 200% center; }
                }
            `}} />

            <div className="absolute inset-0 z-[100] w-full h-full overflow-hidden font-sans bg-white pointer-events-auto selection:bg-black selection:text-white">

                {/* 
                    SOLID WHITE SPACE BACKGROUND
                    Bright white void with scattered black blinking stars.
                */}
                <div
                    className="absolute inset-0 bg-white"
                ></div>

                {/* 
                    FOREGROUND LAYER
                    Standard clean rendering. Pure black text over the white space background.
                */}
                <div className="absolute inset-0 z-10 w-full h-full flex flex-col p-8 md:p-16 text-black">

                    {/* SCATTERED BLINKING STARS */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {stars.map(star => (
                            <div
                                key={star.id}
                                className="absolute rounded-full bg-black opacity-80"
                                style={{
                                    top: star.top,
                                    left: star.left,
                                    width: `${star.size}px`,
                                    height: `${star.size}px`,
                                    animation: `star-pulse ${star.duration} infinite ease-in-out`,
                                    animationDelay: star.delay,
                                }}
                            />
                        ))}

                        {/* SHOOTING STARS */}
                        {shootingStars.map(star => (
                            <div
                                key={star.id}
                                className="absolute h-[2px] opacity-0"
                                style={{
                                    top: star.top,
                                    left: star.left,
                                    width: star.width,
                                    // Tail fading to perfectly transparent black
                                    background: 'linear-gradient(to right, transparent, rgba(0, 0, 0, 1))',
                                    animation: `shooting-star-anim ${star.duration} infinite linear`,
                                    animationDelay: star.delay,
                                }}
                            />
                        ))}
                    </div>

                    {/* VIEW 1: Initial Welcome Screen (Very minimal, just swipe up) */}
                    <div
                        className={`absolute inset-0 flex flex-col justify-between items-center pt-[15vh] pb-12 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-10 cursor-ns-resize
                        ${showLoginForm ? 'opacity-0 -translate-y-20 pointer-events-none' : 'opacity-100 translate-y-0'}`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        // To prevent drag bugs dragging text/images on Desktop
                        onDragStart={(e) => e.preventDefault()}
                    >
                        {/* Top Text with Futuristic Animated Shine */}
                        <div className="flex flex-col items-center select-none mt-[8vh] opacity-90">
                            <span className="text-[12px] md:text-xs font-outfit uppercase tracking-[0.6em] text-black/40 mb-3 ml-2 font-light">
                                Bem vindo ao
                            </span>
                            <h1
                                className="text-5xl md:text-6xl font-outfit font-light tracking-[0.3em] ml-2"
                                style={{
                                    background: 'linear-gradient(to right, #000 20%, #999 50%, #000 80%)',
                                    backgroundSize: '200% auto',
                                    color: '#000',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    animation: 'text-shine 4s linear infinite',
                                }}
                            >
                                ORVAX
                            </h1>
                        </div>

                        {/* Swipe up indicator */}
                        <button
                            onClick={() => setShowLoginForm(true)}
                            className="flex flex-col items-center group cursor-pointer animate-pulse"
                        >
                            <div className="text-black/60 mb-2 group-hover:-translate-y-3 transition-transform duration-300 flex flex-col items-center">
                                {/* Duas setinhas indicando para cima */}
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="-mt-4"><polyline points="18 15 12 9 6 15"></polyline></svg>
                            </div>
                            <span className="text-black/60 font-outfit text-sm font-medium tracking-[0.2em] uppercase mt-1">Deslize para cima</span>
                        </button>
                    </div>

                    {/* VIEW 2: The Glass Login Drawer (Slides up from the bottom) */}
                    <div className={`absolute bottom-0 left-0 w-full flex flex-col items-center justify-end z-20
                        transition-transform duration-[800ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
                        ${showLoginForm ? 'translate-y-0' : 'translate-y-full'}`}
                    >

                        {/* The Glass Container as Dark Smoked Glass mapped as a bottom sheet */}
                        <div className="w-full max-w-md mx-auto flex flex-col p-8 md:p-10 rounded-t-[2.5rem] border-t border-l border-r border-white/10 bg-black/80 backdrop-blur-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden text-white">
                            {/* Inner ambient glow for the glass card */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none"></div>

                            {/* Header row: Arrow back */}
                            <div className="flex justify-start items-start mb-2 w-full relative z-10">
                                <button type="button" onClick={() => setShowLoginForm(false)} className="text-white/70 hover:text-white transition-colors cursor-pointer p-2 -ml-2">
                                    <ArrowLeft size={24} />
                                </button>
                            </div>

                            {/* Center Logo */}
                            <div className="w-full flex justify-center mb-0 relative z-10">
                                <img src="/icone.png" alt="Logo" className="w-40 h-40 md:w-36 md:h-36 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]" />
                            </div>

                            {/* Welcome Texts (Centered) */}
                            <div className="w-full flex flex-col mb-6 relative z-10 text-center">
                                <h1 className="text-[2.2rem] font-outfit font-light leading-none mb-1 tracking-tight">
                                    <strong className="font-bold opacity-100 uppercase tracking-widest mt-1 block">
                                        {isSignUp ? "Criar Conta" : "Conecte-se"}
                                    </strong>
                                </h1>
                                <p className="text-sm font-outfit font-light opacity-60">
                                    {isSignUp ? "inicie sua jornada no ORVAX." : "e continue sua jornada."}
                                </p>
                            </div>

                            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full relative z-10">

                                {/* Username/Email Input (No labels outside, using placeholders) */}
                                <input
                                    type="email"
                                    required
                                    placeholder="Endereço de e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-white/40 focus:bg-white/10 rounded-full px-6 py-4 text-sm font-outfit text-white placeholder-white/40 outline-none transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
                                />

                                {/* Password Input */}
                                <input
                                    type="password"
                                    required
                                    placeholder="Senha de acesso"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 focus:border-white/40 focus:bg-white/10 rounded-full px-6 py-4 text-sm font-outfit tracking-widest text-white placeholder-white/40 outline-none transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
                                />

                                {/* Remember me & Forgot Password */}
                                <div className="flex justify-between items-center w-full px-2 mt-2 mb-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="w-4 h-4 rounded-sm border border-white/30 group-hover:border-white/60 bg-white/5 flex items-center justify-center transition-all">
                                            {/* Visual Checkmark */}
                                            <svg className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-[11px] font-outfit font-medium text-white/70 group-hover:text-white transition-colors">Lembrar-me</span>
                                    </label>

                                    <span
                                        onClick={() => { setIsSignUp(!isSignUp); setErrorMessage(''); }}
                                        className="text-[11px] font-outfit font-light text-white/50 hover:text-white cursor-pointer transition-colors"
                                    >
                                        {isSignUp ? "Já possuo conta" : "Criar nova conta?"}
                                    </span>
                                </div>

                                {/* Error Message */}
                                {errorMessage && (
                                    <div className="text-xs text-red-500 font-outfit font-medium text-center bg-red-500/10 py-2 rounded-lg -mt-1 mb-1">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Submit Button (Solid White fill, Dark text) */}
                                {/* [BUG #4 FIX] Removido onClick duplicado — form onSubmit já trata o submit */}
                                <button
                                    type="submit"
                                    disabled={!email || !password || isSubmitting}
                                    className={`w-full py-4 rounded-full text-center text-base font-outfit font-bold transition-all duration-300 flex justify-center items-center mt-2 shadow-lg
                                        ${(email && password && !isSubmitting) ? 'bg-white text-black hover:bg-gray-200 hover:scale-[0.98]' : 'bg-white/20 text-white/50 cursor-not-allowed'}
                                    `}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={24} className="animate-spin text-black" />
                                    ) : (
                                        isSignUp ? "Registrar-se" : "Entrar"
                                    )}
                                </button>

                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* STATUS MODAL (Success/Error) based on reference image */}
            {loginStatus && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="w-full max-w-[340px] bg-[#1A1A1A] rounded-[2.5rem] p-6 relative flex flex-col items-center shadow-2xl border border-white/5">
                        {/* Close button */}
                        <button
                            onClick={() => setLoginStatus(null)}
                            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X size={16} className="text-white/70" />
                        </button>

                        {/* Icon Area with dots (dust particles) */}
                        <div className="relative mt-8 mb-6 flex items-center justify-center w-32 h-32">
                            {/* Stars / Dust Particles */}
                            <div className={`absolute w-1 h-1 rounded-full ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} top-4 left-6`} />
                            <div className={`absolute w-2 h-2 rounded-full ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} bottom-6 right-2 opacity-80`} />
                            <div className={`absolute w-1.5 h-1.5 rounded-full ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} top-2 right-8`} />
                            <div className={`absolute w-1 h-1 rounded-full ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} bottom-4 left-4`} />
                            <div className={`absolute w-1 h-1 rounded-full ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'} bottom-0 left-[50%]`} />

                            {/* Center Icon */}
                            <div className={`w-16 h-16 rounded-full border-[3px] flex items-center justify-center relative z-10
                                ${loginStatus === 'success' ? 'border-[#22c55e] text-[#22c55e]' : 'border-[#ef4444] text-[#ef4444]'}`}>
                                {loginStatus === 'success' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
                                {/* Glow effect */}
                                <div className={`absolute inset-0 rounded-full blur-md opacity-40 ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}></div>
                            </div>
                        </div>

                        {/* Texts */}
                        <h3 className="text-2xl font-outfit font-semibold text-white mb-2">
                            {loginStatus === 'success' ? 'Sucesso!' : 'Acesso Negado'}
                        </h3>
                        <p className="text-sm font-outfit text-white/50 text-center mb-8 px-2 leading-relaxed">
                            {/* [BUG #7 FIX] Mensagem diferenciada para signUp vs login */}
                            {loginStatus === 'success'
                                ? (isSignUp
                                    ? 'Conta criada! Verifique seu e-mail para confirmar o acesso antes de entrar.'
                                    : 'Você foi autenticado com sucesso.')
                                : 'Suas credenciais estão incorretas ou o acesso foi recusado pelo sistema.'
                            }
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={handleModalClose}
                            className={`w-full py-4 rounded-full font-outfit font-bold text-white transition-opacity hover:opacity-90 tracking-wide
                                ${loginStatus === 'success' ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                        >
                            {loginStatus === 'success' ? 'Continuar' : 'Tentar Novamente'}
                        </button>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default Login;
