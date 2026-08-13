// ============================================================
// ORVAX FitCal — nutri-coach (VITALIS · v3 · AGENTE COM MÃOS)
//
// v2 era um chat que SUGERIA e a pessoa tocava pra registrar.
// v3 é um profissional que EXECUTA: ele monta o plano do dia,
// registra o que você comeu, troca uma refeição e ajusta metas —
// via function calling. O servidor é quem escreve no banco (o
// modelo nunca toca no banco direto) e valida tudo antes.
//
// GUARD-RAILS (não remover):
//  · nunca prescreve/diagnostica (no BR dieta é ato de nutricionista) —
//    em tema clínico ele NÃO executa nada, só encaminha;
//  · zero linguagem de culpa (risco de transtorno alimentar);
//  · nunca sugere jejum/pular refeição/compensar comendo menos;
//  · metas nunca descem abaixo do piso calórico, nem mudam mais
//    que ±25% de uma vez — mesmo que o modelo peça;
//  · alergias são absolutas;
//  · rate limit por usuário (custo + antiabuso).
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const DAILY_LIMIT = 40          // comandos por usuário/dia
const MODEL = "gpt-4o-mini"
const CALORIE_FLOOR: Record<string, number> = { male: 1500, female: 1200 }
const SLOTS = ["breakfast", "lunch", "snack", "dinner"]
const SLOT_PT: Record<string, string> = {
  breakfast: "café da manhã", lunch: "almoço", snack: "lanche", dinner: "jantar",
}
// Até que hora ainda faz sentido planejar cada refeição, e quanto cabe nela.
// Sem isso o modelo planeja café da manhã às 19h e entrega 800 de 2100 kcal.
const SLOT_END: Record<string, number> = { breakfast: 10, lunch: 15, snack: 21, dinner: 23 }
const SLOT_CAP: Record<string, number> = { breakfast: 700, lunch: 900, snack: 400, dinner: 900 }

const slotsAhead = (hour: number) => {
  const ahead = SLOTS.filter(s => hour < SLOT_END[s])
  return ahead.length ? ahead : ["snack"]
}
/** O que dá pra distribuir de verdade no que resta do dia. */
const planBudget = (hour: number, remainingKcal: number) => {
  const capacity = slotsAhead(hour).reduce((a, s) => a + SLOT_CAP[s], 0)
  return Math.min(Math.max(0, remainingKcal), capacity)
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } })

// Dia local de SP (o diário usa data local)
const spToday = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10)
const spHour = () => new Date(Date.now() - 3 * 3600_000).getUTCHours()

const num = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)))
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max)

/* ── SYSTEM ─────────────────────────────────────────────────── */

const SYSTEM = `Você é o VITALIS, o nutricionista virtual do ORVAX. Fala pt-BR, direto, prático, sem enrolação.

VOCÊ NÃO É UM CHATBOT: você TRABALHA. Quando a pessoa fala, você EXECUTA a ação certa com as ferramentas disponíveis e depois resume em 1-2 frases o que fez. Não pergunte "quer que eu registre?" — registre. Não devolva uma lista pra ela copiar — monte o plano dela.

COMO DECIDIR A FERRAMENTA (o passado manda; leia o TEMPO VERBAL antes de tudo):
- Frase no PASSADO — "comi", "tomei", "almocei", "jantei", "lanchei", "acabei de comer", "mandei um X" → SEMPRE registrar_refeicao. NUNCA montar_plano_do_dia nesse caso: o que já foi comido vai pro diário, não pro plano. Estime porção e macros de forma realista; nunca peça o peso exato.
- Frase no FUTURO/pedido — "monta", "o que como", "me dá uma dieta", "planeja" → montar_plano_do_dia.
- Ela não gosta / não tem / quer outra coisa no lugar de um item do plano → trocar_refeicao.
- Ela pede pra mudar a meta de calorias ou macros → ajustar_metas (só se ela pedir explicitamente).
- Ela pede o que comprar / lista de mercado → montar_lista_compras.
- Ela só pergunta algo ("posso comer isso?", "tô na rua, o que peço?") → responda em texto, sem ferramenta, com 2-3 opções concretas dentro da resposta.

REGRAS INEGOCIÁVEIS:
1. NUNCA prescreva tratamento, não diagnostique. Se ela citar condição clínica (diabetes, doença renal, gestação, transtorno alimentar, medicação, cirurgia bariátrica): NÃO chame nenhuma ferramenta. Responda em 1-2 frases que isso precisa de um nutricionista/médico de verdade e ofereça só apoio geral.
2. NUNCA use culpa, vergonha ou julgamento. Nada de "você falhou/estourou/errou". Se ela comeu além do plano: acolha em 1 frase e mostre o ajuste possível. O dia continua.
3. NUNCA sugira jejum, pular refeição, "compensar" comendo menos depois, nem ficar abaixo da meta. Se sobrou pouca caloria, priorize proteína e volume (saciedade), nunca restrição.
4. ALERGIAS e INTOLERÂNCIAS são absolutas — jamais sugira ou planeje um alimento que as viole. Respeite também o padrão alimentar (vegano/vegetariano) e o que ela não gosta.
5. Comida REAL e acessível no Brasil, em medidas caseiras (padaria, mercado, marmita, o que dá pra fazer em casa). Nada de "150g de peito de frango" pra quem está na rua.
6. Ao montar o plano do dia: planeje SÓ as refeições que ainda faltam (respeite a hora atual e o que já foi comido), e distribua o que RESTA de calorias e proteína — não o dia inteiro de novo. Nenhuma refeição sozinha passa de ~900 kcal nem de ~55g de proteína: é comida de verdade, ninguém come 2 peitos de frango numa sentada. Se sobrar muita caloria pra poucas refeições, use pratos completos (arroz+feijão+carne+salada, macarrão com molho de carne) em vez de proteína pura.
7. Sua resposta em texto tem no MÁXIMO 2 frases. O valor está no que você executou, não no que você escreveu.`

/* ── TOOLS ──────────────────────────────────────────────────── */

const itemSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "nome curto do alimento/prato" },
    portion: { type: "string", description: "medida caseira, ex.: '1 unidade grande', '1 concha'" },
    grams: { type: "number", description: "peso aproximado em gramas (0 se não fizer sentido)" },
    kcal: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
  },
  required: ["name", "portion", "grams", "kcal", "protein_g", "carbs_g", "fat_g"],
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "registrar_refeicao",
      description: "Registra no diário o que a pessoa JÁ comeu ou bebeu. Use sempre que ela relatar consumo, mesmo que fora do plano.",
      parameters: {
        type: "object",
        properties: {
          meal_type: { type: "string", enum: SLOTS, description: "refeição a que pertence" },
          items: { type: "array", items: itemSchema, description: "1 a 6 itens" },
        },
        required: ["meal_type", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "montar_plano_do_dia",
      description: "Monta (ou remonta) o plano alimentar de hoje. Planeje apenas as refeições que ainda faltam e distribua as calorias/proteína restantes.",
      parameters: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            description: "as refeições planejadas, em ordem do dia",
            items: {
              type: "object",
              properties: {
                slot: { type: "string", enum: SLOTS },
                name: { type: "string" },
                portion: { type: "string" },
                kcal: { type: "number" },
                protein_g: { type: "number" },
                carbs_g: { type: "number" },
                fat_g: { type: "number" },
                why: { type: "string", description: "por que essa escolha, máx 8 palavras" },
              },
              required: ["slot", "name", "portion", "kcal", "protein_g", "carbs_g", "fat_g", "why"],
            },
          },
        },
        required: ["meals"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trocar_refeicao",
      description: "Substitui um item já planejado por outro equivalente (mesma faixa de calorias e proteína). Use o item_id que aparece no plano de hoje.",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "number", description: "id do item do plano a substituir" },
          novo: {
            type: "object",
            properties: {
              name: { type: "string" },
              portion: { type: "string" },
              kcal: { type: "number" },
              protein_g: { type: "number" },
              carbs_g: { type: "number" },
              fat_g: { type: "number" },
              why: { type: "string" },
            },
            required: ["name", "portion", "kcal", "protein_g", "carbs_g", "fat_g", "why"],
          },
        },
        required: ["item_id", "novo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ajustar_metas",
      description: "Altera as metas diárias. Use SÓ quando a pessoa pedir explicitamente. Nunca reduza abaixo do que é seguro.",
      parameters: {
        type: "object",
        properties: {
          daily_calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          motivo: { type: "string", description: "por que a mudança, 1 frase" },
        },
        required: ["motivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "montar_lista_compras",
      description: "Monta a lista de compras que sustenta as metas da pessoa nos próximos dias.",
      parameters: {
        type: "object",
        properties: {
          grupos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                grupo: { type: "string", description: "ex.: Proteínas, Hortifruti, Mercearia" },
                itens: { type: "array", items: { type: "string" } },
              },
              required: ["grupo", "itens"],
            },
          },
        },
        required: ["grupos"],
      },
    },
  },
]

/* ── CONTEXTO ───────────────────────────────────────────────── */

async function loadState(uid: string) {
  const today = spToday()
  const [plan, prefs, prof, logs, weight, planItems] = await Promise.all([
    admin.from("nutrition_plans").select("id, daily_calories, protein_g, carbs_g, fat_g, water_ml, goal, safety_floor")
      .eq("user_id", uid).eq("is_active", true).maybeSingle(),
    admin.from("nutrition_preferences").select("*").eq("user_id", uid).maybeSingle(),
    admin.from("profiles").select("gender, goal").eq("id", uid).maybeSingle(),
    // Diário ATIVO = food_logs (meal_entries é legado). Nome vem de name_snapshot.
    admin.from("food_logs").select("name_snapshot, calories, protein_g, carbs_g, fat_g, meal_type")
      .eq("user_id", uid).eq("log_date", today),
    admin.from("weight_logs").select("weight_kg").eq("user_id", uid)
      .order("log_date", { ascending: false }).limit(1).maybeSingle(),
    admin.from("meal_plan_items").select("*").eq("user_id", uid).eq("day", today)
      .order("position", { ascending: true }),
  ])

  const eaten = (logs.data ?? []).reduce((a: any, e: any) => ({
    kcal: a.kcal + (e.calories || 0), p: a.p + (e.protein_g || 0),
    c: a.c + (e.carbs_g || 0), f: a.f + (e.fat_g || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0 })

  return {
    today,
    plan: plan.data,
    prefs: prefs.data,
    profile: prof.data,
    logs: logs.data ?? [],
    items: planItems.data ?? [],
    weight: weight.data?.weight_kg ?? null,
    eaten: { kcal: Math.round(eaten.kcal), p: Math.round(eaten.p), c: Math.round(eaten.c), f: Math.round(eaten.f) },
  }
}

function contextText(s: Awaited<ReturnType<typeof loadState>>) {
  const P = s.plan, pr = s.prefs
  const lines = [`Hoje é ${s.today}, são ${spHour()}h.`]

  if (P) {
    lines.push(`METAS DO DIA: ${P.daily_calories} kcal · P ${P.protein_g}g · C ${P.carbs_g}g · G ${P.fat_g}g (objetivo: ${P.goal || s.profile?.goal || "manter"})`)
    lines.push(`JÁ CONSUMIU: ${s.eaten.kcal} kcal · P ${s.eaten.p}g · C ${s.eaten.c}g · G ${s.eaten.f}g`)
    lines.push(`RESTA HOJE: ${Math.max(0, P.daily_calories - s.eaten.kcal)} kcal · ${Math.max(0, P.protein_g - s.eaten.p)}g de proteína`)
  } else {
    lines.push(`METAS: ainda não calculadas. Diga pra pessoa tocar em "Calcular minhas metas" antes de montar plano.`)
    lines.push(`JÁ CONSUMIU HOJE: ${s.eaten.kcal} kcal`)
  }

  if (s.logs.length) {
    lines.push(`Comeu hoje: ${s.logs.map((e: any) => e.name_snapshot).filter(Boolean).slice(0, 10).join(", ")}`)
  }

  // Janela e orçamento: o modelo não estima isso bem sozinho
  const hour = spHour()
  const ahead = slotsAhead(hour)
  lines.push(`REFEIÇÕES QUE AINDA CABEM HOJE: ${ahead.map(s => SLOT_PT[s]).join(", ")}. NÃO planeje nenhuma outra.`)
  if (P) {
    const budget = planBudget(hour, P.daily_calories - s.eaten.kcal)
    lines.push(`ORÇAMENTO DO PLANO: distribua ~${budget} kcal entre essas refeições (a soma tem que chegar perto disso, nunca bem abaixo).`)
  }

  if (s.items.length) {
    lines.push("PLANO DE HOJE (use o item_id pra trocar):")
    for (const it of s.items) {
      lines.push(`  [item_id=${it.id}] ${SLOT_PT[it.slot] || it.slot}: ${it.name} (${it.portion || "-"}) — ${it.kcal} kcal, P ${it.protein_g}g · status: ${it.status}`)
    }
  } else {
    lines.push("PLANO DE HOJE: nenhum montado ainda.")
  }

  if (s.weight) lines.push(`Peso atual: ${s.weight} kg`)
  if (pr) {
    lines.push(`Padrão alimentar: ${pr.diet_type}`)
    if (pr.allergies?.length) lines.push(`ALERGIAS/INTOLERÂNCIAS (absolutas, nunca sugerir nem planejar): ${pr.allergies.join(", ")}`)
    if (pr.dislikes?.length) lines.push(`Não gosta: ${pr.dislikes.join(", ")}`)
    lines.push(`Come fora: ${pr.eats_out_freq} · cozinha em casa: ${pr.cooks_at_home} · orçamento: ${pr.budget_level} · ${pr.meals_per_day} refeições/dia`)
    if (pr.notes) lines.push(`Observações: ${pr.notes}`)
  }
  return lines.join("\n")
}

/* ── EXECUÇÃO DAS FERRAMENTAS (o servidor é quem escreve) ───── */

type Ctx = {
  uid: string
  userClient: ReturnType<typeof createClient>
  state: Awaited<ReturnType<typeof loadState>>
  attempt: number   // 1 = primeira tentativa; 2 = já foi corrigido uma vez
}

async function execRegistrar(ctx: Ctx, args: any) {
  const mealType = SLOTS.includes(args?.meal_type) ? args.meal_type : "snack"
  const items = (Array.isArray(args?.items) ? args.items : []).slice(0, 6)
  if (!items.length) return { ok: false, summary: "Nada pra registrar." }

  let kcal = 0
  const names: string[] = []
  for (const raw of items) {
    const it = {
      name: str(raw.name, 80), portion: str(raw.portion, 60),
      // log_food_from_ai rejeita grams <= 0; medida caseira nem sempre tem peso
      grams: num(raw.grams, 3000) || 100,
      kcal: num(raw.kcal, 3000),
      protein_g: num(raw.protein_g, 300), carbs_g: num(raw.carbs_g, 600), fat_g: num(raw.fat_g, 300),
    }
    if (!it.name) continue
    const { error } = await ctx.userClient.rpc("log_food_from_ai", {
      p_name: it.portion ? `${it.name} (${it.portion})` : it.name,
      p_meal_type: mealType,
      p_grams: it.grams,
      p_calories: it.kcal,
      p_protein: it.protein_g,
      p_carbs: it.carbs_g,
      p_fat: it.fat_g,
      p_confidence: 0.7,
      p_photo_url: null,
      p_log_date: ctx.state.today,
    })
    if (error) { console.error("[vitalis] log_food_from_ai:", error.message); continue }
    kcal += it.kcal
    names.push(it.name)
  }
  if (!names.length) return { ok: false, summary: "Não consegui registrar agora." }

  // Se o que ela comeu corresponde a algo planejado, marca o item como comido
  const planned = ctx.state.items.filter((i: any) => i.slot === mealType && i.status === "planned")
  for (const p of planned) {
    const key = String(p.name).toLowerCase().slice(0, 12)
    if (names.some(n => n.toLowerCase().slice(0, 12) === key)) {
      await admin.from("meal_plan_items")
        .update({ status: "eaten", eaten_at: new Date().toISOString() }).eq("id", p.id)
    }
  }

  return {
    ok: true,
    summary: `Registrei no ${SLOT_PT[mealType]}: ${names.join(", ")} (${kcal} kcal).`,
    data: { meal_type: mealType, kcal, items: names },
  }
}

async function execMontarPlano(ctx: Ctx, args: any) {
  const meals = (Array.isArray(args?.meals) ? args.meals : []).slice(0, 8)
  if (!meals.length) return { ok: false, summary: "Não consegui montar o plano agora." }

  const hour = spHour()
  const ahead = slotsAhead(hour)

  // Descarta o que não cabe mais no dia (café da manhã às 19h não ajuda ninguém)
  const seen: Record<string, number> = {}
  const rows = meals
    .filter((m: any) => ahead.includes(m.slot))
    .map((m: any) => ({
      user_id: ctx.uid,
      day: ctx.state.today,
      slot: m.slot,
      // ordem do dia × ordem dentro da refeição (senão tudo empata em position)
      position: SLOTS.indexOf(m.slot) * 10 + (seen[m.slot] = (seen[m.slot] ?? -1) + 1),
      name: str(m.name, 90),
      portion: str(m.portion, 70),
      kcal: num(m.kcal, 2500),
      protein_g: num(m.protein_g, 250),
      carbs_g: num(m.carbs_g, 500),
      fat_g: num(m.fat_g, 250),
      why: str(m.why, 70),
      status: "planned",
    }))
    .filter((r: any) => r.name)

  if (!rows.length) {
    return {
      ok: false, retry: true,
      summary: `Nenhuma refeição válida. Só cabem hoje: ${ahead.map(s => SLOT_PT[s]).join(", ")}.`,
    }
  }

  const total = rows.reduce((a: number, r: any) => a + r.kcal, 0)

  // Guard-rail: plano curto demais = fome à noite = a pessoa desiste do app.
  // Uma retentativa antes de aceitar (a IA subestima muito na primeira).
  const P = ctx.state.plan
  if (P && ctx.attempt < 2) {
    const budget = planBudget(hour, P.daily_calories - ctx.state.eaten.kcal)
    if (budget > 0 && total < budget * 0.8) {
      return {
        ok: false, retry: true,
        summary: `O plano somou só ${total} kcal de um orçamento de ${budget} kcal. Refaça distribuindo ~${budget} kcal entre ${ahead.map(s => SLOT_PT[s]).join(", ")}, com porções maiores ou mais itens.`,
      }
    }
  }

  // Refaz só o que ainda não foi comido — o já marcado permanece
  await admin.from("meal_plan_items").delete()
    .eq("user_id", ctx.uid).eq("day", ctx.state.today).eq("status", "planned")

  const { error } = await admin.from("meal_plan_items").insert(rows)
  if (error) { console.error("[vitalis] plano:", error.message); return { ok: false, summary: "Falha ao salvar o plano." } }

  const prot = rows.reduce((a: number, r: any) => a + r.protein_g, 0)
  return {
    ok: true,
    summary: `Montei ${rows.length} refeições pra hoje (${total} kcal · ${prot}g de proteína).`,
    data: { count: rows.length, kcal: total, protein_g: prot },
  }
}

async function execTrocar(ctx: Ctx, args: any) {
  const id = Number(args?.item_id)
  const n = args?.novo
  if (!id || !n?.name) return { ok: false, summary: "Não identifiquei o item pra trocar." }

  const old = ctx.state.items.find((i: any) => i.id === id)
  if (!old) return { ok: false, summary: "Esse item não está no plano de hoje." }

  const { error } = await admin.from("meal_plan_items").update({
    name: str(n.name, 90), portion: str(n.portion, 70),
    kcal: num(n.kcal, 2500), protein_g: num(n.protein_g, 250),
    carbs_g: num(n.carbs_g, 500), fat_g: num(n.fat_g, 250),
    why: str(n.why, 70), status: "planned",
  }).eq("id", id).eq("user_id", ctx.uid)
  if (error) return { ok: false, summary: "Falha ao trocar." }

  return {
    ok: true,
    summary: `Troquei "${old.name}" por "${str(n.name, 90)}" no ${SLOT_PT[old.slot] || old.slot}.`,
    data: { from: old.name, to: str(n.name, 90) },
  }
}

async function execAjustarMetas(ctx: Ctx, args: any) {
  const P = ctx.state.plan
  if (!P) return { ok: false, summary: "Ainda não há metas calculadas pra ajustar." }

  const gender = ctx.state.profile?.gender === "male" ? "male" : "female"
  const floor = CALORIE_FLOOR[gender]
  const cur = P.daily_calories

  // Guard-rail: nunca abaixo do piso, nunca mais que ±25% de uma vez
  let asked = args?.daily_calories != null ? Math.round(Number(args.daily_calories)) : cur
  if (!Number.isFinite(asked) || asked <= 0) asked = cur
  const clamped = Math.max(floor, Math.min(Math.round(cur * 1.25), Math.max(Math.round(cur * 0.75), asked)))
  const blocked = clamped !== asked

  const maxProt = ctx.state.weight ? Math.round(ctx.state.weight * 3) : 300
  const patch: Record<string, unknown> = {
    daily_calories: clamped,
    safety_floor: clamped <= floor,
    updated_at: new Date().toISOString(),
  }
  if (args?.protein_g != null) patch.protein_g = Math.min(maxProt, num(args.protein_g, 300))
  if (args?.carbs_g != null) patch.carbs_g = num(args.carbs_g, 600)
  if (args?.fat_g != null) patch.fat_g = Math.max(30, num(args.fat_g, 250))

  const { error } = await admin.from("nutrition_plans").update(patch).eq("id", P.id).eq("user_id", ctx.uid)
  if (error) return { ok: false, summary: "Falha ao ajustar as metas." }

  return {
    ok: true,
    summary: blocked
      ? `Ajustei pra ${clamped} kcal — limitei a mudança pra manter seguro (mínimo ${floor} kcal, no máximo 25% por vez).`
      : `Metas atualizadas: ${clamped} kcal/dia.`,
    data: { daily_calories: clamped, blocked },
  }
}

async function execListaCompras(_ctx: Ctx, args: any) {
  const grupos = (Array.isArray(args?.grupos) ? args.grupos : []).slice(0, 8).map((g: any) => ({
    grupo: str(g.grupo, 40),
    itens: (Array.isArray(g.itens) ? g.itens : []).slice(0, 20).map((i: any) => str(i, 60)).filter(Boolean),
  })).filter((g: any) => g.grupo && g.itens.length)
  if (!grupos.length) return { ok: false, summary: "Não consegui montar a lista agora." }
  const n = grupos.reduce((a: number, g: any) => a + g.itens.length, 0)
  return { ok: true, summary: `Lista de compras com ${n} itens.`, data: { grupos } }
}

const EXECUTORS: Record<string, (ctx: Ctx, args: any) => Promise<any>> = {
  registrar_refeicao: execRegistrar,
  montar_plano_do_dia: execMontarPlano,
  trocar_refeicao: execTrocar,
  ajustar_metas: execAjustarMetas,
  montar_lista_compras: execListaCompras,
}

/* ── ESTADO PÚBLICO (o que o painel desenha) ────────────────── */

function publicState(s: Awaited<ReturnType<typeof loadState>>) {
  const P = s.plan
  return {
    day: s.today,
    hour: spHour(),
    hasPlan: !!P,
    goals: P ? { kcal: P.daily_calories, protein_g: P.protein_g, carbs_g: P.carbs_g, fat_g: P.fat_g } : null,
    eaten: s.eaten,
    remaining: P ? {
      kcal: Math.max(0, P.daily_calories - s.eaten.kcal),
      protein_g: Math.max(0, P.protein_g - s.eaten.p),
    } : null,
    items: s.items.map((i: any) => ({
      id: i.id, slot: i.slot, position: i.position, name: i.name, portion: i.portion,
      kcal: i.kcal, protein_g: i.protein_g, carbs_g: i.carbs_g, fat_g: i.fat_g,
      why: i.why, status: i.status,
    })),
  }
}

/* ── HANDLER ────────────────────────────────────────────────── */

async function callOpenAI(payload: unknown) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const t = await res.text()
    console.error("[nutri-coach] openai:", res.status, t)
    throw new Error("A IA não respondeu agora. Tente de novo.")
  }
  return await res.json()
}

/**
 * O FitCal é recurso do plano COMPLETO.
 *
 * O gate da tela (FitCalGate) decide o que aparece, não o que é
 * permitido: o app roda no navegador do usuário, com o JWT dele, e
 * chamar esta função direto é trivial. Quem tem plano Essencial só é
 * barrado de verdade aqui.
 *
 * A regra é a MESMA de src/services/entitlements.js (normalizeTier) —
 * se as duas divergirem, a tela libera e o servidor recusa, que é o
 * pior dos dois mundos.
 */
async function hasCompleto(uid: string): Promise<boolean> {
  const { data } = await admin
    .from("profiles").select("plan, is_premium, role").eq("id", uid).maybeSingle()
  if (!data) return false
  if (data.role === "admin") return true
  return String(data.plan ?? "").toLowerCase().includes("completo") || data.is_premium === true
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") || ""
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) return json({ error: "Não autenticado." }, 401)
  const uid = user.id

  if (!(await hasCompleto(uid))) {
    return json({
      error: "O Rastreador Nutricional faz parte do plano Completo.",
      code: "plan_required",
    }, 403)
  }

  let body: any = {}
  try { body = await req.json() } catch { /* vazio */ }

  // mode=state: o painel só quer o estado atual (não gasta IA)
  if (body?.mode === "state") {
    const s = await loadState(uid)
    const { data: acts } = await admin.from("nutri_actions")
      .select("tool, summary, payload, created_at").eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(6)
    return json({ state: publicState(s), actions: acts ?? [] })
  }

  if (!OPENAI_API_KEY) return json({ error: "IA não configurada no servidor." }, 500)

  const command = str(body?.command, 500).trim()
  const forceTool = typeof body?.force_tool === "string" && EXECUTORS[body.force_tool] ? body.force_tool : null
  if (!command) return json({ error: "Comando vazio." }, 400)

  // Cota diária. Só é cobrada aqui, no caminho que realmente chama a
  // OpenAI — mode=state passa livre porque não custa nada. Admin não tem
  // cota (precisa testar sem esbarrar em limite).
  const { data: quota } = await admin.rpc("ai_quota_take", {
    p_user: uid, p_fn: "nutri-coach", p_day: spToday(), p_limit: DAILY_LIMIT,
  })
  const q = Array.isArray(quota) ? quota[0] : quota
  if (q && q.allowed === false) {
    return json({
      error: `Você já usou o VITALIS ${q.quota} vezes hoje. Amanhã ele volta — o plano de hoje continua aí.`,
      code: "quota_exceeded",
    }, 429)
  }

  try {
    // Rate limit diário (custo + antiabuso)
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count } = await admin.from("nutri_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid).eq("role", "user").gte("created_at", since)
    if ((count ?? 0) >= DAILY_LIMIT) {
      return json({ error: "Você atingiu o limite de comandos de hoje. Volte amanhã." }, 429)
    }

    const state = await loadState(uid)
    const ctx: Ctx = { uid, userClient, state, attempt: 1 }

    // Memória curta — permite "troca essa" logo depois de outro comando.
    // Só 1 troca: com mais que isso o comando anterior contamina a escolha
    // da ferramenta (já vimos "monta meu plano" fazer um "comi X" virar plano).
    const { data: hist } = await admin.from("nutri_messages")
      .select("role, content").eq("user_id", uid)
      .order("created_at", { ascending: false }).limit(2)
    const history = (hist ?? []).reverse().map((m: any) => ({ role: m.role, content: m.content }))

    const messages: any[] = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `ESTADO ATUAL DA PESSOA:\n${contextText(state)}` },
      ...(history.length
        ? [{ role: "system", content: "A troca a seguir é só contexto do comando ANTERIOR. Não repita aquela ação — responda ao comando novo." }, ...history]
        : []),
      { role: "user", content: command },
    ]

    // Roteador determinístico. O modelo erra isso: com "comi um x-tudo" ele
    // chamava montar_plano_do_dia e PLANEJAVA o hambúrguer em vez de lançar
    // no diário — o dado mais importante do app ficava zerado. Em pt-BR o
    // pretérito é inequívoco, então a decisão sai do LLM.
    // A guarda de pergunta preserva "comi demais hoje, e agora?" (é conversa).
    const ATE = /\b(comi|comemos|tomei|bebi|almocei|jantei|lanchei|devorei|mandei|petisquei)\b|acabei de (comer|almoçar|jantar|tomar|beber)/i
    const ASKING = /\?|\b(o que|oq|como faço|como faco|e agora|quanto|devo|posso|vale a pena|será)\b/i
    const pinned = forceTool || (ATE.test(command) && !ASKING.test(command) ? "registrar_refeicao" : null)

    // Laço do agente: no máximo 2 rodadas de ferramenta. A 2ª só acontece
    // quando o servidor REJEITA o resultado da 1ª (ex.: plano curto demais).
    let reply = ""
    const executed: any[] = []
    let toolChoice: any = pinned ? { type: "function", function: { name: pinned } } : "auto"

    for (let round = 1; round <= 2; round++) {
      const resp = await callOpenAI({
        model: MODEL, temperature: 0.4, max_tokens: 1200,
        messages, tools: TOOLS, tool_choice: toolChoice,
      })
      const msg = resp.choices?.[0]?.message ?? {}
      const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls.slice(0, 3) : []

      // Sem ferramenta: é uma pergunta, a resposta em texto já é o entregável
      if (!toolCalls.length) { reply = str(msg.content, 600); break }

      messages.push(msg)
      ctx.attempt = round
      let needsRetry = false

      for (const tc of toolCalls) {
        const name = tc.function?.name
        const fn = EXECUTORS[name]
        let out: any = { ok: false, summary: "Ferramenta desconhecida." }
        if (fn) {
          let args: any = {}
          try { args = JSON.parse(tc.function?.arguments ?? "{}") } catch { /* args vazios */ }
          out = await fn(ctx, args)
        }
        if (out.retry) needsRetry = true
        if (out.ok) {
          executed.push({ tool: name, summary: out.summary, data: out.data ?? null })
          await admin.from("nutri_actions").insert({
            user_id: uid, tool: name, summary: out.summary, payload: out.data ?? null,
          })
        }
        messages.push({
          role: "tool", tool_call_id: tc.id,
          content: JSON.stringify({ ok: out.ok, resultado: out.summary, dados: out.data ?? null }),
        })
      }

      if (needsRetry && round === 1) {
        messages.push({ role: "system", content: "O servidor RECUSOU o que você fez pelo motivo acima. Chame a ferramenta de novo, corrigindo exatamente esse ponto." })
        toolChoice = { type: "function", function: { name: pinned || "montar_plano_do_dia" } }
        continue
      }

      // Fecho: o modelo vê o que REALMENTE aconteceu e resume em 1-2 frases.
      // O "só o que consta" existe porque ele já disse "registrei" tendo
      // apenas planejado — mentir sobre o diário destrói a confiança.
      messages.push({ role: "system", content: "Confirme em no máximo 2 frases APENAS o que consta nos resultados das ferramentas acima — não invente ações que não aconteceram. Depois dê o próximo passo prático. Sem culpa, sem repetir a lista inteira." })
      const fin = await callOpenAI({ model: MODEL, temperature: 0.4, max_tokens: 300, messages })
      reply = str(fin.choices?.[0]?.message?.content, 600) || executed.map(e => e.summary).join(" ")
      break
    }

    if (!reply) reply = executed.length ? executed.map(e => e.summary).join(" ") : "Feito."

    await admin.from("nutri_messages").insert([
      { user_id: uid, role: "user", content: command },
      { user_id: uid, role: "assistant", content: reply, payload: { executed } },
    ])

    const fresh = await loadState(uid)
    return json({ reply, executed, state: publicState(fresh) })
  } catch (err: any) {
    console.error("nutri-coach error:", err)
    return json({ error: err?.message || "Falha no VITALIS." }, 500)
  }
})
