// Bancada dos 9 estados da Simbiose, lado a lado. Serve para
// comparar ritmos: um estado só está certo quando se distingue dos
// vizinhos sem legenda. Não é montado em lugar nenhum do app — é
// ferramenta de quem desenha a criatura.
import React from 'react';
import Simbiose from './Simbiose';

const TODOS = ['IDLE', 'LISTENING', 'THINKING', 'ANALYZING', 'SPEAKING', 'ATTENTION', 'SUCCESS', 'WARNING', 'EVOLUTION'];

export default function SimbioseLab() {
    return (
        <div
            className="fixed inset-0 z-[9999] overflow-auto p-6"
            style={{ backgroundColor: 'var(--bg-color)' }}
        >
            <div className="grid grid-cols-3 gap-4 max-w-[520px] mx-auto">
                {TODOS.map((e) => (
                    <div key={e} className="flex flex-col items-center gap-2 py-3">
                        <Simbiose estado={e} tamanho={130} />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] opacity-45"
                            style={{ color: 'var(--text-main)' }}>{e}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
