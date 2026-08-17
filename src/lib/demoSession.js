// ============================================================
// ORVAX — Amostra de 15 minutos
//
// A Landing Page manda o visitante para /?demo=1. Aqui a gente entra
// numa CONTA DE DEMONSTRAÇÃO já semeada com dados, para o app parecer
// vivo em vez de vazio — app vazio converte pior que nenhuma amostra.
//
// Por que uma conta real e não dados falsos: 60 arquivos do app falam
// com o Supabase direto, sem um funil único onde interceptar. Com conta
// de verdade, o app roda exatamente como roda para um assinante.
//
// O prazo é contado NO NAVEGADOR, não no banco: a conta é compartilhada
// entre os visitantes, então um prazo no banco seria o mesmo para todos.
// Dá para burlar limpando o armazenamento — e tudo bem. Isto é vitrine,
// não cobrança. O que precisa estar trancado está trancado no servidor:
// as Edge Functions de IA recusam qualquer plano que não seja 'completo',
// então nenhuma demo gasta OpenAI.
// ============================================================
import { supabase } from './supabase';

const KEY = 'orvax_demo_inicio';
export const DEMO_MS = 15 * 60 * 1000;

const EMAIL = import.meta.env.VITE_DEMO_EMAIL || '';
const SENHA = import.meta.env.VITE_DEMO_PASSWORD || '';

/** A LP pediu a demonstração? (/?demo=1) */
export function demoPedida() {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('demo') === '1';
}

/** Está rodando uma demonstração agora? */
export function emDemo() {
    try {
        return Boolean(sessionStorage.getItem(KEY));
    } catch {
        return false;
    }
}

/** Quanto falta, em ms. 0 = acabou (ou não é demo). */
export function msRestantes() {
    try {
        const inicio = Number(sessionStorage.getItem(KEY));
        if (!inicio) return 0;
        return Math.max(0, inicio + DEMO_MS - Date.now());
    } catch {
        return 0;
    }
}

/** Configurada? Sem as credenciais no build, o botão da LP não deve existir. */
export function demoDisponivel() {
    return Boolean(EMAIL && SENHA);
}

/**
 * Entra na conta de demonstração e liga o cronômetro.
 * @returns {Promise<boolean>} true se entrou
 */
export async function iniciarDemo() {
    if (!demoDisponivel()) {
        console.warn('[demo] VITE_DEMO_EMAIL/VITE_DEMO_PASSWORD ausentes no build');
        return false;
    }
    const { error } = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: SENHA,
    });
    if (error) {
        console.warn('[demo] falha ao entrar:', error.message);
        return false;
    }
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* aba anônima */ }
    return true;
}

/** Encerra: desliga o cronômetro e sai da conta. */
export async function encerrarDemo() {
    try { sessionStorage.removeItem(KEY); } catch { /* ignora */ }
    // Limpa a URL para um F5 não reiniciar a amostra sem querer.
    try {
        const u = new URL(window.location.href);
        u.searchParams.delete('demo');
        window.history.replaceState({}, '', u.toString());
    } catch { /* ignora */ }
    await supabase.auth.signOut();
}
