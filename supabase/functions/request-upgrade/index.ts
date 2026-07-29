// ============================================================
// ORVAX — request-upgrade Edge Function
// O app NÃO vende. Aqui registramos a intenção de upgrade e
// enviamos ao usuário um E-MAIL com o link da Landing Page (a
// venda acontece 100% fora do app → conforme Google Play).
//
// Sem preço, sem checkout, sem link de compra no app. O link de
// compra viaja por e-mail (canal externo ao Play).
// Envio via Resend (RESEND_API_KEY); sem a chave, só registra a
// intenção (o backend/LP pode fazer follow-up depois).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL = Deno.env.get("UPGRADE_FROM_EMAIL") ?? "ORVAX <noreply@orvaxapp.com.br>"
const LANDING_URL = Deno.env.get("LANDING_URL") ?? "https://orvaxapp.com.br"
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

const TIER_LABEL: Record<string, string> = { essencial: "Essencial", completo: "Completo" }

async function sendEmail(to: string, tier: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  const label = TIER_LABEL[tier] || "premium"
  const link = `${LANDING_URL}/?plano=${encodeURIComponent(tier)}&utm_source=app&utm_medium=upgrade`
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="letter-spacing:1px">ORVAX</h2>
      <p>Você pediu para desbloquear o plano <strong>${label}</strong>.</p>
      <p>É rápido: conclua pelo link abaixo e o acesso é liberado automaticamente no app assim que o pagamento é confirmado.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#111;color:#fff;padding:14px 26px;border-radius:12px;text-decoration:none;font-weight:bold">
          Desbloquear ${label}
        </a>
      </p>
      <p style="font-size:12px;color:#666">Se você não pediu isso, ignore este e-mail.</p>
    </div>`
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL, to: [to],
        subject: `Desbloquear o plano ${label} — ORVAX`,
        html,
      }),
    })
    return res.ok
  } catch (e) {
    console.error("[request-upgrade] resend:", (e as Error)?.message)
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  let body: any = {}
  try { body = await req.json() } catch { /* vazio */ }
  const tier = ["essencial", "completo"].includes(String(body.tier)) ? String(body.tier) : "completo"
  const feature = body.feature ? String(body.feature).slice(0, 40) : null

  try {
    // anti-spam leve: no máx. 1 pedido do mesmo tier a cada 10 min
    const since = new Date(Date.now() - 10 * 60_000).toISOString()
    const { data: recent } = await admin.from("upgrade_requests")
      .select("id").eq("user_id", user.id).eq("requested_tier", tier)
      .gte("created_at", since).limit(1)
    const throttled = !!(recent && recent.length)

    const emailed = throttled ? true : await sendEmail(user.email || "", tier)

    if (!throttled) {
      await admin.from("upgrade_requests").insert({
        user_id: user.id, requested_tier: tier, source_feature: feature, emailed,
      })
    }

    return json({ ok: true, emailed, email: user.email || null })
  } catch (err: any) {
    console.error("request-upgrade error:", err)
    return json({ error: err?.message || "Falha ao registrar o pedido." }, 500)
  }
})
