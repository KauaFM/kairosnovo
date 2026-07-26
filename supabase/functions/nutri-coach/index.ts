// ============================================================
// ORVAX FitCal — nutri-coach (VITALIS · N2)
//
// Copiloto de DECISÃO alimentar. O valor não está em "montar dieta":
// está em responder bem no momento de pressão ("tô na rua com fome").
//
// Context Builder: perfil + plano + o que já comeu hoje + preferências
// + hora → gpt-4o-mini → resposta curta + 2-3 opções REGISTRÁVEIS.
//
// GUARD-RAILS (não remover):
//  · nunca prescreve/diagnostica (no BR dieta é ato de nutricionista) —
//    sugere e estima, com encaminhamento em temas clínicos;
//  · zero linguagem de culpa (risco de transtorno alimentar);
//  · nunca sugere ficar abaixo do piso calórico nem jejum/restrição;
//  · rate limit por usuário (custo + antiabuso).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const DAILY_MSG_LIMIT = 40   // por usuário/dia
const MODEL = "gpt-4o-mini"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

// Dia local de SP (o diário usa data local)
const spToday = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
const spHour = () => new Date(Date.now() - 3 * 3600_000).getUTCHours()

const SYSTEM = `Você é o VITALIS, o especialista em nutrição do ORVAX. Fala em pt-BR, direto, prático e SEM enrolação.

SEU PAPEL: ajudar a pessoa a decidir O QUE COMER AGORA, com o que ela tem à mão, respeitando as metas do dia. Você é um copiloto de decisão — não um gerador de cardápio genérico.

REGRAS INEGOCIÁVEIS:
1. NUNCA prescreva dieta, não diagnostique e não trate doença. Você dá SUGESTÕES e ESTIMATIVAS educacionais. Se a pessoa citar condição clínica (diabetes, doença renal, gestação, transtorno alimentar, uso de medicação), diga em 1 linha que isso precisa de nutricionista/médico e ofereça ajuda apenas geral.
2. NUNCA use culpa, vergonha ou julgamento. Nada de "você falhou/estourou/errou". Se a pessoa comeu além do plano: acolha em 1 frase e mostre o ajuste possível. O dia continua.
3. NUNCA sugira jejum, pular refeição, "compensar" comendo menos depois, nem ficar abaixo da meta de calorias. Se sobrar pouca caloria no dia, priorize proteína e volume (saciedade), não restrição.
4. Considere SEMPRE as alergias e restrições — elas são absolutas. Respeite os dislikes.
5. Sugira comida REAL e acessível no Brasil (padaria, lanchonete, mercado, marmita, delivery), com porções em medidas caseiras. Nada de "150g de peito de frango" quando a pessoa está na rua.
6. Seja BREVE: no máximo 2 frases de texto. O valor está nas opções.

FORMATO — responda SOMENTE JSON válido:
{
  "reply": "1-2 frases curtas e úteis",
  "options": [
    {"name":"nome curto","portion":"medida caseira","kcal":number,"protein_g":number,"carbs_g":number,"fat_g":number,"why":"por que encaixa (máx 8 palavras)","tag":"melhor|boa|alternativa"}
  ],
  "avoid": "opcional: 1 coisa a evitar agora e o motivo, sem julgamento",
  "needs_professional": false
}
- 0 a 3 opções. Se a pergunta não for sobre escolher comida, devolva options: [].
- Estimativas nutricionais realistas; arredonde.
- needs_professional: true apenas em tema clínico.`

async function buildContext(uid: string) {
  const today = spToday()
  const [plan, prefs, prof, entries, weight] = await Promise.all([
    admin.from("nutrition_plans").select("daily_calories, protein_g, carbs_g, fat_g, water_ml, goal, safety_floor")
      .eq("user_id", uid).eq("is_active", true).maybeSingle(),
    admin.from("nutrition_preferences").select("*").eq("user_id", uid).maybeSingle(),
    admin.from("profiles").select("gender, goal").eq("id", uid).maybeSingle(),
    // Diário ATIVO = food_logs (meal_entries é legado). Nome vem de name_snapshot.
    admin.from("food_logs").select("name_snapshot, calories, protein_g, carbs_g, fat_g, meal_type")
      .eq("user_id", uid).eq("log_date", today),
    admin.from("weight_logs").select("weight_kg").eq("user_id", uid)
      .order("log_date", { ascending: false }).limit(1).maybeSingle(),
  ])

  const eaten = (entries.data ?? []).reduce((a: any, e: any) => ({
    kcal: a.kcal + (e.calories || 0),
    p: a.p + (e.protein_g || 0),
    c: a.c + (e.carbs_g || 0),
    f: a.f + (e.fat_g || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0 })

  const P = plan.data
  const pr = prefs.data
  const hour = spHour()

  const lines = [
    `Hora: ${hour}h`,
    P ? `Metas do dia: ${P.daily_calories} kcal · P ${P.protein_g}g · C ${P.carbs_g}g · G ${P.fat_g}g (objetivo: ${P.goal || prof.data?.goal || "manter"})`
      : `Metas: ainda não calculadas (sugira configurar em "Calcular minhas metas").`,
    `Já consumiu hoje: ${Math.round(eaten.kcal)} kcal · P ${Math.round(eaten.p)}g · C ${Math.round(eaten.c)}g · G ${Math.round(eaten.f)}g`,
  ]
  if (P) {
    lines.push(`RESTA hoje: ${Math.max(0, P.daily_calories - Math.round(eaten.kcal))} kcal · ${Math.max(0, P.protein_g - Math.round(eaten.p))}g de proteína`)
  }
  if ((entries.data ?? []).length) {
    lines.push(`Refeições de hoje: ${(entries.data ?? []).map((e: any) => e.name_snapshot).filter(Boolean).slice(0, 8).join(", ")}`)
  }
  if (weight.data?.weight_kg) lines.push(`Peso atual: ${weight.data.weight_kg} kg`)
  if (pr) {
    lines.push(`Padrão alimentar: ${pr.diet_type}`)
    if (pr.allergies?.length) lines.push(`ALERGIAS/INTOLERÂNCIAS (absolutas, nunca sugerir): ${pr.allergies.join(", ")}`)
    if (pr.dislikes?.length) lines.push(`Não gosta: ${pr.dislikes.join(", ")}`)
    lines.push(`Come fora: ${pr.eats_out_freq} · cozinha em casa: ${pr.cooks_at_home} · orçamento: ${pr.budget_level} · ${pr.meals_per_day} refeições/dia`)
    if (pr.notes) lines.push(`Observações: ${pr.notes}`)
  }
  return { text: lines.join("\n"), plan: P, eaten }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)
  if (!OPENAI_API_KEY) return json({ error: "IA não configurada no servidor." }, 500)

  let body: any = {}
  try { body = await req.json() } catch { /* vazio */ }
  const message = String(body.message || "").trim().slice(0, 500)
  const context = body.context ? String(body.context).slice(0, 32) : null
  if (!message) return json({ error: "Mensagem vazia." }, 400)

  const uid = user.id
  try {
    // Rate limit diário (custo + antiabuso)
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count } = await admin.from("nutri_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid).eq("role", "user").gte("created_at", since)
    if ((count ?? 0) >= DAILY_MSG_LIMIT) {
      return json({ error: "Você atingiu o limite de mensagens de hoje. Volte amanhã." }, 429)
    }

    const ctx = await buildContext(uid)

    // Histórico curto (mantém o fio da conversa sem estourar tokens)
    const { data: hist } = await admin.from("nutri_messages")
      .select("role, content").eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(6)
    const history = (hist ?? []).reverse().map((m: any) => ({ role: m.role, content: m.content }))

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `CONTEXTO ATUAL DA PESSOA:\n${ctx.text}` },
          ...history,
          { role: "user", content: message },
        ],
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      console.error("[nutri-coach] openai:", res.status, t)
      return json({ error: "A IA não respondeu agora. Tente de novo." }, 502)
    }

    const data = await res.json()
    let parsed: any = {}
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") } catch { /* fallback abaixo */ }

    const reply = String(parsed.reply || "Não consegui formular agora. Pode reformular?").slice(0, 600)
    const options = Array.isArray(parsed.options) ? parsed.options.slice(0, 3).map((o: any) => ({
      name: String(o.name || "").slice(0, 80),
      portion: String(o.portion || "").slice(0, 60),
      kcal: Math.max(0, Math.round(Number(o.kcal) || 0)),
      protein_g: Math.max(0, Math.round(Number(o.protein_g) || 0)),
      carbs_g: Math.max(0, Math.round(Number(o.carbs_g) || 0)),
      fat_g: Math.max(0, Math.round(Number(o.fat_g) || 0)),
      why: String(o.why || "").slice(0, 60),
      tag: ["melhor", "boa", "alternativa"].includes(o.tag) ? o.tag : "boa",
    })).filter((o: any) => o.name) : []
    const avoid = parsed.avoid ? String(parsed.avoid).slice(0, 200) : null
    const needsPro = parsed.needs_professional === true

    // Persiste a conversa + as sugestões (aderência = sugerido × seguido)
    await admin.from("nutri_messages").insert([
      { user_id: uid, role: "user", content: message },
      { user_id: uid, role: "assistant", content: reply, payload: { options, avoid, needs_professional: needsPro } },
    ])

    let suggestionIds: number[] = []
    if (options.length) {
      const { data: ins } = await admin.from("meal_suggestions")
        .insert(options.map((o: any) => ({ user_id: uid, context, suggestion: o })))
        .select("id")
      suggestionIds = (ins ?? []).map((r: any) => r.id)
    }

    return json({
      reply, options, avoid, needs_professional: needsPro,
      suggestion_ids: suggestionIds,
      remaining: ctx.plan ? Math.max(0, ctx.plan.daily_calories - Math.round(ctx.eaten.kcal)) : null,
    })
  } catch (err: any) {
    console.error("nutri-coach error:", err)
    return json({ error: err?.message || "Falha no VITALIS." }, 500)
  }
})
