// ============================================================
// ORVAX — Estimador de XP via OpenAI gpt-4o-mini
//
// O usuário NÃO define XP manualmente. O Agente avalia a
// complexidade real daquela tarefa/hábito/meta e atribui XP.
//
// Escala:
//   1-5   → Trivial (beber água, responder mensagem rápida)
//   6-15  → Leve (tarefa curta, <15min)
//   16-30 → Moderado (bloco de foco, treino comum, estudo 1h)
//   31-50 → Intenso (deep work 2h+, treino pesado, projeto)
//   51-80 → Excepcional (maratona, projeto de semana, protocolo extremo)
// ============================================================

const SYSTEM_PROMPT = `Você é o ORVAX, avaliador matemático de complexidade.
Dado o título de um hábito, tarefa ou meta em português, retorne SOMENTE
um número inteiro de XP entre 1 e 80, baseado no esforço real esperado.

REGRAS:
- 1-5:   trivial (beber água, 1 página de leitura)
- 6-15:  leve (caminhada curta, tarefa <15min)
- 16-30: moderado (treino 45min, estudo 1h, bloco de foco)
- 31-50: intenso (deep work 2h+, treino pesado)
- 51-80: excepcional (projeto grande, maratona, protocolo extremo)

Responda APENAS com JSON: { "xp": <número> }`;

const FALLBACK_HEURISTIC = (text) => {
  const t = (text || '').toLowerCase();
  // Heurística rápida baseada em palavras-chave quando a IA falha
  if (/maratona|projeto|deep work|dissertação|tese/.test(t)) return 50;
  if (/treino pesado|musculação|crossfit|hiit/.test(t)) return 30;
  if (/treino|corrida|caminhada|ler livro|estud[ao]r/.test(t)) return 20;
  if (/meditar|diário|agua|água|alongamento/.test(t)) return 8;
  if (/responder|mensagem|email|curto/.test(t)) return 5;
  return 15; // padrão seguro
};

/**
 * Estima XP para um texto de hábito/tarefa/meta.
 * Nunca lança — sempre retorna um inteiro em [1, 80].
 */
export async function estimateXP(text) {
  const clean = (text || '').toString().trim();
  if (!clean) return 10;

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return FALLBACK_HEURISTIC(clean);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 40,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: clean },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('[xpEstimator] OpenAI falhou, usando heurística');
      return FALLBACK_HEURISTIC(clean);
    }

    const data = await response.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || '{}');
    const xp = Math.round(Number(parsed.xp));
    if (!Number.isFinite(xp) || xp < 1) return FALLBACK_HEURISTIC(clean);
    return Math.min(80, Math.max(1, xp));
  } catch (err) {
    console.warn('[xpEstimator] Exceção, usando heurística:', err);
    return FALLBACK_HEURISTIC(clean);
  }
}
