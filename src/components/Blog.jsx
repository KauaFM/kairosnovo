import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Heart, MessageCircle, Share2, ArrowDown, Sun, Moon, Home, Search, User, Newspaper, ChevronLeft, Bookmark, X } from 'lucide-react';
import { getBlogPosts } from '../services/db';

const HIGHLIGHTS = [
    {
        id: "h1",
        title: "SINCRONIA\nNEURAL",
        category: "NEUROCIÊNCIA",
        image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=800&q=80",
        summary: "ESTRUTURAS FRACTAIS DE FOCO ABSOLUTO.",
        content: "A técnica de sincronização fractal permite que o cérebro entre em estados de fluxo mais profundos através de estímulos binaurais em frequências específicas. Pesquisas recentes indicam que a ressonância harmônica em 40Hz pode aumentar a retenção de memória em até 35% durante sessões de foco intenso.\n\nEste protocolo, agora em sua versão 2.0, utiliza algoritmos de IA para ajustar a frequência em tempo real baseando-se na variabilidade da frequência cardíaca do usuário, garantindo uma imersão sem precedentes no ambiente de trabalho ou estudo.\n\nAo longo dos parágrafos seguintes, exploraremos os fundamentos biológicos desta tecnologia e como você pode implementá-la em sua rotina diária para alcançar a performance de elite.",
        author: "DR. KAELEN",
        date: "MAR 24, 2026",
        isVideo: true
    },
    {
        id: "h2",
        title: "DISCIPLINA\nPOR DESIGN",
        category: "PROTOCOLOS",
        image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
        summary: "COMO CONSTRUIR UMA VONTADE INABALÁVEL VIA SISTEMAS.",
        content: "A disciplina não é um traço de caráter, é uma arquitetura ambiental. Nesta masterclass, exploramos como o design do seu espaço e a automação de decisões podem remover o atrito da execução diária.\n\nEstudamos os padrões de comportamento dos 0.1% e descobrimos que eles não possuem mais força de vontade, mas sim sistemas que tornam a falha impossível.",
        author: "ORVAX PROTOCOL",
        date: "MAR 25, 2026",
        isVideo: true
    },
    {
        id: "h3",
        title: "SISTEMAS\nDE ELITE",
        category: "SISTEMAS",
        image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
        summary: "MAPEAMENTO DE GATILHOS INVISÍVEIS PARA EFICIÊNCIA.",
        content: "Nesta análise profunda, mergulhamos nos sistemas que regem a produtividade humana em ambientes de alta pressão. Mapeamos os gatilhos invisíveis que desencadeiam a procrastinação e desenvolvemos um framework robusto para substituí-los por hábitos de alta performance.",
        author: "SYS ADMIN",
        date: "MAR 22, 2026",
        isVideo: false
    }
];

const FEED_POSTS = [
    {
        id: "f1",
        author: { name: "Dr. Kaelen", avatar: "https://i.pravatar.cc/150?u=kaelen" },
        readTime: "5 MIN READ",
        title: "A Química do Estado de Fluxo Profundo",
        image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80",
        category: "CIÊNCIA",
        date: { day: "24", month: "MAR" },
        summary: "Explorando os neurotransmissores envolvidos na imersão cognitiva e como otimizá-los naturalmente.",
        content: "O estado de fluxo não é apenas um conceito psicológico; é uma cascata bioquímica precisa. Quando entramos em 'deep work', o cérebro libera uma mistura potente de norepinefrina, dopamina, anandamida, serotonina e endorfinas.\n\nCada um desses químicos tem um papel crucial: a norepinefrina aumenta o foco e a atenção; a dopamina aumenta a recompensa e o foco; a anandamida melhora o pensamento lateral e a união de ideias díspares; a serotonina e as endorfinas criam a sensação de prazer e bem-estar que nos mantém engajados por horas.\n\nPara otimizar essa química, recomendamos um protocolo que equilibre o desafio da tarefa com o seu nível de habilidade, eliminando distrações externas e preparando o ambiente para a imersão total."
    },
    {
        id: "f2",
        author: { name: "Sys Admin", avatar: "https://i.pravatar.cc/150?u=sysadmin" },
        readTime: "3 MIN READ",
        title: "Atualização de Matriz de Hábitos v2.4",
        category: "SISTEMAS",
        image: null,
        date: { day: "22", month: "MAR" },
        summary: "Log de mudanças focado no controle de dopamina sintética e recompensas variáveis.",
        content: "A versão 2.4 do nosso framework de hábitos foca na regulação da dopamina sintética. Vivemos em um mundo projetado para hackear nosso sistema de recompensa. Esta atualização traz ferramentas de 'jejum de dopamina' integradas ao dashboard principal.\n\nAplicamos agora o conceito de 'micro-recompensas analógicas', incentivando o usuário a encontrar gratificação em processos de longo prazo em vez de notificações instantâneas."
    },
    {
        id: "f3",
        author: { name: "Orvax Protocol", avatar: "https://i.pravatar.cc/150?u=orvax" },
        readTime: "8 MIN READ",
        title: "Dopamina Sintética e o Design de Interfaces",
        category: "TECNOLOGIA",
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
        date: { day: "20", month: "MAR" },
        summary: "Como grandes plataformas usam a psicologia do vício para manter o usuário em loop infinito.",
        content: "O design moderno de interfaces evoluiu para uma forma de engenharia comportamental. O 'infinite scroll', as cores vibrantes das notificações e a gratificação social intermitente são projetados para criar dependência cíclica.\n\nNeste dossiê, desmontamos essas táticas e mostramos como o design ético pode recuperar o controle da atenção do usuário, priorizando a utilidade em vez da retenção forçada."
    },
    {
        id: "f4",
        author: { name: "Coach Mike", avatar: "https://i.pravatar.cc/150?u=mike" },
        readTime: "6 MIN READ",
        title: "A Matemática da Consistência Inabalável",
        category: "PERFORMANCE",
        image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&q=80",
        date: { day: "18", month: "MAR" },
        summary: "Por que 1% de melhoria diária é superior a 100% de esforço esporádico.",
        content: "O sucesso não é um evento, é um processo de juros compostos. Quando você mantém a consistência por 365 dias, a melhoria de 1% diária resulta em uma evolução 37 vezes superior ao ponto de partida.\n\nA dificuldade não está na execução, mas na manutenção do ritmo em dias de baixa energia. Aqui apresentamos o protocolo de 'Mínimo Viável Diário' para garantir que a corrente nunca seja quebrada."
    },
    {
        id: "f5",
        author: { name: "Athena AI", avatar: "https://i.pravatar.cc/150?u=athena" },
        readTime: "4 MIN READ",
        title: "Rotina de Aço: O Guia de Alvorada",
        category: "PROTOCOLOS",
        image: "https://images.unsplash.com/photo-1493612276216-ee3925520721?w=800&q=80",
        date: { day: "15", month: "MAR" },
        summary: "Como as primeiras 2 horas do seu dia definem o seu teto de performance.",
        content: "Vencer o dia começa antes do sol nascer. A alvorada é o único momento de silêncio absoluto onde você é o dono da sua agenda. Implementar um ritual de exposição à luz solar, hidratação profunda e 15 minutos de meditação de visualização cria um 'buffer' psicológico contra o caos do dia corporativo."
    }
];

// Public lo-fi radio stream (SomaFM Lush)
const RADIO_STREAM_URL = 'https://ice2.somafm.com/lush-128-mp3';

const Blog = ({ theme, toggleTheme, onScrollChange }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isRadioPlaying, setIsRadioPlaying] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [highlights, setHighlights] = useState(HIGHLIGHTS);
    const [feedPosts, setFeedPosts] = useState(FEED_POSTS);
    const containerRef = useRef(null);
    const audioRef = useRef(null);

    // Fetch blog posts from database (fallback to hardcoded if empty)
    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const dbHighlights = await getBlogPosts(true);
                const dbFeed = await getBlogPosts(false);
                if (dbHighlights && dbHighlights.length > 0) {
                    setHighlights(dbHighlights.map(p => ({
                        id: p.id,
                        title: p.title,
                        category: (p.category || 'GERAL').toUpperCase(),
                        image: p.image_url,
                        summary: p.summary || '',
                        content: p.content || '',
                        author: p.author_name || 'ORVAX',
                        date: new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
                        isVideo: false
                    })));
                }
                if (dbFeed && dbFeed.length > 0) {
                    setFeedPosts(dbFeed.filter(p => !p.is_highlight).map(p => {
                        const dt = new Date(p.created_at);
                        return {
                            id: p.id,
                            author: { name: p.author_name || 'ORVAX', avatar: p.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author_name}` },
                            readTime: `${p.read_time_min || 5} MIN READ`,
                            title: p.title,
                            image: p.image_url,
                            category: (p.category || 'GERAL').toUpperCase(),
                            date: { day: String(dt.getDate()).padStart(2, '0'), month: dt.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '') },
                            summary: p.summary || '',
                            content: p.content || ''
                        };
                    }));
                }
            } catch (e) {
                // Fallback to hardcoded data silently
            }
        };
        fetchPosts();
    }, []);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleScroll = () => {
        if (containerRef.current) {
            const scrollTop = containerRef.current.scrollTop;
            const scrolled = scrollTop > window.innerHeight * 0.4;
            setIsScrolled(scrolled);
            if (onScrollChange) onScrollChange(scrolled);
        }
    };

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className="max-w-md mx-auto h-screen overflow-y-scroll snap-y snap-mandatory bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 relative scrollbar-hide text-black dark:text-white"
        >
            
            {/* 1. TOP HEADER: FLOATING ISLAND RADIO (ULTRA PREMIUM) */}
            <div className="fixed top-4 w-full max-w-md px-4 z-[60] flex justify-between items-center pointer-events-none">
                {/* Floating Pill Radio */}
                <div className="pointer-events-auto flex items-center gap-2">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-full border border-white/20 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-lg transition-all active:scale-95">
                        {/* Spinning Avatar */}
                        <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border border-black/10 dark:border-white/10 ${isRadioPlaying ? 'animate-spin-slow' : ''}`}>
                            <img src="https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=100&q=80" alt="Orvax Radio" className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Info & Equalizer */}
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black tracking-widest leading-none">ORVAX FM</span>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-[8px] font-medium text-gray-500 dark:text-gray-400">Lo-Fi Beats</span>
                                {isRadioPlaying && (
                                    <div className="flex items-end gap-[1px] h-2 ml-1">
                                        <div className="w-[1.5px] bg-indigo-500 rounded-full animate-equalizer-long" />
                                        <div className="w-[1.5px] bg-indigo-500 rounded-full animate-equalizer-short" />
                                        <div className="w-[1.5px] bg-indigo-500 rounded-full animate-equalizer-long delay-150" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Control Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!audioRef.current) {
                                    audioRef.current = new Audio(RADIO_STREAM_URL);
                                    audioRef.current.volume = 0.6;
                                }
                                if (isRadioPlaying) {
                                    audioRef.current.pause();
                                    setIsRadioPlaying(false);
                                } else {
                                    audioRef.current.play().catch(() => {});
                                    setIsRadioPlaying(true);
                                }
                            }}
                            className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-md active:scale-90 transition-all ml-1 shrink-0"
                        >
                            {isRadioPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                        </button>
                    </div>
                </div>

                {/* Theme Toggle Button */}
                <button 
                    onClick={toggleTheme}
                    className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/20 dark:border-zinc-800 shadow-lg active:scale-90 transition-all text-black dark:text-white"
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>

            {/* 2. HERO SECTION: CAPA IMERSIVA (1ª TELA) */}
            <section className="h-screen w-full snap-start flex flex-col pt-32 pb-8 relative shrink-0">
                <div className="px-6 mb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">MAR 2026</span>
                    <h1 className="text-4xl font-black tracking-tighter text-black dark:text-white uppercase leading-none mt-1">
                        TODAY'S<br/>HIGHLIGHTS
                    </h1>
                </div>

                {/* Great Carrossel */}
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-5 px-6 h-full pb-16">
                    {highlights.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setSelectedArticle(item)}
                            className="min-w-[88vw] snap-center flex flex-col relative group text-left transition-transform duration-300 active:scale-[0.98]"
                        >
                            <div className="h-[70%] w-full rounded-t-3xl overflow-hidden relative shadow-lg">
                                <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/5 dark:bg-black/20" />
                                {item.isVideo && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xl transition-transform group-hover:scale-110">
                                            <Play size={28} fill="currentColor" className="ml-1" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="h-[30%] w-full bg-white dark:bg-zinc-900 rounded-b-3xl p-6 flex flex-col justify-center shadow-xl border-x border-b border-gray-100 dark:border-zinc-800 transition-colors">
                                <span className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-600 dark:text-indigo-400 mb-2">
                                    {item.category}
                                </span>
                                <h2 className="text-2xl font-black leading-[1.1] tracking-tight text-black dark:text-white uppercase">
                                    {item.title}
                                </h2>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Scroll Trigger */}
                <div className="absolute bottom-6 w-full text-center flex flex-col items-center animate-pulse pointer-events-none">
                    <span className="text-[9px] font-black tracking-[0.5em] text-gray-400 uppercase mb-1">SCROLL TO FEED</span>
                    <ArrowDown size={14} className="text-gray-300 dark:text-gray-700 animate-bounce" />
                </div>
            </section>

            {/* 3. BLOG BODY: O FEED SOCIAL BRUTALISTA (2ª TELA) */}
            <main className="min-h-screen w-full snap-start pt-32 px-6 pb-40 bg-gray-50 dark:bg-zinc-950 transition-colors">
                <div className="mb-14 px-2">
                    <h2 className="text-sm font-black tracking-[0.3em] text-black dark:text-white uppercase inline-block border-b-4 border-black dark:border-white pb-1">TIMELINE DE NOTÍCIAS</h2>
                </div>

                <div className="flex flex-col gap-14">
                    {feedPosts.map((post, idx) => (
                        <button 
                            key={post.id}
                            onClick={() => setSelectedArticle(post)}
                            className="flex gap-6 relative group text-left w-full active:scale-[0.98] transition-transform"
                        >
                            {/* Data Brutalista Frequente */}
                            <div className="w-14 flex flex-col items-center shrink-0 pt-1">
                                <span className="text-[40px] font-black text-black dark:text-white leading-none tracking-tighter transition-transform group-hover:scale-110 duration-500">{post.date.day}</span>
                                <span className="text-[11px] font-black tracking-[0.3em] text-gray-300 dark:text-gray-600 uppercase mt-2">{post.date.month}</span>
                                
                                {idx !== feedPosts.length - 1 && (
                                    <div className="absolute top-20 bottom-[-80px] w-px border-l-2 border-dashed border-gray-200 dark:border-zinc-800" />
                                )}
                            </div>

                            {/* O Post Card */}
                            <div className="flex-1 pb-10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[9px] font-black px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded uppercase tracking-widest">{post.category}</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{post.readTime}</span>
                                </div>
                                <h3 className="text-2xl font-black leading-tight text-black dark:text-white transition-opacity group-hover:opacity-70">
                                    {post.title}
                                </h3>
                                {post.image && (
                                    <div className="w-full h-44 rounded-3xl overflow-hidden mt-4 border border-gray-100 dark:border-zinc-800 shadow-sm">
                                        <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                                    </div>
                                )}
                                {/* Social Feedback Bar */}
                                <div className="flex items-center gap-8 mt-5 pt-4 border-t border-gray-100 dark:border-zinc-900">
                                    <div className="flex items-center gap-1.5 text-gray-300 dark:text-zinc-700">
                                        <Heart size={18} /> <span className="text-[10px] font-black font-mono">1.2K</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-300 dark:text-zinc-700">
                                        <MessageCircle size={18} /> <span className="text-[10px] font-black font-mono">42</span>
                                    </div>
                                    <div className="ml-auto text-gray-300 dark:text-zinc-700">
                                        <Share2 size={18} />
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </main>

            {/* 5. TELA DE LEITURA (ARTICLE MODAL) */}
            {selectedArticle && (
                <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 max-w-md mx-auto overflow-y-auto animate-slide-up transition-colors duration-300">
                    {/* Modal Landing/Header Image */}
                    <div className="h-[45vh] w-full relative">
                        <img src={selectedArticle.image || "https://images.unsplash.com/photo-1451187580459-43490279c0fa"} alt="Hero" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent to-black/30" />
                        
                        {/* Floating Buttons */}
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
                            <button 
                                onClick={() => setSelectedArticle(null)}
                                className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white active:scale-90 transition-all"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div className="flex gap-3">
                                <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white active:scale-90 transition-all">
                                    <Bookmark size={20} />
                                </button>
                                <button className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-white active:scale-90 transition-all">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <article className="p-8 -mt-10 relative z-10 bg-white dark:bg-zinc-950 rounded-t-[3rem] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] transition-colors">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs uppercase shadow-lg">
                                {selectedArticle.author?.name?.charAt(0) || selectedArticle.author?.charAt(0) || "O"}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black tracking-widest uppercase">{selectedArticle.author?.name || selectedArticle.author}</span>
                                <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase">
                                    {selectedArticle.category} • {selectedArticle.date?.day ? `${selectedArticle.date.day} ${selectedArticle.date.month}` : selectedArticle.date}
                                </span>
                            </div>
                        </div>

                        <h1 className="text-4xl font-black leading-[1.1] tracking-tighter text-black dark:text-white uppercase mb-8">
                            {selectedArticle.title}
                        </h1>

                        <div className="space-y-6">
                            <p className="text-xl font-medium leading-relaxed text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                                {selectedArticle.summary}
                            </p>
                            <div className="h-px w-20 bg-black dark:bg-white/20 mb-8" />
                            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 font-medium">
                                {selectedArticle.content}
                            </p>
                            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 font-medium opacity-60">
                                Simulamos aqui um conteúdo adicional para demonstrar a fluidez da leitura em dispositivos móveis. A atenção humana é o recurso mais escasso da era moderna. Projetar para respeitar esse tempo não é apenas uma escolha estética, mas uma necessidade sistêmica.
                            </p>
                            <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400 font-medium opacity-60">
                                Ao final deste dossiê, você compreenderá as ferramentas necessárias para blindar seu foco e utilizar os protocolos ORVAX como uma extensão de sua própria mente.
                            </p>
                        </div>

                        {/* Modal Footer Spacer */}
                        <div className="h-20" />
                    </article>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 15s linear infinite; }
                
                @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.6s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                
                @keyframes equalizer-long { 0%, 100% { height: 4px; } 50% { height: 10px; } }
                @keyframes equalizer-short { 0%, 100% { height: 6px; } 50% { height: 3px; } }
                .animate-equalizer-long { animation: equalizer-long 0.6s ease-in-out infinite; }
                .animate-equalizer-short { animation: equalizer-short 0.6s ease-in-out infinite; }
            `}</style>

        </div>
    );
};

export default Blog;
