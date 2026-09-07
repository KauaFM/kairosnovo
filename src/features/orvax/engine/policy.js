// =============================================================
// ORVAX · Presença — POLÍTICA DE INTERRUPÇÃO
//
// As regras dizem O QUE existe. Esta camada decide SE e QUANDO
// dizer. É deliberadamente separada, porque são perguntas de
// natureza diferente: "isso é verdade?" não é a mesma coisa que
// "isso merece interromper agora?".
//
// O silêncio é o comportamento padrão. Um mentor que fala toda vez
// que você abre a porta vira barulho, e barulho a pessoa aprende a
// ignorar — inclusive quando ele finalmente tem algo urgente. Cada
// aparição gasta um pouco da atenção que ele tem disponível, então
// o motor prefere não usá-la.
//
// Estado mora no localStorage: é preferência de ritmo, individual
// por aparelho, e não vale ocupar o banco com isso.
// =============================================================

const CHAVE = 'orvax_presenca_v1';

// No máximo isto de intervenções por dia. Passou disso, o ORVAX
// cala a boca até amanhã, mesmo tendo o que dizer.
const TETO_DIARIO = 3;
// Intervalo mínimo entre duas aparições (ms).
const INTERVALO_MIN_MS = 3 * 60 * 60 * 1000; // 3h
// Peso mínimo para valer a pena interromper.
const PESO_MINIMO = 40;
// Depois de dispensada, a mesma intervenção não volta por este tempo.
const SILENCIO_APOS_DISPENSA_MS = 20 * 60 * 60 * 1000; // ~1 dia
// Madrugada: nem urgência justifica.
const HORA_INICIO = 7;
const HORA_FIM = 23;

function ler() {
    try {
        const bruto = localStorage.getItem(CHAVE);
        if (!bruto) return { historico: [], dispensadas: {} };
        const o = JSON.parse(bruto);
        return { historico: o.historico || [], dispensadas: o.dispensadas || {} };
    } catch {
        return { historico: [], dispensadas: {} };
    }
}

function gravar(estado) {
    try {
        // Só o passado recente interessa; o resto é lixo acumulando.
        const limite = Date.now() - 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem(CHAVE, JSON.stringify({
            historico: (estado.historico || []).filter((h) => h.em > limite).slice(-40),
            dispensadas: Object.fromEntries(
                Object.entries(estado.dispensadas || {}).filter(([, em]) => em > limite)
            ),
        }));
    } catch { /* modo privado: a presença funciona, só não lembra */ }
}

/** Registra que uma intervenção foi mostrada. */
export function registrarExibicao(intervencao) {
    const e = ler();
    e.historico.push({ id: intervencao.id, tipo: intervencao.tipo, em: Date.now() });
    gravar(e);
}

/** Registra que a pessoa dispensou — não insiste tão cedo. */
export function registrarDispensa(intervencao) {
    const e = ler();
    e.dispensadas[intervencao.id] = Date.now();
    gravar(e);
}

/** Registra que a pessoa AGIU. Sinal de que aquilo era útil. */
export function registrarAcao(intervencao, tipoAcao) {
    const e = ler();
    e.historico.push({ id: intervencao.id, tipo: intervencao.tipo, acao: tipoAcao, em: Date.now() });
    gravar(e);
}

/**
 * O coração: escolhe UMA intervenção, ou nenhuma.
 *
 * Devolve sempre um motivo junto, porque "por que o ORVAX ficou
 * calado?" precisa ser uma pergunta respondível — sem isso, depurar
 * comportamento proativo vira adivinhação.
 *
 * @param {Array} candidatas — saída de avaliarRegras(), já ordenada
 * @param {{hora:number}} ctx
 */
export function decidirIntervencao(candidatas, ctx = {}) {
    const agora = Date.now();
    const hora = ctx.hora ?? new Date().getHours();
    const { historico, dispensadas } = ler();

    if (hora < HORA_INICIO || hora >= HORA_FIM) {
        return { intervencao: null, motivo: 'fora do horário' };
    }

    const hojeISO = new Date().toDateString();
    const exibidasHoje = historico.filter((h) => !h.acao && new Date(h.em).toDateString() === hojeISO);
    if (exibidasHoje.length >= TETO_DIARIO) {
        return { intervencao: null, motivo: `teto diário atingido (${TETO_DIARIO})` };
    }

    const ultima = historico.filter((h) => !h.acao).sort((a, b) => b.em - a.em)[0];
    if (ultima && agora - ultima.em < INTERVALO_MIN_MS) {
        const faltamMin = Math.ceil((INTERVALO_MIN_MS - (agora - ultima.em)) / 60000);
        return { intervencao: null, motivo: `intervalo mínimo (faltam ${faltamMin} min)` };
    }

    for (const c of candidatas) {
        if (c.peso < PESO_MINIMO) continue;
        const dispensadaEm = dispensadas[c.id];
        if (dispensadaEm && agora - dispensadaEm < SILENCIO_APOS_DISPENSA_MS) continue;
        // Celebração é a única que pode repetir o id sem cooldown de
        // exibição — mas o id já carrega o marco, então cada número
        // só acontece uma vez na vida daquele hábito.
        if (historico.some((h) => h.id === c.id && !h.acao)) continue;
        return { intervencao: c, motivo: 'ok' };
    }

    return { intervencao: null, motivo: candidatas.length ? 'nada relevante o bastante' : 'nenhum sinal' };
}

/** Para a tela de diagnóstico — deixa o comportamento auditável. */
export function lerEstado() {
    return { ...ler(), limites: { TETO_DIARIO, INTERVALO_MIN_MS, PESO_MINIMO, HORA_INICIO, HORA_FIM } };
}

/** Usado nos testes e no botão de reset da tela de diagnóstico. */
export function limparEstado() {
    try { localStorage.removeItem(CHAVE); } catch { /* ignora */ }
}
