// =============================================================
// ORVAX · ANÁLISE PROFUNDA DA DIMENSÃO
//
// A camada que faltava entre "aqui está seu número" e "e daí?".
//
// Regra que governa cada bloco daqui: SE NÃO HÁ BASE, NÃO AFIRMA.
// O motor devolve `suficiente: false` quando os dados não sustentam
// uma conclusão, e a tela diz isso em português — em vez de desenhar
// um gráfico bonito sobre três pontos e deixar a pessoa acreditar
// num padrão que não existe. Métrica inventada é pior que métrica
// ausente: a ausente a pessoa ignora, a inventada ela usa para
// decidir.
//
// O seletor de período não refaz consulta: a série inteira já veio
// do banco uma vez e as janelas são recortes em memória.
// =============================================================
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { analisarDimensao } from '../engine/dimensionMetrics';

const PERIODOS = [
    { dias: 7, rotulo: '7D' },
    { dias: 30, rotulo: '30D' },
    { dias: 90, rotulo: '90D' },
    { dias: 365, rotulo: '1A' },
];

const NOMES_SEMANA_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const Secao = ({ titulo, children, acessorio }) => (
    <section className="mb-7">
        <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[9px] font-mono font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-zinc-600">
                {titulo}
            </h3>
            {acessorio}
        </div>
        {children}
    </section>
);

const Bloco = ({ children, className = '' }) => (
    <div className={`rounded-[20px] border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 ${className}`}>
        {children}
    </div>
);

/** Estado honesto para quando falta base. Diz o que falta e o que virá. */
const SemBase = ({ oQueFalta, oQueRevela }) => (
    <Bloco>
        <p className="text-[12px] leading-relaxed text-slate-500 dark:text-zinc-500">
            {oQueFalta}
        </p>
        <p className="text-[11px] leading-relaxed text-slate-400 dark:text-zinc-600 mt-1.5">
            {oQueRevela}
        </p>
    </Bloco>
);

export default function AnaliseProfunda({ habitos = [], logs = [], cor = '#18181b' }) {
    const [dias, setDias] = useState(30);
    const [habitoAberto, setHabitoAberto] = useState(null);

    // Recalcula só quando a janela muda — sem ida ao banco.
    const a = useMemo(() => analisarDimensao({ habitos, logs, dias }), [habitos, logs, dias]);

    if (!a.baseSuficiente) {
        return (
            <SemBase
                oQueFalta={`Ainda são ${a.totalRegistros} ${a.totalRegistros === 1 ? 'registro' : 'registros'} nesta dimensão. Com menos de 10, qualquer padrão que eu apontasse seria ruído.`}
                oQueRevela="A partir de umas duas semanas de uso, dá para ver seu melhor horário, os dias em que você funciona melhor e o que costuma travar."
            />
        );
    }

    const { comparacao: c, sequencias: s, semanal, horario, extremos } = a;
    const maxSemana = Math.max(...(semanal.dias || [1]));
    const maxHora = Math.max(...(horario.horas || [1]));

    return (
        <div>
            {/* ─── PERÍODO ─────────────────────────────────────── */}
            <div className="flex gap-1.5 mb-6">
                {PERIODOS.map((p) => (
                    <button
                        key={p.dias}
                        onClick={() => setDias(p.dias)}
                        className={[
                            'flex-1 h-8 rounded-lg text-[10px] font-mono font-bold tracking-wider transition-all',
                            dias === p.dias
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-600',
                        ].join(' ')}
                    >
                        {p.rotulo}
                    </button>
                ))}
            </div>

            {/* ─── COMPARAÇÃO ──────────────────────────────────── */}
            <Secao titulo="Contra o período anterior">
                <Bloco>
                    <div className="flex items-end gap-4">
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[38px] font-extrabold tracking-tighter text-slate-900 dark:text-zinc-100 leading-none">
                                    {c.atual}
                                </span>
                                <span className="text-[12px] font-bold text-slate-400 dark:text-zinc-600">
                                    {c.atual === 1 ? 'dia' : 'dias'}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-600 mt-1 block">
                                ativos em {dias}d
                            </span>
                        </div>

                        <div className="flex-1 border-l border-slate-100 dark:border-zinc-800 pl-4 pb-1">
                            {/* Pontos ABSOLUTOS quando a base é pequena: com
                                2 dias virando 4, "+100%" mente e "+2 dias"
                                informa. O motor decide qual é honesto. */}
                            {c.temBase ? (
                                <>
                                    <p className="text-[13px] leading-snug text-slate-700 dark:text-zinc-300">
                                        {c.deltaAbsoluto === 0 ? (
                                            <>Igual ao período anterior — <strong>{c.anterior} dias</strong>.</>
                                        ) : (
                                            <>
                                                <strong className={c.deltaAbsoluto > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                                    {c.deltaAbsoluto > 0 ? '+' : ''}{c.deltaAbsoluto} {Math.abs(c.deltaAbsoluto) === 1 ? 'dia' : 'dias'}
                                                </strong>
                                                {' '}contra os {c.anterior} do período anterior
                                                {c.percentualConfiavel && c.deltaPct !== null && ` (${c.deltaPct > 0 ? '+' : ''}${c.deltaPct}%)`}.
                                            </>
                                        )}
                                    </p>
                                    <p className="text-[11px] text-slate-400 dark:text-zinc-600 mt-1">
                                        Taxa de {c.taxaAtual}% dos dias, contra {c.taxaAnterior}%.
                                    </p>
                                </>
                            ) : (
                                <p className="text-[12px] text-slate-400 dark:text-zinc-600">
                                    Sem registros no período anterior para comparar.
                                </p>
                            )}
                        </div>
                    </div>
                </Bloco>
            </Secao>

            {/* ─── SEQUÊNCIA ───────────────────────────────────── */}
            <Secao titulo="Sequência">
                <div className="grid grid-cols-2 gap-2.5">
                    <Bloco>
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 block mb-1.5">Atual</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[30px] font-extrabold tracking-tighter text-slate-900 dark:text-zinc-100 leading-none">{s.atual}</span>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-600">dias</span>
                        </div>
                        {s.atual === 0 && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1.5 leading-snug">
                                Quebrada. Recomeçar hoje já conta como 1.
                            </p>
                        )}
                    </Bloco>
                    <Bloco>
                        <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 block mb-1.5">Melhor de todas</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-[30px] font-extrabold tracking-tighter text-slate-900 dark:text-zinc-100 leading-none">{s.melhor}</span>
                            <span className="text-[11px] font-bold text-slate-400 dark:text-zinc-600">dias</span>
                        </div>
                        {s.melhor > 0 && s.atual < s.melhor && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-600 mt-1.5 leading-snug">
                                Faltam {s.melhor - s.atual} para empatar.
                            </p>
                        )}
                    </Bloco>
                </div>
            </Secao>

            {/* ─── QUANDO ──────────────────────────────────────── */}
            <Secao titulo="Quando você funciona">
                <Bloco>
                    {horario.suficiente ? (
                        <>
                            <div className="flex items-end gap-[3px] h-16 mb-2">
                                {horario.horas.map((n, h) => (
                                    <div key={h} className="flex-1 rounded-t-sm transition-all"
                                        style={{
                                            height: `${maxHora > 0 ? Math.max(3, (n / maxHora) * 100) : 3}%`,
                                            backgroundColor: cor,
                                            opacity: h === horario.pico ? 1 : n > 0 ? 0.3 : 0.08,
                                        }} />
                                ))}
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-slate-300 dark:text-zinc-700 mb-3">
                                <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                            </div>
                            <p className="text-[12px] leading-relaxed text-slate-600 dark:text-zinc-400">
                                Seu pico é às <strong className="text-slate-900 dark:text-zinc-100">{String(horario.pico).padStart(2, '0')}h</strong>,
                                e <strong className="text-slate-900 dark:text-zinc-100">{horario.concentracaoNaFaixa}%</strong> do que você faz
                                acontece de {horario.faixa}.
                            </p>
                        </>
                    ) : (
                        <SemBase
                            oQueFalta="Ainda não dá para dizer seu melhor horário."
                            oQueRevela="Com uns 10 registros eu consigo apontar a janela do dia em que você rende mais."
                        />
                    )}
                </Bloco>
            </Secao>

            {/* ─── DIAS DA SEMANA ──────────────────────────────── */}
            <Secao titulo="Dias da semana">
                <Bloco>
                    {semanal.suficiente ? (
                        <>
                            <div className="flex items-end justify-between gap-2 h-20 mb-2">
                                {semanal.dias.map((n, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                        <div className="w-full rounded-t-md transition-all"
                                            style={{
                                                height: `${maxSemana > 0 ? Math.max(4, (n / maxSemana) * 64) : 4}px`,
                                                backgroundColor: cor,
                                                opacity: n === maxSemana && n > 0 ? 1 : 0.28,
                                            }} />
                                        <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-600">{NOMES_SEMANA_CURTO[i]}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Só afirma padrão quando a assimetria é real —
                                senão diz que está equilibrado, que também é
                                uma informação. */}
                            <p className="text-[12px] leading-relaxed text-slate-600 dark:text-zinc-400 mt-2">
                                {semanal.assimetriaRelevante ? (
                                    <>Você é mais constante <strong className="text-slate-900 dark:text-zinc-100">{semanal.melhorDia}</strong> —
                                        {' '}{semanal.acimaDaMedia}% acima da sua média. O ponto fraco é {semanal.piorDia}.</>
                                ) : (
                                    <>Sua distribuição é equilibrada na semana: nenhum dia se destaca o bastante para virar padrão.</>
                                )}
                            </p>
                        </>
                    ) : (
                        <SemBase
                            oQueFalta="Poucos registros para ler o padrão semanal."
                            oQueRevela="Com duas semanas de uso dá para ver em quais dias você costuma falhar."
                        />
                    )}
                </Bloco>
            </Secao>

            {/* ─── EXTREMOS ────────────────────────────────────── */}
            {extremos && (
                <Secao titulo="Melhor e pior momento">
                    <div className="grid grid-cols-2 gap-2.5">
                        <Bloco>
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 block mb-1.5">Melhor</span>
                            <span className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 block capitalize">{extremos.melhor.quando}</span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-600">{extremos.melhor.registros} registros</span>
                        </Bloco>
                        <Bloco>
                            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 block mb-1.5">Mais fraco</span>
                            <span className="text-[13px] font-bold text-slate-900 dark:text-zinc-100 block capitalize">{extremos.pior.quando}</span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-600">{extremos.pior.registros} registros</span>
                        </Bloco>
                    </div>
                </Secao>
            )}

            {/* ─── COMPOSIÇÃO (DRILL-DOWN) ─────────────────────── */}
            {a.habitos.length > 0 && (
                <Secao titulo="Do que este número é feito">
                    <Bloco className="p-0 overflow-hidden">
                        {a.habitos.map((h, i) => {
                            const aberto = habitoAberto === h.id;
                            return (
                                <div key={h.id} className={i > 0 ? 'border-t border-slate-100 dark:border-zinc-800' : ''}>
                                    <button
                                        onClick={() => setHabitoAberto(aberto ? null : h.id)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40"
                                    >
                                        {aberto
                                            ? <ChevronDown size={13} className="shrink-0 text-slate-300 dark:text-zinc-700" />
                                            : <ChevronRight size={13} className="shrink-0 text-slate-300 dark:text-zinc-700" />}
                                        <span className="flex-1 text-[12px] font-semibold text-slate-700 dark:text-zinc-300 truncate">
                                            {h.titulo}
                                        </span>
                                        <div className="w-16 h-1 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.taxa)}%`, backgroundColor: cor, opacity: 0.7 }} />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-zinc-100 w-9 text-right shrink-0">
                                            {h.taxa}%
                                        </span>
                                    </button>

                                    {aberto && (
                                        <div className="px-4 pb-4 pt-1 pl-10">
                                            <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-zinc-500">
                                                {h.feitos} {h.feitos === 1 ? 'registro' : 'registros'} nos últimos {dias} dias
                                                {h.diasParado === null
                                                    ? ' — nunca foi marcado.'
                                                    : h.diasParado === 0
                                                        ? ' — o último foi hoje.'
                                                        : h.diasParado === 1
                                                            ? ' — o último foi ontem.'
                                                            : ` — o último foi há ${h.diasParado} dias.`}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </Bloco>
                </Secao>
            )}
        </div>
    );
}
