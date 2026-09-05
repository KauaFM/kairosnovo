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

const NOMES_MES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const NOMES_MES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Rótulo curto de mês (ex.: "ago") a partir de uma string "YYYY-MM".
 *
 * NÃO usa `new Date(str)`: um valor "YYYY-MM-01" sem hora é interpretado
 * como meia-noite UTC, e toLocaleDateString devolve o mês no fuso LOCAL —
 * em Brasília (UTC-3) isso empurra a data pro dia anterior, e perto da
 * virada do mês o rótulo sai errado (mostra o mês passado). Ver o mesmo
 * problema documentado no topo deste arquivo (BUG #11).
 *
 * @param {string} yyyyMm - "YYYY-MM"
 * @param {'pt'|'en'} [lang]
 * @returns {string}
 */
export const monthLabelFromYYYYMM = (yyyyMm, lang = 'pt') => {
    const mes = parseInt(String(yyyyMm).slice(5, 7), 10);
    if (!mes || mes < 1 || mes > 12) return '';
    const nomes = lang === 'en' ? NOMES_MES_EN : NOMES_MES_PT;
    return nomes[mes - 1];
};
