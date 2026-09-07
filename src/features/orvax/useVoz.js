// =============================================================
// ORVAX — ditado por voz
//
// Usa a Web Speech API do navegador (SpeechRecognition), que
// reconhece a fala no próprio navegador/aparelho. Não passa pela
// nossa Edge Function nem gasta OpenAI: o que chega ao mentor é
// texto, igual ao que a pessoa teria digitado.
//
// ─── POR QUE O PROMPT DE PERMISSÃO NÃO APARECIA ──────────────
//
// O SpeechRecognition sozinho NÃO pede permissão de forma
// confiável — em várias situações (PWA instalado, alguns Androids)
// ele simplesmente falha calado, e a pessoa fica olhando para um
// microfone que não faz nada. Quem provoca o pedido de verdade é
// getUserMedia. Então pedimos o microfone por ele primeiro, e só
// depois iniciamos o reconhecimento; o stream é fechado na hora,
// porque queríamos a PERMISSÃO, não o áudio.
//
// E há o caso em que nenhum prompt vai aparecer nunca: quando a
// pessoa já negou antes, o navegador não pergunta de novo. Aí o
// único caminho é ela mudar nas configurações do site — e o app
// precisa DIZER isso, em vez de ficar mudo. Silêncio aqui faz a
// pessoa achar que o app está quebrado, ou que ela é que errou.
// =============================================================
import { useState, useRef, useCallback, useEffect } from 'react';

function API() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const AJUDA_BLOQUEADO =
    'O microfone está bloqueado para este site. Toque no cadeado (ou no ícone ao lado do endereço), permita o microfone e tente de novo.';

export function useVoz({ aoFinalizar, lang = 'pt-BR' } = {}) {
    const Rec = API();
    const [suportado] = useState(!!Rec);
    const [ouvindo, setOuvindo] = useState(false);
    const [preparando, setPreparando] = useState(false); // pedindo permissão
    const [parcial, setParcial] = useState('');
    const [erro, setErro] = useState(null);
    const recRef = useRef(null);
    const finalRef = useRef('');
    const cbRef = useRef(aoFinalizar);
    useEffect(() => { cbRef.current = aoFinalizar; }, [aoFinalizar]);

    const parar = useCallback(() => {
        try { recRef.current?.stop(); } catch { /* já parado */ }
        setOuvindo(false);
    }, []);

    /**
     * Garante a permissão do microfone.
     * @returns {Promise<'ok'|'bloqueado'|'indisponivel'>}
     */
    const garantirPermissao = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) return 'indisponivel';
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Só precisávamos do "sim". Manter o stream aberto deixaria o
            // indicador de microfone aceso à toa e brigaria com o
            // reconhecimento pelo mesmo dispositivo.
            stream.getTracks().forEach((t) => t.stop());
            return 'ok';
        } catch (e) {
            if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') return 'bloqueado';
            return 'indisponivel';
        }
    }, []);

    const iniciar = useCallback(async () => {
        if (!Rec || ouvindo || preparando) return;
        setErro(null);
        setParcial('');
        finalRef.current = '';

        // Se já foi negado antes, nenhum prompt vai aparecer — então
        // explica o caminho em vez de tentar e falhar em silêncio.
        try {
            const st = await navigator.permissions?.query({ name: 'microphone' });
            if (st?.state === 'denied') { setErro(AJUDA_BLOQUEADO); return; }
        } catch { /* navegador sem Permissions API: segue e tenta */ }

        setPreparando(true);
        const permissao = await garantirPermissao();
        setPreparando(false);

        if (permissao === 'bloqueado') { setErro(AJUDA_BLOQUEADO); return; }
        if (permissao === 'indisponivel') { setErro('Não encontrei um microfone disponível.'); return; }

        const rec = new Rec();
        rec.lang = lang;
        rec.continuous = false;
        rec.interimResults = true; // mostra o texto se formando

        rec.onresult = (e) => {
            let interino = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalRef.current += t;
                else interino += t;
            }
            setParcial(finalRef.current + interino);
        };

        rec.onerror = (e) => {
            // 'no-speech' e 'aborted' são situações normais (não falou,
            // ou cancelou); só o resto merece virar mensagem.
            if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                setErro(AJUDA_BLOQUEADO);
            } else if (e.error === 'network') {
                // O reconhecimento do Chrome manda o áudio para um
                // servidor: sem internet ele falha, e "tente de novo"
                // faria a pessoa repetir para sempre.
                setErro('O reconhecimento de voz precisa de internet. Verifique sua conexão.');
            } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setErro(`Não consegui ouvir agora (${e.error}). Tente de novo.`);
            }
            setOuvindo(false);
        };

        rec.onend = () => {
            setOuvindo(false);
            const texto = finalRef.current.trim();
            if (texto) {
                cbRef.current?.(texto);
            } else {
                // Antes isto era silêncio total: a pessoa falava, o
                // microfone fechava e NADA acontecia — indistinguível de
                // "o app está quebrado". Agora ela sabe que ele ouviu e
                // não entendeu, que é uma informação diferente.
                setErro('Não captei nada. Fale mais perto do microfone e tente de novo.');
            }
            setParcial('');
        };

        recRef.current = rec;
        try {
            rec.start();
            setOuvindo(true);
        } catch {
            setErro('Não consegui abrir o microfone.');
        }
    }, [Rec, lang, ouvindo, preparando, garantirPermissao]);

    // Deixar o reconhecimento vivo depois que a tela sai é vazamento de
    // recurso — e o microfone continuaria aberto.
    useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ok */ } }, []);

    return {
        suportado, ouvindo, preparando, parcial, erro,
        iniciar, parar,
        limparErro: () => setErro(null),
        // Para a interface poder DIZER por que não dá, em vez de
        // esconder o botão e deixar a pessoa achar que o app quebrou.
        motivoIndisponivel: suportado
            ? null
            : 'Este navegador não reconhece fala. No Android, use o Chrome; no iPhone, o Safari. Você também pode ditar pelo teclado, no ícone de microfone dele.',
        setErro,
    };
}
