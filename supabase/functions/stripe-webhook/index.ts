// ORVAX — stripe-webhook (fonte de verdade do acesso; verify_jwt=false) — 4 planos
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

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  httpClient: Stripe.createFetchHttpClient(),
})
const cryptoProvider = Stripe.createSubtleCryptoProvider()
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const ACTIVE = new Set(["active", "trialing"])

// Preco -> tier (essencial | completo). O intervalo (mensal/trimestral) nao muda o acesso.
function tierFromSubscription(sub: any): "essencial" | "completo" {
  const priceId = sub?.items?.data?.[0]?.price?.id
  if (priceId && (priceId === PRICE_COMPLETO || priceId === PRICE_COMPLETO_TRI)) return "completo"
  if (priceId && (priceId === PRICE_ESSENCIAL || priceId === PRICE_ESSENCIAL_TRI)) return "essencial"
  const m = String(sub?.metadata?.tier || sub?.metadata?.plan || "")
  return m.startsWith("completo") ? "completo" : "essencial"
}

async function syncSubscription(sub: any) {
  const tier = tierFromSubscription(sub)
  const active = ACTIVE.has(sub.status)
  const isSubscribed = active
  const isPremium = active && tier === "completo"

  let userId: string | undefined = sub?.metadata?.user_id
  if (!userId && sub.customer) {
    const { data } = await admin.from("profiles").select("id")
      .eq("stripe_customer_id", sub.customer).maybeSingle()
    userId = data?.id
  }
  if (!userId) { console.warn("webhook: user_id nao encontrado para sub", sub.id); return }

  const { error } = await admin.from("profiles").update({
    subscription_id: sub.id,
    subscription_status: sub.status,
    plan: active ? tier : "none",
    is_subscribed: isSubscribed,
    is_premium: isPremium,
    current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
    stripe_customer_id: sub.customer ?? undefined,
  }).eq("id", userId)
  if (error) console.error("webhook: update profile falhou:", error.message)
  else console.log(`webhook: ${userId} -> ${sub.status}/${tier} (sub=${isSubscribed}, premium=${isPremium})`)
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
          await syncSubscription(sub)
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
