// [BUG #11 FIX] Utilitários de data com suporte a fuso horário local.
// PROBLEMA: new Date().toISOString().split('T')[0] converte para UTC antes de
// extrair a data, causando data errada após 21:00 BRT (UTC-3).
// SOLUÇÃO: Usar getFullYear/getMonth/getDate que operam no fuso local.

/**
 * Retorna a data em formato YYYY-MM-DD usando o fuso horário LOCAL do usuário.
 * @param {Date} [date] - Opcional. Padrão: new Date() (agora).
 * @returns {string} "YYYY-MM-DD"
 */
export const toLocalDateStr = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Retorna a data de hoje em formato YYYY-MM-DD (fuso local).
 * @returns {string} "YYYY-MM-DD"
 */
export const todayLocalStr = () => toLocalDateStr(new Date());

/**
 * Retorna a data de N dias atrás em formato YYYY-MM-DD (fuso local).
 * @param {number} days
 * @returns {string} "YYYY-MM-DD"
 */
export const daysAgoLocalStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return toLocalDateStr(d);
};
