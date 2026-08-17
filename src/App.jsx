import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Menu, User, Sun, Moon, Loader2, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import Nexus from './components/Nexus';
import Navigation from './components/Navigation';
import MentorModal from './components/MentorModal';
import { XpToastLayer } from './features/lifeOs/components/XpToastLayer';
import Login from './components/Login/Login';
import AccessGate from './components/AccessGate';
import { getEntitlement, hasActivePlan } from './services/entitlements';
import { useLang } from './i18n/LanguageContext';

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
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import DemoBar from './components/DemoBar';
import { demoPedida, iniciarDemo } from './lib/demoSession';
import { DialogHost } from './lib/dialog';
import { sendMentorMessage } from './services/mentorAgent';
import { supabase } from './lib/supabase';
import { appEvents } from './lib/events';
import { popBack, useBackHandler } from './lib/backHandler';

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
    const { t } = useLang();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingInit, setIsLoadingInit] = useState(true);

    // Welcome flow states controlled by Supabase
    const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
    const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);
    const welcomeHandledRef = useRef(false);

    const [activeTab, setActiveTab] = useState('nexus');
    const [userRole, setUserRole] = useState('user');
    // Tema persiste entre sessões (default light). Antes voltava sempre pra light.
    const [theme, setTheme] = useState(() => {
        try { return localStorage.getItem('orvax_theme') || 'light'; } catch { return 'light'; }
    });
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
        try { localStorage.setItem('orvax_theme', theme); } catch { /* modo privado */ }
    }, [theme]);

    // Efeito 2: sessão inicial + listener de mudanças de auth (login em outra aba,
    // logout, refresh de token, reset de senha via link, etc.)
    useEffect(() => {
        // Verifica sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handleSupabaseLogin(session.user);
            } else if (demoPedida()) {
                // A LP mandou /?demo=1 — entra na conta de amostra. O
                // SIGNED_IN logo abaixo assume dali, pelo caminho normal.
                iniciarDemo().then((ok) => { if (!ok) setIsLoadingInit(false); });
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

    // Botão VOLTAR do Android: fecha overlay do topo → volta pra Home →
    // duplo-toque sai. Sem isso, "voltar" minimizava o app de dentro de
    // qualquer modal/ritual/checkout (viola padrão Android).
    const activeTabRef = useRef('nexus');
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
    const lastBackRef = useRef(0);
    useEffect(() => {
        if (!window.Capacitor?.isNativePlatform?.()) return;
        let sub;
        (async () => {
            try {
                const { App: CapApp } = await import('@capacitor/app');
                sub = await CapApp.addListener('backButton', () => {
                    if (popBack()) return;                       // 1) fecha overlay aberto
                    if (activeTabRef.current !== 'nexus') {       // 2) volta pra Home
                        setActiveTab('nexus'); return;
                    }
                    if (Date.now() - lastBackRef.current < 1500) {// 3) duplo-toque → sai
                        CapApp.exitApp();
                    } else {
                        lastBackRef.current = Date.now();
                    }
                });
            } catch (e) { console.warn('[back] plugin indisponível:', e?.message); }
        })();
        return () => { sub?.remove?.(); };
    }, []);

    // Ponte realtime → barramento interno de eventos.
    // Mudanças feitas FORA desta aba (agente WhatsApp/n8n, outro
    // dispositivo, outra aba) chegam via Supabase Realtime e são
    // re-emitidas no appEvents — assim todas as telas que escutam
    // o barramento (Compass, ExecutionBoard, etc.) atualizam sozinhas.
    useEffect(() => {
        if (!isAuthenticated) return;
        const emit = (type) => () => appEvents.emit({ type });
        const ch = supabase
            .channel('orvax-live-bridge')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, emit('TRANSACTION_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, emit('HABIT_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, emit('HABIT_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, emit('TASK_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'universal_events' }, emit('TASK_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, emit('GOAL_CHANGED'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals' }, emit('GOAL_CHANGED'))
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, [isAuthenticated]);

    // --- ACESSO POR PLANO (não há plano gratuito) ---
    // O app é plataforma de acesso: só quem contratou (Essencial/Completo)
    // usa. Sem plano → tela informativa (não vende nada).
    const [access, setAccess] = useState('checking'); // checking | ok | none
    const checkAccess = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { tier } = await getEntitlement();
            setAccess(hasActivePlan(tier) ? 'ok' : 'none');
        } catch (e) {
            console.error('[access]', e);
            setAccess('none');
        }
    }, [isAuthenticated]);
    useEffect(() => { if (isAuthenticated) checkAccess(); else setAccess('checking'); }, [isAuthenticated, checkAccess]);

    // Acesso confirmado → 1º acesso toca o vídeo de boas-vindas
    useEffect(() => { if (access === 'ok') handleAccessGranted(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime: assim que o webhook grava o plano (pós-compra na LP),
    // o app libera sozinho — sem precisar reabrir.
    useEffect(() => {
        if (!isAuthenticated) return;
        let ch; let alive = true;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !alive) return;
            ch = supabase.channel(`app-access-${session.user.id}`)
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` },
                    () => checkAccess())
                .subscribe();
        })();
        return () => { alive = false; if (ch) supabase.removeChannel(ch); };
    }, [isAuthenticated, checkAccess]);

    // --- MENTOR STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mentorReply, setMentorReply] = useState('');

    // Overlays de nível-App entram na pilha do botão VOLTAR
    useBackHandler(showBlog, useCallback(() => setShowBlog(false), []));
    useBackHandler(isModalOpen, useCallback(() => setIsModalOpen(false), []));

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
    const [vaultHabits] = useState([]);

    // Mentor rápido (overlay do Nexus) → mesma Edge Function mentor-chat
    // do assistente central. A chave da IA vive SÓ no servidor.
    const handleProcess = async () => {
        setIsLoading(true);
        setMentorReply('');
        try {
            const res = await sendMentorMessage(userInput);
            setMentorReply(res?.reply || t('lo.neuralErr'));
        } catch (error) {
            setMentorReply(t('lo.neuralErr'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSupabaseLogin = async (user) => {
        setIsAuthenticated(true);
        try {
            const profile = await ensureProfile(user);

            setUserRole(profile?.role || 'user');

            // O vídeo de boas-vindas toca quando o acesso é confirmado
            // (efeito abaixo, em access === 'ok') — nunca antes do plano.
            setHasSeenWelcome(true);

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

    // Toca o vídeo de boas-vindas no 1º login do usuário (lê is_first_login
    // fresco). Chamado por handleSupabaseLogin — não há mais gate de pagamento.
    const handleAccessGranted = useCallback(async () => {
        if (welcomeHandledRef.current) return;
        welcomeHandledRef.current = true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { welcomeHandledRef.current = false; return; }
            const { data: prof } = await supabase
                .from('profiles').select('is_first_login').eq('id', session.user.id).maybeSingle();
            if (prof?.is_first_login) {
                setShowWelcomeVideo(true);
                await supabase.from('profiles').update({ is_first_login: false }).eq('id', session.user.id);
            }
        } catch (e) {
            console.error('handleAccessGranted:', e);
        }
    }, []);

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
        <ErrorBoundary fallbackTitle={t('lo.criticalError')}>
        <React.Fragment>
            {/* Life OS · global XP toast */}
            <XpToastLayer />

            {/* Banner global de conexão */}
            <OfflineBanner />

            {/* Convite para instalar o app (some no APK e quando já instalado) */}
            <InstallPrompt />

            {/* Contagem da amostra de 15 min (só existe em modo demo) */}
            <DemoBar />

            {/* Diálogos do design system (substitui alert/confirm nativos) */}
            <DialogHost />


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
                        aria-label={t('lo.closeNews')}
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

                  {/* App = plataforma de ACESSO ao plano contratado na Landing Page.
                      Sem plano ativo → AccessGate (informativo, NÃO vende).
                      Recursos por tier são gateados adiante (FitCalGate etc.). */}
                  {access === 'checking' ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <Loader2 size={22} className="animate-spin opacity-30" />
                    </div>
                  ) : access === 'none' ? (
                    <AccessGate onRecheck={checkAccess} />
                  ) : (
                  <>
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
                  </>
                  )}
                </div>
            </div>
        </React.Fragment>
        </ErrorBoundary>
    );
}
