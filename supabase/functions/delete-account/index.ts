// ============================================================
// ORVAX — delete-account Edge Function
// Exclusão de conta (Google Play: User Data / Account deletion).
//
// O usuário confirma no app → esta função (verify_jwt=true):
//   1. purga os dados via RPC veritas_purge_user_data (service_role)
//   2. remove os arquivos do Storage (avatars/food-photos/vault-media/
//      workout-media) na pasta {user_id}/  — best-effort
//   3. remove o usuário do Auth (admin.deleteUser)
// Irreversível. Sem service_role NADA disso é possível pelo cliente.
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

const BUCKETS = ["avatars", "food-photos", "vault-media", "workout-media"]

// Apaga recursivamente a pasta {uid}/ de um bucket (best-effort)
async function purgeBucket(bucket: string, uid: string) {
  try {
    const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 })
    if (!files || !files.length) return
    const paths = files.map((f) => `${uid}/${f.name}`)
    await admin.storage.from(bucket).remove(paths)
  } catch (e) {
    console.warn(`[delete-account] storage ${bucket}:`, (e as Error)?.message)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)

  // Confirmação explícita no corpo (defesa extra contra chamada acidental)
  let body: any = {}
  try { body = await req.json() } catch { /* vazio */ }
  if (body?.confirm !== "DELETE") return json({ error: "Confirmação ausente." }, 400)

  const uid = user.id
  try {
    // 1) dados relacionais (cascata a partir de profiles)
    const { error: purgeErr } = await admin.rpc("veritas_purge_user_data", { p_user: uid })
    if (purgeErr) throw new Error(`purge: ${purgeErr.message}`)

    // 2) arquivos do Storage
    for (const b of BUCKETS) await purgeBucket(b, uid)

    // 3) usuário do Auth
    const { error: delErr } = await admin.auth.admin.deleteUser(uid)
    if (delErr) throw new Error(`auth: ${delErr.message}`)

    return json({ ok: true })
  } catch (err: any) {
    console.error("delete-account error:", err)
    return json({ error: err?.message || "Falha ao excluir a conta." }, 500)
  }
})
