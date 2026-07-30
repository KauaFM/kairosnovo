// ============================================================
// ORVAX — xp-engine (Protocolo VERITAS · F3)
// Única entidade que emite XP. O cliente envia FATOS + verificação.
//
// XP = round(B×D×Q×C×T×S×K) × capFactor × crit
//   Q: nível de verificação (N1=0.6, N2=0.85/0.7, N3=1.1, N4=ai)
//   T: Índice de Integridade (trust_scores.score) → 0.30..1.20
//   + emite trust_events (rajada, N2 boa/genérica) e registra verifications.
// F3: source_type='ritual' → valida daily_reviews de hoje (1×/dia),
//   usa a nota calculada e o streak PRÓPRIO do ritual. Docs: GDD §2–§4.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// N4 — Tribunal de IA: audita a resposta da micro-entrevista (coerência/
// especificidade/plausibilidade) e devolve confiança 0..1. gpt-4o-mini.
async function auditAnswer(title: string, answer: string): Promise<{ confidence: number; reason: string }> {
  if (!OPENAI_API_KEY) return { confidence: 0.5, reason: "sem chave" }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você audita se um usuário realmente executou uma tarefa, avaliando a resposta dele sobre como foi. Julgue especificidade, coerência e plausibilidade. Responda SOMENTE JSON: {\"confidence\": number 0..1, \"reason\": string curta em pt-BR}. 1 = claramente específico/genuíno; 0 = genérico/evasivo/implausível." },
        { role: "user", content: `Tarefa: "${title}"\nResposta do usuário: "${answer}"` },
      ],
    }),
  })
  if (!res.ok) return { confidence: 0.5, reason: "erro llm" }
  const data = await res.json()
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}")
    return { confidence: clamp(0, 1, Number(parsed.confidence) || 0.5), reason: String(parsed.reason || "") }
  } catch { return { confidence: 0.5, reason: "parse" } }
}

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
  nutrition_day: 12,
}
const DIM_DEFAULT: Record<string, string> = {
  task: "execution", habit: "evolution", event: "execution", meeting: "social",
  reminder: "execution", payment: "capital", goal_progress: "evolution",
  goal_complete: "evolution", ritual: "evolution", challenge: "evolution", arena: "body", finance: "capital",
  nutrition_day: "body",
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
// Dia VERITAS (igual à SQL veritas_today): vira às 03:00 de SP → UTC-6
const spDayStr = () => new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10)

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

  // Teto duro de eventos por dia. Antes só existia a penalidade de Trust por
  // rajada (-5), que desestimula mas NÃO impede: um autenticado podia gravar
  // xp_events em laço e, de quebra, disparar a auditoria de IA a cada chamada.
  // 200/dia é ~5x o que um usuário intenso gera de verdade.
  {
    const spDay = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
    const { data: quota } = await admin.rpc("ai_quota_take", {
      p_user: user.id, p_fn: "xp-engine", p_day: spDay, p_limit: 200,
    })
    const q = Array.isArray(quota) ? quota[0] : quota
    if (q && q.allowed === false) {
      return json({ xp: 0, error: "Limite diário de registros atingido.", code: "quota_exceeded" }, 429)
    }
  }

  const title = String(body.title || sourceType).slice(0, 200)
  const titleNorm = normTitle(title) || sourceType
  const dimension = String(body.dimension || DIM_DEFAULT[sourceType] || "general").slice(0, 32)
  const difficulty = clamp(1, 5, Number(body.difficulty) || 2)
  let minutes = clamp(1, 480, Number(body.minutes) || 15)
  const priority = [1, 2, 3].includes(Number(body.priority)) ? Number(body.priority) : 3
  const sourceId = body.source_id ? String(body.source_id).slice(0, 64) : null

  // ── VITALIS N4 · FECHAR O DIA: XP por META BATIDA, não por registrar ──
  // Recompensa RESULTADO verificável (o servidor recalcula de food_logs vs
  // nutrition_plans), nunca a auto-declaração. 1×/dia. Zero input do cliente.
  if (sourceType === "nutrition_day") {
    try {
      const day = spDayStr()
      const dayStart = spDayStartISO()

      // já fechou hoje?
      const { data: dup } = await admin.from("xp_events")
        .select("id").eq("user_id", user.id).eq("source_type", "nutrition_day")
        .gte("created_at", dayStart).limit(1)
      if (dup && dup.length) return json({ xp: 0, already: true })

      const [{ data: plan }, { data: logs }, { data: trust }] = await Promise.all([
        admin.from("nutrition_plans").select("daily_calories, protein_g")
          .eq("user_id", user.id).eq("is_active", true).maybeSingle(),
        admin.from("food_logs").select("calories, protein_g")
          .eq("user_id", user.id).eq("log_date", day),
        admin.from("trust_scores").select("score").eq("user_id", user.id).maybeSingle(),
      ])
      if (!plan?.daily_calories) return json({ error: "Sem metas configuradas." }, 400)
      if (!logs || logs.length < 2) {
        return json({ error: "Registre pelo menos 2 refeições para fechar o dia." }, 400)
      }

      const kcal = logs.reduce((s: number, l: any) => s + (Number(l.calories) || 0), 0)
      const prot = logs.reduce((s: number, l: any) => s + (Number(l.protein_g) || 0), 0)
      const kcalRatio = kcal / plan.daily_calories
      const protRatio = plan.protein_g ? prot / plan.protein_g : 1

      // Dentro da meta = ±10% das calorias. Proteína >= 90% dá bônus.
      const onTarget = kcalRatio >= 0.90 && kcalRatio <= 1.10
      const proteinHit = protRatio >= 0.90
      // Q recompensa a precisão; fora da faixa ainda ganha algo (registrar importa)
      const Q = onTarget ? (proteinHit ? 1.15 : 0.95) : 0.5

      const trustScore = trust?.score ?? 50
      const T = clamp(0.30, 1.20, 0.30 + 0.009 * trustScore)
      const D = 1 + Math.min(0.3, (logs.length - 2) * 0.06) // constância no registro
      const h = spHour()
      const K = (h >= 2 && h < 5) ? 0.9 : 1.0

      const xp = Math.max(1, Math.round(BASE.nutrition_day * D * Q * T * K))

      const { error: insErr } = await admin.from("xp_events").insert({
        user_id: user.id, source_type: "nutrition_day", source_id: day,
        dimension: "body", title_norm: "nutrition day",
        base: BASE.nutrition_day, d: D, q: Q, c: 1, t: T, s: 1, k: K, crit: false, xp_final: xp,
        meta: { day, kcal: Math.round(kcal), protein: Math.round(prot), meals: logs.length,
                kcalRatio: +kcalRatio.toFixed(2), protRatio: +protRatio.toFixed(2), onTarget, proteinHit },
      })
      if (insErr) throw new Error(`ledger: ${insErr.message}`)
      const { data: applied, error: applyErr } = await admin.rpc("veritas_apply_xp", { p_user_id: user.id, p_xp: xp })
      if (applyErr) throw new Error(`apply: ${applyErr.message}`)

      return json({
        xp, total: applied?.new_xp ?? null, onTarget, proteinHit,
        kcal: Math.round(kcal), protein: Math.round(prot), meals: logs.length,
        goal: plan.daily_calories, protein_goal: plan.protein_g,
      })
    } catch (err: any) {
      console.error("xp-engine nutrition_day:", err)
      return json({ error: err?.message || "Falha ao fechar o dia." }, 500)
    }
  }

  // ── F3 · RITUAL: caminho próprio — a prova é a daily_review de HOJE ──
  // Nada vem do cliente: nota, atos e streak são lidos da linha que a RPC
  // veritas_submit_review calculou. xp_awarded garante 1×/dia (update condicional).
  if (sourceType === "ritual") {
    try {
      const day = spDayStr()
      const [{ data: rev }, { data: trust }, todayQ] = await Promise.all([
        admin.from("daily_reviews")
          .select("id, computed_score, acts, ritual_streak, xp_awarded, completed")
          .eq("user_id", user.id).eq("day", day).maybeSingle(),
        admin.from("trust_scores").select("score").eq("user_id", user.id).maybeSingle(),
        admin.from("xp_events").select("xp_final").eq("user_id", user.id).gte("created_at", spDayStartISO()),
      ])
      if (!rev || !rev.completed) return json({ error: "Ritual não registrado hoje." }, 400)
      if (rev.xp_awarded) return json({ xp: 0, already: true })

      // trava anti-corrida: só quem virar xp_awarded=false→true emite
      const { data: locked } = await admin.from("daily_reviews")
        .update({ xp_awarded: true }).eq("id", rev.id).eq("xp_awarded", false).select("id")
      if (!locked || !locked.length) return json({ xp: 0, already: true })

      const score = clamp(0, 10, Number(rev.computed_score) || 0)
      const acts = clamp(0, 6, Number(rev.acts) || 0)
      const rStreak = Math.max(1, Number(rev.ritual_streak) || 1)
      const trustScore = trust?.score ?? 50
      const xpToday = (todayQ.data ?? []).reduce((s: number, e: any) => s + (e.xp_final || 0), 0)

      const D = 0.8 + 0.05 * score                                  // dia melhor rende mais (0.8..1.3)
      const Q = acts >= 6 ? 1.0 : acts >= 4 ? 0.85 : 0.7            // ritual completo > exausto
      const C = 1 + 0.5 * (1 - Math.exp(-rStreak / 21))             // streak PRÓPRIO do ritual
      const T = clamp(0.30, 1.20, 0.30 + 0.009 * trustScore)
      const h = spHour()
      const K = (h >= 2 && h < 5) ? 0.9 : 1.0
      let capFactor = 1.0
      if (xpToday > 250) capFactor = 0.25
      else if (xpToday > 150) capFactor = 0.5

      const xp = Math.max(1, Math.round(BASE.ritual * D * Q * C * T * K * capFactor))

      const { error: insErr } = await admin.from("xp_events").insert({
        user_id: user.id, source_type: "ritual", source_id: String(rev.id),
        dimension: "evolution", title_norm: "ritual",
        base: BASE.ritual, d: D, q: Q, c: C, t: T, s: 1, k: K, crit: false, xp_final: xp,
        meta: { day, score, acts, ritual_streak: rStreak, trustScore, capFactor },
      })
      if (insErr) throw new Error(`ledger: ${insErr.message}`)
      const { data: applied, error: applyErr } = await admin.rpc("veritas_apply_xp", { p_user_id: user.id, p_xp: xp })
      if (applyErr) throw new Error(`apply: ${applyErr.message}`)

      return json({
        xp, total: applied?.new_xp ?? null, ritual_streak: rStreak, score,
        factors: { B: BASE.ritual, D: +D.toFixed(2), Q, C: +C.toFixed(2), T: +T.toFixed(2), K, capFactor },
      })
    } catch (err: any) {
      console.error("xp-engine ritual:", err)
      return json({ error: err?.message || "Falha no XP do ritual." }, 500)
    }
  }

  // Verificação declarada pelo cliente (o nível é ACEITO, o Q é decidido aqui)
  const v = body.verification || {}
  let level = [1, 2, 3, 4].includes(Number(v.level)) ? Number(v.level) : 1
  const answersObj = (v.answers && typeof v.answers === "object") ? v.answers : {}
  const answersText = normText(Object.values(answersObj).map((x: any) => String(x || "")).join(" "))
  const focusSessionId = v.session_id ? Number(v.session_id) : null

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

    // ── N3: valida a prova por timer de foco (duração é do servidor) ──
    let verifiedProof = false
    if (level === 3 && v.kind === "timer" && focusSessionId) {
      const { data: fs } = await admin.from("veritas_focus")
        .select("id, seconds, status, consumed")
        .eq("id", focusSessionId).eq("user_id", user.id).maybeSingle()
      if (fs && fs.status === "ended" && !fs.consumed && (fs.seconds ?? 0) >= 60) {
        minutes = clamp(1, 480, Math.round((fs.seconds ?? 0) / 60)) // duração REAL substitui a declarada
        verifiedProof = true
        await admin.from("veritas_focus").update({ consumed: true }).eq("id", fs.id)
      } else {
        level = 1 // sem prova válida (sessão curta/reusada/inexistente) → autodeclaração
      }
    } else if (level === 3) {
      level = 1 // F2.2 só suporta prova por timer; outros kinds caem pra N1
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
    if (verifiedProof) await bump(2, "n3_prova", { source_id: sourceId })
    if (interviewSpecific) await bump(1.5, "n2_especifica", { source_id: sourceId })
    else if (interviewGeneric) await bump(-3, "n2_generica", { source_id: sourceId })

    // ── N4: tribunal de IA (amostral, assíncrono) → ajusta o Trust FUTURO ──
    if (level === 2 && answersText.length >= 20) {
      const auditProb = clamp(0.03, 0.5, 0.55 - trustScore / 200)
      if (Math.random() < auditProb) {
        const rawAnswer = Object.values(answersObj).map((x: any) => String(x || "")).join(" ").slice(0, 500)
        try {
          // @ts-ignore EdgeRuntime existe no runtime da Supabase
          EdgeRuntime.waitUntil((async () => {
            try {
              const a = await auditAnswer(title, rawAnswer)
              await admin.from("verifications").insert({
                user_id: user.id, source_type: sourceType, source_id: sourceId,
                level: 4, kind: "ai", ai_confidence: a.confidence,
                status: a.confidence < 0.35 ? "rejected" : "valid",
                answers: { audit_reason: a.reason },
              })
              const delta = a.confidence >= 0.6 ? 5 : a.confidence < 0.35 ? -10 : 0
              if (delta !== 0) await admin.rpc("veritas_bump_trust", {
                p_user: user.id, p_delta: delta,
                p_reason: delta > 0 ? "auditoria_ok" : "auditoria_falha",
                p_ref: { source_id: sourceId, conf: a.confidence },
              })
            } catch (e) { console.error("audit bg:", e) }
          })())
        } catch (_) { /* runtime sem waitUntil: ignora a auditoria */ }
      }
    }

    return json({
      xp, total: applied?.new_xp ?? null, streak, crit, trust: newTrust, level,
      factors: { B, D: +D.toFixed(2), Q, C: +C.toFixed(2), T: +T.toFixed(2), S, K, capFactor, rarity: +rarity.toFixed(2) },
    })
  } catch (err: any) {
    console.error("xp-engine error:", err)
    return json({ error: err?.message || "Falha ao processar XP." }, 500)
  }
})
