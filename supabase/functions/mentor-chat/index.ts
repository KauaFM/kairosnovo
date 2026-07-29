// ============================================================
// ORVAX — mentor-chat Edge Function
// Assistente de IA NATIVO do app. Substitui o agente do WhatsApp:
// assume a persona do mentor selecionado (profiles.selected_mentor →
// mentor_personas), mantém memória (conversation_history) e executa
// as MESMAS ações (criar tarefa, transação, estudo, XP, telemetria,
// nota, resumo do dia).
//
// Autenticação: o app chama via supabase.functions.invoke, que envia
// o JWT do usuário no header Authorization. Daqui extraímos o user.
// A chave da OpenAI fica SOMENTE no servidor (Supabase secret).
//
// Deploy:
//   supabase functions deploy mentor-chat
//   supabase secrets set OPENAI_API_KEY=sk-...
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

// Cliente com service role para escrever (bypassa RLS, igual ao WhatsApp agent).
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Mensagens/dia por usuário. Conversa longa com o mentor é ~15 mensagens;
// 60 é 4x isso, então ninguém real esbarra — o limite é contra script.
const DAILY_LIMIT = 60
// Dia local de SP
const spToday = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })

// Sentinela de canal — o app não tem telefone; conversation_history pode ter
// user_phone NOT NULL (legado WhatsApp). Histórico é consultado por user_id.
const APP_CHANNEL = "app"

// ─── PERSONA FALLBACK (se mentor_personas não tiver a linha) ────
const FALLBACK_PROMPT = `Você é o Mentor Interior do sistema ORVAX. Tom direto, sem rodeios.
Responda SEMPRE em português brasileiro, conciso (máx. 3-4 parágrafos curtos). NUNCA quebre o personagem.`

// ─── TOOLS ──────────────────────────────────────────────────
const AGENT_TOOLS = [
    {
        type: "function",
        function: {
            name: "create_task",
            description: "Criar uma tarefa na agenda do usuário. Use quando ele pedir para agendar/marcar/registrar algo na agenda.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título da tarefa" },
                    scheduled_date: { type: "string", description: "Data YYYY-MM-DD. Se não dito, use hoje." },
                    time_start: { type: "string", description: "Horário HH:MM" },
                    category: { type: "string", enum: ["FOCO", "TREINO", "ESTUDO", "TRABALHO", "PESSOAL", "SAÚDE", "SOCIAL"] },
                    duration: { type: "string", description: "Duração (ex: 1h, 30min)" },
                },
                required: ["title", "scheduled_date", "time_start"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "add_transaction",
            description: "Registrar uma transação financeira (receita/despesa). Use ao mencionar gastos, ganhos, compras ou recebimentos.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    amount: { type: "number", description: "Valor positivo" },
                    type: { type: "string", enum: ["in", "out"], description: "'in' receita, 'out' despesa" },
                    category: { type: "string", description: "Moradia, Alimentação, Transporte, Lazer, Receita, Assinaturas, Outros" },
                    date: { type: "string", description: "Data YYYY-MM-DD" },
                },
                required: ["name", "amount", "type", "category", "date"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "log_study",
            description: "Registrar horas de estudo. Use quando o usuário disser que estudou algo.",
            parameters: {
                type: "object",
                properties: {
                    subject: { type: "string" },
                    hours: { type: "number" },
                    notes: { type: "string" },
                },
                required: ["subject", "hours"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "award_xp",
            description: "Dar XP como recompensa por ações/consistência. Você decide o valor pela dificuldade e impacto.",
            parameters: {
                type: "object",
                properties: {
                    amount: { type: "integer", description: "10=simples, 25=média, 50=conquista, 100=marco épico" },
                    reason: { type: "string" },
                },
                required: ["amount", "reason"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "update_telemetry",
            description: "Atualizar uma métrica de telemetria (0-100). Use ao receber info sobre saúde, cognição, social, etc.",
            parameters: {
                type: "object",
                properties: {
                    metric_title: { type: "string", description: "Ex: BioFisico, Cognitivo, Social, Espiritual, Digital" },
                    new_value: { type: "integer", description: "0-100" },
                    type: { type: "string", enum: ["CORE_NODE", "EXPANSION_NODE", "SHADOW_METRIC"] },
                    trend: { type: "string", description: "Ex: +2.4%, -1.1%, estável" },
                },
                required: ["metric_title", "new_value", "type"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "add_note",
            description: "Salvar uma anotação no Vault do usuário. Use quando ele pedir para anotar/guardar algo.",
            parameters: {
                type: "object",
                properties: { text: { type: "string" } },
                required: ["text"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_today_summary",
            description: "Buscar o resumo do dia: tarefas, métricas, XP, streak. Use quando perguntar sobre o dia/progresso/status.",
            parameters: { type: "object", properties: {}, required: [] },
        },
    },
]

// ─── EXECUTORES ─────────────────────────────────────────────
async function executeTool(name: string, args: any, userId: string): Promise<string> {
    try {
        switch (name) {
            case "create_task": {
                const { error } = await admin.from("tasks").insert({
                    user_id: userId,
                    title: args.title,
                    scheduled_date: args.scheduled_date,
                    time_start: args.time_start,
                    category: args.category || "PESSOAL",
                    duration: args.duration || "1h",
                    state: "pending",
                })
                if (error) throw error
                await logAction(userId, "create_task", args)
                return `Tarefa "${args.title}" criada para ${args.scheduled_date} às ${args.time_start}.`
            }
            case "add_transaction": {
                const { error } = await admin.from("transactions").insert({
                    user_id: userId, name: args.name, amount: args.amount,
                    type: args.type, category: args.category, date: args.date,
                })
                if (error) throw error
                await logAction(userId, "add_transaction", args)
                return `Transação "${args.name}" de R$${args.amount} registrada como ${args.type === "in" ? "receita" : "despesa"}.`
            }
            case "log_study": {
                let { data: modules } = await admin.from("modulos").select("id").eq("nome_modulo", "Estudos").limit(1)
                let moduloId = modules?.[0]?.id
                if (!moduloId) {
                    const { data: newMod } = await admin.from("modulos")
                        .insert({ nome_modulo: "Estudos", telefone_usuario: "Sistema" }).select().single()
                    moduloId = newMod?.id
                }
                if (moduloId) {
                    await admin.from("registros_dinamicos").insert({
                        modulo_id: moduloId, user_id: userId,
                        dados: { materia: args.subject, horas: args.hours, notas: args.notes || "" },
                    })
                }
                await logAction(userId, "log_study", args)
                return `Estudo registrado: ${args.hours}h de ${args.subject}.`
            }
            case "award_xp": {
                const { data } = await admin.rpc("add_xp_and_update_streak", {
                    p_user_id: userId, p_xp_amount: args.amount, p_reason: args.reason,
                })
                await logAction(userId, "award_xp", args)
                if (data) return `+${args.amount} XP. Total: ${data.new_xp} XP. Rank: ${data.rank} (${data.rank_title}). Motivo: ${args.reason}`
                return `+${args.amount} XP concedido. Motivo: ${args.reason}`
            }
            case "update_telemetry": {
                const { error } = await admin.from("telemetry_metrics").upsert({
                    user_id: userId, title: args.metric_title, value: args.new_value,
                    unit: "%", status: "ATIVO", type: args.type, trend: args.trend || "estável",
                    metadata: { subtitle: args.metric_title, factors: { pos: [], crit: [] }, history: [50, 50, 50, 50, 50, 50, args.new_value], subMetrics: [] },
                }, { onConflict: "user_id,title" })
                if (error) throw error
                await logAction(userId, "update_telemetry", args)
                return `Métrica "${args.metric_title}" atualizada para ${args.new_value}/100.`
            }
            case "add_note": {
                // App nativo: grava em user_notes (visível no Vault), não no legado modulos.
                const { error } = await admin.from("user_notes").insert({
                    user_id: userId,
                    title: String(args.text).slice(0, 80),
                    content: args.text,
                })
                if (error) throw error
                await logAction(userId, "add_note", args)
                return "Nota salva no Vault."
            }
            case "get_today_summary": {
                return await buildTodaySummary(userId)
            }
            default:
                return `Ação desconhecida: ${name}`
        }
    } catch (error: any) {
        console.error(`Tool error [${name}]:`, error)
        return `Erro ao executar ${name}: ${error.message}`
    }
}

async function logAction(userId: string, actionType: string, actionData: any) {
    try {
        await admin.from("agent_actions").insert({
            user_id: userId, user_phone: APP_CHANNEL, action_type: actionType, action_data: actionData,
        })
    } catch (_) { /* não bloqueia a conversa */ }
}

async function buildTodaySummary(userId: string): Promise<string> {
    const today = new Date().toISOString().split("T")[0]
    const [tasksRes, profileRes, metricsRes] = await Promise.all([
        admin.from("tasks").select("*").eq("user_id", userId).eq("scheduled_date", today),
        admin.from("profiles").select("*").eq("id", userId).single(),
        admin.from("telemetry_metrics").select("title,value,type").eq("user_id", userId),
    ])
    const tasks = tasksRes.data || []
    const profile = profileRes.data
    const metrics = metricsRes.data || []
    const pending = tasks.filter((t: any) => t.state === "pending" || t.state === "active")
    const completed = tasks.filter((t: any) => t.state === "completed" || t.state === "done")

    let s = `RESUMO DO DIA (${today}):\n`
    s += `- XP Total: ${profile?.xp || 0}\n`
    s += `- Streak: ${profile?.streak_days || 0} dias\n`
    s += `- Tarefas hoje: ${completed.length} feitas / ${pending.length} pendentes / ${tasks.length} total\n`
    if (pending.length > 0) {
        s += `\nPENDENTES:\n`
        pending.forEach((t: any) => { s += `  • ${t.time_start} - ${t.title} [${t.category}]\n` })
    }
    if (metrics.length > 0) {
        s += `\nMÉTRICAS:\n`
        metrics.forEach((m: any) => { s += `  • ${m.title}: ${m.value}/100\n` })
    }
    return s
}

// ─── MEMÓRIA ────────────────────────────────────────────────
async function getHistory(userId: string, limit = 20): Promise<Array<{ role: string; content: string }>> {
    const { data } = await admin.from("conversation_history")
        .select("role, content").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(limit)
    if (!data) return []
    return data.reverse().map((h: any) => ({ role: h.role, content: h.content }))
}

async function saveMessage(userId: string, role: string, content: string) {
    try {
        await admin.from("conversation_history").insert({
            user_id: userId, user_phone: APP_CHANNEL, role, content, message_type: "text",
        })
    } catch (e) { console.warn("saveMessage falhou:", (e as Error).message) }
}

// ─── GPT (com tools, 2 passos) ─────────────────────────────
async function callGPT(systemPrompt: string, messages: Array<{ role: string; content: any }>, userId: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: systemPrompt }, ...messages],
            tools: AGENT_TOOLS, tool_choice: "auto", max_tokens: 1000, temperature: 0.7,
        }),
    })
    const data = await res.json()
    const choice = data.choices?.[0]
    if (!choice) { console.error("GPT error:", JSON.stringify(data)); throw new Error("Falha no processamento da IA.") }
    const message = choice.message

    if (message.tool_calls?.length > 0) {
        const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = []
        for (const tc of message.tool_calls) {
            const fnArgs = JSON.parse(tc.function.arguments || "{}")
            const result = await executeTool(tc.function.name, fnArgs, userId)
            toolResults.push({ role: "tool", tool_call_id: tc.id, content: result })
        }
        const followUp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "system", content: systemPrompt }, ...messages, message, ...toolResults],
                max_tokens: 1000, temperature: 0.7,
            }),
        })
        const followData = await followUp.json()
        return followData.choices?.[0]?.message?.content || "Ação executada."
    }
    return message.content || "..."
}

// ─── HANDLER ────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
    if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY não configurada no servidor." }, 500)

    // 1. Autenticar pelo JWT do usuário
    const authHeader = req.headers.get("Authorization") || ""
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr || !user) return json({ error: "Não autenticado." }, 401)
    const userId = user.id

    let body: { message?: string }
    try { body = await req.json() } catch { return json({ error: "JSON inválido." }, 400) }
    const text = (body.message || "").trim()
    if (!text) return json({ error: "Mensagem vazia." }, 400)

    // Cota diária (admin passa livre) — teto de custo por usuário
    const { data: quota } = await admin.rpc("ai_quota_take", {
        p_user: userId, p_fn: "mentor-chat", p_day: spToday(), p_limit: DAILY_LIMIT,
    })
    const q = Array.isArray(quota) ? quota[0] : quota
    if (q && q.allowed === false) {
        return json({
            error: `Conversamos bastante hoje (${q.quota} mensagens). Amanhã eu volto — aproveita pra executar o que combinamos.`,
            code: "quota_exceeded",
        }, 429)
    }

    // 2. Persona do mentor selecionado
    let mentorId = "atlas"
    let mentorPrompt = FALLBACK_PROMPT
    try {
        const { data: profile } = await admin.from("profiles").select("selected_mentor").eq("id", userId).maybeSingle()
        mentorId = profile?.selected_mentor || "atlas"
        const { data: persona } = await admin.from("mentor_personas").select("system_prompt").eq("id", mentorId).maybeSingle()
        if (persona?.system_prompt) mentorPrompt = persona.system_prompt
    } catch (e) { console.warn("persona fallback:", (e as Error).message) }

    // 3. Contexto temporal + do usuário (o mentor "conhece" o usuário)
    const now = new Date()
    const dateCtx = `\n\nCONTEXTO ATUAL: ${now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} às ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`
    let userCtx = ""
    try { userCtx = `\n\n${await buildTodaySummary(userId)}` } catch (_) { /* opcional */ }
    const systemPrompt = mentorPrompt + dateCtx + userCtx

    // 4. Memória + chamada
    try {
        const history = await getHistory(userId, 20)
        await saveMessage(userId, "user", text)
        const gptMessages = [...history.map(h => ({ role: h.role, content: h.content })), { role: "user", content: text }]
        const reply = await callGPT(systemPrompt, gptMessages, userId)
        await saveMessage(userId, "assistant", reply)
        return json({ reply, mentorId })
    } catch (err: any) {
        console.error("mentor-chat error:", err)
        return json({ error: err?.message || "Sistema instável. Tente novamente." }, 500)
    }
})
