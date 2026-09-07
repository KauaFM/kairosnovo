// =============================================================
// ORVAX — ditado por voz
//
// ─── POR QUE ISTO FOI REESCRITO ──────────────────────────────
//
// A primeira versão usava a Web Speech API. Ela é grátis e
// instantânea, mas quebra exatamente onde o produto vive: no app
// INSTALADO no celular ela frequentemente não existe, e quando a
// permissão já foi negada não há barra de endereço nem cadeado para
// reabrir. A pessoa fica sem microfone e sem caminho de volta —
// foi literalmente o relato: "não tem como desativar o cadeado em
// um app baixado no celular".
//
// Agora o caminho principal é GRAVAR de verdade:
//
//   getUserMedia + MediaRecorder ─▶ Edge Function transcribe-audio
//                                    (Whisper, chave no servidor)
//
// Isso funciona em PWA instalado, porque getUserMedia é a API
// padrão de mídia e pede permissão pelo diálogo NATIVO do sistema —
// o mesmo de câmera. E a chave da OpenAI nunca entra no bundle,
// respeitando a regra do projeto.
//
// A Web Speech continua como atalho quando existe: é instantânea e
// não custa nada. Se falhar, cai para a gravação sem a pessoa
// perceber.
// =============================================================
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

function ApiFala() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/** Está rodando como app instalado (sem barra de endereço)? */
export function ehAppInstalado() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true
        || !!window.Capacitor?.isNativePlatform?.();
}

/**
 * Instrução de permissão que serve para o contexto REAL da pessoa.
 * Mandar alguém "tocar no cadeado" dentro de um app instalado é
 * mandar procurar algo que não existe ali.
 */
function comoLiberarMicrofone() {
    if (ehAppInstalado()) {
        const android = /android/i.test(navigator.userAgent);
        return android
            ? 'O microfone está bloqueado. Abra os Ajustes do celular → Apps → ORVAX → Permissões → Microfone → Permitir. Depois volte aqui.'
            : 'O microfone está bloqueado. Abra os Ajustes do celular → ORVAX (ou Safari → Microfone) e permita o acesso. Depois volte aqui.';
    }
    return 'O microfone está bloqueado para este site. Toque no cadeado ao lado do endereço, permita o microfone e tente de novo.';
}

/** Formato que o navegador realmente sabe gravar. */
function melhorFormato() {
    if (typeof MediaRecorder === 'undefined') return null;
    const opcoes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    return opcoes.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

export function useVoz({ aoFinalizar, lang = 'pt-BR' } = {}) {
    const [ouvindo, setOuvindo] = useState(false);
    const [preparando, setPreparando] = useState(false);
    const [transcrevendo, setTranscrevendo] = useState(false);
    const [parcial, setParcial] = useState('');
    const [erro, setErro] = useState(null);

    const recFalaRef = useRef(null);
    const gravadorRef = useRef(null);
    const pedacosRef = useRef([]);
    const streamRef = useRef(null);
    const finalRef = useRef('');
    const usouFalaRef = useRef(false);
    const cbRef = useRef(aoFinalizar);
    useEffect(() => { cbRef.current = aoFinalizar; }, [aoFinalizar]);

    // Gravar é possível em qualquer lugar com microfone. Isto é o que
    // torna o recurso disponível no app instalado.
    const suportado = typeof navigator !== 'undefined'
        && !!navigator.mediaDevices?.getUserMedia
        && typeof MediaRecorder !== 'undefined';

    const encerrarStream = useCallback(() => {
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ok */ }
        streamRef.current = null;
    }, []);

    // ── transcrição no servidor ───────────────────────────────
    const transcrever = useCallback(async (blob) => {
        setTranscrevendo(true);
        try {
            const form = new FormData();
            const ext = (blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm');
            form.append('file', blob, `ditado.${ext}`);

            const { data, error } = await supabase.functions.invoke('transcribe-audio', { body: form });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            const texto = String(data?.text || '').trim();
            if (texto) cbRef.current?.(texto);
            else setErro('Não captei nada. Fale mais perto e tente de novo.');
        } catch (e) {
            const msg = String(e?.message || '');
            setErro(
                /Failed to send|fetch/i.test(msg)
                    ? 'Sem conexão para transcrever. Tente de novo com internet.'
                    // Enquanto a função não estiver publicada, o convite a
                    // "tentar de novo" seria mentira: diz o que houve.
                    : /not found|404/i.test(msg)
                        ? 'A transcrição ainda não está ativa no servidor. Use o teclado por enquanto.'
                        : msg || 'Não consegui transcrever agora.'
            );
        } finally {
            setTranscrevendo(false);
            setParcial('');
        }
    }, []);

    const parar = useCallback(() => {
        setOuvindo(false);
        try { recFalaRef.current?.stop(); } catch { /* ok */ }
        try {
            if (gravadorRef.current?.state === 'recording') gravadorRef.current.stop();
        } catch { /* ok */ }
    }, []);

    const iniciar = useCallback(async () => {
        if (ouvindo || preparando || transcrevendo) return;
        setErro(null);
        setParcial('');
        finalRef.current = '';
        usouFalaRef.current = false;
        pedacosRef.current = [];

        if (!suportado) {
            setErro('Este aparelho não tem microfone disponível para o app.');
            return;
        }

        // getUserMedia é quem provoca o diálogo NATIVO de permissão —
        // inclusive no app instalado. A Web Speech sozinha não pede de
        // forma confiável, e era por isso que nada acontecia.
        setPreparando(true);
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
        } catch (e) {
            setPreparando(false);
            setErro(
                e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
                    ? comoLiberarMicrofone()
                    : 'Não encontrei um microfone disponível.'
            );
            return;
        }
        setPreparando(false);

        // ── Grava sempre. É o caminho que funciona em todo lugar ──
        try {
            const mime = melhorFormato();
            const gravador = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            gravadorRef.current = gravador;
            gravador.ondataavailable = (e) => { if (e.data?.size) pedacosRef.current.push(e.data); };
            gravador.onstop = async () => {
                encerrarStream();
                // Se a Web Speech já entregou o texto, a gravação foi só
                // seguro: não gasta transcrição à toa.
                if (usouFalaRef.current && finalRef.current.trim()) return;
                const blob = new Blob(pedacosRef.current, { type: mime || 'audio/webm' });
                if (blob.size < 1200) { setErro('Não captei nada. Fale mais perto e tente de novo.'); return; }
                await transcrever(blob);
            };
            gravador.start();
            setOuvindo(true);
        } catch {
            encerrarStream();
            setErro('Não consegui gravar o áudio neste aparelho.');
            return;
        }

        // ── Atalho: se o navegador reconhece fala, usa e evita custo ──
        const ApiF = ApiFala();
        if (ApiF) {
            try {
                const rec = new ApiF();
                rec.lang = lang;
                rec.continuous = false;
                rec.interimResults = true;
                rec.onresult = (e) => {
                    let interino = '';
                    for (let i = e.resultIndex; i < e.results.length; i++) {
                        const t = e.results[i][0].transcript;
                        if (e.results[i].isFinal) finalRef.current += t;
                        else interino += t;
                    }
                    setParcial(finalRef.current + interino);
                };
                rec.onend = () => {
                    const texto = finalRef.current.trim();
                    if (texto) {
                        usouFalaRef.current = true;
                        cbRef.current?.(texto);
                        setParcial('');
                    }
                    // Sem texto: não faz nada. O gravador ainda está
                    // rodando e a transcrição do servidor assume — é
                    // esse encadeamento que faz funcionar onde a Web
                    // Speech falha calada.
                    parar();
                };
                // Falha da Web Speech é silenciosa de propósito: existe o
                // caminho da gravação atrás dela. Avisar aqui assustaria
                // a pessoa por algo que vai se resolver sozinho.
                rec.onerror = () => { };
                rec.start();
                recFalaRef.current = rec;
            } catch { /* sem atalho: segue só com gravação */ }
        }
    }, [ouvindo, preparando, transcrevendo, suportado, lang, transcrever, encerrarStream, parar]);

    // Sair da tela com o microfone aberto é vazamento de recurso — e o
    // indicador de gravação ficaria aceso no celular.
    useEffect(() => () => {
        try { recFalaRef.current?.abort(); } catch { /* ok */ }
        try { if (gravadorRef.current?.state === 'recording') gravadorRef.current.stop(); } catch { /* ok */ }
        encerrarStream();
    }, [encerrarStream]);

    return {
        suportado,
        ouvindo,
        preparando,
        transcrevendo,
        parcial,
        erro,
        iniciar,
        parar,
        limparErro: () => setErro(null),
        setErro,
        motivoIndisponivel: suportado ? null : 'Este aparelho não expõe microfone para o app.',
    };
}
