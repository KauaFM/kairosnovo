// ============================================================
// ORVAX — Cliente de IA agnóstico de provedor
//
// Usa o endpoint compatível-com-OpenAI do Google Gemini, então
// todo o código de chat/tool-calling continua no mesmo formato
// (messages, tools, tool_choice, response_format).
//
// Ordem de preferência:
//   1. Gemini  (VITE_GEMINI_API_KEY) — grátis em aistudio.google.com
//   2. OpenAI  (VITE_OPENAI_API_KEY) — fallback, se ainda houver saldo
//
// Chame `llmChat(body)` SEM `model` — o modelo é resolvido pelo
// provedor ativo (qualquer `model` no body é ignorado de propósito,
// pra um caller que peça 'gpt-4o-mini' não quebrar no Gemini).
// ============================================================

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: GEMINI_KEY,
    model: 'gemini-2.5-flash',
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    key: OPENAI_KEY,
    model: 'gpt-4o-mini',
  },
};

/** Nome do provedor ativo ('gemini' | 'openai') ou null se nenhum configurado. */
export function activeProvider() {
  if (GEMINI_KEY) return 'gemini';
  if (OPENAI_KEY) return 'openai';
  return null;
}

/** Há alguma IA configurada? */
export function llmAvailable() {
  return activeProvider() !== null;
}

const MISSING_KEY_MSG =
  'Nenhuma IA configurada. Gere uma chave gratuita do Gemini em ' +
  'aistudio.google.com e defina VITE_GEMINI_API_KEY no .env.';

/**
 * Chat completion no formato OpenAI. Resolve provedor + modelo.
 * Lança Error (com .status quando veio de HTTP) em falha.
 */
export async function llmChat(body = {}) {
  const name = activeProvider();
  if (!name) throw new Error(MISSING_KEY_MSG);

  const p = PROVIDERS[name];
  // ignora qualquer `model` vindo do caller — o provedor decide
  const { model: _ignore, ...rest } = body;
  const payload = { model: p.model, ...rest };

  // Gemini 2.5-flash "pensa" por padrão e consome o orçamento de
  // tokens antes de responder (retorna vazio com max_tokens baixo).
  // Desligar o thinking deixa o custo previsível e a resposta rápida.
  // reasoning_effort é específico do Gemini — não enviar pra OpenAI.
  if (name === 'gemini' && payload.reasoning_effort === undefined) {
    payload.reasoning_effort = 'none';
  }

  const res = await fetch(p.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `${name} ${res.status}`);
    err.status = res.status;
    err.provider = name;
    throw err;
  }
  return data;
}

/**
 * Parse tolerante de JSON vindo de LLM: aceita objeto puro ou
 * embrulhado em ```json ... ``` (o Gemini às vezes cerca mesmo em
 * modo JSON). Retorna null se não achar objeto válido.
 */
export function safeJsonParse(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch { /* tenta extrair abaixo */ }
  const match = String(content).match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* desiste */ }
  }
  return null;
}
