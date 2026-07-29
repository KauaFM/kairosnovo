import { supabase } from '../../../lib/supabase';
import { toLocalDateStr } from '../../../utils/dateUtils';
import { compressImage } from '../../../utils/imageCompression';
import { llmChat, llmAvailable, safeJsonParse } from '../../../services/llm';
import { readFunctionError } from '../../../lib/fnError';

const SYSTEM_PROMPT = `Você é uma API de análise nutricional de alta precisão.
Analise a imagem e identifique TODOS os alimentos visíveis.

REGRAS ESTRITAS:
1. Retorne APENAS um objeto JSON válido no formato { "items": [...] }. Zero texto fora do JSON.
2. Cada alimento tem: name (nome em português BR), quantity_g (gramas estimadas), calories (kcal), protein_g, carbs_g, fat_g, confidence (0.0 a 1.0).
3. Use a Tabela TACO (Tabela Brasileira de Composição de Alimentos) como referência.
4. Se a imagem não contém alimentos, retorne { "items": [] }.
5. Seja conservador. NÃO invente alimentos que não estão na imagem.
6. Arredonde macros para 1 casa decimal.`;

/**
 * Distingue "a função caiu" de "a função respondeu NÃO".
 * Cota estourada (429) e sessão expirada (401/403) são respostas legítimas
 * e precisam chegar ao usuário; qualquer outra falha pode tentar o fallback.
 * @returns {Promise<string|null>} a mensagem a exibir, ou null
 */
async function readBusinessError(err) {
  const { message, status } = await readFunctionError(err);
  if (status !== 429 && status !== 401 && status !== 403) return null;
  if (message) return message;
  return 'Sua sessão expirou. Entre de novo para usar o scanner.';
}

// Valida e limita os números (a IA pode alucinar / o RPC rejeita kcal > 9·gramas)
function toNum(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : fallback;
}

function sanitizeItems(raw) {
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const out = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const name = typeof it.name === 'string' ? it.name.trim() : '';
    if (!name) continue;
    const grams = Math.max(1, toNum(it.quantity_g, 100));
    out.push({
      name: name.slice(0, 120),
      quantity_g: grams,
      calories: Math.min(toNum(it.calories, 0), 9 * grams), // teto físico de gordura pura
      protein_g: toNum(it.protein_g, 0),
      carbs_g: toNum(it.carbs_g, 0),
      fat_g: toNum(it.fat_g, 0),
      confidence: Math.min(1, Math.max(0, toNum(it.confidence, 0.5))),
    });
  }
  return out;
}

// Fallback DEV: chama a IA (Gemini/OpenAI) direto do navegador — expõe a
// chave, só para desenvolvimento. Visão pelo endpoint compatível-OpenAI.
async function analyzeViaLLMDirect(base64Raw, mimeType) {
  const data = await llmChat({
    response_format: { type: 'json_object' },
    max_tokens: 1500,
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identifique os alimentos e estime a nutrição. Retorne JSON { "items": [...] }.' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Raw}` } },
        ],
      },
    ],
  });

  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('A IA retornou resposta vazia.');
  const parsed = safeJsonParse(text);
  if (!parsed) throw new Error('A IA retornou um formato inesperado.');
  return sanitizeItems(parsed);
}

/**
 * Analisa uma foto de refeição e devolve { items, photoUrl }.
 * Pipeline: comprime → faz upload (best-effort) → Edge Function `analyze-food`
 * (caminho seguro) → fallback DEV direto na IA (Gemini/OpenAI). Lança Error
 * em caso de falha total (nada falso é registrado no diário).
 */
export async function analyzeFoodPhoto(file, userId) {
  // 1. Comprime no cliente: JPEG ~768px (rápido, barato, cabe no bucket, evita HEIC)
  let compressed;
  try {
    compressed = await compressImage(file, { maxDimension: 768, quality: 0.72 });
  } catch (err) {
    console.error('[analyzeFoodPhoto] compressão falhou:', err);
    throw new Error('Não consegui ler essa imagem. Tente outra foto.');
  }

  // 2. Upload best-effort (a análise não depende dele)
  let publicUrl = null;
  try {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('food-photos')
      .upload(path, compressed.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressed.mimeType,
      });
    if (!uploadErr) {
      publicUrl = supabase.storage.from('food-photos').getPublicUrl(path).data.publicUrl;
    } else {
      console.warn('[analyzeFoodPhoto] upload falhou (segue sem URL):', uploadErr.message);
    }
  } catch (err) {
    console.warn('[analyzeFoodPhoto] upload exception:', err);
  }

  // 3. Caminho seguro: Edge Function (chave fica no servidor)
  try {
    const { data, error } = await supabase.functions.invoke('analyze-food', {
      body: publicUrl
        ? { imageUrl: publicUrl }
        : { imageBase64: compressed.base64Raw, mimeType: compressed.mimeType },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { items: sanitizeItems(data?.items), photoUrl: publicUrl || URL.createObjectURL(compressed.blob) };
  } catch (edgeErr) {
    // Erro de NEGÓCIO (cota estourada, sessão expirada) tem que chegar na
    // pessoa com o texto do servidor. Sem isso ela vê "publique a Edge
    // Function..." — mensagem de dev — e não entende o que aconteceu.
    const business = await readBusinessError(edgeErr);
    if (business) throw new Error(business);
    console.info('[analyzeFoodPhoto] Edge Function indisponível, tentando fallback direto:', edgeErr?.message || edgeErr);
  }

  // 4. Fallback DEV (somente se houver IA configurada localmente)
  if (!llmAvailable()) {
    throw new Error('O scanner está indisponível agora. Adicione a refeição pela busca.');
  }
  const items = await analyzeViaLLMDirect(compressed.base64Raw, compressed.mimeType);
  return { items, photoUrl: publicUrl || URL.createObjectURL(compressed.blob) };
}

export async function analyzeFoodText(description) {
  const { data, error } = await supabase.functions
    .invoke('analyze-food-text', { body: { description } });
  if (error) throw error;
  return data.items;
}

export async function saveAIResults(userId, items, mealType, photoUrl = null) {
  const entries = items.map((item) => ({
    user_id: userId,
    meal_type: mealType,
    log_date: toLocalDateStr(),
    quantity_g: item.quantity_g || 100,
    calories: item.calories || 0,
    protein_g: item.protein_g || 0,
    carbs_g: item.carbs_g || 0,
    fat_g: item.fat_g || 0,
    photo_url: photoUrl,
    ai_confidence: item.confidence || null,
    source: photoUrl ? 'ai_photo' : 'ai_voice',
    notes: item.name,
  }));

  const { data, error } = await supabase
    .from('meal_entries')
    .insert(entries)
    .select();
  if (error) throw error;
  return data;
}
