// =============================================================
// ORVAX — Normalização do tipo de transação
//
// Convenção CANÔNICA do banco: 'in' (receita) | 'out' (despesa).
// É o que o agente WhatsApp (agent/index.ts), o n8n e o RPC
// get_aspect_dashboard usam. Versões antigas do front gravaram
// 'income'/'expense' — estes helpers aceitam as duas formas na
// leitura, e toda escrita nova deve converter com toDbTxType().
// =============================================================

export const isIncomeTx = (t) => t?.type === 'in' || t?.type === 'income';
export const isExpenseTx = (t) => t?.type === 'out' || t?.type === 'expense';

/** 'income'|'in' → 'in' · 'expense'|'out' → 'out' */
export const toDbTxType = (type) =>
    type === 'in' || type === 'income' ? 'in' : 'out';
