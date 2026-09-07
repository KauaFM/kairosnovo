// =============================================================
// ORVAX — ditado por voz
//
// Usa a Web Speech API do navegador (SpeechRecognition), que
// reconhece a fala NO APARELHO / no serviço do próprio navegador.
// Não passa pela nossa Edge Function nem gasta OpenAI: o que chega
// ao mentor é texto, igual ao que a pessoa teria digitado.
//
// Suporte é irregular — Chrome e Android têm; Firefox não; iOS
// depende da versão. Por isso `suportado` é exposto: a interface
// não deve oferecer um botão de microfone que não faz nada. Botão
// que não funciona é pior que botão ausente, porque a pessoa culpa
// a si mesma pelo silêncio.
// =============================================================
import { useState, useRef, useCallback, useEffect } from 'react';

function Reconhecimento() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoz({ aoFinalizar, lang = 'pt-BR' } = {}) {
    const API = Reconhecimento();
    const [suportado] = useState(!!API);
    const [ouvindo, setOuvindo] = useState(false);
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

    const iniciar = useCallback(() => {
        if (!API || ouvindo) return;
        setErro(null);
        setParcial('');
        finalRef.current = '';

        const rec = new API();
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
            // 'no-speech' e 'aborted' são situações normais (a pessoa não
            // falou, ou cancelou); só o resto merece virar mensagem.
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setErro(e.error === 'not-allowed'
                    ? 'Preciso da permissão do microfone.'
                    : 'Não consegui ouvir agora.');
            }
            setOuvindo(false);
        };

        rec.onend = () => {
            setOuvindo(false);
            const texto = finalRef.current.trim();
            if (texto) cbRef.current?.(texto);
            setParcial('');
        };

        recRef.current = rec;
        try {
            rec.start();
            setOuvindo(true);
        } catch {
            setErro('Não consegui abrir o microfone.');
        }
    }, [API, lang, ouvindo]);

    // Deixar o reconhecimento vivo depois que a tela sai é vazamento
    // de recurso — e o microfone continuaria aberto.
    useEffect(() => () => { try { recRef.current?.abort(); } catch { /* ok */ } }, []);

    return { suportado, ouvindo, parcial, erro, iniciar, parar, limparErro: () => setErro(null) };
}
