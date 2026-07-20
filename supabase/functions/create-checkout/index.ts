// ============================================================
// ORVAX — create-checkout (Stripe Checkout, modo subscription)
// Cria a sessão de pagamento para o plano escolhido e devolve a URL.
// Autentica pelo JWT do usuário; guarda o stripe_customer_id no perfil.
//
// Secrets necessários (supabase secrets set ...):
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_ESSENCIAL       (Essencial · mensal)
//   STRIPE_PRICE_ESSENCIAL_TRI   (Essencial · trimestral)
//   STRIPE_PRICE_COMPLETO        (Completo · mensal)
//   STRIPE_PRICE_COMPLETO_TRI    (Completo · trimestral)
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY são padrão)
//
// Deploy: supabase functions deploy create-checkout
// ============================================================

import Stripe from "https://esm.sh/stripe@17.7.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
const PRICE: Record<string, string> = {
  essencial: Deno.env.get("STRIPE_PRICE_ESSENCIAL") ?? "",
  essencial_tri: Deno.env.get("STRIPE_PRICE_ESSENCIAL_TRI") ?? "",
  completo: Deno.env.get("STRIPE_PRICE_COMPLETO") ?? "",
  completo_tri: Deno.env.get("STRIPE_PRICE_COMPLETO_TRI") ?? "",
}
const VALID_PLANS = new Set(["essencial", "essencial_tri", "completo", "completo_tri"])
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  httpClient: Stripe.createFetchHttpClient(),
})
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!STRIPE_SECRET_KEY) return json({ error: "STRIPE_SECRET_KEY não configurada." }, 500)

  // 1. Autentica o usuário pelo JWT
  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  let body: { plan?: string; origin?: string }
  try { body = await req.json() } catch { return json({ error: "JSON inválido." }, 400) }
  const plan = VALID_PLANS.has(body.plan ?? "") ? (body.plan as string) : "essencial"
  const priceId = PRICE[plan]
  if (!priceId) return json({ error: `Preço do plano "${plan}" não configurado no servidor.` }, 500)

  const origin = (body.origin || "").replace(/\/$/, "") || "https://app.orvax.com"

  try {
    // 2. Reaproveita ou cria o customer do Stripe
    const { data: profile } = await admin.from("profiles")
      .select("stripe_customer_id, full_name").eq("id", user.id).maybeSingle()

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: profile?.full_name ?? undefined,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id)
    }

    // 2.5. Já tem assinatura ativa? Então é UPGRADE/DOWNGRADE de plano —
    // atualiza o item existente (com proração) em vez de criar outra.
    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 3 })
    const activeSub = existing.data.find((s: any) => s.status === "active" || s.status === "trialing")
    if (activeSub) {
      const item = activeSub.items.data[0]
      if (item?.price?.id !== priceId) {
        await stripe.subscriptions.update(activeSub.id, {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: "create_prorations",
          metadata: { user_id: user.id, plan },
        })
      }
      // webhook (customer.subscription.updated) sincroniza o profile
      return json({ url: `${origin}/?checkout=success`, updated: true })
    }

    // 3. Cria a sessão de checkout (assinatura recorrente — o intervalo
    //    mensal/trimestral vem do próprio price configurado no Stripe)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
      subscription_data: { metadata: { user_id: user.id, plan } },
      metadata: { user_id: user.id, plan },
    })

    return json({ url: session.url })
  } catch (err: any) {
    console.error("create-checkout error:", err)
    return json({ error: err?.message || "Falha ao criar checkout." }, 500)
  }
})
