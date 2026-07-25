// ============================================================
// ORVAX — stripe-webhook (fonte de verdade do acesso; verify_jwt=false)
//
// Fluxo NOVO (app = só acesso; venda na Landing Page):
//   LP → Stripe → ESTE webhook → Supabase → app libera por plano.
//
// NÃO existe plano gratuito: 2 planos pagos (essencial|completo).
// Sem assinatura ativa → plan='none' e o app mostra o AccessGate.
//
// Quem compra na LP normalmente NÃO tem conta ainda. Então aqui:
//   1. acha o usuário (metadata.user_id → stripe_customer_id → e-mail)
//   2. se não existir, CRIA no Auth (e-mail já confirmado) + profile
//   3. envia e-mail de acesso: link pra definir senha + link do app
//   4. grava plan/is_premium/is_subscribed (o app só LÊ isso)
// ============================================================
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? ""
const PRICE_ESSENCIAL = Deno.env.get("STRIPE_PRICE_ESSENCIAL") ?? ""
const PRICE_ESSENCIAL_TRI = Deno.env.get("STRIPE_PRICE_ESSENCIAL_TRIMESTRAL") ?? ""
const PRICE_COMPLETO = Deno.env.get("STRIPE_PRICE_COMPLETO") ?? ""
const PRICE_COMPLETO_TRI = Deno.env.get("STRIPE_PRICE_COMPLETO_TRIMESTRAL") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// E-mail de boas-vindas (opcional: sem RESEND_API_KEY o acesso é criado
// mesmo assim; o usuário pode usar "esqueci minha senha" no app)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const FROM_EMAIL = Deno.env.get("UPGRADE_FROM_EMAIL") ?? "ORVAX <noreply@orvax.com.br>"
const PLAY_STORE_URL = Deno.env.get("PLAY_STORE_URL") ?? "https://play.google.com/store/apps/details?id=com.orvax.app"
const PASSWORD_REDIRECT = Deno.env.get("PASSWORD_SETUP_REDIRECT") ?? "https://orvax.com.br/definir-senha"

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ACTIVE = new Set(["active", "trialing"])
const TIER_LABEL: Record<string, string> = { essencial: "Essencial", completo: "Completo" }

// Preco -> tier (essencial | completo). O intervalo (mensal/trimestral) nao muda o acesso.
function tierFromSubscription(sub: any): "essencial" | "completo" {
  const priceId = sub?.items?.data?.[0]?.price?.id
  if (priceId && (priceId === PRICE_COMPLETO || priceId === PRICE_COMPLETO_TRI)) return "completo"
  if (priceId && (priceId === PRICE_ESSENCIAL || priceId === PRICE_ESSENCIAL_TRI)) return "essencial"
  const m = String(sub?.metadata?.tier || sub?.metadata?.plan || "")
  return m.startsWith("completo") ? "completo" : "essencial"
}

// ── E-mail de acesso (nova conta criada pela compra na LP) ──────
async function sendWelcomeEmail(to: string, tier: string, setupLink: string | null) {
  if (!RESEND_API_KEY) { console.warn("welcome email: sem RESEND_API_KEY"); return }
  const label = TIER_LABEL[tier] || "ORVAX"
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111">
      <h2 style="letter-spacing:1px">ORVAX</h2>
      <p>Sua compra do plano <strong>${label}</strong> foi confirmada. Bem-vindo.</p>
      <p>Sua conta já está criada com este e-mail (<strong>${to}</strong>).</p>
      ${setupLink ? `
      <p><strong>1.</strong> Defina sua senha:</p>
      <p style="margin:18px 0">
        <a href="${setupLink}" style="background:#111;color:#fff;padding:14px 26px;border-radius:12px;text-decoration:none;font-weight:bold">
          Definir minha senha
        </a>
      </p>` : `
      <p><strong>1.</strong> Baixe o app e use "Esqueci minha senha" para definir seu acesso.</p>`}
      <p><strong>2.</strong> Baixe o aplicativo:</p>
      <p style="margin:18px 0">
        <a href="${PLAY_STORE_URL}" style="background:#111;color:#fff;padding:14px 26px;border-radius:12px;text-decoration:none;font-weight:bold">
          Baixar o ORVAX
        </a>
      </p>
      <p><strong>3.</strong> Faça login no app — seu plano ${label} já estará liberado.</p>
      <p style="font-size:12px;color:#666">Dúvidas? Responda este e-mail.</p>
    </div>`
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject: `Seu acesso ao ORVAX (${label}) está pronto`, html }),
    })
    if (!res.ok) console.error("welcome email falhou:", res.status, await res.text())
  } catch (e) {
    console.error("welcome email erro:", (e as Error)?.message)
  }
}

/**
 * Garante que existe um usuário para este comprador.
 * Ordem: metadata.user_id → stripe_customer_id → e-mail → CRIA.
 * @returns { userId, created }
 */
async function resolveOrCreateUser(sub: any, sessionEmail?: string | null):
  Promise<{ userId: string | null; created: boolean; email: string | null }> {
  // 1) veio do app (usuário já logado)
  const metaId: string | undefined = sub?.metadata?.user_id
  if (metaId) return { userId: metaId, created: false, email: null }

  // 2) já é cliente conhecido
  if (sub.customer) {
    const { data } = await admin.from("profiles").select("id, email")
      .eq("stripe_customer_id", sub.customer).maybeSingle()
    if (data?.id) return { userId: data.id, created: false, email: data.email ?? null }
  }

  // 3) descobre o e-mail do comprador
  let email = sessionEmail ?? null
  if (!email && sub.customer) {
    try {
      const cust: any = await stripe.customers.retrieve(sub.customer as string)
      email = cust?.email ?? null
    } catch (e) { console.warn("customers.retrieve:", (e as Error)?.message) }
  }
  if (!email) return { userId: null, created: false, email: null }
  const emailLc = email.toLowerCase()

  // 4) já existe profile com esse e-mail?
  const { data: byEmail } = await admin.from("profiles").select("id")
    .ilike("email", emailLc).maybeSingle()
  if (byEmail?.id) return { userId: byEmail.id, created: false, email: emailLc }

  // 5) cria a conta (e-mail confirmado; senha aleatória — o usuário define
  //    a dele pelo link do e-mail de boas-vindas)
  const tempPassword = crypto.randomUUID() + crypto.randomUUID()
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: emailLc,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: emailLc.split("@")[0], source: "landing_page" },
  })
  if (createErr || !created?.user) {
    // corrida: alguém criou nesse meio-tempo → tenta achar de novo
    console.warn("createUser:", createErr?.message)
    const { data: retry } = await admin.from("profiles").select("id").ilike("email", emailLc).maybeSingle()
    return { userId: retry?.id ?? null, created: false, email: emailLc }
  }

  const uid = created.user.id
  // profile (o trigger do banco pode já criar; upsert é idempotente)
  await admin.from("profiles").upsert(
    { id: uid, email: emailLc, role: "user", is_first_login: true },
    { onConflict: "id" },
  )
  return { userId: uid, created: true, email: emailLc }
}

async function syncSubscription(sub: any, sessionEmail?: string | null) {
  const tier = tierFromSubscription(sub)
  const active = ACTIVE.has(sub.status)
  const isSubscribed = active
  const isPremium = active && tier === "completo"

  const { userId, created, email } = await resolveOrCreateUser(sub, sessionEmail)
  if (!userId) {
    console.error("webhook: nao consegui resolver/criar usuario para sub", sub.id)
    return
  }

  const { error } = await admin.from("profiles").update({
    subscription_id: sub.id,
    subscription_status: sub.status,
    plan: active ? tier : "none",   // não existe plano gratuito: none = sem acesso
    is_subscribed: isSubscribed,
    is_premium: isPremium,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    stripe_customer_id: sub.customer ?? undefined,
  }).eq("id", userId)
  if (error) { console.error("webhook: update profile falhou:", error.message); return }
  console.log(`webhook: ${userId} -> ${sub.status}/${tier} (sub=${isSubscribed}, premium=${isPremium}, novo=${created})`)

  // Conta recém-criada pela compra → e-mail de acesso (senha + app)
  if (created && email && active) {
    let setupLink: string | null = null
    try {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: PASSWORD_REDIRECT },
      })
      setupLink = (link as any)?.properties?.action_link ?? null
    } catch (e) { console.warn("generateLink:", (e as Error)?.message) }
    await sendWelcomeEmail(email, tier, setupLink)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })
  const sig = req.headers.get("stripe-signature")
  if (!sig || !WEBHOOK_SECRET) return new Response("Missing signature/secret", { status: 400 })

  const raw = await req.text()
  let event: any
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider)
  } catch (err: any) {
    console.error("Assinatura invalida do webhook:", err?.message)
    return new Response(`Webhook signature error: ${err?.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          if (!sub.metadata?.user_id && session.metadata?.user_id) {
            sub.metadata = { ...sub.metadata, user_id: session.metadata.user_id, plan: session.metadata.plan, tier: session.metadata.tier }
          }
          // e-mail do comprador (compra feita na LP, sem conta prévia)
          const email = session.customer_details?.email || session.customer_email || null
          await syncSubscription(sub, email)
        }
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object)
        break
      }
      default:
        break
    }
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } })
  } catch (err: any) {
    console.error("webhook handler error:", err)
    return new Response(`Handler error: ${err?.message}`, { status: 500 })
  }
})
