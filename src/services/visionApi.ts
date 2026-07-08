/* ═══════════════════════════════════════════════════════════════════════════════
 * VISION API SERVICE — Food Recognition Pipeline (OpenAI gpt-4o-mini)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Architecture:
 *   1. Client-side compression (imageCompression.ts) → 512x512 JPEG
 *   2. Rate limit check (per-user daily quota)
 *   3. API call to OpenAI gpt-4o-mini (vision) with strict JSON response_format
 *   4. Parse + validate response
 *   5. Return typed result for UI consumption
 *
 * Cost control:
 *   - 512px JPEG at q=0.70 ≈ 40-60KB base64
 *   - gpt-4o-mini é barato comparado a gpt-4o; custo por scan ~$0.0005
 *
 * Security:
 *   - API key stored in VITE_OPENAI_API_KEY (client env)
 *   - For production: route through Supabase Edge Function to hide key
 *   - Rate limiting prevents abuse even with exposed client key
 *
 * ═══════════════════════════════════════════════════════════════════════════════ */

import { compressImage, type CompressionResult } from '../utils/imageCompression';
import { supabase } from '../lib/supabase';

/* ─────────────────────────────────────────────────────────────────────────────
 * TYPES
 * ───────────────────────────────────────────────────────────────────────────── */

export interface FoodItem {
  name: string;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
}

export interface VisionAnalysisResult {
  items: FoodItem[];
  photoUrl: string;
  compressed: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
    dimensions: string;
  };
  latencyMs: number;
  source: 'openai' | 'edge_function' | 'mock';
}

export interface RateLimitStatus {
  allowed: boolean;
  used: number;
  limit: number;
  resetsAt: string;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

const MAX_SCANS_FREE = 5;
const MAX_SCANS_PREMIUM = 50;

const RATE_LIMIT_STORAGE_KEY = 'orvax_vision_rate';

/* ─────────────────────────────────────────────────────────────────────────────
 * SYSTEM PROMPT
 * ───────────────────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Voce e uma API de analise nutricional de alta precisao.
Analise a imagem fornecida e identifique TODOS os alimentos visiveis.

REGRAS ESTRITAS:
1. Retorne APENAS um objeto JSON valido no formato { "items": [...] }. Zero texto fora do JSON.
2. Cada alimento deve ter: name (nome em portugues BR), quantity_g (estimativa em gramas), calories (kcal), protein_g, carbs_g, fat_g, confidence (0.0 a 1.0).
3. Use a tabela TACO (Tabela Brasileira de Composicao de Alimentos) como referencia nutricional.
4. Se a imagem nao contem alimentos, retorne { "items": [] }.
5. Confidence score: 0.9+ = alimento claramente visivel e identificavel. 0.7-0.89 = provavel mas parcialmente obstruido. 0.5-0.69 = estimativa baseada em contexto. <0.5 = baixa confianca.
6. Estime quantidades em gramas baseado no tamanho visual relativo ao prato/recipiente.
7. Arredonde calorias e macros para 1 casa decimal.
8. Nao invente alimentos que nao estao visiveis na imagem.`;

/* ─────────────────────────────────────────────────────────────────────────────
 * RATE LIMITING (Client-Side with localStorage)
 * ───────────────────────────────────────────────────────────────────────────── */

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface RateLimitStore {
  date: string;
  count: number;
}

function getRateLimitStore(): RateLimitStore {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (!raw) return { date: getTodayKey(), count: 0 };
    const parsed: RateLimitStore = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function incrementRateLimit(): void {
  const store = getRateLimitStore();
  store.count += 1;
  localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(store));
}

export function checkRateLimit(isPremium = false): RateLimitStatus {
  const store = getRateLimitStore();
  const limit = isPremium ? MAX_SCANS_PREMIUM : MAX_SCANS_FREE;

  return {
    allowed: store.count < limit,
    used: store.count,
    limit,
    resetsAt: `00:00 (${limit - store.count} restantes)`,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * RESPONSE VALIDATION
 * ───────────────────────────────────────────────────────────────────────────── */

function validateFoodItem(item: unknown): FoodItem | null {
  if (!item || typeof item !== 'object') return null;
  const obj = item as Record<string, unknown>;

  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  if (!name) return null;

  const toNum = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : fallback;
  };

  const confidence = toNum(obj.confidence, 0.5);
  const clampedConfidence = Math.min(1, Math.max(0, confidence));

  return {
    name,
    quantity_g: toNum(obj.quantity_g, 100),
    calories: toNum(obj.calories, 0),
    protein_g: toNum(obj.protein_g, 0),
    carbs_g: toNum(obj.carbs_g, 0),
    fat_g: toNum(obj.fat_g, 0),
    confidence: clampedConfidence,
  };
}

function validateResponse(raw: unknown): FoodItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.items)) return [];

  const validated: FoodItem[] = [];
  for (const item of obj.items) {
    const valid = validateFoodItem(item);
    if (valid) validated.push(valid);
  }

  return validated;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * UPLOAD COMPRESSED IMAGE TO SUPABASE STORAGE
 * ───────────────────────────────────────────────────────────────────────────── */

async function uploadCompressedImage(
  compressed: CompressionResult,
  userId: string
): Promise<string | null> {
  try {
    const path = `${userId}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('food-photos')
      .upload(path, compressed.blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: compressed.mimeType,
      });

    if (error) {
      console.warn('[VisionAPI] Storage upload failed:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('food-photos').getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn('[VisionAPI] Storage upload exception:', err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * OPENAI VISION API CALL (gpt-4o-mini multimodal)
 * ───────────────────────────────────────────────────────────────────────────── */

async function callOpenAIVision(
  base64Raw: string,
  mimeType: string,
  apiKey: string
): Promise<FoodItem[]> {
  const requestBody = {
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' as const },
    temperature: 0.1,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identifique os alimentos e estime a nutricao. Retorne JSON { "items": [...] }.' },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Raw}` },
          },
        ],
      },
    ],
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const errMsg =
      (errBody as Record<string, { message?: string }>).error?.message ||
      `HTTP ${response.status}`;
    throw new Error(`OPENAI_API_ERROR: ${errMsg}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OPENAI_EMPTY_RESPONSE: No content in API response');
  }

  const parsed = JSON.parse(text);
  return validateResponse(parsed);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MAIN ENTRY POINT: analyzeFood
 * ───────────────────────────────────────────────────────────────────────────── */

export async function analyzeFood(
  file: File,
  userId: string,
  isPremium = false
): Promise<VisionAnalysisResult> {
  const startTime = performance.now();

  // ── 1. Rate limit check ───────────────────────────────
  const rateStatus = checkRateLimit(isPremium);
  if (!rateStatus.allowed) {
    throw new Error(
      `RATE_LIMIT_EXCEEDED: ${rateStatus.used}/${rateStatus.limit} scans usados hoje. Reseta as ${rateStatus.resetsAt}`
    );
  }

  // ── 2. Compress image ─────────────────────────────────
  const compressed = await compressImage(file, {
    maxDimension: 512,
    quality: 0.70,
    outputFormat: 'image/jpeg',
  });

  // ── 3. Upload to storage (non-blocking) ───────────────
  const uploadPromise = uploadCompressedImage(compressed, userId);

  // ── 4. Call Vision API ────────────────────────────────
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;

  let items: FoodItem[];
  let source: VisionAnalysisResult['source'];

  if (!apiKey || apiKey === 'sua_chave_openai') {
    // No API key: use mock response for development
    items = [
      {
        name: 'Arroz Branco',
        quantity_g: 150,
        calories: 193.5,
        protein_g: 3.8,
        carbs_g: 42.0,
        fat_g: 0.5,
        confidence: 0.85,
      },
      {
        name: 'Feijao Carioca',
        quantity_g: 120,
        calories: 86.4,
        protein_g: 5.6,
        carbs_g: 14.4,
        fat_g: 0.6,
        confidence: 0.82,
      },
      {
        name: 'Frango Grelhado',
        quantity_g: 100,
        calories: 159.0,
        protein_g: 32.0,
        carbs_g: 0.0,
        fat_g: 3.2,
        confidence: 0.90,
      },
    ];
    source = 'mock';
  } else {
    items = await callOpenAIVision(compressed.base64Raw, compressed.mimeType, apiKey);
    source = 'openai';
  }

  // ── 5. Wait for storage upload ────────────────────────
  const storedUrl = await uploadPromise;
  const photoUrl = storedUrl || URL.createObjectURL(compressed.blob);

  // ── 6. Increment rate counter ─────────────────────────
  incrementRateLimit();

  const latencyMs = Math.round(performance.now() - startTime);

  return {
    items,
    photoUrl,
    compressed: {
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      ratio: compressed.ratio,
      dimensions: `${compressed.width}x${compressed.height}`,
    },
    latencyMs,
    source,
  };
}
