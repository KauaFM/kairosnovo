// =============================================================
// ORVAX — dados BRUTOS de uma dimensão
//
// O adapter (buildPillarData) devolve o pilar já digerido: score,
// deltas, séries agregadas. Serve para os gráficos que já existiam,
// mas não dá para calcular padrão de horário, sequência real ou a
// composição por hábito — para isso é preciso o registro cru, com
// data e hora de cada um.
//
// Este hook busca esse cru UMA vez por dimensão. Todas as janelas
// do seletor de período (7/30/90/365) são recortes em memória do
// mesmo array, então trocar de período não volta ao banco.
// =============================================================
import { useState, useEffect } from 'react';
import { listHabits, getRecentHabitLogs } from '../../../services/habits';
import { HABIT_PILLAR_TO_COMPASS } from '../compass/pillarMapping';

/** habit.pillar ('foco', 'saude'...) → slug do Compass ('mind'...). */
function slugDoHabito(pillar) {
    if (!pillar) return null;
    return HABIT_PILLAR_TO_COMPASS[String(pillar).toLowerCase()] || null;
}

export function useDimensaoBruta(slug) {
    const [estado, setEstado] = useState({ habitos: [], logs: [], pronto: false, carregando: true });

    useEffect(() => {
        let vivo = true;
        if (!slug) return;

        (async () => {
            setEstado((e) => ({ ...e, carregando: true }));
            try {
                const [todos, todosLogs] = await Promise.all([
                    listHabits({ onlyActive: true }).catch(() => []),
                    getRecentHabitLogs(365).catch(() => []),
                ]);
                if (!vivo) return;

                const doPilar = (todos || []).filter((h) => slugDoHabito(h.pillar) === slug);
                const ids = new Set(doPilar.map((h) => h.id));
                const logs = (todosLogs || []).filter((l) => ids.has(l.habit_id));

                setEstado({
                    habitos: doPilar,
                    logs,
                    // `pronto` só é true quando há hábito ligado a esta
                    // dimensão. Dimensões que não vêm de hábito (finanças,
                    // metas) não devem renderizar a análise — mostrariam
                    // vazio permanente sem explicação.
                    pronto: doPilar.length > 0,
                    carregando: false,
                });
            } catch {
                if (vivo) setEstado({ habitos: [], logs: [], pronto: false, carregando: false });
            }
        })();

        return () => { vivo = false; };
    }, [slug]);

    return estado;
}
