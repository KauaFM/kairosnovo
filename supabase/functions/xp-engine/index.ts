// ============================================================
// ORVAX — xp-engine (Protocolo VERITAS · F2.1)
// Única entidade que emite XP. O cliente envia FATOS + verificação.
//
// XP = round(B×D×Q×C×T×S×K) × capFactor × crit
//   Q: nível de verificação (N1=0.6, N2=0.85/0.7, N3=1.1, N4=ai)
//   T: Índice de Integridade (trust_scores.score) → 0.30..1.20
//   + emite trust_events (rajada, N2 boa/genérica) e registra verifications.
// Docs: docs/GDD_SISTEMA_EVOLUCAO.md §2–§3.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

const BASE: Record<string, number> = {
  task: 10, habit: 8, event: 4, meeting: 4, reminder: 2, payment: 3,
  goal_progress: 25, goal_complete: 50, ritual: 15, challenge: 30, arena: 12, finance: 2,
}
const DIM_DEFAULT: Record<string, string> = {
  task: "execution", habit: "evolution", event: "execution", meeting: "social",
  reminder: "execution", payment: "capital", goal_progress: "evolution",
  goal_complete: "evolution", ritual: "evolution", challenge: "evolution", arena: "body", finance: "capital",
}
const clamp = (lo: number, hi: number, v: number) => Math.max(lo, Math.min(hi, v))

const GENERIC = new Set([
  "foi bom", "bom", "consegui", "dificil mas consegui", "tranquilo", "normal", "ok", "okay",
  "sim", "nao", "tudo certo", "de boa", "foi", "legal", "nada", "nenhuma", "nenhum",
])

function normText(t: string): string {
  return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}
function normTitle(t: string): string { return normText(t).replace(/[0-9]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) }

function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(" ").filter(Boolean)), sb = new Set(b.split(" ").filter(Boolean))
  if (!sa.size || !sb.size) return 0
  let inter = 0
  for (const w of sa) if (sb.has(w)) inter++
  return inter / (sa.size + sb.size - inter)
}

function spDayStartISO(): string {
  const sp = new Date(Date.now() - 3 * 3600_000)
  return new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate(), 3, 0, 0)).toISOString()
}
const spHour = () => new Date(Date.now() - 3 * 3600_000).getUTCHours()

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  let body: any
  try { body = await req.json() } catch { return json({ error: "JSON inválido." }, 400) }

  const sourceType = String(body.source_type || "")
  const B = BASE[sourceType]
  if (!B) return json({ error: `source_type inválido: "${sourceType}"` }, 400)

  const title = String(body.title || sourceType).slice(0, 200)
  const titleNorm = normTitle(title) || sourceType
  const dimension = String(body.dimension || DIM_DEFAULT[sourceType] || "general").slice(0, 32)
  const difficulty = clamp(1, 5, Number(body.difficulty) || 2)
  const minutes = clamp(1, 480, Number(body.minutes) || 15)
  const priority = [1, 2, 3].includes(Number(body.priority)) ? Number(body.priority) : 3
  const sourceId = body.source_id ? String(body.source_id).slice(0, 64) : null

  // Verificação declarada pelo cliente (o nível é ACEITO, o Q é decidido aqui)
  const v = body.verification || {}
  let level = [1, 2, 3, 4].includes(Number(v.level)) ? Number(v.level) : 1
  const answersObj = (v.answers && typeof v.answers === "object") ? v.answers : {}
  const answersText = normText(Object.values(answersObj).map((x: any) => String(x || "")).join(" "))

  try {
    const dayStart = spDayStartISO()
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString()
    const t60 = new Date(Date.now() - 60_000).toISOString()

    const [rar, today, prof, trust, recentAns, burst] = await Promise.all([
      admin.from("xp_events").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("title_norm", titleNorm).gte("created_at", d30),
      admin.from("xp_events").select("xp_final, dimension, title_norm")
        .eq("user_id", user.id).gte("created_at", dayStart),
      admin.from("profiles").select("streak_days").eq("id", user.id).maybeSingle(),
      admin.from("trust_scores").select("score").eq("user_id", user.id).maybeSingle(),
      admin.from("verifications").select("answers").eq("user_id", user.id).eq("kind", "interview")
        .order("created_at", { ascending: false }).limit(30),
      admin.from("xp_events").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", t60),
    ])

    const nRepeats30d = rar.count ?? 0
    const todayEvents = today.data ?? []
    const nSameToday = todayEvents.filter((e: any) => e.title_norm === titleNorm).length
    const xpToday = todayEvents.reduce((s: number, e: any) => s + (e.xp_final || 0), 0)
    const xpDimToday = todayEvents.filter((e: any) => e.dimension === dimension)
      .reduce((s: number, e: any) => s + (e.xp_final || 0), 0)
    const streak = Math.max(0, prof.data?.streak_days ?? 0)
    const trustScore = trust.data?.score ?? 50
    const nBurst = burst.count ?? 0

    // ── N2: valida a micro-entrevista por heurística ──
    let interviewSpecific = false
    let interviewGeneric = false
    if (level === 2) {
      const words = answersText.split(" ").filter(Boolean)
      const onlyGeneric = GENERIC.has(answersText) || words.length < 4
      let nearDup = false
      for (const r of (recentAns.data ?? [])) {
        const prev = normText(Object.values(r.answers || {}).map((x: any) => String(x || "")).join(" "))
        if (prev && jaccard(answersText, prev) >= 0.8) { nearDup = true; break }
      }
      if (answersText.length >= 20 && !onlyGeneric && !nearDup) interviewSpecific = true
      else interviewGeneric = true
      if (!answersText) level = 1 // sem resposta → cai pra autodeclaração
    }

    // ── Fatores ──
    const rarity = 1 / (1 + nRepeats30d)
    const prioNorm = priority === 1 ? 1.0 : priority === 2 ? 0.6 : 0.3
    const D = clamp(0.5, 3.0,
      0.40 + 0.15 * difficulty + 0.20 * Math.log2(1 + minutes / 15) + 0.25 * rarity + 0.20 * prioNorm)

    // Q por nível de verificação
    let Q = 0.6
    let vKind = "selfdeclare"
    if (level === 2) { Q = interviewSpecific ? 0.85 : 0.70; vKind = "interview" }
    else if (level === 3) { Q = 1.1; vKind = String(v.kind || "proof") }
    else if (level === 4) { Q = clamp(0.9, 1.3, 0.9 + 0.4 * (Number(v.ai_confidence) || 0.5)); vKind = "ai" }

    const C = 1 + 0.5 * (1 - Math.exp(-streak / 21))
    const T = clamp(0.30, 1.20, 0.30 + 0.009 * trustScore)           // Trust → multiplicador
    const S = [1.0, 0.55, 0.30, 0.15][nSameToday] ?? 0.10
    const h = spHour()
    const K = (h >= 2 && h < 5) ? 0.9 : 1.0

    let capFactor = 1.0
    if (xpToday > 250) capFactor = 0.25
    else if (xpToday > 150) capFactor = 0.5
    if (xpDimToday > 60) capFactor *= 0.5

    // Crit: só com verificação N2+ (Q ≥ 0.85), 5%
    const crit = Q >= 0.85 && Math.random() < 0.05
    const critMult = crit ? 2 : 1

    let xp = Math.round(B * D * Q * C * T * S * K * capFactor) * critMult
    if (xp < 1 && nSameToday === 0) xp = 1
    xp = Math.max(0, xp)

    // ── Persistência ──
    const { error: insErr } = await admin.from("xp_events").insert({
      user_id: user.id, source_type: sourceType, source_id: sourceId,
      dimension, title_norm: titleNorm,
      base: B, d: D, q: Q, c: C, t: T, s: S, k: K, crit, xp_final: xp,
      meta: { title, difficulty, minutes, priority, rarity, nRepeats30d, nSameToday, xpToday, capFactor, level, trustScore },
    })
    if (insErr) throw new Error(`ledger: ${insErr.message}`)

    if (level >= 2) {
      await admin.from("verifications").insert({
        user_id: user.id, source_type: sourceType, source_id: sourceId,
        level, kind: vKind, answers: answersObj,
        ai_confidence: level === 4 ? (Number(v.ai_confidence) || null) : null,
        status: interviewGeneric ? "weak" : "valid",
      })
    }

    const { data: applied, error: applyErr } = await admin.rpc("veritas_apply_xp", { p_user_id: user.id, p_xp: xp })
    if (applyErr) throw new Error(`apply: ${applyErr.message}`)

    // ── Trust events (afetam ações FUTURAS, não esta) ──
    let newTrust = trustScore
    const bump = async (delta: number, reason: string, ref: any) => {
      const { data } = await admin.rpc("veritas_bump_trust", { p_user: user.id, p_delta: delta, p_reason: reason, p_ref: ref })
      if (typeof data === "number") newTrust = data
    }
    if (nBurst > 5) await bump(-5, "rajada", { count: nBurst })
    if (interviewSpecific) await bump(1.5, "n2_especifica", { source_id: sourceId })
    else if (interviewGeneric) await bump(-3, "n2_generica", { source_id: sourceId })

    return json({
      xp, total: applied?.new_xp ?? null, streak, crit, trust: newTrust, level,
      factors: { B, D: +D.toFixed(2), Q, C: +C.toFixed(2), T: +T.toFixed(2), S, K, capFactor, rarity: +rarity.toFixed(2) },
    })
  } catch (err: any) {
    console.error("xp-engine error:", err)
    return json({ error: err?.message || "Falha ao processar XP." }, 500)
  }
})
