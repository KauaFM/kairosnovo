// =============================================================
// ORVAX — Captura Rápida
//
// Um campo só, de qualquer tela: "gastei 40 no almoço", "treinei
// 1h", "marca dentista terça 15h". O mentor entende e registra —
// no lugar de abrir a aba certa e preencher um formulário de
// quatro campos.
//
// Reaproveita sendMentorMessage inteiro, que já resolve os dois
// caminhos: Edge Function (age no servidor) e, se ela falhar, o
// modo cliente (age pelo db.js com o RLS do próprio usuário).
// Aqui não tem regra de negócio nova — só a porta de entrada.
// =============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Loader2, Check, CornerDownLeft } from 'lucide-react';
import { sendMentorMessage } from '../services/mentorAgent';
import { hasFeature } from '../services/entitlements';
import { appEvents } from '../lib/events';
import { useLang } from '../i18n/LanguageContext';

export default function QuickCapture({ hidden = false }) {
    const { t } = useLang();
    const [liberado, setLiberado] = useState(false);
    const [aberto, setAberto] = useState(false);
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [resposta, setResposta] = useState(null); // { ok: bool, texto: string }
    const inputRef = useRef(null);

    // A captura fala com o mentor, então segue o mesmo acesso dele:
    // a amostra de 15 min e conta sem plano não gastam IA paga.
    useEffect(() => {
        let vivo = true;
        hasFeature('mentor')
            .then((pode) => { if (vivo) setLiberado(!!pode); })
            .catch(() => { /* sem acesso, o botão simplesmente não aparece */ });
        return () => { vivo = false; };
    }, []);

    useEffect(() => {
        if (aberto) {
            // espera a animação começar pra não brigar com o teclado do celular
            const id = setTimeout(() => inputRef.current?.focus(), 120);
            return () => clearTimeout(id);
        }
    }, [aberto]);

    const fechar = useCallback(() => {
        setAberto(false);
        setTexto('');
        setResposta(null);
    }, []);

    useEffect(() => {
        if (!aberto) return;
        const onKey = (e) => { if (e.key === 'Escape') fechar(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [aberto, fechar]);

    const enviar = async () => {
        const limpo = texto.trim();
        if (!limpo || enviando) return;
        setEnviando(true);
        setResposta(null);
        try {
            const { reply, mode } = await sendMentorMessage(limpo, []);
            // No caminho da Edge Function quem escreve é o servidor, então
            // nenhum evento do cliente disparou e as telas abertas ficariam
            // desatualizadas. No modo cliente o db.js já emitiu por conta.
            if (mode === 'agent') {
                appEvents.emit({ type: 'TRANSACTION_CHANGED' });
                appEvents.emit({ type: 'TASK_CHANGED' });
                appEvents.emit({ type: 'HABIT_CHANGED' });
            }
            setResposta({ ok: true, texto: reply });
            setTexto('');
        } catch (err) {
            setResposta({ ok: false, texto: err?.message || t('quickCapture.genericError') });
        } finally {
            setEnviando(false);
        }
    };

    if (!liberado) return null;

    return (
        <>
            {/* ─── Botão recolhido ─────────────────────────────────
                Fica à ESQUERDA porque os FABs de Métricas ocupam a
                direita na mesma altura. */}
            <button
                onClick={() => setAberto(true)}
                aria-label={t('quickCapture.aria')}
                className={[
                    'fixed left-4 z-[60] w-12 h-12 rounded-full flex items-center justify-center',
                    'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900',
                    'border border-white/10 shadow-xl transition-all duration-300',
                    'hover:scale-105 active:scale-95',
                    (hidden || aberto) ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100',
                ].join(' ')}
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
            >
                <Sparkles size={18} strokeWidth={2.2} />
            </button>

            {/* ─── Folha aberta ─────────────────────────────────── */}
            {aberto && (
                <>
                    <div
                        className="fixed inset-0 z-[88] bg-black/40 backdrop-blur-[2px]"
                        onClick={fechar}
                    />
                    <div
                        className="fixed left-0 right-0 z-[90] mx-auto w-full max-w-[428px] px-4"
                        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
                    >
                        <div
                            className="rounded-2xl border shadow-2xl p-4 flex flex-col gap-3"
                            style={{
                                backgroundColor: 'var(--bg-color)',
                                borderColor: 'var(--border-color)',
                                animation: 'compass-slide-up 0.22s ease-out',
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] opacity-40">
                                    {t('quickCapture.title')}
                                </span>
                                <button
                                    onClick={fechar}
                                    aria-label={t('quickCapture.close')}
                                    className="w-7 h-7 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={inputRef}
                                    rows={2}
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Enter envia; Shift+Enter quebra linha
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
                                    }}
                                    placeholder={t('quickCapture.placeholder')}
                                    disabled={enviando}
                                    className="flex-1 resize-none bg-transparent border rounded-xl px-3 py-2.5 text-[12px] leading-snug focus:outline-none transition-colors disabled:opacity-50"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                />
                                <button
                                    onClick={enviar}
                                    disabled={enviando || !texto.trim()}
                                    aria-label={t('quickCapture.send')}
                                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                                >
                                    {enviando
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <CornerDownLeft size={16} strokeWidth={2.4} />}
                                </button>
                            </div>

                            {resposta && (
                                <div
                                    className="flex items-start gap-2 rounded-xl px-3 py-2.5 border"
                                    style={{
                                        borderColor: resposta.ok ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
                                        backgroundColor: resposta.ok ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                                    }}
                                >
                                    {resposta.ok
                                        ? <Check size={13} className="mt-[2px] shrink-0 text-[#22c55e]" />
                                        : <X size={13} className="mt-[2px] shrink-0 text-[#ef4444]" />}
                                    <p className="text-[11px] leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                                        {resposta.texto}
                                    </p>
                                </div>
                            )}

                            {!resposta && (
                                <p className="text-[9px] font-mono uppercase tracking-wider opacity-30 leading-relaxed">
                                    {t('quickCapture.hint')}
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
