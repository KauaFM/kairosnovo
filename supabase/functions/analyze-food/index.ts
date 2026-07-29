// ============================================================
// ORVAX FitCal — analyze-food Edge Function
// Reconhecimento nutricional por foto (OpenAI gpt-4o-mini vision).
//
// A chave da OpenAI fica SOMENTE aqui (Supabase secret), nunca no
// bundle do cliente. O front envia { imageUrl } (foto já no bucket
// público food-photos) ou { imageBase64, mimeType } como fallback.
//
// Deploy:
//   supabase functions deploy analyze-food
//   supabase secrets set OPENAI_API_KEY=sk-...
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
const OPENAI_MODEL = "gpt-4o-mini"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Fotos/dia por usuário. O scanner é a ação mais cara do app (~4x um
// comando do VITALIS). 25 é ~5x o uso de quem registra TODAS as refeições,
// então ninguém real esbarra — só um script.
const DAILY_LIMIT = 25
// Dia local de SP (o diário do FitCal usa data local)
const spToday = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

// ─── CORS (chamado do navegador via supabase.functions.invoke) ──
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

// ─── PROMPT NUTRICIONAL ─────────────────────────────────────
const SYSTEM_PROMPT = `Você é uma API de análise nutricional de alta precisão.
Analise a imagem e identifique TODOS os alimentos visíveis.

REGRAS ESTRITAS:
1. Retorne APENAS um objeto JSON válido no formato { "items": [...] }. Zero texto fora do JSON.
2. Cada alimento tem: name (nome em português BR), quantity_g (gramas estimadas), calories (kcal), protein_g, carbs_g, fat_g, confidence (0.0 a 1.0).
3. Use a Tabela TACO (Tabela Brasileira de Composição de Alimentos) como referência.
4. Se a imagem não contém alimentos, retorne { "items": [] }.
5. confidence: 0.9+ = claramente visível; 0.7-0.89 = provável mas parcial; 0.5-0.69 = estimativa por contexto; <0.5 = baixa confiança.
6. Estime quantidades em gramas pelo tamanho visual relativo ao prato/recipiente.
7. Seja conservador. NÃO invente alimentos que não estão na imagem.
8. Arredonde macros para 1 casa decimal.`

// ─── VALIDAÇÃO + CLAMP (a IA pode alucinar) ─────────────────
interface FoodItem {
    name: string
    quantity_g: number
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    confidence: number
}

function toNum(v: unknown, fallback: number): number {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : fallback
}

function sanitizeItems(raw: unknown): FoodItem[] {
    if (!raw || typeof raw !== "object") return []
    const arr = (raw as Record<string, unknown>).items
    if (!Array.isArray(arr)) return []

    const out: FoodItem[] = []
    for (const it of arr) {
        if (!it || typeof it !== "object") continue
        const o = it as Record<string, unknown>
        const name = typeof o.name === "string" ? o.name.trim() : ""
        if (!name) continue

        const grams = Math.max(1, toNum(o.quantity_g, 100))
        // Limite físico: nenhum alimento real passa de ~9 kcal/g (gordura pura).
        const calMax = 9 * grams
        const calories = Math.min(toNum(o.calories, 0), calMax)
        const confidence = Math.min(1, Math.max(0, toNum(o.confidence, 0.5)))

        out.push({
            name: name.slice(0, 120),
            quantity_g: grams,
            calories,
            protein_g: toNum(o.protein_g, 0),
            carbs_g: toNum(o.carbs_g, 0),
            fat_g: toNum(o.fat_g, 0),
            confidence,
        })
    }
    return out
}

// ─── HANDLER ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }
    if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405)
    }
    if (!OPENAI_API_KEY) {
        return json(
            { error: "OPENAI_API_KEY não configurada no servidor (supabase secrets set OPENAI_API_KEY=...)" },
            500,
        )
    }

    // Autenticação REAL. Antes daqui a função só tinha verify_jwt do gateway
    // — e o gateway aceita a própria anon key, que viaja dentro do APK. Ou
    // seja: o endpoint mais caro do app era chamável por qualquer um.
    const authHeader = req.headers.get("Authorization") || ""
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: "Não autenticado." }, 401)

    // Cota diária (admin passa livre)
    const { data: quota } = await admin.rpc("ai_quota_take", {
        p_user: user.id, p_fn: "analyze-food", p_day: spToday(), p_limit: DAILY_LIMIT,
    })
    const q = Array.isArray(quota) ? quota[0] : quota
    if (q && q.allowed === false) {
        return json({
            error: `Você já analisou ${q.quota} fotos hoje. Adicione a refeição pela busca — amanhã o scanner volta.`,
            code: "quota_exceeded",
        }, 429)
    }

    let body: { imageUrl?: string; imageBase64?: string; mimeType?: string }
    try {
        body = await req.json()
    } catch {
        return json({ error: "JSON inválido no corpo da requisição" }, 400)
    }

    const { imageUrl, imageBase64, mimeType } = body
    if (!imageUrl && !imageBase64) {
        return json({ error: "Envie imageUrl ou imageBase64" }, 400)
    }

    const imagePayload = imageUrl
        ? { url: imageUrl }
        : { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` }

    try {
        const aiRes = await fetch(OPENAI_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                response_format: { type: "json_object" },
                temperature: 0.1,
                max_tokens: 1500,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: 'Identifique os alimentos e estime a nutrição. Retorne JSON { "items": [...] }.' },
                            { type: "image_url", image_url: imagePayload },
                        ],
                    },
                ],
            }),
        })

        if (!aiRes.ok) {
            const errBody = await aiRes.json().catch(() => ({}))
            const msg = errBody?.error?.message || `HTTP ${aiRes.status}`
            console.error("[analyze-food] OpenAI error:", msg)
            return json({ error: `Falha na IA: ${msg}` }, 502)
        }

        const data = await aiRes.json()
        const text = data?.choices?.[0]?.message?.content
        if (!text) return json({ error: "IA retornou resposta vazia" }, 502)

        let parsed: unknown
        try {
            parsed = JSON.parse(text)
        } catch {
            return json({ error: "IA retornou JSON inválido" }, 502)
        }

        return json({ items: sanitizeItems(parsed) })
    } catch (err) {
        console.error("[analyze-food] erro:", err)
        return json({ error: (err as Error)?.message || "Erro interno" }, 500)
    }
})
