import React, { useState, useEffect } from 'react';
import { Menu, User, Sun, Moon, Loader2 } from 'lucide-react';
import Nexus from './components/Nexus';
import Vault from './components/Vault';
import Telemetry from './components/Telemetry';
import Dossier from './components/Dossier';
import Navigation from './components/Navigation';
import MentorModal from './components/MentorModal';
import GlobalRanking from './components/GlobalRanking';
import Blog from './components/Blog';
import GymRatsHome from './features/gymrats/pages/GymRatsHome';
import FitCalHome from './features/fitcal/pages/FitCalHome';
import Login from './components/Login/Login';
import WelcomeVideo from './components/WelcomeVideo';
import EventNotifier from './components/EventNotifier';
import { callGemini } from './services/gemini';
import { supabase } from './lib/supabase';

import { OrvaxHeader, ScrollContainer } from './components/BaseLayout';

const TabWrapper = ({ active, children }) => (
    <div 
        className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}
    >
        {children}
    </div>
);



export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    // Welcome flow states controlled by Supabase
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

    const [activeTab, setActiveTab] = useState('nexus');
    const [theme, setTheme] = useState('light'); // LIGHT MODE AS DEFAULT
    const [isBlogScrolled, setIsBlogScrolled] = useState(false);
    const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

    // [BUG #3 FIX] Separado em dois useEffects independentes
    // Efeito 1: aplica o tema no DOM (re-executa só quando tema muda)
    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme]);

    // Efeito 2: verifica sessão UMA ÚNICA VEZ na montagem do app
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handleSupabaseLogin(session.user);
            } else {
                setIsLoadingInit(false);
            }
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- MENTOR STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mentorReply, setMentorReply] = useState('');

    // Toggle Theme
    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        if (newTheme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    };

    // --- DATA STATES ---
    const [cfiScore, setCfiScore] = useState(0);
    const [vaultHabits, setVaultHabits] = useState([]);

    // Handle Gemini Process
    const handleProcess = async () => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
        if (!apiKey) {
            setMentorReply("ERRO: Chave API ausente. Configure VITE_GEMINI_API_KEY.");
            return;
        }

        setIsLoading(true);
        setMentorReply('');

        try {
            const data = await callGemini(userInput, apiKey);
            if (data) {
                setMentorReply(data.mentor_reply);
                if (data.cognitive_friction !== undefined) {
                    setCfiScore(data.cognitive_friction);
                }
                if (data.extracted_goals && data.extracted_goals.length > 0) {
                    const newHabits = data.extracted_goals.map(g => ({
                        ...g,
                        progress: Math.floor(Math.random() * 30)
                    }));
                    setVaultHabits(prev => [...newHabits, ...prev].slice(0, 4));
                }
            }
        } catch (error) {
            setMentorReply("ERRO DE CONEXÃO NEURAL. Sistema instável.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSupabaseLogin = async (user) => {
        setIsAuthenticated(true);
        try {
            // Puxar Profile V2 (Agora com XP e Rank)
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (!profile) {
                // Cria o perfil se não existir
                await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    is_first_login: true,
                });
            }

            if (profile?.is_first_login) {
                setShowWelcomeVideo(true);
                setHasSeenWelcome(false);
                await supabase.from('profiles').update({ is_first_login: false }).eq('id', user.id);
            } else {
                setHasSeenWelcome(true);
            }

            // Puxar Configurações controladas pelo Agente
            const { data: settings } = await supabase
                .from('app_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (settings && settings.theme_color) {
                document.documentElement.style.setProperty('--orvax-green', settings.theme_color);
            }

        } catch (err) {
            console.error("Erro DB:", err);
            setHasSeenWelcome(true);
        } finally {
            setIsLoadingInit(false);
        }
    };

    // Login Flow complete handler from Login Screen
    const handleLoginSuccess = async () => {
        setIsLoadingInit(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            await handleSupabaseLogin(session.user);
        } else {
            setIsLoadingInit(false);
        }
    };

    const handleWelcomeComplete = () => {
        setShowWelcomeVideo(false);
        localStorage.setItem('hasSeenWelcome', 'true');
        setHasSeenWelcome(true);
    };

    if (isLoadingInit) {
        return (
            <div className={`min-h-screen bg-[var(--bg-color)] flex flex-col items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-schematic pointer-events-none z-0"></div>
                <div className="hud-scanline"></div>
                <Loader2 className="animate-spin text-white z-10 opacity-50" size={48} />
                <span className="text-white/40 font-mono text-xs tracking-[0.3em] mt-6 uppercase z-10 block animate-pulse">Sincronizando link neural...</span>
            </div>
        );
    }

    return (
        <React.Fragment>
            {/* Show Authenticaton Page First */}
            {!isAuthenticated && (
                <Login onLoginSuccess={handleLoginSuccess} />
            )}

            {/* Futuristic Cinematic Sequence */}
            {showWelcomeVideo && (
                <WelcomeVideo onComplete={handleWelcomeComplete} />
            )}

            {/* Mentor AI Modal */}
            <MentorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userInput={userInput}
                setUserInput={setUserInput}
                handleInteraction={handleProcess}
                isLoading={isLoading}
                mentorReply={mentorReply}
            />

            <div className={`min-h-screen font-sans flex justify-center overflow-hidden overflow-x-hidden relative selection:bg-[var(--text-main)] selection:text-[var(--bg-color)] transition-colors duration-700 ${isModalOpen ? 'bg-white text-black' : 'bg-[var(--bg-color)] text-[var(--text-main)]'} ${(!isAuthenticated || showWelcomeVideo) ? 'hidden' : 'flex'}`}>
                {/* Global Background (Schematic Grid) */}
                {!isModalOpen && <div className="absolute inset-0 bg-schematic pointer-events-none z-0"></div>}

                {/* Background System Event Notifier */}
                <EventNotifier />

                {/* Global Futuristic Overlays (Preserved for technical feel) */}
                <div className="hud-scanline"></div>
                <div className="hud-noise"></div>

                {/* Mobile Device Container */}
                <div className="w-full max-w-[428px] h-screen relative flex flex-col z-20 bg-transparent overflow-hidden border-x border-[var(--border-color)]">

                    <div className="flex-1 relative">
                        <TabWrapper active={activeTab === 'nexus'}>
                            <Nexus theme={theme} toggleTheme={toggleTheme} onOpenMentor={() => setIsModalOpen(true)} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'vault'}>
                            <Vault habits={vaultHabits} theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'telemetry'}>
                            <Telemetry cfiScore={cfiScore} theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'fitcal'}>
                            <FitCalHome theme={theme} toggleTheme={toggleTheme} onModalChange={setIsAnyModalOpen} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'arena'}>
                            <GymRatsHome theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'dossier'}>
                            <Dossier theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'focus'}>
                            <Blog theme={theme} toggleTheme={toggleTheme} onScrollChange={setIsBlogScrolled} />
                        </TabWrapper>
                    </div>

                    {/* NAVIGATION DOCK (Horizontal) */}
                    <Navigation
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isBlogScrolled={isBlogScrolled}
                        isAnyModalOpen={isAnyModalOpen}
                    />
                </div>
            </div>
        </React.Fragment>
    );
}
