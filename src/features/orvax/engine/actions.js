// =============================================================
// ORVAX · Presença — AÇÕES
//
// O que separa este motor de um chatbot: cada botão executa uma
// mudança real no banco. Falar "você deveria reorganizar seu dia"
// é conselho; reorganizar quando a pessoa toca em REORGANIZAR é
// mentoria.
//
// Toda ação devolve { ok, mensagem } — a presença mostra o
// resultado no lugar do texto original, para a pessoa ver o que
// aconteceu sem precisar ir conferir em outra aba.
// =============================================================
import { checkInHabit, updateHabit } from '../../../services/habits';
import { updateTask } from '../../../services/db';
import { appEvents } from '../../../lib/events';
import { confirmDialog } from '../../../lib/dialog';
import { toLocalDateStr } from '../../../utils/dateUtils';

function amanha() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalDateStr(d);
}

/**
 * @param {object} acao        — { tipo, dados }
 * @param {object} sinais      — snapshot usado para decidir
 * @param {object} ganchos     — callbacks de navegação da UI
 */
export async function executarAcao(acao, sinais, ganchos = {}) {
    const d = acao.dados || {};

    switch (acao.tipo) {
        case 'dispensar':
            return { ok: true, mensagem: null, fechar: true };

        case 'marcar_habito': {
            const r = await checkInHabit(d.habitId, { quality: 4 });
            if (r?.error) return { ok: false, mensagem: `Não consegui marcar: ${r.error.message}` };
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return { ok: true, mensagem: `Feito. "${d.titulo}" marcado — sequência mantida.` };
        }

        case 'reduzir_habito': {
            // A adaptação da especificação: em vez de cobrar mais, o
            // ORVAX diminui a exigência para o hábito voltar a caber
            // no dia. Recomeçar pequeno vence recomeçar perfeito.
            const r = await updateHabit(d.habitId, { target_count: 1 });
            if (r?.error) return { ok: false, mensagem: `Não consegui ajustar: ${r.error.message}` };
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return { ok: true, mensagem: `Reduzi "${d.titulo}" para a menor versão possível. Volta por aí — depois a gente aumenta.` };
        }

        case 'arquivar_habito': {
            // A única ação daqui que FAZ ALGO SUMIR da vista da pessoa.
            // O registro já a marcava como `confirmar: true`, mas este
            // caminho não respeitava isso: um toque tirava o hábito da
            // lista sem pergunta e sem desfazer fácil. Nada é apagado
            // (o histórico continua no banco), mas some da tela — e
            // sumir sem aviso é indistinguível de perder.
            const confirmou = await confirmDialog({
                title: 'Arquivar este hábito?',
                message: `"${d.titulo}" sai da sua lista. O histórico dele não é apagado, mas ele deixa de aparecer no dia a dia.`,
                confirmLabel: 'Arquivar',
                cancelLabel: 'Manter',
                danger: true,
            });
            if (!confirmou) return { ok: true, mensagem: null, fechar: false };

            const r = await updateHabit(d.habitId, { active: false });
            if (r?.error) return { ok: false, mensagem: `Não consegui arquivar: ${r.error.message}` };
            appEvents.emit({ type: 'HABIT_CHANGED' });
            return { ok: true, mensagem: `"${d.titulo}" saiu da sua lista. O histórico ficou guardado.` };
        }

        case 'reorganizar_dia': {
            // Mantém as N primeiras de hoje e empurra o resto para
            // amanhã. Escolha explícita: o ORVAX não apaga nada, só
            // muda de dia — desfazer continua possível.
            const manter = d.manter ?? 3;
            const aMover = (sinais?.tarefas?.listaPendentes || []).slice(manter);
            if (!aMover.length) return { ok: true, mensagem: 'Seu dia já está do tamanho certo.' };

            // Diz QUANTAS antes de mexer. O botão é explícito, mas a
            // pessoa não sabe o tamanho da mudança até ela acontecer —
            // e mudança em lote sem número é o tipo de coisa que faz
            // alguém achar que perdeu tarefa.
            const confirmou = await confirmDialog({
                title: `Mover ${aMover.length} ${aMover.length === 1 ? 'tarefa' : 'tarefas'} para amanhã?`,
                message: `As ${manter} primeiras ficam para hoje. Nada é apagado — só muda de dia, e você pode trazer de volta na agenda.`,
                confirmLabel: 'Reorganizar',
                cancelLabel: 'Cancelar',
            });
            if (!confirmou) return { ok: true, mensagem: null, fechar: false };

            let movidas = 0;
            for (const t of aMover) {
                const r = await updateTask(t.id, { scheduled_date: amanha() });
                if (!r?.error) movidas++;
            }
            appEvents.emit({ type: 'TASK_CHANGED' });
            return {
                ok: movidas > 0,
                mensagem: movidas
                    ? `Movi ${movidas} ${movidas === 1 ? 'tarefa' : 'tarefas'} para amanhã. Sobraram ${manter} para hoje — essas dá pra fechar.`
                    : 'Não consegui mover as tarefas agora.',
            };
        }

        case 'focar_uma': {
            ganchos.irPara?.('vault');
            return { ok: true, mensagem: 'Abri sua agenda. Escolhe uma e fecha ela antes de abrir outra.', fechar: true };
        }

        case 'abrir_capital':
            ganchos.irPara?.('vault');
            return { ok: true, mensagem: null, fechar: true };

        case 'abrir_criacao':
            ganchos.irPara?.('metrics');
            return { ok: true, mensagem: null, fechar: true };

        default:
            return { ok: false, mensagem: `Ação desconhecida: ${acao.tipo}` };
    }
}
