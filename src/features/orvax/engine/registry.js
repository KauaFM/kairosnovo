// =============================================================
// ORVAX · REGISTRO DE AÇÕES — a fronteira de poder da IA
//
//   IA ─▶ REGISTRO ─▶ SERVICES ─▶ DOMÍNIO ─▶ BANCO
//
// O modelo nunca toca o banco. Ele só consegue pedir uma ação pelo
// NOME, e só existem os nomes que estão aqui. Tudo que não foi
// declarado neste arquivo é impossível de executar — não porque
// alguém esqueceu de implementar, mas porque não há caminho.
//
// ─── REGRA ABSOLUTA ──────────────────────────────────────────
// Nenhuma ação pode apagar tudo. Não existe apagar-conta,
// limpar-histórico, resetar-progresso, nem nada equivalente, e
// isso é verificado no carregamento do módulo (validarRegistro):
// se alguém no futuro adicionar uma ação com cara de destruição
// em massa, ou marcar `emMassa`, a aplicação recusa a subir em vez
// de silenciosamente ganhar esse poder.
//
// A escolha de falhar ALTO é deliberada. Uma trava que apenas
// avisa no console é uma trava que ninguém vê.
// =============================================================
import { checkInHabit, updateHabit, createHabit } from '../../../services/habits';
import { updateTask, createTask, updateTaskState } from '../../../services/db';
import { appEvents } from '../../../lib/events';
import { toLocalDateStr } from '../../../utils/dateUtils';

/** Nomes proibidos, casados por forma — não por lista fechada. */
const PADROES_PROIBIDOS = [
    /delete_?all/i, /wipe/i, /reset_?everything/i, /reset_?all/i,
    /drop_/i, /truncate/i, /purge/i, /apagar_?tudo/i, /limpar_?tudo/i,
    /destruir/i, /zerar_?tudo/i, /excluir_?conta/i, /delete_?account/i,
];

/**
 * Cada ação declara o que faz e o quanto pesa.
 *
 * escopo: 'um'  — mexe em UM registro identificado
 *         'poucos' — mexe em um punhado, delimitado e reversível
 * (não existe escopo 'todos'. É essa ausência que é a segurança.)
 *
 * confirmar: true — exige toque explícito da pessoa antes de rodar
 * reversivel: se dá pra desfazer sem perder informação
 */
export const ACOES = {
    marcar_habito: {
        rotulo: 'Marcar hábito como feito',
        escopo: 'um', confirmar: false, reversivel: true,
        executar: async ({ habitId }) => {
            const r = await checkInHabit(habitId, { quality: 4 });
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return 'Hábito marcado.';
        },
    },

    reduzir_habito: {
        rotulo: 'Reduzir a exigência de um hábito',
        escopo: 'um', confirmar: false, reversivel: true,
        executar: async ({ habitId }) => {
            const r = await updateHabit(habitId, { target_count: 1 });
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return 'Exigência reduzida.';
        },
    },

    arquivar_habito: {
        rotulo: 'Arquivar um hábito',
        // Some da lista, mas a linha e o histórico continuam no banco:
        // é ocultar, não destruir. Por isso reversível.
        escopo: 'um', confirmar: true, reversivel: true,
        executar: async ({ habitId }) => {
            const r = await updateHabit(habitId, { active: false });
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return 'Hábito arquivado (o histórico fica).';
        },
    },

    criar_habito: {
        rotulo: 'Criar um hábito',
        escopo: 'um', confirmar: true, reversivel: true,
        executar: async ({ titulo, pilar = 'disciplina' }) => {
            const r = await createHabit({ title: titulo, pillar: pilar, frequency: 'daily', target_count: 1 });
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return `Hábito "${titulo}" criado.`;
        },
    },

    criar_tarefa: {
        rotulo: 'Criar uma tarefa',
        escopo: 'um', confirmar: false, reversivel: true,
        executar: async ({ titulo, data, hora = '09:00' }) => {
            const r = await createTask({
                title: titulo, scheduled_date: data || toLocalDateStr(),
                time_start: hora, category: 'PESSOAL', duration: '1h', state: 'pending',
            });
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'TASK_CHANGED' });
            return `Tarefa "${titulo}" criada.`;
        },
    },

    concluir_tarefa: {
        rotulo: 'Concluir uma tarefa',
        escopo: 'um', confirmar: false, reversivel: true,
        executar: async ({ tarefaId }) => {
            const r = await updateTaskState(tarefaId, 'completed');
            if (r?.error) throw new Error(r.error.message);
            appEvents.emit({ type: 'TASK_CHANGED' });
            return 'Tarefa concluída.';
        },
    },

    adiar_tarefas: {
        rotulo: 'Mover tarefas para outro dia',
        // O teto de 12 não é decoração: delimita o estrago máximo de
        // uma decisão errada. E mover não apaga — o pior caso é a
        // pessoa arrastar de volta.
        escopo: 'poucos', confirmar: true, reversivel: true, maximo: 12,
        executar: async ({ ids = [], para }) => {
            if (ids.length > 12) throw new Error('Limite de 12 tarefas por vez.');
            const destino = para || toLocalDateStr(new Date(Date.now() + 86400000));
            let n = 0;
            for (const id of ids) {
                const r = await updateTask(id, { scheduled_date: destino });
                if (!r?.error) n++;
            }
            appEvents.emit({ type: 'TASK_CHANGED' });
            return `${n} ${n === 1 ? 'tarefa movida' : 'tarefas movidas'}.`;
        },
    },
};

/**
 * Roda no import. Falha ALTO quando alguém introduz poder demais —
 * uma verificação que só loga no console é uma verificação que
 * ninguém lê.
 */
export function validarRegistro(acoes = ACOES) {
    const erros = [];
    for (const [nome, a] of Object.entries(acoes)) {
        if (PADROES_PROIBIDOS.some((re) => re.test(nome))) {
            erros.push(`"${nome}": nome de ação com forma de destruição em massa.`);
        }
        if (a.escopo === 'todos' || a.emMassa) {
            erros.push(`"${nome}": escopo em massa não é permitido para a IA.`);
        }
        if (a.escopo === 'poucos' && !(a.maximo > 0 && a.maximo <= 20)) {
            erros.push(`"${nome}": escopo 'poucos' exige maximo entre 1 e 20.`);
        }
        if (typeof a.executar !== 'function') {
            erros.push(`"${nome}": sem função executar.`);
        }
    }
    if (erros.length) {
        throw new Error('[ORVAX/registro] limites de segurança violados:\n' + erros.join('\n'));
    }
    return true;
}

validarRegistro();

/** Única porta de saída. Nome desconhecido não executa nada. */
export async function executarDoRegistro(nome, args = {}) {
    const acao = ACOES[nome];
    if (!acao) return { ok: false, mensagem: `Ação não permitida: ${nome}` };
    try {
        const mensagem = await acao.executar(args);
        return { ok: true, mensagem };
    } catch (e) {
        return { ok: false, mensagem: e?.message || 'Falhou.' };
    }
}

/** O que a IA pode pedir — para montar as ferramentas do modelo. */
export function listarAcoes() {
    return Object.entries(ACOES).map(([nome, a]) => ({
        nome, rotulo: a.rotulo, escopo: a.escopo, confirmar: !!a.confirmar, reversivel: !!a.reversivel,
    }));
}
