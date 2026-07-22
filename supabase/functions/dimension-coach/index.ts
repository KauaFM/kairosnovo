// ============================================================
// ORVAX — dimension-coach (Protocolo VERITAS · F5)
// O Conselho de IAs: 1 cérebro, 8 chapéus (GDD §6).
//
// Semanal e idempotente: se já existem insights da semana, devolve.
// Context Builder → métricas 30d reais + últimos rituais → LLM
// (gpt-4o-mini, mesma chave do mentor-chat) → JSON estruturado →
// persiste em ai_insights. O front NUNCA chama o LLM direto.
// Guard-rails: sem diagnóstico, sem culpa, TODA recomendação cita
// o dado que a sustenta (explicabilidade é requisito).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))
const pct = (v: number, target: number) => clamp(0, 100, Math.round((Number(v) || 0) / target * 100))

// Segunda-feira da semana corrente em SP (âncora da idempotência)
function weekStartStr(): string {
  const sp = new Date(Date.now() - 3 * 3600_000)
  const dow = (sp.getUTCDay() + 6) % 7 // 0 = segunda
  const monday = new Date(sp.getTime() - dow * 86400_000)
  return monday.toISOString().slice(0, 10)
}

const SPECIALIST: Record<string, string> = {
  body: "VITALIS", mind: "NOÛS", execution: "FORGE", capital: "AUREUS",
  career: "ASCENT", social: "NEXUS", internal: "LUMEN", evolution: "MENTOR",
}

// Score 0-100 por dimensão a partir dos agregados reais (alvos = F4)
function dimensionScores(m: any): { dim: string; score: number; facts: string }[] {
  const out: { dim: string; score: number; facts: string }[] = []
  const w = Number(m.workouts_30d || 0), wm = Number(m.workout_min_30d || 0)
  const nd = Number(m.nutrition_days_30d || 0)
  if (w > 0 || nd > 0) out.push({
    dim: "body",
    score: Math.round(0.5 * (0.6 * pct(w, 12) + 0.4 * pct(wm, 600)) + 0.5 * pct(nd, 30)),
    facts: `${w} treino(s) / ${wm} min em 30d; ${nd}/30 dias de diário alimentar`,
  })
  const fm = Number(m.focus_min_30d || 0), fs = Number(m.focus_sessions_30d || 0)
  if (fm > 0) out.push({
    dim: "mind", score: Math.round(0.7 * pct(fm, 600) + 0.3 * pct(fs, 20)),
    facts: `${fm} min de foco provado por timer; ${fs} sessão(ões) de 5min+`,
  })
  const td = Number(m.tasks_done_30d || 0), tf = Number(m.tasks_failed_30d || 0)
  if (td > 0 || tf > 0) out.push({
    dim: "execution",
    score: clamp(0, 100, Math.round(pct(td, 40) - 10 * tf)),
    facts: `${td} tarefa(s) concluída(s) e ${tf} abandonada(s) em 30d`,
  })
  const en = m.avg_energy_30d != null ? Number(m.avg_energy_30d) : null
  const sh = m.avg_sleep_h_30d != null ? Number(m.avg_sleep_h_30d) : null
  const gd = Number(m.gratitude_days_30d || 0)
  if (en != null || sh != null || gd > 0) out.push({
    dim: "internal",
    score: Math.round(((en != null ? pct(en, 5) : 50) + (sh != null ? pct(Math.min(sh, 8), 8) : 50) + pct(gd, 30)) / 3),
    facts: `energia média ${en ?? "?"}/5; sono médio ${sh ?? "?"}h; gratidão em ${gd} dia(s)`,
  })
  const rit = Number(m.rituals_30d || 0), xp = Number(m.xp_30d || 0)
  if (rit > 0 || xp > 0) out.push({
    dim: "evolution",
    score: Math.round(0.6 * pct(rit, 30) + 0.4 * pct(xp, 1500)),
    facts: `${rit} ritual(is) de encerramento; ${xp} XP verificado em 30d; streak do ritual: ${m.ritual_streak || 0}`,
  })
  return out
}

// Fallback determinístico (sem chave/erro do LLM): útil mesmo assim
function fallbackItems(weak: { dim: string; score: number; facts: string }[], hasData: boolean) {
  if (!hasData) return [{
    dimension: "evolution", specialist: "MENTOR", kind: "plan",
    title: "Comece pelo ritual",
    body: "Ainda não há dados suficientes pra análise. Esta semana: 3 rituais de encerramento e 1 sessão de foco por dia. Com 7 dias de dados, o Conselho entra em ação.",
    data_ref: "0 registros nos últimos 30 dias",
  }]
  return weak.slice(0, 2).map((d) => ({
    dimension: d.dim, specialist: SPECIALIST[d.dim] || "MENTOR", kind: "challenge",
    title: `Elevar ${d.dim === "body" ? "o Corpo" : d.dim === "mind" ? "a Mente" : d.dim === "execution" ? "a Execução" : d.dim === "internal" ? "o Interno" : "a Evolução"}`,
    body: `Sua dimensão mais fraca da semana (score ${d.score}/100). Meta dos próximos 7 dias: 3 ações registradas nessa frente — pequenas e verificáveis.`,
    data_ref: d.facts,
  }))
}

async function callCouncil(scores: { dim: string; score: number; facts: string }[], reviews: any[]): Promise<any[] | null> {
  if (!OPENAI_API_KEY) return null
  const ctx = scores.map((s) => `- ${s.dim} (${SPECIALIST[s.dim]}): score ${s.score}/100 · dados: ${s.facts}`).join("\n")
  const rag = reviews.map((r) =>
    `dia ${r.day} (nota ${r.computed_score ?? "?"}): vitória="${r.victory ?? ""}" desafio="${r.challenge ?? ""}" aprendizado="${r.learning ?? ""}"`).join("\n")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Você é o Conselho de IAs do ORVAX (sistema anti-procrastinação). Especialistas: VITALIS (body), NOÛS (mind), FORGE (execution), AUREUS (capital), ASCENT (career), NEXUS (social), LUMEN (internal), MENTOR (evolution). Todos falam ATRAVÉS do Mentor: tom firme e cuidadoso, pt-BR, 2ª pessoa, frases curtas. REGRAS INEGOCIÁVEIS: 1) nunca diagnostique saúde física/mental; 2) nunca use culpa ou vergonha — dados + próxima ação mínima; 3) TODA recomendação cita o dado que a sustenta; 4) missões pequenas e verificáveis. Responda SOMENTE JSON: {"items":[{"dimension":string,"specialist":string,"kind":"insight"|"challenge"|"risk","title":string(max 60),"body":string(max 280),"data_ref":string(max 100)}]}. Gere: 1 insight + 1 challenge para CADA uma das 2 dimensões mais fracas, e 1 risk global se houver padrão de queda. Máximo 5 itens.',
        },
        { role: "user", content: `Métricas reais (30 dias):\n${ctx}\n\nÚltimos rituais de encerramento:\n${rag || "(nenhum)"}` },
      ],
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}")
    return Array.isArray(parsed.items) ? parsed.items.slice(0, 5) : null
  } catch { return null }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  let body: any = {}
  try { body = await req.json() } catch { /* corpo vazio ok */ }
  const force = body?.force === true

  try {
    const week = weekStartStr()

    // Idempotência semanal
    const { data: existing } = await admin.from("ai_insights")
      .select("dimension, specialist, kind, title, body, data_ref, week")
      .eq("user_id", user.id).eq("week", week).order("id")
    if (existing && existing.length && !force) return json({ items: existing, week, cached: true })
    if (force && existing?.length) {
      await admin.from("ai_insights").delete().eq("user_id", user.id).eq("week", week)
    }

    // Context Builder
    const [{ data: metrics }, { data: reviews }] = await Promise.all([
      admin.rpc("veritas_dimension_metrics_for", { p_user: user.id }),
      admin.from("daily_reviews").select("day, victory, challenge, learning, computed_score")
        .eq("user_id", user.id).eq("completed", true).order("day", { ascending: false }).limit(3),
    ])

    const scores = dimensionScores(metrics || {})
    const weak = [...scores].sort((a, b) => a.score - b.score)
    const hasData = scores.length > 0

    // Conselho (LLM) com fallback determinístico
    let items = hasData ? await callCouncil(scores, reviews || []) : null
    if (!items || !items.length) items = fallbackItems(weak, hasData)

    // Sanitiza e persiste
    const rows = items.slice(0, 5).map((i: any) => ({
      user_id: user.id,
      dimension: String(i.dimension || "evolution").slice(0, 24),
      specialist: String(i.specialist || SPECIALIST[i.dimension] || "MENTOR").slice(0, 24),
      kind: ["insight", "challenge", "risk", "plan", "correction"].includes(i.kind) ? i.kind : "insight",
      title: String(i.title || "").slice(0, 80),
      body: String(i.body || "").slice(0, 400),
      data_ref: String(i.data_ref || "").slice(0, 120),
      content: i,
      week,
    }))
    const { error: insErr } = await admin.from("ai_insights").insert(rows)
    if (insErr) throw new Error(`insert: ${insErr.message}`)

    return json({ items: rows, week, cached: false })
  } catch (err: any) {
    console.error("dimension-coach error:", err)
    return json({ error: err?.message || "Falha no Conselho." }, 500)
  }
})
