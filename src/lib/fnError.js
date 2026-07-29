// ============================================================
// ORVAX — leitura do erro de uma Edge Function
//
// Quando a função responde não-2xx, o supabase-js joga um
// FunctionsHttpError cujo `message` é sempre genérico
// ("Edge Function returned a non-2xx status code"). A mensagem
// de verdade está no CORPO — e em supabase-js v2.9x o `context`
// é um Response, então `error.context.body.error` (o padrão
// antigo) lê um ReadableStream e devolve undefined.
//
// Sem isso, "Você já analisou 25 fotos hoje" nunca chega na tela:
// o usuário vê o texto genérico e acha que o app quebrou.
// ============================================================

/**
 * Extrai a mensagem que o servidor mandou no corpo do erro.
 * @param {unknown} err erro devolvido por supabase.functions.invoke
 * @returns {Promise<{ message: string|null, status: number|null, code: string|null }>}
 */
export async function readFunctionError(err) {
  const ctx = err?.context;
  const status = ctx?.status ?? err?.status ?? null;

  let body = null;
  // v2.9x: context é um Response (só dá pra ler uma vez — clone antes)
  if (typeof ctx?.clone === 'function') {
    try { body = await ctx.clone().json(); } catch { /* corpo não é JSON */ }
  } else if (typeof ctx?.json === 'function') {
    try { body = await ctx.json(); } catch { /* idem */ }
  } else if (ctx?.body && typeof ctx.body === 'object') {
    body = ctx.body;   // versões antigas já entregavam parseado
  }

  return {
    message: body?.error ? String(body.error) : null,
    status,
    code: body?.code ? String(body.code) : null,
  };
}

/**
 * A mensagem pronta para exibir — a do servidor quando existe,
 * senão um fallback humano (nunca o texto genérico do supabase-js).
 */
export async function functionErrorMessage(err, fallback = 'Não consegui completar agora. Tente de novo.') {
  const { message, status } = await readFunctionError(err);
  if (message) return message;
  if (status === 401 || status === 403) return 'Sua sessão expirou. Entre de novo.';
  return fallback;
}
