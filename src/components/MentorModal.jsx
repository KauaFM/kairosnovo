import React from 'react';
import { X, Loader2 } from 'lucide-react';

const MentorModal = ({
    isOpen,
    onClose,
    userInput,
    setUserInput,
    handleInteraction,
    isLoading,
    mentorReply
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-[var(--text-main)] flex flex-col items-center justify-center p-8 overflow-hidden animate-in fade-in duration-500">
            <button onClick={onClose} className="absolute top-6 right-6 md:top-12 md:right-12 text-[var(--bg-color)] opacity-50 hover:opacity-100 transition-opacity">
                <X size={32} strokeWidth={1} />
            </button>

            {/* Generative UI Graphics (Inverted schematic) */}
            <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vw] opacity-10 animate-orbit-reverse pointer-events-none" viewBox="0 0 500 500">
                <circle cx="250" cy="250" r="240" stroke="currentColor" strokeWidth="0.5" fill="none" strokeDasharray="2 10" />
                <circle cx="250" cy="250" r="180" stroke="currentColor" strokeWidth="0.2" fill="none" />
                <circle cx="250" cy="250" r="120" stroke="currentColor" strokeWidth="0.1" fill="none" strokeDasharray="4 4" />
            </svg>

            <div className="w-full max-w-sm relative z-10 text-[var(--bg-color)]">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-3 h-3 bg-[var(--bg-color)] shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>
                    <h2 className="text-2xl font-syncopate font-bold tracking-widest uppercase text-glow">O Arquiteto</h2>
                </div>

                <p className="text-[10px] font-mono tracking-[0.4em] mb-4 uppercase opacity-50">Input Neural Requerido</p>

                <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="[ Descreva o progresso ou determine novas coordenadas... ]"
                    className="w-full h-40 bg-transparent border-t border-b p-4 text-sm font-space focus:outline-none transition-colors resize-none mb-8"
                    style={{ borderColor: 'var(--border-color)', color: 'var(--bg-color)' }}
                />

                {mentorReply && (
                    <div className="mb-8 p-5 shadow-[var(--glass-shadow)] border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--card-hover)' }}>
                        <span className="text-[9px] font-mono block mb-3 tracking-[0.3em] uppercase opacity-40">{" >> "} Resposta_Sistema</span>
                        <p className="text-sm font-space leading-relaxed">{mentorReply}</p>
                    </div>
                )}

                <button
                    onClick={handleInteraction}
                    disabled={isLoading || !userInput.trim()}
                    className="w-full h-16 flex items-center justify-center gap-3 text-xs font-syncopate font-bold tracking-[0.3em] uppercase transition-all shadow-[var(--glass-shadow)]"
                    style={{
                        backgroundColor: (isLoading || !userInput.trim()) ? 'transparent' : 'var(--bg-color)',
                        color: (isLoading || !userInput.trim()) ? 'var(--bg-color)' : 'var(--text-main)',
                        borderColor: 'var(--bg-color)',
                        borderWidth: '1px',
                        opacity: (isLoading || !userInput.trim()) ? 0.3 : 1
                    }}
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : "Processar Link"}
                </button>
            </div>
        </div>
    );
};

export default MentorModal;
