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
// Robustez: a disponibilidade por MODELO varia conforme o tier da
// chave (alguns respondem 404 "no longer available", outros 503 por
// carga). Por isso o Gemini tenta uma CASCATA de modelos, com retry
// em 429/5xx, e memoriza o primeiro que funcionar na sessão.
//
// Chame `llmChat(body)` SEM `model` — o provedor decide (qualquer
// `model` no body é ignorado de propósito).
// ============================================================

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// Cascata de modelos do Gemini (preferência decrescente). O primeiro
// que responder 200 é memorizado e passa a ser tentado primeiro.
const GEMINI_MODELS = [
  'gemini-flash-latest',       // alias estável — melhor qualidade quando disponível
  'gemini-3-flash-preview',    // Gemini 3 flash — rápido e capaz
  'gemini-flash-lite-latest',  // leve, alta disponibilidade
  'gemini-2.5-flash',          // fallback final
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Respostas do endpoint às vezes vêm embrulhadas em array ([{...}]).
const unwrap = (j) => (Array.isArray(j) ? j[0] : j);

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

// Uma requisição HTTP única. Retorna { ok, status, data }.
async function requestOnce(url, key, payload) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, status: 0, data: {} }; // erro de rede
  }
  const data = unwrap(await res.json().catch(() => ({})));
  return { ok: res.ok, status: res.status, data };
}

// Tenta um modelo com retry em 429/5xx/rede. Retorna { ok, status, data }.
async function tryModel(url, key, payload, retries = 2) {
  let last = { ok: false, status: 0, data: {} };
  for (let i = 0; i <= retries; i++) {
    last = await requestOnce(url, key, payload);
    if (last.ok) return last;
    const transient = last.status === 429 || last.status >= 500 || last.status === 0;
    if (!transient || i === retries) return last;
    await sleep(600 * (i + 1));
  }
  return last;
}

// Modelo do Gemini que funcionou por último nesta sessão.
let cachedGeminiModel = null;

async function chatGemini(rest) {
  const base = { ...rest };
  // Gemini "pensa" por padrão e consome o orçamento de tokens antes de
  // responder (vazio com max_tokens baixo). Desligar deixa previsível.
  if (base.reasoning_effort === undefined) base.reasoning_effort = 'none';

  // Ordem: modelo memorizado primeiro, depois o restante da cascata.
  const order = cachedGeminiModel
    ? [cachedGeminiModel, ...GEMINI_MODELS.filter((m) => m !== cachedGeminiModel)]
    : GEMINI_MODELS;

  let lastErr = null;
  for (const model of order) {
    const r = await tryModel(GEMINI_URL, GEMINI_KEY, { model, ...base });
    if (r.ok) {
      cachedGeminiModel = model; // memoriza o vencedor
      return r.data;
    }
    // 404/400 = modelo indisponível pra essa chave → tenta o próximo.
    // 429/5xx persistente após retry → também tenta o próximo modelo.
    lastErr = new Error(r.data?.error?.message || `gemini ${r.status}`);
    lastErr.status = r.status;
    // se foi o modelo memorizado que falhou, limpa o cache
    if (model === cachedGeminiModel) cachedGeminiModel = null;
  }
  throw lastErr || new Error('gemini indisponível');
}

async function chatOpenAI(rest) {
  const r = await tryModel(OPENAI_URL, OPENAI_KEY, { model: 'gpt-4o-mini', ...rest });
  if (r.ok) return r.data;
  const err = new Error(r.data?.error?.message || `openai ${r.status}`);
  err.status = r.status;
  throw err;
}

/**
 * Chat completion no formato OpenAI. Resolve provedor + modelo,
 * com cascata/retry no Gemini. Lança Error (com .status) em falha.
 */
export async function llmChat(body = {}) {
  const name = activeProvider();
  if (!name) throw new Error(MISSING_KEY_MSG);

  // ignora qualquer `model` vindo do caller — o provedor decide
  const { model: _ignore, ...rest } = body;

  return name === 'gemini' ? chatGemini(rest) : chatOpenAI(rest);
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
