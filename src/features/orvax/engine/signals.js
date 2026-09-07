// =============================================================
// ORVAX · Presença — SINAIS
//
// Primeira camada: transforma o banco em FATOS. Nada de opinião
// aqui, nada de texto para o usuário — só números que as regras
// vão interpretar depois.
//
// A separação importa: quando o ORVAX afirma "você abandonou 3
// missões depois de começar", esse 3 precisa ter vindo de uma
// contagem real e rastreável. Se sinal e julgamento morassem no
// mesmo lugar, seria fácil o texto dizer uma coisa e o dado outra
// — que é exatamente como um mentor perde credibilidade.
// =============================================================
import { listHabitsWithTodayStatus, getRecentHabitLogs } from '../../../services/habits';
import { getTasks, getTransactions, getDashboard } from '../../../services/db';
import { toLocalDateStr } from '../../../utils/dateUtils';

/** Dias entre duas datas YYYY-MM-DD, sem passar por fuso. */
function diasEntre(aStr, bStr) {
    const [ay, am, ad] = aStr.split('-').map(Number);
    const [by, bm, bd] = bStr.split('-').map(Number);
    const a = Date.UTC(ay, am - 1, ad);
    const b = Date.UTC(by, bm - 1, bd);
    return Math.round((b - a) / 86400000);
}

/** YYYY-MM-DD de um timestamp, no fuso LOCAL (não UTC). */
function diaLocalDe(ts) {
    return toLocalDateStr(new Date(ts));
}

/**
 * Sequência atual de um hábito: quantos dias seguidos, terminando
 * hoje ou ontem. Termina em ontem = "em risco" (ainda dá pra salvar
 * hoje); terminou antes = sequência já quebrada.
 */
function calcularSequencia(diasFeitos, hoje) {
    if (!diasFeitos.size) return { tamanho: 0, ultimoDia: null };
    const ordenados = [...diasFeitos].sort().reverse();
    const ultimoDia = ordenados[0];
    const distancia = diasEntre(ultimoDia, hoje);
    if (distancia > 1) return { tamanho: 0, ultimoDia }; // já quebrou

    let tamanho = 1;
    for (let i = 1; i < ordenados.length; i++) {
        if (diasEntre(ordenados[i], ordenados[i - 1]) === 1) tamanho++;
        else break;
    }
    return { tamanho, ultimoDia };
}

/**
 * Coleta tudo de uma vez. As consultas vão em paralelo porque isto
 * roda na abertura do app — não pode custar segundos.
 *
 * @returns {Promise<object|null>} null quando não há sessão.
 */
export async function coletarSinais() {
    const hoje = toLocalDateStr();

    const [habitos, logs, tarefasHoje, transacoes, painel] = await Promise.all([
        listHabitsWithTodayStatus().catch(() => []),
        getRecentHabitLogs(60).catch(() => []),
        getTasks(hoje).catch(() => []),
        getTransactions('MES').catch(() => []),
        getDashboard().catch(() => null),
    ]);

    // ── Hábitos: sequência e abandono, por hábito ──────────────
    const diasPorHabito = new Map();
    for (const log of logs) {
        const dia = diaLocalDe(log.logged_at);
        if (!diasPorHabito.has(log.habit_id)) diasPorHabito.set(log.habit_id, new Set());
        diasPorHabito.get(log.habit_id).add(dia);
    }

    const habitosDetalhados = habitos.map((h) => {
        const dias = diasPorHabito.get(h.id) || new Set();
        const { tamanho, ultimoDia } = calcularSequencia(dias, hoje);
        return {
            id: h.id,
            titulo: h.title,
            pilar: h.pillar,
            feitoHoje: !!h.done_today,
            sequencia: tamanho,
            ultimoDia,
            diasSemFazer: ultimoDia ? diasEntre(ultimoDia, hoje) : null,
            totalDias30: [...dias].filter((d) => diasEntre(d, hoje) <= 30).length,
        };
    });

    // ── Tarefas de hoje ────────────────────────────────────────
    const estadoDe = (t) => String(t.state || '').toLowerCase();
    const concluidas = tarefasHoje.filter((t) => ['completed', 'done'].includes(estadoDe(t)));
    const emAndamento = tarefasHoje.filter((t) => estadoDe(t) === 'active');
    const pendentes = tarefasHoje.filter((t) => estadoDe(t) === 'pending');

    // ── Finanças do mês, por categoria ─────────────────────────
    const gastosPorCategoria = new Map();
    let totalGasto = 0;
    for (const t of transacoes) {
        if (t.type !== 'out') continue;
        const v = Number(t.amount) || 0;
        totalGasto += v;
        const cat = t.category || 'Outros';
        gastosPorCategoria.set(cat, (gastosPorCategoria.get(cat) || 0) + v);
    }

    const agora = new Date();

    return {
        hoje,
        horaLocal: agora.getHours(),
        // Quanto do dia já passou — usado para não cobrar de manhã
        // uma coisa que a pessoa ainda tem o dia inteiro pra fazer.
        fracaoDoDia: (agora.getHours() * 60 + agora.getMinutes()) / 1440,

        habitos: habitosDetalhados,
        temHabitos: habitosDetalhados.length > 0,

        tarefas: {
            total: tarefasHoje.length,
            concluidas: concluidas.length,
            emAndamento: emAndamento.length,
            pendentes: pendentes.length,
            listaPendentes: pendentes.map((t) => ({ id: t.id, titulo: t.title, hora: t.time_start })),
            listaEmAndamento: emAndamento.map((t) => ({ id: t.id, titulo: t.title, hora: t.time_start })),
        },

        financas: {
            totalGastoMes: totalGasto,
            porCategoria: [...gastosPorCategoria.entries()]
                .map(([categoria, valor]) => ({ categoria, valor }))
                .sort((a, b) => b.valor - a.valor),
            qtdTransacoes: transacoes.length,
        },

        xp: painel?.xp ?? null,
        streakDias: painel?.streak_days ?? null,

        // Quantidade de dado disponível. Regra que precisa de
        // histórico não deve opinar sobre quem começou ontem — é
        // assim que se evita o mentor inventando padrão onde não há.
        maturidade: {
            diasComLog: new Set(logs.map((l) => diaLocalDe(l.logged_at))).size,
            temHistoricoSuficiente: new Set(logs.map((l) => diaLocalDe(l.logged_at))).size >= 7,
        },
    };
}
