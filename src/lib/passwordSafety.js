// ============================================================
// ORVAX — recusa de senhas já vazadas (HaveIBeenPwned)
//
// Faz de graça o que o Supabase cobra no plano Pro ("Prevent use
// of leaked passwords"). Mesma fonte de dados, mesma técnica.
//
// k-ANONYMITY — a senha NUNCA sai do aparelho:
//   1. calcula o SHA-1 da senha localmente;
//   2. envia só os 5 PRIMEIROS caracteres do hash;
//   3. a API devolve todos os hashes com aquele prefixo (~800);
//   4. a comparação acontece aqui, em memória.
// O serviço não tem como saber qual das ~800 senhas é a sua.
// O header Add-Padding faz a resposta vir com iscas, para que nem
// o TAMANHO da resposta entregue alguma informação.
//
// FALHA ABERTA de propósito: se a API cair, estiver lenta ou o
// aparelho não tiver Web Crypto, a senha passa. Bloquear cadastro
// por indisponibilidade de um serviço externo seria pior que o
// risco que estamos evitando.
// ============================================================

const HIBP_RANGE = 'https://api.pwnedpasswords.com/range/';
const TIMEOUT_MS = 4000;

async function sha1Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Quantas vezes essa senha apareceu em vazamentos públicos.
 * @returns {Promise<number>} 0 = não encontrada (ou checagem indisponível)
 */
export async function pwnedCount(password) {
  if (!password) return 0;
  // Web Crypto exige contexto seguro. No Capacitor a origem é https,
  // então existe; num http:// de dev, não — e aí só não checamos.
  if (!globalThis.crypto?.subtle) return 0;

  let hash;
  try {
    hash = await sha1Hex(password);
  } catch {
    return 0;
  }
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(HIBP_RANGE + prefix, {
      headers: { 'Add-Padding': 'true' },
      signal: ctrl.signal,
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split('\n')) {
      const [suf, count] = line.trim().split(':');
      // As linhas de padding vêm com contagem 0 — não são vazamento real.
      if (suf === suffix) return parseInt(count, 10) || 0;
    }
    return 0;
  } catch {
    return 0;   // rede fora / timeout: não trava o usuário
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Valida a senha antes de gravar. Lança Error com texto pronto de exibir.
 * @param {string} password
 * @param {{ minLength?: number, tooShort?: string, leaked?: string }} msgs
 */
export async function assertPasswordSafe(password, msgs = {}) {
  const min = msgs.minLength ?? 8;
  if (!password || password.length < min) {
    throw new Error(msgs.tooShort || `A senha precisa de ao menos ${min} caracteres.`);
  }
  if (await pwnedCount(password) > 0) {
    throw new Error(
      msgs.leaked ||
      'Essa senha já apareceu em vazamentos públicos. Escolha outra — é o primeiro palpite de quem tenta invadir contas.',
    );
  }
}
