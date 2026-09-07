// =============================================================
// ORVAX · Presença — o cartão da intervenção
//
// A interface sem chat: o ORVAX diz o que observou, com números
// reais, e oferece botões que EXECUTAM. A pessoa decide; ela nunca
// precisa digitar para agir.
//
// Depois de agir, o cartão não some na hora: mostra o que
// aconteceu. Ação sem retorno visível é indistinguível de nada ter
// acontecido.
// =============================================================
import React, { useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import Simbiose from './Simbiose';

const RUBRICA = {
    alerta: 'ORVAX detectou',
    recomendacao: 'ORVAX recomenda',
    analise: 'ORVAX analisou',
    pergunta: 'ORVAX pergunta',
    celebracao: 'ORVAX reconhece',
};

export default function InterventionCard({ intervencao, estado = 'SPEAKING', aoAgir, aoFechar }) {
    const [executando, setExecutando] = useState(null);
    const [resultado, setResultado] = useState(null);

    // A Simbiose acompanha o que está acontecendo NO cartão: pensa
    // enquanto executa, e comemora quando deu certo. Sem isso a
    // entidade viraria um logo parado no canto.
    const estadoAtual = executando ? 'THINKING' : resultado ? 'SUCCESS' : estado;

    const clicar = async (acao) => {
        if (executando) return;
        setExecutando(acao.tipo);
        try {
            const r = await aoAgir(acao);
            if (r?.mensagem) setResultado(r);
        } finally {
            setExecutando(null);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[88] bg-black/40 backdrop-blur-[2px]" onClick={aoFechar} />
            <div
                className="fixed left-0 right-0 z-[90] mx-auto w-full max-w-[428px] px-4"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
            >
                <div
                    className="rounded-2xl border shadow-2xl overflow-hidden"
                    style={{
                        backgroundColor: 'var(--bg-color)',
                        borderColor: 'var(--border-color)',
                        animation: 'compass-slide-up 0.26s ease-out',
                    }}
                >
                    {/* Rubrica — diz de quem é a fala e de que tipo ela é */}
                    <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                        <div className="flex items-center gap-2.5">
                            <Simbiose estado={estadoAtual} tamanho={30} />
                            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] opacity-50">
                                {RUBRICA[intervencao.tipo] || 'ORVAX'}
                            </span>
                        </div>
                        <button
                            onClick={aoFechar}
                            aria-label="Fechar"
                            className="w-7 h-7 rounded-full flex items-center justify-center opacity-35 hover:opacity-100 transition-opacity"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="px-4 pb-4">
                        {resultado ? (
                            // Depois de executar: o que mudou de fato.
                            <div className="flex items-start gap-2.5 py-1">
                                <Check size={15} className="mt-[3px] shrink-0" style={{ color: 'var(--text-main)' }} />
                                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-main)' }}>
                                    {resultado.mensagem}
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-[15px] font-bold leading-snug mb-1.5" style={{ color: 'var(--text-main)' }}>
                                    {intervencao.titulo}
                                </h3>
                                <p className="text-[12.5px] leading-relaxed opacity-70 mb-4" style={{ color: 'var(--text-main)' }}>
                                    {intervencao.corpo}
                                </p>

                                <div className="flex flex-col gap-2">
                                    {intervencao.acoes.map((acao) => (
                                        <button
                                            key={acao.tipo + acao.rotulo}
                                            onClick={() => clicar(acao)}
                                            disabled={!!executando}
                                            className={[
                                                'w-full h-10 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider',
                                                'flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40',
                                                acao.primaria
                                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                                    : 'border',
                                            ].join(' ')}
                                            style={acao.primaria ? undefined : { borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                        >
                                            {executando === acao.tipo && <Loader2 size={13} className="animate-spin" />}
                                            {acao.rotulo}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
