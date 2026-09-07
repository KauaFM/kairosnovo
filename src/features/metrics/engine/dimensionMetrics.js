// =============================================================
// ORVAX · MOTOR DE MÉTRICAS DA DIMENSÃO
//
// Por que este arquivo existe:
//
// O adapter atual encerra com `as unknown as PillarData` — um cast
// que desliga o TypeScript. O tipo promete 29 campos; o objeto
// entrega ~23. `prediction`, `scatter`, `lifetimeMilestones`,
// `recurringDistraction` e `sankey` não são calculados em lugar
// nenhum, e `scorePrev`/`axesPast` são zero fixo com um comentário
// "for now". Eram campos fantasmas: a tela não os mostrava porque
// não havia o que mostrar.
//
// Aqui as métricas são DERIVADAS de dado real (habits +
// habit_logs), e cada uma responde a uma pergunta que a pessoa
// realmente faz. Quando não há base suficiente, a função devolve
// null e a tela diz isso — em vez de desenhar um gráfico bonito
// sobre nada.
//
//   BANCO ─▶ SERVIÇO ─▶ ESTE MOTOR ─▶ UI
//
// Nada aqui inventa número. Se a conta não fecha, não sai.
// =============================================================
import { toLocalDateStr } from '../../../utils/dateUtils';

/** YYYY-MM-DD no fuso LOCAL (nunca UTC — ver dateUtils, BUG #11). */
const diaDe = (ts) => toLocalDateStr(new Date(ts));

const diffDias = (aStr, bStr) => {
    const [ay, am, ad] = aStr.split('-').map(Number);
    const [by, bm, bd] = bStr.split('-').map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

/**
 * Prepara os logs de uma dimensão uma única vez. Todas as funções
 * abaixo consomem este resultado — evita varrer o array de novo a
 * cada métrica, o que numa lista de 365 dias × N hábitos importa.
 */
export function prepararSerie(logs = [], hoje = toLocalDateStr()) {
    const porDia = new Map();      // 'YYYY-MM-DD' → contagem
    const porHora = new Array(24).fill(0);
    const porDiaSemana = new Array(7).fill(0);

    for (const l of logs) {
        const d = new Date(l.logged_at);
        const dia = diaDe(l.logged_at);
        porDia.set(dia, (porDia.get(dia) || 0) + 1);
        porHora[d.getHours()] += 1;
        porDiaSemana[d.getDay()] += 1;
    }
    return { porDia, porHora, porDiaSemana, hoje, total: logs.length };
}

/** Dias com pelo menos um registro dentro dos últimos N dias. */
function diasAtivosEm(serie, dias) {
    let n = 0;
    for (const [dia, c] of serie.porDia) {
        if (c > 0 && diffDias(dia, serie.hoje) < dias) n++;
    }
    return n;
}

/**
 * COMPARAÇÃO DE PERÍODOS — a pergunta "melhorei ou piorei?".
 *
 * Devolve pontos ABSOLUTOS além do percentual: quando a base é
 * pequena (3 dias → 4 dias), "+33%" engana e "+1 dia" informa. A
 * tela escolhe qual usar conforme o tamanho da base.
 */
export function compararPeriodos(serie, dias) {
    const atual = diasAtivosEm(serie, dias);
    let anterior = 0;
    for (const [dia, c] of serie.porDia) {
        const d = diffDias(dia, serie.hoje);
        if (c > 0 && d >= dias && d < dias * 2) anterior++;
    }
    const temBase = anterior > 0 || atual > 0;
    return {
        atual,
        anterior,
        deltaAbsoluto: atual - anterior,
        deltaPct: anterior > 0 ? Math.round(((atual - anterior) / anterior) * 100) : null,
        taxaAtual: Math.round((atual / dias) * 100),
        taxaAnterior: Math.round((anterior / dias) * 100),
        // Base pequena demais para percentual dizer algo honesto.
        percentualConfiavel: anterior >= 5,
        temBase,
    };
}

/**
 * SEQUÊNCIAS — atual e melhor de todas. É a métrica que a pessoa
 * mais sente, e a que o produto inteiro tenta proteger.
 */
export function sequencias(serie) {
    const dias = [...serie.porDia.keys()].filter((d) => serie.porDia.get(d) > 0).sort();
    if (!dias.length) return { atual: 0, melhor: 0, fimDaMelhor: null };

    let melhor = 1, corrente = 1, fimDaMelhor = dias[0];
    for (let i = 1; i < dias.length; i++) {
        if (diffDias(dias[i - 1], dias[i]) === 1) {
            corrente++;
            if (corrente > melhor) { melhor = corrente; fimDaMelhor = dias[i]; }
        } else corrente = 1;
    }

    // A sequência ATUAL só vale se terminar hoje ou ontem — senão já
    // quebrou, e mostrá-la como viva seria mentir para a pessoa.
    const ultimo = dias[dias.length - 1];
    const distancia = diffDias(ultimo, serie.hoje);
    let atual = 0;
    if (distancia <= 1) {
        atual = 1;
        for (let i = dias.length - 1; i > 0; i--) {
            if (diffDias(dias[i - 1], dias[i]) === 1) atual++;
            else break;
        }
    }
    return { atual, melhor, fimDaMelhor };
}

const NOMES_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * PADRÃO SEMANAL — "em que dias eu funciono?".
 * Só afirma quando há assimetria real: com 8 registros espalhados,
 * o "melhor dia" é ruído com nome bonito.
 */
export function padraoSemanal(serie) {
    const total = serie.porDiaSemana.reduce((a, b) => a + b, 0);
    if (total < 14) return { suficiente: false, dias: serie.porDiaSemana };

    const maxI = serie.porDiaSemana.indexOf(Math.max(...serie.porDiaSemana));
    const minI = serie.porDiaSemana.indexOf(Math.min(...serie.porDiaSemana));
    const media = total / 7;
    const acima = serie.porDiaSemana[maxI] / media;

    return {
        suficiente: true,
        dias: serie.porDiaSemana,
        melhorDia: NOMES_SEMANA[maxI],
        piorDia: NOMES_SEMANA[minI],
        // Menos de 40% acima da média não é padrão, é variação normal.
        assimetriaRelevante: acima >= 1.4,
        acimaDaMedia: Math.round((acima - 1) * 100),
    };
}

/**
 * PADRÃO DE HORÁRIO — "quando eu funciono?". A informação mais
 * acionável do conjunto: dá para agendar em cima dela.
 */
export function padraoHorario(serie) {
    const total = serie.porHora.reduce((a, b) => a + b, 0);
    if (total < 10) return { suficiente: false, horas: serie.porHora };

    const pico = serie.porHora.indexOf(Math.max(...serie.porHora));
    const faixa = pico < 6 ? 'madrugada' : pico < 12 ? 'manhã' : pico < 18 ? 'tarde' : 'noite';
    const naFaixa = serie.porHora.reduce((soma, n, h) => {
        const f = h < 6 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite';
        return f === faixa ? soma + n : soma;
    }, 0);

    return {
        suficiente: true,
        horas: serie.porHora,
        pico,
        faixa,
        concentracaoNaFaixa: Math.round((naFaixa / total) * 100),
    };
}

/**
 * MELHOR E PIOR SEMANA do período — dá ao gráfico um "quando",
 * que é o que transforma número em história.
 */
export function extremosSemanais(serie, dias = 90) {
    const semanas = new Map();
    for (const [dia, c] of serie.porDia) {
        const d = diffDias(dia, serie.hoje);
        if (d >= dias || c === 0) continue;
        const semana = Math.floor(d / 7);
        semanas.set(semana, (semanas.get(semana) || 0) + c);
    }
    if (semanas.size < 3) return null;

    const lista = [...semanas.entries()].sort((a, b) => b[1] - a[1]);
    const rotulo = (s) => (s === 0 ? 'esta semana' : s === 1 ? 'semana passada' : `${s} semanas atrás`);
    return {
        melhor: { quando: rotulo(lista[0][0]), registros: lista[0][1] },
        pior: { quando: rotulo(lista[lista.length - 1][0]), registros: lista[lista.length - 1][1] },
    };
}

/**
 * DETALHE POR HÁBITO — a base do drill-down: o score da dimensão
 * deixa de ser um número dado e passa a ter composição visível.
 */
export function porHabito(habitos = [], logs = [], dias = 30, hoje = toLocalDateStr()) {
    const dentro = logs.filter((l) => diffDias(diaDe(l.logged_at), hoje) < dias);
    const contagem = new Map();
    const ultimoDe = new Map();
    for (const l of dentro) {
        contagem.set(l.habit_id, (contagem.get(l.habit_id) || 0) + 1);
        const d = diaDe(l.logged_at);
        if (!ultimoDe.has(l.habit_id) || d > ultimoDe.get(l.habit_id)) ultimoDe.set(l.habit_id, d);
    }
    return habitos
        .map((h) => {
            const feitos = contagem.get(h.id) || 0;
            const ultimo = ultimoDe.get(h.id) || null;
            return {
                id: h.id,
                titulo: h.title,
                feitos,
                taxa: Math.round((feitos / dias) * 100),
                ultimoDia: ultimo,
                diasParado: ultimo ? diffDias(ultimo, hoje) : null,
            };
        })
        .sort((a, b) => b.feitos - a.feitos);
}

/**
 * Junta tudo. `dias` controla a janela — é o que o seletor de
 * período da tela altera sem refazer consulta ao banco: a série
 * inteira já está em memória.
 */
export function analisarDimensao({ habitos = [], logs = [], dias = 30 }) {
    const serie = prepararSerie(logs);
    const comp = compararPeriodos(serie, dias);
    return {
        serie,
        comparacao: comp,
        sequencias: sequencias(serie),
        semanal: padraoSemanal(serie),
        horario: padraoHorario(serie),
        extremos: extremosSemanais(serie, Math.max(dias, 28)),
        habitos: porHabito(habitos, logs, dias),
        // Abaixo disto, qualquer padrão é ruído com nome bonito.
        baseSuficiente: serie.total >= 10,
        totalRegistros: serie.total,
    };
}
