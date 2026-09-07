// ============================================================
// ORVAX — transcribe-audio
//
// POR QUE ESTA FUNÇÃO EXISTE
//
// O ditado por voz usava a Web Speech API do navegador. Ela é
// grátis e instantânea, mas tem um problema fatal para este
// produto: no app INSTALADO no celular ela frequentemente não
// existe, e quando a permissão foi negada não há barra de endereço
// nem cadeado para reabrir. O usuário fica sem microfone e sem
// caminho de volta.
//
// Aqui o app grava o áudio com MediaRecorder — que é a API padrão
// de mídia, funciona em PWA instalado e pede permissão pelo diálogo
// nativo do sistema — e manda para cá. A transcrição acontece no
// SERVIDOR, com a chave da OpenAI guardada no servidor. Isso
// respeita a regra do projeto: nenhuma VITE_* de LLM no bundle,
// porque qualquer VITE_* viaja dentro do app e extrair string de
// APK é trivial.
//
// Custo: Whisper cobra por minuto de áudio, não por token. Um
// ditado de 10 segundos custa frações de centavo — mas a cota
// diária abaixo existe para que um bug de repetição não vire uma
// fatura.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Teto de transcrições por dia, por pessoa. Áudio é barato, mas um
// laço acidental no cliente não pode virar prejuízo.
const LIMITE_DIARIO = 120
// Áudio maior que isso é quase certamente engano — ditado de app é
// medido em segundos, não em minutos.
const TAMANHO_MAXIMO = 8 * 1024 * 1024 // 8 MB

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

/** Data de hoje em São Paulo — o mesmo critério de dia usado no mentor-chat. */
const spToday = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
    if (!OPENAI_API_KEY) return json({ error: "Transcrição não configurada no servidor." }, 500)

    // 1. Autenticação pelo JWT do usuário
    const authHeader = req.headers.get("Authorization") || ""
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: "Não autenticado." }, 401)

    // 2. A conta de amostra é pública e sem cadastro: liberar
    //    transcrição paga ali seria pagar OpenAI por quem só olha.
    const { data: prof } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle()
    if (String(prof?.plan ?? "").toLowerCase() === "demo") {
        return json({ error: "O ditado por voz faz parte dos planos.", code: "demo_sem_ia" }, 403)
    }

    // 3. Cota diária
    try {
        const { data: quota } = await admin.rpc("ai_quota_take", {
            p_user: user.id, p_fn: "transcribe-audio", p_day: spToday(), p_limit: LIMITE_DIARIO,
        })
        const q = Array.isArray(quota) ? quota[0] : quota
        if (q && q.allowed === false) {
            return json({ error: "Você usou o ditado bastante hoje. Amanhã ele volta.", code: "quota_exceeded" }, 429)
        }
    } catch (_) {
        // Sem a RPC de cota a transcrição segue: perder o ditado por
        // causa do contador seria pior que o risco de custo.
    }

    // 4. Recebe o áudio
    let arquivo: File | null = null
    try {
        const form = await req.formData()
        const f = form.get("file")
        if (f instanceof File) arquivo = f
    } catch {
        return json({ error: "Envio inválido." }, 400)
    }
    if (!arquivo) return json({ error: "Nenhum áudio recebido." }, 400)
    if (arquivo.size > TAMANHO_MAXIMO) return json({ error: "Áudio longo demais." }, 413)
    if (arquivo.size < 1024) return json({ error: "Áudio muito curto.", code: "curto" }, 400)

    // 5. Whisper
    try {
        const envio = new FormData()
        envio.append("file", arquivo, arquivo.name || "audio.webm")
        envio.append("model", "whisper-1")
        envio.append("language", "pt")
        // Dá contexto ao modelo: nomes do produto e vocabulário do app
        // reduzem erro de transcrição em termos que ele nunca viu.
        envio.append("prompt", "ORVAX, hábito, sequência, missão, dossiê, cofre, telemetria, XP.")

        const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
            body: envio,
        })

        if (!r.ok) {
            const detalhe = await r.text()
            console.error("[transcribe-audio] OpenAI:", r.status, detalhe.slice(0, 300))
            return json({ error: "Não consegui transcrever agora." }, 502)
        }

        const { text } = await r.json()
        const limpo = String(text || "").trim()
        if (!limpo) return json({ error: "Não captei nada no áudio.", code: "vazio" }, 200)

        return json({ text: limpo })
    } catch (e) {
        console.error("[transcribe-audio] falhou:", (e as Error).message)
        return json({ error: "Não consegui transcrever agora." }, 500)
    }
})
