import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')

script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'montar-contexto-v2.js'), 'r', encoding='utf-8') as f:
    montar_contexto_code = f.read()

uid_c = [0]
def uid():
    uid_c[0] += 1
    return f'node-{uid_c[0]:03d}'

# ── Supabase fetch helper (embedded in every tool) ──
def sb_fetch(method, path, body=None):
    """Returns JS code for a Supabase fetch call"""
    opts = f"method:'{method}',headers:{{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'}}"
    if body:
        opts += f",body:JSON.stringify({body})"
    return f"const r=await fetch(process.env.SUPABASE_URL+'/rest/v1/{path}',{{{opts}}});return await r.json();"

# ── Tool Code node factory ──
def tool_code(name, desc, js, pos):
    return {
        'parameters': {'name': name, 'description': desc, 'jsCode': js},
        'id': uid(), 'name': name,
        'type': '@n8n/n8n-nodes-langchain.toolCode',
        'typeVersion': 1.1, 'position': pos
    }

# user_id and date helpers (used inside tool JS)
UID_JS = '$("Montar Contexto do Usuário").item.json.user_id'
TODAY_JS = 'new Date().toISOString().split("T")[0]'
NOW_JS = 'new Date().toISOString()'

# Tool position grid
ti = [0]
def tp():
    r, c = ti[0] // 6, ti[0] % 6
    ti[0] += 1
    return [2500 + c * 280, 900 + r * 150]

nodes = []

# ════════════════════════════════════════════════
# MAIN FLOW
# ════════════════════════════════════════════════

# 1. Webhook
nodes.append({
    'parameters': {'httpMethod': 'POST', 'path': 'whatsapp-webhook', 'options': {}},
    'id': uid(), 'name': 'Webhook WhatsApp',
    'type': 'n8n-nodes-base.webhook', 'typeVersion': 2, 'position': [0, 300],
    'webhookId': 'orvax-wa'
})

# 2. É Mensagem Real? (Code instead of IF to avoid format issues)
nodes.append({
    'parameters': {'jsCode': 'const msgs = $input.item.json.body?.entry?.[0]?.changes?.[0]?.value?.messages;\nif (!msgs || !msgs.length) return [];\nreturn $input.all();'},
    'id': uid(), 'name': 'É Mensagem Real?',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [250, 300]
})

# 3. Extrair Metadados
nodes.append({
    'parameters': {'jsCode': 'const b=$input.item.json.body;const v=b?.entry?.[0]?.changes?.[0]?.value;const m=v?.messages?.[0];const c=v?.contacts?.[0];\nreturn {json:{phone:m?.from||\'\',name:c?.profile?.name||\'\',message_id:m?.id||\'\',type:m?.type||\'text\',text:m?.text?.body||\'\',audio_id:m?.audio?.id||\'\',image_id:m?.image?.id||\'\',caption:m?.image?.caption||\'\',timestamp:m?.timestamp||\'\',phone_number_id:v?.metadata?.phone_number_id||\'\'}};'},
    'id': uid(), 'name': 'Extrair Metadados1',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [500, 300]
})

# 4. Buscar user_id pelo Telefone
nodes.append({
    'parameters': {
        'method': 'GET',
        'url': '={{$env.SUPABASE_URL}}/rest/v1/profiles?select=id,full_name,selected_mentor,streak_days,phone_number,xp,level&phone_number=eq.{{ $json.phone }}',
        'authentication': 'none',
        'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'apikey', 'value': '={{$env.SUPABASE_KEY}}'},
            {'name': 'Authorization', 'value': '=Bearer {{$env.SUPABASE_KEY}}'}
        ]},
        'options': {}
    },
    'id': uid(), 'name': 'Buscar user_id pelo Telefone',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [750, 300]
})

# 5. Montar Contexto
nodes.append({
    'parameters': {'jsCode': montar_contexto_code},
    'id': uid(), 'name': 'Montar Contexto do Usuário',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [1000, 300]
})

# 6. Atualizar Última Interação
nodes.append({
    'parameters': {
        'method': 'PATCH',
        'url': '={{$env.SUPABASE_URL}}/rest/v1/profiles?id=eq.{{ $json.user_id }}',
        'authentication': 'none',
        'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'apikey', 'value': '={{$env.SUPABASE_KEY}}'},
            {'name': 'Authorization', 'value': '=Bearer {{$env.SUPABASE_KEY}}'},
            {'name': 'Content-Type', 'value': 'application/json'}
        ]},
        'sendBody': True,
        'specifyBody': 'json',
        'jsonBody': '={"last_whatsapp_interaction":"{{ $now.toISO() }}"}',
        'options': {}
    },
    'id': uid(), 'name': 'Atualizar Última Interação',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [1250, 300]
})

# 7. Router (Code node that sets a 'route' field, then we use multiple outputs)
# Actually, let's use a simple approach: Code node that passes data through
# and a Switch node with simple string matching
nodes.append({
    'parameters': {
        'mode': 'rules',
        'rules': {
            'values': [
                {'outputKey': 'Texto', 'conditions': {'conditions': [{'leftValue': '={{ $json.type }}', 'rightValue': 'text', 'operator': {'type': 'string', 'operation': 'equals'}}], 'combinator': 'and'}},
                {'outputKey': 'Áudio', 'conditions': {'conditions': [{'leftValue': '={{ $json.type }}', 'rightValue': 'audio', 'operator': {'type': 'string', 'operation': 'equals'}}], 'combinator': 'and'}},
                {'outputKey': 'Imagem', 'conditions': {'conditions': [{'leftValue': '={{ $json.type }}', 'rightValue': 'image', 'operator': {'type': 'string', 'operation': 'equals'}}], 'combinator': 'and'}}
            ]
        },
        'options': {'fallbackOutput': 'extra'}
    },
    'id': uid(), 'name': 'Tipo de Mensagem',
    'type': 'n8n-nodes-base.switch', 'typeVersion': 3.2, 'position': [1500, 300]
})

# 8. Extrair Texto
nodes.append({
    'parameters': {'jsCode': 'return {json:{userMessage:$input.item.json.text}};'},
    'id': uid(), 'name': 'Extrair Texto',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [1800, 100]
})

# ── AUDIO PATH ──
WA_AUTH = [
    {'name': 'Authorization', 'value': '=Bearer {{$env.WHATSAPP_TOKEN}}'}
]

nodes.append({
    'parameters': {'method': 'GET', 'url': '=https://graph.facebook.com/v21.0/{{ $json.audio_id }}',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': WA_AUTH}, 'options': {}},
    'id': uid(), 'name': 'Pegar Link Áudio',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [1800, 300]
})

nodes.append({
    'parameters': {'method': 'GET', 'url': '={{ $json.url }}',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': WA_AUTH},
        'options': {'response': {'response': {'responseFormat': 'file'}}}},
    'id': uid(), 'name': 'Baixar Áudio',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [2050, 300]
})

nodes.append({
    'parameters': {'method': 'POST', 'url': 'https://api.openai.com/v1/audio/transcriptions',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': [{'name': 'Authorization', 'value': '=Bearer {{$env.OPENAI_KEY}}'}]},
        'contentType': 'multipart-form-data', 'sendBody': True,
        'bodyParameters': {'parameters': [
            {'name': 'file', 'parameterType': 'formBinaryData', 'inputDataFieldName': 'data'},
            {'name': 'model', 'value': 'whisper-1'},
            {'name': 'language', 'value': 'pt'}
        ]}, 'options': {}},
    'id': uid(), 'name': 'Transcrever Áudio',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [2300, 300]
})

nodes.append({
    'parameters': {'jsCode': 'return {json:{userMessage:"[ÁUDIO TRANSCRITO]: "+($input.item.json.text||"Não consegui transcrever.")}};'},
    'id': uid(), 'name': 'Formatar Transcrição',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [2550, 300]
})

# ── IMAGE PATH ──
nodes.append({
    'parameters': {'method': 'GET', 'url': '=https://graph.facebook.com/v21.0/{{ $json.image_id }}',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': WA_AUTH}, 'options': {}},
    'id': uid(), 'name': 'Pegar Link Foto',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [1800, 550]
})

nodes.append({
    'parameters': {'method': 'GET', 'url': '={{ $json.url }}',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': WA_AUTH},
        'options': {'response': {'response': {'responseFormat': 'file'}}}},
    'id': uid(), 'name': 'Baixar Imagem',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [2050, 550]
})

vision_body = json.dumps({"model":"gpt-4o-mini","messages":[{"role":"user","content":[
    {"type":"text","text":"Descreva esta imagem em detalhes, em português. Se for comida, estime calorias e macros. Se for treino, descreva. Se for comprovante financeiro, extraia valor e descrição."},
    {"type":"image_url","image_url":{"url":"data:image/jpeg;base64,{{ $json.data }}"}}
]}],"max_tokens":500})

nodes.append({
    'parameters': {'method': 'POST', 'url': 'https://api.openai.com/v1/chat/completions',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'Authorization', 'value': '=Bearer {{$env.OPENAI_KEY}}'},
            {'name': 'Content-Type', 'value': 'application/json'}
        ]},
        'sendBody': True, 'specifyBody': 'json', 'jsonBody': '=' + vision_body, 'options': {}},
    'id': uid(), 'name': 'Analisar Imagem (Vision)',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [2300, 550]
})

nodes.append({
    'parameters': {'jsCode': 'const a=$input.item.json.choices?.[0]?.message?.content||"Não consegui analisar.";\nreturn {json:{userMessage:"[IMAGEM]: "+a}};'},
    'id': uid(), 'name': 'Formatar Análise Imagem',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [2550, 550]
})

# Unsupported
nodes.append({
    'parameters': {'jsCode': 'return {json:{userMessage:"[O usuário enviou mídia não suportada. Peça que envie como texto, áudio ou imagem.]"}};'},
    'id': uid(), 'name': 'Mídia Não Suportada',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [1800, 750]
})

# ════════════════════════════════════════════════
# AI AGENT + MODEL + MEMORY
# ════════════════════════════════════════════════

nodes.append({
    'parameters': {'options': {'systemMessage': '={{ $("Montar Contexto do Usuário").item.json.system_prompt }}'}},
    'id': uid(), 'name': 'Cérebro ORVAX',
    'type': '@n8n/n8n-nodes-langchain.agent', 'typeVersion': 1.7, 'position': [2900, 300]
})

nodes.append({
    'parameters': {'model': 'gpt-4o-mini', 'options': {'temperature': 0.7, 'maxTokens': 1024}},
    'id': uid(), 'name': 'Modelo GPT-4o-mini',
    'type': '@n8n/n8n-nodes-langchain.lmChatOpenAi', 'typeVersion': 1.2, 'position': [2700, 100],
    'credentials': {'openAiApi': {'id': 'CONFIGURE_OPENAI', 'name': 'OpenAI'}}
})

nodes.append({
    'parameters': {'sessionIdType': 'customKey',
        'sessionKey': '={{ $("Montar Contexto do Usuário").item.json.phone }}',
        'contextWindowLength': 20},
    'id': uid(), 'name': 'Memória',
    'type': '@n8n/n8n-nodes-langchain.memoryBufferWindow', 'typeVersion': 1.3, 'position': [2700, 250]
})

# ── RESPONSE ──
nodes.append({
    'parameters': {'method': 'POST',
        'url': '=https://graph.facebook.com/v21.0/{{$env.WHATSAPP_PHONE_ID}}/messages',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'Authorization', 'value': '=Bearer {{$env.WHATSAPP_TOKEN}}'},
            {'name': 'Content-Type', 'value': 'application/json'}
        ]},
        'sendBody': True, 'specifyBody': 'json',
        'jsonBody': '={"messaging_product":"whatsapp","to":"{{ $("Montar Contexto do Usuário").item.json.phone }}","type":"text","text":{"body":{{ JSON.stringify($json.output || $json.text || "Erro interno.") }}}}',
        'options': {}},
    'id': uid(), 'name': 'Responder no WhatsApp',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [3200, 300]
})

nodes.append({
    'parameters': {'method': 'POST',
        'url': '=https://graph.facebook.com/v21.0/{{$env.WHATSAPP_PHONE_ID}}/messages',
        'authentication': 'none', 'sendHeaders': True,
        'headerParameters': {'parameters': [
            {'name': 'Authorization', 'value': '=Bearer {{$env.WHATSAPP_TOKEN}}'},
            {'name': 'Content-Type', 'value': 'application/json'}
        ]},
        'sendBody': True, 'specifyBody': 'json',
        'jsonBody': '={"messaging_product":"whatsapp","to":"{{ $("Montar Contexto do Usuário").item.json.phone }}","type":"text","text":{"body":"Ops, tive um problema. Tenta de novo."}}',
        'options': {}},
    'id': uid(), 'name': 'Resposta de Erro',
    'type': 'n8n-nodes-base.httpRequest', 'typeVersion': 4.2, 'position': [3200, 100]
})

# ── VALIDATION ──
nodes.append({
    'parameters': {'httpMethod': 'GET', 'path': 'whatsapp-webhook', 'options': {}},
    'id': uid(), 'name': 'Validador Meta (GET)',
    'type': 'n8n-nodes-base.webhook', 'typeVersion': 2, 'position': [0, 700],
    'webhookId': 'orvax-verify'
})

nodes.append({
    'parameters': {'jsCode': 'const ch=$input.item.json.query["hub.challenge"];return {json:{body:ch||"ok"}};'},
    'id': uid(), 'name': 'Responder Desafio',
    'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [250, 700]
})

# ════════════════════════════════════════════════
# TOOL NODES (all using toolCode for reliability)
# ════════════════════════════════════════════════

def sb_tool(name, desc, method, path, body_js=None, params=[]):
    """Create a Supabase tool using Code Tool"""
    ph_lines = '\n'.join([f'const {p["name"]} = $fromAI("{p["name"]}", "{p["desc"]}", "{p.get("type","string")}");' for p in params])

    uid_line = f'const userId = $("{UID_JS.split(".")[0].replace("$(","")}).item.json.user_id;' if True else ''
    uid_line = f'const userId = $("Montar Contexto do Usuário").item.json.user_id;'
    today_line = 'const today = new Date().toISOString().split("T")[0];'
    now_line = 'const now = new Date().toISOString();'

    url_path = path.replace('__UID__', '"+userId+"').replace('__TODAY__', '"+today+"')

    fetch_opts = f"method:'{method}'"
    fetch_opts += ",headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'}"

    if body_js:
        fetch_opts += f",body:JSON.stringify({body_js})"

    js = f"""{uid_line}
{today_line}
{now_line}
{ph_lines}
const url = process.env.SUPABASE_URL + '/rest/v1/{url_path}';
const r = await fetch(url, {{{fetch_opts}}});
const data = await r.json();
return JSON.stringify(data);"""

    return tool_code(name, desc, js.strip(), tp())

# ── FINANCIAL ──
nodes.append(sb_tool('registrar_transacao',
    'Registra receita ou despesa. type: "in" (receita) ou "out" (despesa).',
    'POST', 'transactions',
    '{user_id:userId,description,amount:Number(amount),type,category,date:now}',
    [{'name':'description','desc':'Descrição da transação'},
     {'name':'amount','desc':'Valor em reais','type':'number'},
     {'name':'type','desc':'in (receita) ou out (despesa)'},
     {'name':'category','desc':'Categoria: alimentacao, moradia, transporte, lazer, assinaturas, receita, outros'}]))

nodes.append(sb_tool('consultar_transacoes',
    'Lista transações financeiras recentes do usuário.',
    'GET', 'transactions?user_id=eq.__UID__&select=id,description,amount,type,category,date&order=date.desc&limit=30'))

nodes.append(sb_tool('criar_meta_financeira',
    'Cria meta de economia.',
    'POST', 'financial_goals',
    '{user_id:userId,name,target_amount:Number(target_amount),deadline,current_amount:0}',
    [{'name':'name','desc':'Nome da meta'},
     {'name':'target_amount','desc':'Valor alvo em R$','type':'number'},
     {'name':'deadline','desc':'Data limite YYYY-MM-DD'}]))

nodes.append(sb_tool('consultar_metas_financeiras',
    'Lista metas financeiras ativas.',
    'GET', 'financial_goals?user_id=eq.__UID__&select=*&order=created_at.desc'))

# ── TASKS ──
nodes.append(sb_tool('criar_tarefa',
    'Cria nova tarefa/compromisso.',
    'POST', 'tasks',
    '{user_id:userId,title,description:description||"",scheduled_date:due_date,priority,state:"pending"}',
    [{'name':'title','desc':'Título da tarefa'},
     {'name':'description','desc':'Descrição (pode ser vazio)'},
     {'name':'due_date','desc':'Data YYYY-MM-DD'},
     {'name':'priority','desc':'low, medium ou high'}]))

nodes.append(sb_tool('consultar_tarefas',
    'Lista tarefas do usuário com id, título, estado.',
    'GET', 'tasks?user_id=eq.__UID__&select=id,title,description,state,scheduled_date,priority&order=scheduled_date.desc&limit=20'))

nodes.append(sb_tool('atualizar_tarefa',
    'Muda estado de uma tarefa. Use consultar_tarefas primeiro para pegar o ID. Estados: pending, active, done.',
    'PATCH', 'tasks?id=eq.{task_id}&user_id=eq.__UID__'.replace('{task_id}', '"+task_id+"'),
    '{state}',
    [{'name':'task_id','desc':'UUID da tarefa'},
     {'name':'state','desc':'pending, active ou done'}]))

# Fix: atualizar_tarefa path needs special handling
# Let me redo it properly
nodes.pop()  # Remove the broken one

atualizar_tarefa_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const task_id = $fromAI("task_id", "UUID da tarefa", "string");
const state = $fromAI("state", "Novo estado: pending, active ou done", "string");
const url = process.env.SUPABASE_URL + '/rest/v1/tasks?id=eq.' + task_id + '&user_id=eq.' + userId;
const r = await fetch(url, {
  method: 'PATCH',
  headers: {'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
  body: JSON.stringify({state})
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('atualizar_tarefa', 'Muda estado de tarefa. Use consultar_tarefas primeiro. Estados: pending, active, done.', atualizar_tarefa_js.strip(), tp()))

del_tarefa_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const task_id = $fromAI("task_id", "UUID da tarefa a deletar", "string");
const url = process.env.SUPABASE_URL + '/rest/v1/tasks?id=eq.' + task_id + '&user_id=eq.' + userId;
const r = await fetch(url, {
  method: 'DELETE',
  headers: {'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}
});
return "Tarefa deletada";"""
nodes.append(tool_code('deletar_tarefa', 'Deleta tarefa. SEMPRE confirme antes.', del_tarefa_js.strip(), tp()))

# ── GOALS ──
nodes.append(sb_tool('criar_meta',
    'Cria meta pessoal.',
    'POST', 'goals',
    '{user_id:userId,title,description:description||"",target_date,category,status:"ativo",progress:0}',
    [{'name':'title','desc':'Título'},{'name':'description','desc':'Descrição'},
     {'name':'target_date','desc':'Data YYYY-MM-DD'},{'name':'category','desc':'Categoria'}]))

nodes.append(sb_tool('consultar_metas',
    'Lista metas pessoais ativas.',
    'GET', 'goals?user_id=eq.__UID__&status=eq.ativo&select=id,title,description,progress,target_date,category&order=created_at.desc'))

atualizar_meta_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const goal_id = $fromAI("goal_id", "UUID da meta", "string");
const progress = $fromAI("progress", "Progresso 0-100", "number");
const status = $fromAI("status", "ativo, concluido ou abandonado", "string");
const url = process.env.SUPABASE_URL + '/rest/v1/goals?id=eq.' + goal_id + '&user_id=eq.' + userId;
const r = await fetch(url, {
  method: 'PATCH',
  headers: {'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
  body: JSON.stringify({progress:Number(progress),status})
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('atualizar_meta', 'Atualiza progresso/status de meta.', atualizar_meta_js.strip(), tp()))

# ── HEALTH ──
nodes.append(sb_tool('registrar_agua', 'Registra água em ml.', 'POST', 'water_logs',
    '{user_id:userId,amount_ml:Number(amount_ml),log_date:today}',
    [{'name':'amount_ml','desc':'Quantidade em ml','type':'number'}]))

nodes.append(sb_tool('consultar_agua_hoje', 'Água consumida hoje.',
    'GET', 'water_logs?user_id=eq.__UID__&log_date=eq.__TODAY__&select=amount_ml,created_at'))

nodes.append(sb_tool('registrar_peso', 'Registra peso em kg.', 'POST', 'weight_logs',
    '{user_id:userId,weight_kg:Number(weight_kg),log_date:today}',
    [{'name':'weight_kg','desc':'Peso em kg','type':'number'}]))

nodes.append(sb_tool('consultar_peso_recente', 'Últimos 10 pesos.',
    'GET', 'weight_logs?user_id=eq.__UID__&select=weight_kg,log_date&order=log_date.desc&limit=10'))

# ── FITNESS ──
nodes.append(sb_tool('registrar_treino', 'Registra treino/exercício.', 'POST', 'workouts',
    '{user_id:userId,title,description:description||"",duration_min:Number(duration_min),activity_type,created_at:now}',
    [{'name':'title','desc':'Nome do treino'},{'name':'description','desc':'Descrição'},
     {'name':'duration_min','desc':'Minutos','type':'number'},
     {'name':'activity_type','desc':'gym/run/yoga/cycling/swim/walk/other'}]))

nodes.append(sb_tool('consultar_treinos', 'Últimos 10 treinos.',
    'GET', 'workouts?user_id=eq.__UID__&select=id,title,duration_min,activity_type,created_at&order=created_at.desc&limit=10'))

# ── NUTRITION ──
nodes.append(sb_tool('registrar_refeicao', 'Registra refeição. Estime calorias se necessário.', 'POST', 'meal_entries',
    '{user_id:userId,meal_type,food_name,calories:Number(calories),protein_g:Number(protein_g),carbs_g:Number(carbs_g),fat_g:Number(fat_g),log_date:today}',
    [{'name':'meal_type','desc':'breakfast/lunch/dinner/snack'},{'name':'food_name','desc':'Nome do alimento'},
     {'name':'calories','desc':'kcal estimadas','type':'number'},{'name':'protein_g','desc':'Proteína g','type':'number'},
     {'name':'carbs_g','desc':'Carbs g','type':'number'},{'name':'fat_g','desc':'Gordura g','type':'number'}]))

nodes.append(sb_tool('consultar_refeicoes_hoje', 'Refeições de hoje.',
    'GET', 'meal_entries?user_id=eq.__UID__&log_date=eq.__TODAY__&select=meal_type,food_name,calories,protein_g,carbs_g,fat_g'))

# ── HABITS ──
nodes.append(sb_tool('registrar_habito', 'Marca hábito cumprido.', 'POST', 'orvax_habitos',
    '{user_id:userId,habit_name,completed_at:now}',
    [{'name':'habit_name','desc':'Nome do hábito'}]))

nodes.append(sb_tool('consultar_habitos', 'Lista hábitos.',
    'GET', 'orvax_habitos?user_id=eq.__UID__&select=*&order=created_at.desc'))

# ── FOCUS ──
nodes.append(sb_tool('registrar_foco', 'Registra sessão de foco completada.', 'POST', 'focus_sessions',
    '{user_id:userId,planned_minutes:Number(duration_min),actual_minutes:Number(duration_min),activity,status:"completed",created_at:now}',
    [{'name':'duration_min','desc':'Minutos','type':'number'},{'name':'activity','desc':'Atividade realizada'}]))

nodes.append(sb_tool('consultar_foco_hoje', 'Sessões de foco recentes.',
    'GET', 'focus_sessions?user_id=eq.__UID__&select=planned_minutes,actual_minutes,activity,status,created_at&order=created_at.desc&limit=10'))

# ── NOTES ──
nodes.append(sb_tool('criar_nota', 'Salva nota/reflexão.', 'POST', 'user_notes',
    '{user_id:userId,title,content}',
    [{'name':'title','desc':'Título'},{'name':'content','desc':'Conteúdo'}]))

nodes.append(sb_tool('consultar_notas', 'Notas recentes.',
    'GET', 'user_notes?user_id=eq.__UID__&select=id,title,content,created_at&order=created_at.desc&limit=10'))

atualizar_nota_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const note_id = $fromAI("note_id", "UUID da nota", "string");
const title = $fromAI("title", "Novo título", "string");
const content = $fromAI("content", "Novo conteúdo", "string");
const url = process.env.SUPABASE_URL + '/rest/v1/user_notes?id=eq.' + note_id + '&user_id=eq.' + userId;
const r = await fetch(url, {
  method: 'PATCH',
  headers: {'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
  body: JSON.stringify({title,content})
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('atualizar_nota', 'Edita nota existente.', atualizar_nota_js.strip(), tp()))

del_nota_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const note_id = $fromAI("note_id", "UUID da nota a deletar", "string");
const url = process.env.SUPABASE_URL + '/rest/v1/user_notes?id=eq.' + note_id + '&user_id=eq.' + userId;
await fetch(url, {method:'DELETE',headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY}});
return "Nota deletada";"""
nodes.append(tool_code('deletar_nota', 'Remove nota. CONFIRME antes.', del_nota_js.strip(), tp()))

# ── TELEMETRY ──
nodes.append(sb_tool('consultar_perfil', 'Dados do perfil: nome, streak, XP, nível.',
    'GET', 'profiles?id=eq.__UID__&select=full_name,streak_days,xp,level,selected_mentor'))

nodes.append(sb_tool('consultar_telemetria', 'Scores dos 6 pilares ORVAX.',
    'GET', 'telemetry_metrics?user_id=eq.__UID__&select=name,score,category&order=name.asc'))

# ── GAMIFICATION ──
nodes.append(sb_tool('consultar_conquistas', 'Conquistas desbloqueadas.',
    'GET', 'user_achievements?user_id=eq.__UID__&select=*,achievements(title,description,icon,points)&order=unlocked_at.desc'))

verificar_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/rpc/check_achievements';
const r = await fetch(url, {
  method:'POST',
  headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({p_user_id:userId})
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('verificar_conquistas', 'Verifica e desbloqueia achievements novos.', verificar_js.strip(), tp()))

streak_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const url = process.env.SUPABASE_URL + '/rest/v1/rpc/calculate_streak';
const r = await fetch(url, {
  method:'POST',
  headers:{'apikey':process.env.SUPABASE_KEY,'Authorization':'Bearer '+process.env.SUPABASE_KEY,'Content-Type':'application/json'},
  body:JSON.stringify({p_user_id:userId})
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('calcular_streak', 'Calcula streak de dias consecutivos.', streak_js.strip(), tp()))

# ── STATS ──
nodes.append(sb_tool('consultar_stats_hoje', 'Stats dos últimos 7 dias: tarefas e foco.',
    'GET', 'daily_activity?user_id=eq.__UID__&select=date,tasks_completed,tasks_total,focus_minutes&order=date.desc&limit=7'))

nodes.append(sb_tool('consultar_atividade_semana', 'Atividade dos últimos 7 dias — consistência e streak visual.',
    'GET', 'daily_activity?user_id=eq.__UID__&select=date,tasks_completed,focus_minutes&order=date.desc&limit=7'))

nodes.append(sb_tool('consultar_resumo_financeiro', 'Transações financeiras para o agente agregar por mês (receitas, despesas, saldo).',
    'GET', 'transactions?user_id=eq.__UID__&select=amount,type,category,date&order=date.desc&limit=100'))

foco_total_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const today = new Date().toISOString().split("T")[0];
const url = process.env.SUPABASE_URL + '/rest/v1/focus_sessions?user_id=eq.' + userId + '&status=eq.completed&select=actual_minutes&created_at=gte.' + today + 'T00:00:00Z';
const r = await fetch(url, {
  method: 'GET',
  headers: {'apikey': process.env.SUPABASE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_KEY}
});
const data = await r.json();
const total = Array.isArray(data) ? data.reduce((s, x) => s + (x.actual_minutes || 0), 0) : 0;
return JSON.stringify({total_minutes: total});"""
nodes.append(tool_code('consultar_foco_total_hoje', 'Total de minutos de foco completados hoje.', foco_total_js.strip(), tp()))

# ── GAMIFICATION ──
nodes.append(sb_tool('registrar_pontos', 'Adiciona XP/pontos ao usuário por uma conquista ou ação.', 'POST', 'xp_events',
    '{user_id:userId,points:Number(points),reason,created_at:now}',
    [{'name':'points','desc':'Quantidade de pontos/XP','type':'number'},
     {'name':'reason','desc':'Motivo da pontuação'}]))

# ── SYSTEM ──
nodes.append(sb_tool('salvar_conversa', 'Salva resumo para memória de longo prazo.', 'POST', 'conversation_history',
    '{user_id:userId,role:"assistant",content:summary,created_at:now}',
    [{'name':'summary','desc':'Resumo da conversa importante'}]))

config_js = """const userId = $("Montar Contexto do Usuário").item.json.user_id;
const key = $fromAI("key", "Chave de configuração a atualizar", "string");
const value = $fromAI("value", "Novo valor", "string");
const body = {};
body[key] = value;
const url = process.env.SUPABASE_URL + '/rest/v1/profiles?id=eq.' + userId;
const r = await fetch(url, {
  method: 'PATCH',
  headers: {'apikey': process.env.SUPABASE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation'},
  body: JSON.stringify(body)
});
return JSON.stringify(await r.json());"""
nodes.append(tool_code('atualizar_config_app', 'Atualiza uma configuração do perfil/app do usuário (ex: selected_mentor, notificacoes_ativas).', config_js.strip(), tp()))

# ════════════════════════════════════════════════
# CONNECTIONS
# ════════════════════════════════════════════════

tool_names = [n['name'] for n in nodes if n['type'] == '@n8n/n8n-nodes-langchain.toolCode']

conn = {
    'Webhook WhatsApp': {'main': [[{'node': 'É Mensagem Real?', 'type': 'main', 'index': 0}]]},
    'É Mensagem Real?': {'main': [[{'node': 'Extrair Metadados1', 'type': 'main', 'index': 0}]]},
    'Extrair Metadados1': {'main': [[{'node': 'Buscar user_id pelo Telefone', 'type': 'main', 'index': 0}]]},
    'Buscar user_id pelo Telefone': {'main': [[{'node': 'Montar Contexto do Usuário', 'type': 'main', 'index': 0}]]},
    'Montar Contexto do Usuário': {'main': [[{'node': 'Atualizar Última Interação', 'type': 'main', 'index': 0}]]},
    'Atualizar Última Interação': {'main': [[{'node': 'Tipo de Mensagem', 'type': 'main', 'index': 0}]]},
    'Tipo de Mensagem': {'main': [
        [{'node': 'Extrair Texto', 'type': 'main', 'index': 0}],
        [{'node': 'Pegar Link Áudio', 'type': 'main', 'index': 0}],
        [{'node': 'Pegar Link Foto', 'type': 'main', 'index': 0}],
        [{'node': 'Mídia Não Suportada', 'type': 'main', 'index': 0}]
    ]},
    'Extrair Texto': {'main': [[{'node': 'Cérebro ORVAX', 'type': 'main', 'index': 0}]]},
    'Pegar Link Áudio': {'main': [[{'node': 'Baixar Áudio', 'type': 'main', 'index': 0}]]},
    'Baixar Áudio': {'main': [[{'node': 'Transcrever Áudio', 'type': 'main', 'index': 0}]]},
    'Transcrever Áudio': {'main': [[{'node': 'Formatar Transcrição', 'type': 'main', 'index': 0}]]},
    'Formatar Transcrição': {'main': [[{'node': 'Cérebro ORVAX', 'type': 'main', 'index': 0}]]},
    'Pegar Link Foto': {'main': [[{'node': 'Baixar Imagem', 'type': 'main', 'index': 0}]]},
    'Baixar Imagem': {'main': [[{'node': 'Analisar Imagem (Vision)', 'type': 'main', 'index': 0}]]},
    'Analisar Imagem (Vision)': {'main': [[{'node': 'Formatar Análise Imagem', 'type': 'main', 'index': 0}]]},
    'Formatar Análise Imagem': {'main': [[{'node': 'Cérebro ORVAX', 'type': 'main', 'index': 0}]]},
    'Mídia Não Suportada': {'main': [[{'node': 'Cérebro ORVAX', 'type': 'main', 'index': 0}]]},
    'Cérebro ORVAX': {'main': [
        [{'node': 'Responder no WhatsApp', 'type': 'main', 'index': 0}],
        [{'node': 'Resposta de Erro', 'type': 'main', 'index': 0}]
    ]},
    'Validador Meta (GET)': {'main': [[{'node': 'Responder Desafio', 'type': 'main', 'index': 0}]]},
    'Modelo GPT-4o-mini': {'ai_languageModel': [[{'node': 'Cérebro ORVAX', 'type': 'ai_languageModel', 'index': 0}]]},
    'Memória': {'ai_memory': [[{'node': 'Cérebro ORVAX', 'type': 'ai_memory', 'index': 0}]]}
}

for tn in tool_names:
    conn[tn] = {'ai_tool': [[{'node': 'Cérebro ORVAX', 'type': 'ai_tool', 'index': 0}]]}

workflow = {
    'name': 'ORVAX WhatsApp Agent v2',
    'nodes': nodes,
    'connections': conn,
    'pinData': {},
    'settings': {'executionOrder': 'v1'},
    'staticData': None,
    'tags': [],
    'triggerCount': 1,
    'versionId': '2'
}

out_path = os.path.join(script_dir, 'orvax-agent-v2.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

sz = os.path.getsize(out_path)
print(f'OK: {len(nodes)} nós, {len(tool_names)} tools (toolCode), {len(conn)} conexões')
print(f'Arquivo: {sz:,} bytes ({sz/1024:.1f} KB)')
