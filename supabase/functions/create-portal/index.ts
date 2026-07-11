// ============================================================
// ORVAX — create-portal (Stripe Customer Portal)
// Abre o portal onde o usuário gerencia/cancela a assinatura e vê faturas.
// Autentica pelo JWT; usa o stripe_customer_id do perfil.
//
// Deploy: supabase functions deploy create-portal
// ============================================================

import Stripe from "https://esm.sh/stripe@17.7.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? ""
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

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  let body: { origin?: string }
  try { body = await req.json() } catch { body = {} }
  const origin = (body.origin || "").replace(/\/$/, "") || "https://app.orvax.com"

  try {
    const { data: profile } = await admin.from("profiles")
      .select("stripe_customer_id").eq("id", user.id).maybeSingle()
    if (!profile?.stripe_customer_id) return json({ error: "Nenhuma assinatura encontrada." }, 400)

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/`,
    })
    return json({ url: session.url })
  } catch (err: any) {
    console.error("create-portal error:", err)
    return json({ error: err?.message || "Falha ao abrir o portal." }, 500)
  }
})
