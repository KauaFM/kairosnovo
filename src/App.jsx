import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Menu, User, Sun, Moon, Loader2, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Nexus from './components/Nexus';
import Navigation from './components/Navigation';
import MentorModal from './components/MentorModal';
import { XpToastLayer } from './features/lifeOs/components/XpToastLayer';
import Login from './components/Login/Login';

// Abas pesadas · carregadas sob demanda (code-splitting) para o app abrir rápido
const Vault = lazy(() => import('./components/Vault'));
const Dossier = lazy(() => import('./components/Dossier'));
const MentorAssistant = lazy(() => import('./components/MentorAssistant'));
const Blog = lazy(() => import('./components/Blog'));
const MetricsPage = lazy(() => import('./features/metrics/pages/MetricsPage'));
const AdminBlog = lazy(() => import('./components/AdminBlog'));
const GymRatsHome = lazy(() => import('./features/gymrats/pages/GymRatsHome'));
const FitCalGate = lazy(() => import('./features/fitcal/pages/FitCalGate'));
import WelcomeVideo from './components/WelcomeVideo';
import EventNotifier from './components/EventNotifier';
import { callMentor, clearMentorCache } from './services/mentor';
import { getSelectedMentor } from './services/db';
import { supabase } from './lib/supabase';

import { OrvaxHeader, ScrollContainer } from './components/BaseLayout';

// Garante que todo usuário autenticado tem uma row em profiles.
// Usa upsert com ignoreDuplicates para ser seguro contra race conditions
// (trigger do banco é a primeira defesa; isso é a segunda).
// Sempre retorna o profile com dados atuais, inclusive quando recém-criado.
async function ensureProfile(user) {
    await supabase.from('profiles').upsert(
        { id: user.id, email: user.email, role: 'user', is_first_login: true },
        { onConflict: 'id', ignoreDuplicates: true }
    );
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    return data;
}

// Keep-alive lazy mount: a aba só monta (e dispara suas queries) na PRIMEIRA
// vez que fica ativa. Depois permanece montada (preserva estado) apenas
// escondida. Evita que todas as abas carreguem dados ao abrir o app.
const TabWrapper = ({ active, children }) => {
    const [mounted, setMounted] = useState(active);
    useEffect(() => {
        if (active) setMounted(true);
    }, [active]);
    return (
        <div
            className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}
        >
            {mounted ? children : null}
        </div>
    );
};

// Fallback enquanto o chunk da aba baixa (só na primeira visita de cada aba)
const TabLoader = () => (
    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <Loader2 className="animate-spin opacity-30" size={22} />
    </div>
);



export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    // Welcome flow states controlled by Supabase
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

    const [activeTab, setActiveTab] = useState('nexus');
    const [userRole, setUserRole] = useState('user');
    const [theme, setTheme] = useState('light'); // LIGHT MODE AS DEFAULT
    const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
    const [showBlog, setShowBlog] = useState(false); // timeline de notícias (realocada da aba central)

    // [BUG #3 FIX] Separado em dois useEffects independentes
    // Efeito 1: aplica o tema no DOM (re-executa só quando tema muda)
    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
        }
    }, [theme]);

    // Efeito 2: sessão inicial + listener de mudanças de auth (login em outra aba,
    // logout, refresh de token, reset de senha via link, etc.)
    useEffect(() => {
        // Verifica sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handleSupabaseLogin(session.user);
            } else {
                setIsLoadingInit(false);
            }
        });

        // Listener de mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                handleSupabaseLogin(session.user);
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setUserRole('user');
                setHasSeenWelcome(false);
                setShowWelcomeVideo(false);
                setActiveTab('nexus');
            } else if (event === 'PASSWORD_RECOVERY') {
                // Abre fluxo de redefinição de senha (trata no Login component)
                setIsAuthenticated(false);
            } else if (event === 'TOKEN_REFRESHED') {
                // Silencioso — sessão renovada
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

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

    // Handle Mentor Process (OpenAI gpt-4o-mini)
    const handleProcess = async () => {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY || "";
        if (!apiKey) {
            setMentorReply("ERRO: Chave API ausente. Configure VITE_OPENAI_API_KEY.");
            return;
        }

        setIsLoading(true);
        setMentorReply('');

        try {
            const mentorId = await getSelectedMentor();
            const data = await callMentor(userInput, { mentorId, apiKey });
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
            const profile = await ensureProfile(user);

            setUserRole(profile?.role || 'user');

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
        <ErrorBoundary fallbackTitle="Erro Critico ORVAX">
        <React.Fragment>
            {/* Life OS · global XP toast */}
            <XpToastLayer />


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

            {/* Timeline de Notícias (realocada da aba central → overlay) */}
            {showBlog && (
                <div className="fixed inset-0 z-[70]" style={{ backgroundColor: 'var(--bg-color)' }}>
                    <button
                        onClick={() => setShowBlog(false)}
                        className="fixed top-5 right-5 z-[80] w-10 h-10 rounded-full border flex items-center justify-center backdrop-blur-xl transition-all hover:scale-105"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                        aria-label="Fechar notícias"
                    >
                        <X size={18} />
                    </button>
                    <div className="w-full max-w-[428px] h-full mx-auto relative">
                        <Suspense fallback={<TabLoader />}>
                            <Blog theme={theme} toggleTheme={toggleTheme} onScrollChange={() => {}} />
                        </Suspense>
                    </div>
                </div>
            )}

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
                        <Suspense fallback={<TabLoader />}>
                        <TabWrapper active={activeTab === 'nexus'}>
                            <Nexus theme={theme} toggleTheme={toggleTheme} onOpenMentor={() => setIsModalOpen(true)} onOpenBlog={() => setShowBlog(true)} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'vault'}>
                            <Vault habits={vaultHabits} theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'fitcal'}>
                            <FitCalGate theme={theme} toggleTheme={toggleTheme} onModalChange={setIsAnyModalOpen} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'arena'}>
                            <GymRatsHome theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'dossier'}>
                            <Dossier theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'metrics'}>
                            <MetricsPage theme={theme} toggleTheme={toggleTheme} onModalChange={setIsAnyModalOpen} />
                        </TabWrapper>
                        <TabWrapper active={activeTab === 'focus'}>
                            <MentorAssistant theme={theme} toggleTheme={toggleTheme} />
                        </TabWrapper>
                        {userRole === 'admin' && (
                            <TabWrapper active={activeTab === 'admin'}>
                                <AdminBlog />
                            </TabWrapper>
                        )}
                        </Suspense>
                    </div>

                    {/* NAVIGATION DOCK (Horizontal) */}
                    <Navigation
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        isAnyModalOpen={isAnyModalOpen}
                        userRole={userRole}
                    />
                </div>
            </div>
        </React.Fragment>
        </ErrorBoundary>
    );
}
