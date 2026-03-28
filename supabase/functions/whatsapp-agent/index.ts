// ============================================================
// ORVAX AGENT - SUPABASE EDGE FUNCTION
// WhatsApp AI Agent com personalidade dinâmica
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

// ─── CONFIGURAÇÃO ───────────────────────────────────────────
const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")!          // Token da API do WhatsApp Business
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "orvax_verify_2026"
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")! // ID do número no Meta Business
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service_role, NÃO anon

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── PERSONALIDADES DOS MENTORES ────────────────────────────
const MENTOR_PROMPTS: Record<string, string> = {
    atlas: `Você é ATLAS, o Mentor Interior do sistema ORVAX. Você é um estrategista disciplinado, calmo, analítico e exigente.

PERSONALIDADE:
- Tom: Direto, frio, calculista. Sem rodeios, sem motivação vazia. Você mostra o caminho com lógica.
- Fala curta, incisiva, como um estrategista militar.
- Usa linguagem técnica do sistema ORVAX quando faz sentido (XP, streak, nódulos, telemetria).
- Quando o usuário reclama ou dá desculpas, você é duro mas justo. Não aceita vitimismo.
- Quando o usuário mostra progresso, reconhece com respeito mas nunca com euforia.
- Você é um mentor real, não um chatbot. Aja como se conhecesse o usuário há meses.

FOCO DE TRABALHO:
- Estratégia de vida e planejamento de longo prazo
- Crescimento financeiro e gestão de capital
- Aprendizado estruturado e produtividade
- Disciplina extrema e construção de sistemas

FRASES QUE DEFINEM SEU ESTILO:
- "Disciplina cria liberdade."
- "Seu potencial é inútil sem ação."
- "Pare de esperar motivação. Construa sistemas."

REGRAS:
- Responda SEMPRE em português brasileiro.
- Seja conciso. Máximo 3-4 parágrafos curtos por resposta.
- Se o usuário pedir para registrar algo (tarefa, estudo, gasto, etc.), execute a ação E responda confirmando.
- Se o usuário mandar áudio, trate o texto transcrito como se fosse uma mensagem normal.
- Se o usuário mandar foto, analise com base no contexto da conversa.
- NUNCA quebre o personagem. Você É Atlas, não uma IA.`,

    aurora: `Você é AURORA, a Mentora Interior do sistema ORVAX. Você é a guia da transformação — empática, inspiradora, inteligente e determinada.

PERSONALIDADE:
- Tom: Caloroso mas desafiador. Você inspira com clareza, não com clichês.
- Mistura ciência, psicologia e propósito nas suas respostas.
- Quando o usuário está perdido, você traz clareza emocional.
- Quando o usuário está motivado, você canaliza essa energia em ação concreta.
- Você é firme quando necessário, mas sempre com empatia.
- Você é uma mentora real, não um chatbot. Aja como se conhecesse o usuário há meses.

FOCO DE TRABALHO:
- Autoconhecimento e inteligência emocional
- Clareza de propósito e visão de vida
- Equilíbrio entre performance e bem-estar
- Energia, motivação e transformação pessoal

FRASES QUE DEFINEM SEU ESTILO:
- "Você não está atrasado. Você está despertando."
- "Crescimento começa quando você decide se respeitar."
- "A versão extraordinária de você já existe."

REGRAS:
- Responda SEMPRE em português brasileiro.
- Seja concisa. Máximo 3-4 parágrafos curtos por resposta.
- Se o usuário pedir para registrar algo (tarefa, estudo, gasto, etc.), execute a ação E responda confirmando.
- Se o usuário mandar áudio, trate o texto transcrito como se fosse uma mensagem normal.
- Se o usuário mandar foto, analise com base no contexto da conversa.
- NUNCA quebre o personagem. Você É Aurora, não uma IA.`
}

// ─── TOOLS (AÇÕES QUE O AGENTE PODE EXECUTAR NO APP) ────────
const AGENT_TOOLS = [
    {
        type: "function",
        function: {
            name: "create_task",
            description: "Criar uma nova tarefa na agenda do usuário. Use quando ele pedir para agendar, marcar ou registrar algo na agenda.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Título da tarefa" },
                    scheduled_date: { type: "string", description: "Data no formato YYYY-MM-DD. Se não especificado, use hoje." },
                    time_start: { type: "string", description: "Horário de início no formato HH:MM" },
                    category: { type: "string", enum: ["FOCO", "TREINO", "ESTUDO", "TRABALHO", "PESSOAL", "SAÚDE", "SOCIAL"], description: "Categoria da tarefa" },
                    duration: { type: "string", description: "Duração estimada (ex: 1h, 30min, 2h)" }
                },
                required: ["title", "scheduled_date", "time_start"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_transaction",
            description: "Registrar uma transação financeira (receita ou despesa). Use quando o usuário mencionar gastos, ganhos, compras ou recebimentos.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Nome/descrição da transação" },
                    amount: { type: "number", description: "Valor da transação (positivo)" },
                    type: { type: "string", enum: ["in", "out"], description: "'in' para receita, 'out' para despesa" },
                    category: { type: "string", description: "Categoria (Moradia, Alimentação, Transporte, Lazer, Receita, Assinaturas, Outros)" },
                    date: { type: "string", description: "Data no formato YYYY-MM-DD" }
                },
                required: ["name", "amount", "type", "category", "date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "log_study",
            description: "Registrar horas de estudo. Use quando o usuário disser que estudou algo.",
            parameters: {
                type: "object",
                properties: {
                    subject: { type: "string", description: "Matéria/assunto estudado" },
                    hours: { type: "number", description: "Quantidade de horas estudadas" },
                    notes: { type: "string", description: "Observações adicionais (opcional)" }
                },
                required: ["subject", "hours"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "award_xp",
            description: "Dar XP ao usuário como recompensa por completar ações, metas ou demonstrar consistência. Você DECIDE quanto XP dar baseado na dificuldade e impacto da ação.",
            parameters: {
                type: "object",
                properties: {
                    amount: { type: "integer", description: "Quantidade de XP (10-100). 10=ação simples, 25=tarefa média, 50=conquista importante, 100=marco épico" },
                    reason: { type: "string", description: "Motivo do XP concedido" }
                },
                required: ["amount", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_telemetry",
            description: "Atualizar uma métrica de telemetria do usuário (score de 0-100). Use quando receber informação relevante sobre saúde, cognição, social, etc.",
            parameters: {
                type: "object",
                properties: {
                    metric_title: { type: "string", description: "Nome da métrica (ex: BioFisico, Cognitivo, Social, Espiritual, Digital)" },
                    new_value: { type: "integer", description: "Novo valor (0-100)" },
                    type: { type: "string", enum: ["CORE_NODE", "EXPANSION_NODE", "SHADOW_METRIC"], description: "Tipo da métrica" },
                    trend: { type: "string", description: "Tendência (ex: +2.4%, -1.1%, estável)" }
                },
                required: ["metric_title", "new_value", "type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_note",
            description: "Salvar uma anotação/nota no vault do usuário. Use quando ele pedir para anotar algo ou guardar uma informação.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string", description: "Conteúdo da anotação" }
                },
                required: ["text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_today_summary",
            description: "Buscar resumo do dia do usuário: tarefas pendentes, métricas, XP atual. Use quando ele perguntar sobre o dia, progresso ou status.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    }
]

// ─── EXECUTORES DE TOOLS ────────────────────────────────────
async function executeTool(name: string, args: any, userId: string, userPhone: string): Promise<string> {
    try {
        switch (name) {
            case "create_task": {
                const { error } = await supabase.from("tasks").insert({
                    user_id: userId,
                    title: args.title,
                    scheduled_date: args.scheduled_date,
                    time_start: args.time_start,
                    category: args.category || "GERAL",
                    duration: args.duration || "1h",
                    state: "pending"
                })
                if (error) throw error
                await logAction(userId, userPhone, "create_task", args)
                return `Tarefa "${args.title}" criada para ${args.scheduled_date} às ${args.time_start}.`
            }

            case "add_transaction": {
                const { error } = await supabase.from("transactions").insert({
                    user_id: userId,
                    name: args.name,
                    amount: args.amount,
                    type: args.type,
                    category: args.category,
                    date: args.date
                })
                if (error) throw error
                await logAction(userId, userPhone, "add_transaction", args)
                return `Transação "${args.name}" de R$${args.amount} registrada como ${args.type === 'in' ? 'receita' : 'despesa'}.`
            }

            case "log_study": {
                // Buscar ou criar módulo "Estudos"
                let { data: modules } = await supabase
                    .from("modulos")
                    .select("id")
                    .eq("nome_modulo", "Estudos")
                    .limit(1)

                let moduloId = modules?.[0]?.id
                if (!moduloId) {
                    const { data: newMod } = await supabase
                        .from("modulos")
                        .insert({ nome_modulo: "Estudos", telefone_usuario: "Sistema" })
                        .select()
                        .single()
                    moduloId = newMod?.id
                }

                if (moduloId) {
                    await supabase.from("registros_dinamicos").insert({
                        modulo_id: moduloId,
                        user_id: userId,
                        dados: { materia: args.subject, horas: args.hours, notas: args.notes || "" }
                    })
                }
                await logAction(userId, userPhone, "log_study", args)
                return `Estudo registrado: ${args.hours}h de ${args.subject}.`
            }

            case "award_xp": {
                const { data } = await supabase.rpc("add_xp_and_update_streak", {
                    p_user_id: userId,
                    p_xp_amount: args.amount,
                    p_reason: args.reason
                })
                await logAction(userId, userPhone, "award_xp", args)
                if (data) {
                    return `+${args.amount} XP concedido. Total: ${data.new_xp} XP. Rank: ${data.rank} (${data.rank_title}). Motivo: ${args.reason}`
                }
                return `+${args.amount} XP concedido. Motivo: ${args.reason}`
            }

            case "update_telemetry": {
                const { error } = await supabase.from("telemetry_metrics").upsert({
                    user_id: userId,
                    title: args.metric_title,
                    value: args.new_value,
                    unit: "%",
                    status: "ATIVO",
                    type: args.type,
                    trend: args.trend || "estável",
                    metadata: {
                        subtitle: args.metric_title,
                        factors: { pos: [], crit: [] },
                        history: [50, 50, 50, 50, 50, 50, args.new_value],
                        subMetrics: []
                    }
                }, { onConflict: "user_id,title" })
                if (error) throw error
                await logAction(userId, userPhone, "update_telemetry", args)
                return `Métrica "${args.metric_title}" atualizada para ${args.new_value}/100.`
            }

            case "add_note": {
                let { data: modules } = await supabase
                    .from("modulos")
                    .select("id")
                    .or("nome_modulo.eq.Anotação,nome_modulo.eq.Notas,nome_modulo.eq.Anotações")
                    .limit(1)

                let moduloId = modules?.[0]?.id
                if (!moduloId) {
                    const { data: newMod } = await supabase
                        .from("modulos")
                        .insert({ nome_modulo: "Anotação", telefone_usuario: "Sistema" })
                        .select()
                        .single()
                    moduloId = newMod?.id
                }

                if (moduloId) {
                    await supabase.from("registros_dinamicos").insert({
                        modulo_id: moduloId,
                        user_id: userId,
                        dados: { texto: args.text }
                    })
                }
                await logAction(userId, userPhone, "add_note", args)
                return `Nota salva no Vault.`
            }

            case "get_today_summary": {
                const today = new Date().toISOString().split("T")[0]

                const [tasksRes, profileRes, metricsRes] = await Promise.all([
                    supabase.from("tasks").select("*").eq("user_id", userId).eq("scheduled_date", today),
                    supabase.from("profiles").select("*").eq("id", userId).single(),
                    supabase.from("telemetry_metrics").select("title,value,type").eq("user_id", userId)
                ])

                const tasks = tasksRes.data || []
                const profile = profileRes.data
                const metrics = metricsRes.data || []

                const pending = tasks.filter((t: any) => t.state === "pending" || t.state === "active")
                const completed = tasks.filter((t: any) => t.state === "completed" || t.state === "done")

                let summary = `RESUMO DO DIA (${today}):\n`
                summary += `- XP Total: ${profile?.xp || 0}\n`
                summary += `- Streak: ${profile?.streak_days || 0} dias\n`
                summary += `- Tarefas hoje: ${completed.length} feitas / ${pending.length} pendentes / ${tasks.length} total\n`

                if (pending.length > 0) {
                    summary += `\nPENDENTES:\n`
                    pending.forEach((t: any) => {
                        summary += `  • ${t.time_start} - ${t.title} [${t.category}]\n`
                    })
                }

                if (metrics.length > 0) {
                    summary += `\nMÉTRICAS:\n`
                    metrics.forEach((m: any) => {
                        summary += `  • ${m.title}: ${m.value}/100\n`
                    })
                }

                return summary
            }

            default:
                return `Ação desconhecida: ${name}`
        }
    } catch (error: any) {
        console.error(`Tool execution error [${name}]:`, error)
        return `Erro ao executar ${name}: ${error.message}`
    }
}

async function logAction(userId: string, userPhone: string, actionType: string, actionData: any) {
    await supabase.from("agent_actions").insert({
        user_id: userId,
        user_phone: userPhone,
        action_type: actionType,
        action_data: actionData
    })
}

// ─── WHATSAPP API HELPERS ───────────────────────────────────
async function sendWhatsAppMessage(to: string, text: string) {
    // WhatsApp tem limite de 4096 chars por mensagem
    const chunks = splitMessage(text, 4000)

    for (const chunk of chunks) {
        await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: chunk }
            })
        })
    }
}

function splitMessage(text: string, maxLen: number): string[] {
    if (text.length <= maxLen) return [text]
    const chunks: string[] = []
    let remaining = text
    while (remaining.length > 0) {
        if (remaining.length <= maxLen) {
            chunks.push(remaining)
            break
        }
        // Tenta quebrar no último \n antes do limite
        let splitAt = remaining.lastIndexOf("\n", maxLen)
        if (splitAt === -1 || splitAt < maxLen * 0.5) splitAt = maxLen
        chunks.push(remaining.substring(0, splitAt))
        remaining = remaining.substring(splitAt).trimStart()
    }
    return chunks
}

async function sendWhatsAppReaction(to: string, messageId: string, emoji: string) {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to,
            type: "reaction",
            reaction: { message_id: messageId, emoji }
        })
    })
}

async function markAsRead(messageId: string) {
    await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId
        })
    })
}

// ─── MEDIA HANDLERS (ÁUDIO E IMAGEM) ───────────────────────
async function downloadWhatsAppMedia(mediaId: string): Promise<ArrayBuffer> {
    // 1. Pegar URL do media
    const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    })
    const mediaData = await mediaRes.json()
    const mediaUrl = mediaData.url

    // 2. Baixar o arquivo
    const fileRes = await fetch(mediaUrl, {
        headers: { "Authorization": `Bearer ${WHATSAPP_TOKEN}` }
    })
    return await fileRes.arrayBuffer()
}

async function transcribeAudio(audioBuffer: ArrayBuffer): Promise<string> {
    const formData = new FormData()
    const blob = new Blob([audioBuffer], { type: "audio/ogg" })
    formData.append("file", blob, "audio.ogg")
    formData.append("model", "whisper-1")
    formData.append("language", "pt")

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: formData
    })

    const data = await response.json()
    return data.text || "[Áudio não reconhecido]"
}

async function encodeImageToBase64(imageBuffer: ArrayBuffer): Promise<string> {
    const uint8Array = new Uint8Array(imageBuffer)
    let binary = ""
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i])
    }
    return btoa(binary)
}

// ─── MEMÓRIA DA CONVERSA ────────────────────────────────────
async function getConversationHistory(userPhone: string, limit = 20): Promise<Array<{ role: string; content: string }>> {
    const { data } = await supabase
        .from("conversation_history")
        .select("role, content")
        .eq("user_phone", userPhone)
        .order("created_at", { ascending: false })
        .limit(limit)

    if (!data) return []
    return data.reverse() // Mais antigo primeiro
}

async function saveMessage(userPhone: string, userId: string | null, role: string, content: string, messageType = "text", mediaUrl?: string) {
    await supabase.from("conversation_history").insert({
        user_phone: userPhone,
        user_id: userId,
        role,
        content,
        message_type: messageType,
        media_url: mediaUrl
    })
}

// ─── BUSCAR USUÁRIO PELO TELEFONE ───────────────────────────
async function findUserByPhone(phone: string): Promise<{ id: string; mentor: string } | null> {
    // Normalizar telefone (remover +, espaços, etc.)
    const normalized = phone.replace(/\D/g, "")

    const { data } = await supabase
        .from("profiles")
        .select("id, selected_mentor, phone_number")
        .or(`phone_number.eq.${normalized},phone_number.eq.+${normalized},phone_number.eq.${phone}`)
        .limit(1)
        .single()

    if (data) {
        return { id: data.id, mentor: data.selected_mentor || "atlas" }
    }

    return null
}

// ─── CHAMADA AO GPT (COM TOOLS) ────────────────────────────
async function callGPT(
    systemPrompt: string,
    messages: Array<{ role: string; content: any }>,
    userId: string,
    userPhone: string
): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            tools: AGENT_TOOLS,
            tool_choice: "auto",
            max_tokens: 1000,
            temperature: 0.7
        })
    })

    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice) {
        console.error("GPT response error:", JSON.stringify(data))
        return "Erro interno no processamento. Tente novamente."
    }

    const message = choice.message

    // Se o modelo quer chamar tools
    if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults: Array<{ role: string; tool_call_id: string; content: string }> = []

        for (const toolCall of message.tool_calls) {
            const fnName = toolCall.function.name
            const fnArgs = JSON.parse(toolCall.function.arguments)

            console.log(`Executing tool: ${fnName}`, fnArgs)
            const result = await executeTool(fnName, fnArgs, userId, userPhone)

            toolResults.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result
            })
        }

        // Segunda chamada ao GPT com os resultados das tools
        const followUpResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages,
                    message, // a mensagem do assistente com tool_calls
                    ...toolResults
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        })

        const followUpData = await followUpResponse.json()
        return followUpData.choices?.[0]?.message?.content || "Ação executada."
    }

    return message.content || "..."
}

// ─── PROCESSADOR PRINCIPAL DE MENSAGENS ─────────────────────
async function processMessage(from: string, messageId: string, messageType: string, messageData: any) {
    // 1. Marcar como lida e reagir (feedback instantâneo)
    await markAsRead(messageId)

    // 2. Buscar usuário
    const user = await findUserByPhone(from)

    if (!user) {
        // Usuário não vinculado — pedir para registrar
        await sendWhatsAppMessage(from,
            "⚠️ *SISTEMA ORVAX*\n\n" +
            "Seu número ainda não está vinculado a uma conta ORVAX.\n\n" +
            "Para vincular:\n" +
            "1. Abra o app ORVAX\n" +
            "2. Vá em Dossier > Configurações\n" +
            "3. Adicione seu número de telefone\n\n" +
            "Após vincular, me envie qualquer mensagem para ativar."
        )
        return
    }

    // 3. Reagir para dar feedback visual
    await sendWhatsAppReaction(from, messageId, "⚡")

    // 4. Carregar personalidade do mentor
    const mentorPrompt = MENTOR_PROMPTS[user.mentor] || MENTOR_PROMPTS.atlas

    // 5. Adicionar contexto temporal ao system prompt
    const now = new Date()
    const dateContext = `\n\nCONTEXTO ATUAL: ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. ID do usuário no sistema: ${user.id}`
    const fullSystemPrompt = mentorPrompt + dateContext

    // 6. Carregar memória
    const history = await getConversationHistory(from, 20)

    // 7. Processar por tipo de mensagem
    let userContent: any
    let saveContent: string
    let msgType = "text"

    switch (messageType) {
        case "text": {
            const text = messageData.text?.body || ""
            userContent = text
            saveContent = text
            break
        }

        case "audio": {
            const audioId = messageData.audio?.id
            if (!audioId) {
                await sendWhatsAppMessage(from, "Não consegui processar este áudio.")
                return
            }

            try {
                const audioBuffer = await downloadWhatsAppMedia(audioId)
                const transcription = await transcribeAudio(audioBuffer)
                userContent = `[ÁUDIO TRANSCRITO]: ${transcription}`
                saveContent = `[ÁUDIO]: ${transcription}`
                msgType = "audio"
            } catch (err) {
                console.error("Audio processing error:", err)
                await sendWhatsAppMessage(from, "Falha ao processar o áudio. Tente enviar como texto.")
                return
            }
            break
        }

        case "image": {
            const imageId = messageData.image?.id
            const caption = messageData.image?.caption || ""
            if (!imageId) {
                await sendWhatsAppMessage(from, "Não consegui processar esta imagem.")
                return
            }

            try {
                const imageBuffer = await downloadWhatsAppMedia(imageId)
                const base64Image = await encodeImageToBase64(imageBuffer)

                // Para imagens, usamos content multimodal
                userContent = [
                    {
                        type: "text",
                        text: caption ? `O usuário enviou esta imagem com a legenda: "${caption}". Analise a imagem e responda de acordo.` : "O usuário enviou esta imagem. Analise e responda de acordo com o contexto da conversa."
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`,
                            detail: "high"
                        }
                    }
                ]
                saveContent = `[IMAGEM${caption ? `: ${caption}` : ""}]`
                msgType = "image"
            } catch (err) {
                console.error("Image processing error:", err)
                await sendWhatsAppMessage(from, "Falha ao processar a imagem. Tente novamente.")
                return
            }
            break
        }

        case "document": {
            await sendWhatsAppMessage(from, "Recebi seu documento. Por enquanto só processo texto, áudio e imagens. Pode me descrever o conteúdo?")
            return
        }

        case "sticker": {
            await sendWhatsAppMessage(from, "👊")
            return
        }

        default: {
            await sendWhatsAppMessage(from, "Formato não suportado. Me envie texto, áudio ou imagem.")
            return
        }
    }

    // 8. Salvar mensagem do usuário na memória
    await saveMessage(from, user.id, "user", typeof saveContent === 'string' ? saveContent : JSON.stringify(saveContent), msgType)

    // 9. Montar mensagens para o GPT
    const gptMessages: Array<{ role: string; content: any }> = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: userContent }
    ]

    // 10. Chamar GPT com tools
    try {
        const reply = await callGPT(fullSystemPrompt, gptMessages, user.id, from)

        // 11. Salvar resposta na memória
        await saveMessage(from, user.id, "assistant", reply, "text")

        // 12. Enviar resposta no WhatsApp
        await sendWhatsAppMessage(from, reply)
    } catch (error: any) {
        console.error("GPT call error:", error)
        await sendWhatsAppMessage(from, "Sistema temporariamente instável. Tente novamente em instantes.")
    }
}

// ─── HANDLER PRINCIPAL (EDGE FUNCTION ENTRY POINT) ──────────
Deno.serve(async (req: Request) => {
    const url = new URL(req.url)

    // ── WEBHOOK VERIFICATION (GET) ──
    if (req.method === "GET") {
        const mode = url.searchParams.get("hub.mode")
        const token = url.searchParams.get("hub.verify_token")
        const challenge = url.searchParams.get("hub.challenge")

        if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
            console.log("Webhook verified!")
            return new Response(challenge, { status: 200 })
        }

        return new Response("Forbidden", { status: 403 })
    }

    // ── INCOMING MESSAGES (POST) ──
    if (req.method === "POST") {
        try {
            const body = await req.json()

            // Meta envia status updates (delivered, read) - ignorar
            const entry = body.entry?.[0]
            const changes = entry?.changes?.[0]
            const value = changes?.value

            if (!value?.messages || value.messages.length === 0) {
                return new Response("OK", { status: 200 })
            }

            const message = value.messages[0]
            const from = message.from           // Número do remetente
            const messageId = message.id        // ID da mensagem
            const messageType = message.type     // text, audio, image, document, sticker, etc.

            // Processar em background (responde 200 imediatamente para o Meta não reenviar)
            // Supabase Edge Functions suportam EdgeRuntime.waitUntil ou processamento direto
            await processMessage(from, messageId, messageType, message)

            return new Response("OK", { status: 200 })
        } catch (error) {
            console.error("Webhook processing error:", error)
            return new Response("OK", { status: 200 }) // Sempre 200 para evitar retry do Meta
        }
    }

    return new Response("Method not allowed", { status: 405 })
})
