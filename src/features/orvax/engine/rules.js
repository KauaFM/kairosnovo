// =============================================================
// ORVAX · Presença — REGRAS
//
// Cada regra olha os sinais e responde uma pergunta só: "existe
// algo aqui que valha dizer?". Quando existe, devolve uma
// intervenção JÁ com o texto específico e as ações executáveis.
//
// Três princípios que valem para todas:
//
// 1. NÚMERO REAL, SEMPRE. O texto cita o que foi contado. "Você
//    largou 3 depois de começar" vale; "continue focado" não diz
//    nada e some da memória em dois segundos.
//
// 2. AÇÃO JUNTO. Toda intervenção nasce com pelo menos um botão
//    que muda alguma coisa de verdade no app. Falar sobre a
//    solução sem poder executá-la é o que um chatbot faz.
//
// 3. NÃO OPINAR SEM DADO. Regra que depende de padrão exige
//    histórico mínimo. Sem isso, o ORVAX admite que não sabe em
//    vez de inventar causa — inventar é o jeito mais rápido de
//    perder a confiança de quem lê.
//
// `peso` (0-100) é o quanto aquilo merece interromper. Quem decide
// se interrompe mesmo é a política (policy.js), não a regra.
// =============================================================

const brl = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

// ─── 1. Sequência prestes a quebrar ───────────────────────────
// A mais valiosa: é a única com prazo. Depois da meia-noite não
// tem mais o que fazer, então só aparece quando ainda dá tempo.
function sequenciaEmRisco(s) {
    if (s.fracaoDoDia < 0.55) return null; // antes das ~13h ainda é cedo pra cobrar

    const candidatos = s.habitos
        .filter((h) => !h.feitoHoje && h.sequencia >= 3)
        .sort((a, b) => b.sequencia - a.sequencia);
    if (!candidatos.length) return null;

    const h = candidatos[0];
    const horasRestantes = Math.max(1, Math.round((1 - s.fracaoDoDia) * 24));

    return {
        id: `sequencia-risco:${h.id}:${s.hoje}`,
        tipo: 'alerta',
        peso: Math.min(95, 55 + h.sequencia * 3),
        titulo: 'Sua sequência está em risco',
        corpo: `"${h.titulo}" está em ${h.sequencia} dias seguidos e ainda não foi marcado hoje. Restam cerca de ${horasRestantes}h.`,
        acoes: [
            { rotulo: 'Marcar feito', tipo: 'marcar_habito', dados: { habitId: h.id, titulo: h.titulo }, primaria: true },
            { rotulo: 'Hoje não', tipo: 'dispensar' },
        ],
    };
}

// ─── 2. Hábito abandonado ─────────────────────────────────────
// Só fala de quem JÁ teve constância — abandonar algo que nunca
// pegou não é recaída, é a pessoa descobrindo que não era pra ela.
function habitoAbandonado(s) {
    if (!s.maturidade.temHistoricoSuficiente) return null;

    const candidatos = s.habitos
        .filter((h) => h.diasSemFazer !== null && h.diasSemFazer >= 4 && h.diasSemFazer <= 21 && h.totalDias30 >= 5)
        .sort((a, b) => b.totalDias30 - a.totalDias30);
    if (!candidatos.length) return null;

    const h = candidatos[0];
    return {
        id: `habito-parado:${h.id}:${s.hoje}`,
        tipo: 'pergunta',
        peso: 60,
        titulo: 'Um hábito seu parou',
        corpo: `"${h.titulo}" está há ${h.diasSemFazer} dias sem registro — mas você fez ${h.totalDias30} vezes nos últimos 30 dias. Não parece falta de capacidade; parece que algo mudou na rotina.`,
        // A "pergunta" da especificação: opções estruturadas, sem digitar.
        acoes: [
            { rotulo: 'Recomeçar hoje', tipo: 'marcar_habito', dados: { habitId: h.id, titulo: h.titulo }, primaria: true },
            { rotulo: 'Está difícil demais', tipo: 'reduzir_habito', dados: { habitId: h.id, titulo: h.titulo } },
            { rotulo: 'Não faz mais sentido', tipo: 'arquivar_habito', dados: { habitId: h.id, titulo: h.titulo } },
        ],
    };
}

// ─── 3. Acúmulo de tarefas ────────────────────────────────────
function acumuloDeTarefas(s) {
    const { pendentes, total, concluidas } = s.tarefas;
    if (pendentes < 4) return null;
    if (s.fracaoDoDia < 0.5) return null; // de manhã ainda dá tempo

    return {
        id: `acumulo:${s.hoje}`,
        tipo: 'recomendacao',
        peso: 50 + Math.min(30, pendentes * 3),
        titulo: 'Seu dia está carregado demais',
        corpo: `Restam ${pendentes} tarefas para hoje e ${concluidas} de ${total} foram concluídas. Nesse ritmo, o que sobrar vira dívida amanhã — e dia seguinte carregado é o que costuma quebrar a sequência.`,
        acoes: [
            { rotulo: 'Reorganizar o dia', tipo: 'reorganizar_dia', dados: { manter: 3 }, primaria: true },
            { rotulo: 'Deixar como está', tipo: 'dispensar' },
        ],
    };
}

// ─── 4. Começa e não termina ──────────────────────────────────
// O padrão que a especificação cita: o problema está no meio, não
// na capacidade de concluir.
function comecaENaoTermina(s) {
    const { emAndamento } = s.tarefas;
    if (emAndamento < 3) return null;
    if (s.fracaoDoDia < 0.6) return null;

    return {
        id: `sem-fechar:${s.hoje}`,
        tipo: 'analise',
        peso: 62,
        titulo: 'Três frentes abertas ao mesmo tempo',
        corpo: `Você tem ${emAndamento} tarefas começadas e nenhuma fechada. O gargalo não parece ser capacidade de executar — é quantidade de coisa aberta ao mesmo tempo. Fechar uma costuma destravar as outras.`,
        acoes: [
            { rotulo: 'Escolher uma para fechar', tipo: 'focar_uma', dados: {}, primaria: true },
            { rotulo: 'Dispensar', tipo: 'dispensar' },
        ],
    };
}

// ─── 5. Reconhecimento (o ORVAX celebra) ──────────────────────
// Sem isto o mentor vira só cobrança. Marco redondo, e uma vez só.
function marcoAlcancado(s) {
    const marcos = [7, 14, 21, 30, 50, 100];
    const h = s.habitos.find((x) => x.feitoHoje && marcos.includes(x.sequencia));
    if (!h) return null;

    return {
        id: `marco:${h.id}:${h.sequencia}`,
        tipo: 'celebracao',
        peso: 70,
        titulo: `${h.sequencia} dias seguidos`,
        corpo: `"${h.titulo}" chegou a ${h.sequencia} dias sem falhar. Isso já não é motivação — motivação não dura ${h.sequencia} dias. Virou sistema.`,
        acoes: [{ rotulo: 'Continuar', tipo: 'dispensar', primaria: true }],
    };
}

// ─── 6. Gasto fora do padrão ──────────────────────────────────
function gastoConcentrado(s) {
    const { porCategoria, totalGastoMes, qtdTransacoes } = s.financas;
    if (qtdTransacoes < 8 || totalGastoMes <= 0 || !porCategoria.length) return null;

    const topo = porCategoria[0];
    const fatia = topo.valor / totalGastoMes;
    if (fatia < 0.45) return null;

    return {
        id: `gasto-concentrado:${topo.categoria}:${s.hoje.slice(0, 7)}`,
        tipo: 'analise',
        peso: 45,
        titulo: 'Seu gasto está concentrado',
        corpo: `${Math.round(fatia * 100)}% do que você gastou este mês foi em ${topo.categoria} — ${brl(topo.valor)} de ${brl(totalGastoMes)}. Não é necessariamente problema, mas é o lugar onde qualquer corte rende mais.`,
        acoes: [
            { rotulo: 'Ver no Capital', tipo: 'abrir_capital', dados: { categoria: topo.categoria }, primaria: true },
            { rotulo: 'Dispensar', tipo: 'dispensar' },
        ],
    };
}

// ─── 7. Primeiro passo (conta nova) ───────────────────────────
// Quem não tem hábito nenhum não precisa de análise — precisa de
// um começo. Aqui o ORVAX reconhece que não tem dado, em vez de
// fingir que tem.
function semDadosAinda(s) {
    if (s.temHabitos) return null;
    return {
        id: `sem-habitos:${s.hoje.slice(0, 7)}`,
        tipo: 'recomendacao',
        peso: 40,
        titulo: 'Ainda não tenho o que analisar',
        corpo: 'Você não tem nenhum hábito ativo, então qualquer leitura minha sobre sua rotina seria chute. Um hábito só já me dá o suficiente para começar a enxergar padrão.',
        acoes: [
            { rotulo: 'Criar o primeiro', tipo: 'abrir_criacao', dados: {}, primaria: true },
            { rotulo: 'Agora não', tipo: 'dispensar' },
        ],
    };
}

export const REGRAS = [
    sequenciaEmRisco,
    marcoAlcancado,
    comecaENaoTermina,
    habitoAbandonado,
    acumuloDeTarefas,
    gastoConcentrado,
    semDadosAinda,
];

/** Roda todas as regras e devolve as intervenções candidatas. */
export function avaliarRegras(sinais) {
    const achados = [];
    for (const regra of REGRAS) {
        try {
            const r = regra(sinais);
            if (r) achados.push(r);
        } catch (e) {
            // Uma regra com defeito não pode derrubar a presença inteira.
            console.warn('[orvax] regra falhou:', regra.name, e?.message);
        }
    }
    return achados.sort((a, b) => b.peso - a.peso);
}
