# ORVAX Agent v2 — Configuração de Tools

> Cada tool abaixo é um nó **HTTP Request Tool** conectado ao "Cérebro ORVAX" (AI Agent).
> Substitua `{{SUPABASE_URL}}` e `{{SUPABASE_KEY}}` pela URL e **service_role key** do seu Supabase.

## Headers padrão (todos os tools):
```
apikey: {{SUPABASE_KEY}}
Authorization: Bearer {{SUPABASE_KEY}}
Content-Type: application/json
Prefer: return=representation
```

---

## TOOLS JÁ EXISTENTES (manter como estão)
- registrar_transacao
- consultar_transacoes
- criar_tarefa
- consultar_tarefas
- criar_meta1
- consultar_metas1
- criar_meta_financeira
- registrar_habito1
- registrar_pontos
- criar_nota
- registrar_foco
- salvar_conversa
- registrar_acao
- atualizar_config_app

---

## NOVOS TOOLS PARA ADICIONAR

### 1. registrar_agua
**Description para a IA:** "Registra consumo de água do usuário em mililitros. Use quando o usuário mencionar que bebeu água."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/water_logs`
- **Body:**
```json
{
  "user_id": "{user_id}",
  "amount_ml": {amount_ml},
  "log_date": "{today}"
}
```
- **Placeholders:**
  - `user_id`: string — "ID do usuário" (preencha via expressão: `{{ $('Montar Contexto do Usuário').item.json.user_id }}`)
  - `amount_ml`: number — "Quantidade de água em mililitros"
  - `today`: string — "Data de hoje no formato YYYY-MM-DD" (preencha via expressão: `{{ new Date().toISOString().split('T')[0] }}`)

---

### 2. consultar_agua_hoje
**Description:** "Consulta a quantidade total de água que o usuário bebeu hoje."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/water_logs?user_id=eq.{user_id}&log_date=eq.{today}&select=amount_ml`
- **Placeholders:**
  - `user_id`: fixo via expressão
  - `today`: data de hoje

---

### 3. registrar_peso
**Description:** "Registra o peso corporal do usuário em kg. Use quando o usuário informar seu peso."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/weight_logs`
- **Body:**
```json
{
  "user_id": "{user_id}",
  "weight_kg": {weight_kg},
  "log_date": "{today}"
}
```
- **Placeholders:**
  - `weight_kg`: number — "Peso em quilogramas"

---

### 4. consultar_peso_recente
**Description:** "Consulta os últimos 10 registros de peso do usuário para mostrar evolução."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/weight_logs?user_id=eq.{user_id}&select=weight_kg,log_date&order=log_date.desc&limit=10`

---

### 5. registrar_treino
**Description:** "Registra um treino/exercício do usuário. Use quando o usuário mencionar que fez atividade física."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/workouts`
- **Body:**
```json
{
  "user_id": "{user_id}",
  "title": "{title}",
  "description": "{description}",
  "duration_min": {duration_min},
  "activity_type": "{activity_type}",
  "created_at": "{now}"
}
```
- **Placeholders:**
  - `title`: string — "Nome do treino (ex: 'Musculação', 'Corrida')"
  - `description`: string — "Descrição breve do treino"
  - `duration_min`: number — "Duração em minutos"
  - `activity_type`: string — "Tipo: gym, run, yoga, cycling, swim, walk, other"

---

### 6. consultar_treinos
**Description:** "Consulta os últimos 10 treinos do usuário."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/workouts?user_id=eq.{user_id}&select=title,duration_min,activity_type,created_at&order=created_at.desc&limit=10`

---

### 7. registrar_refeicao
**Description:** "Registra uma refeição do usuário. Use quando o usuário mencionar o que comeu."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/meal_entries`
- **Body:**
```json
{
  "user_id": "{user_id}",
  "meal_type": "{meal_type}",
  "food_name": "{food_name}",
  "calories": {calories},
  "protein_g": {protein_g},
  "carbs_g": {carbs_g},
  "fat_g": {fat_g},
  "log_date": "{today}"
}
```
- **Placeholders:**
  - `meal_type`: string — "Tipo: breakfast, lunch, dinner, snack"
  - `food_name`: string — "Nome/descrição do alimento"
  - `calories`: number — "Calorias estimadas (estimativa se não souber)"
  - `protein_g`: number — "Proteína em gramas (0 se não souber)"
  - `carbs_g`: number — "Carboidratos em gramas (0 se não souber)"
  - `fat_g`: number — "Gordura em gramas (0 se não souber)"

---

### 8. consultar_refeicoes_hoje
**Description:** "Consulta as refeições registradas hoje pelo usuário."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/meal_entries?user_id=eq.{user_id}&log_date=eq.{today}&select=meal_type,food_name,calories,protein_g,carbs_g,fat_g`

---

### 9. atualizar_tarefa
**Description:** "Atualiza o estado de uma tarefa existente. Use quando o usuário disser que completou ou iniciou uma tarefa. Estados: 'pending', 'active', 'done'."
- **Method:** PATCH
- **URL:** `{{SUPABASE_URL}}/rest/v1/tasks?id=eq.{task_id}&user_id=eq.{user_id}`
- **Body:**
```json
{
  "state": "{state}"
}
```
- **Placeholders:**
  - `task_id`: string — "ID da tarefa a atualizar"
  - `state`: string — "Novo estado: 'pending' (pendente), 'active' (em andamento), 'done' (concluída)"

**IMPORTANTE:** Primeiro use consultar_tarefas para obter o ID, depois atualize.

---

### 10. deletar_tarefa
**Description:** "Deleta uma tarefa do usuário. SEMPRE confirme com o usuário antes de usar esta ferramenta."
- **Method:** DELETE
- **URL:** `{{SUPABASE_URL}}/rest/v1/tasks?id=eq.{task_id}&user_id=eq.{user_id}`
- **Placeholders:**
  - `task_id`: string — "ID da tarefa a deletar"

---

### 11. atualizar_meta
**Description:** "Atualiza uma meta pessoal — alterar progresso, status ou descrição."
- **Method:** PATCH
- **URL:** `{{SUPABASE_URL}}/rest/v1/goals?id=eq.{goal_id}&user_id=eq.{user_id}`
- **Body:**
```json
{
  "progress": {progress},
  "status": "{status}"
}
```
- **Placeholders:**
  - `goal_id`: string — "ID da meta"
  - `progress`: number — "Progresso de 0 a 100"
  - `status`: string — "Status: active, completed, abandoned"

---

### 12. consultar_metas_financeiras
**Description:** "Lista todas as metas financeiras ativas do usuário com progresso."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/financial_goals?user_id=eq.{user_id}&select=*&order=created_at.desc`

---

### 13. consultar_habitos
**Description:** "Lista os hábitos do usuário e se foram cumpridos hoje."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/orvax_habitos?user_id=eq.{user_id}&select=*&order=created_at.desc`

---

### 14. consultar_perfil
**Description:** "Consulta dados do perfil do usuário — nome, streak, score, nível, mentor selecionado."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/profiles?id=eq.{user_id}&select=full_name,streak_days,xp,level,selected_mentor,avatar_url`

---

### 15. consultar_telemetria
**Description:** "Consulta os scores dos 6 pilares ORVAX do usuário (BioFísico, Cognitivo, Capital, Social, Espiritual, Digital)."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/telemetry_metrics?user_id=eq.{user_id}&select=name,score,category&order=name.asc`

---

### 16. consultar_conquistas
**Description:** "Lista conquistas/achievements que o usuário já desbloqueou."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/user_achievements?user_id=eq.{user_id}&select=*,achievements(title,description,icon,points)`

---

### 17. consultar_notas
**Description:** "Lista as notas/reflexões mais recentes do usuário."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/user_notes?user_id=eq.{user_id}&select=title,content,created_at&order=created_at.desc&limit=10`

---

### 18. consultar_foco_hoje
**Description:** "Lista sessões de foco/deep work de hoje do usuário."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/focus_sessions?user_id=eq.{user_id}&select=duration_min,activity,created_at&order=created_at.desc&limit=10`

---

### 19. consultar_resumo_financeiro
**Description:** "Retorna resumo financeiro mensal — receitas, despesas e saldo líquido dos últimos meses."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/transactions?user_id=eq.{user_id}&select=amount,type,category,date&order=date.desc`
- **Nota:** O agente deve agregar os dados por mês no lado do AI (somar type='in' e type='out')

---

### 20. consultar_stats_hoje
**Description:** "Retorna estatísticas de hoje — tarefas concluídas, total de tarefas, minutos de foco. Use para check-ins e revisões do dia."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/daily_activity?user_id=eq.{user_id}&select=tasks_completed,tasks_total,focus_minutes,date&order=date.desc&limit=7`

---

### 21. consultar_atividade_semana
**Description:** "Retorna atividade dos últimos 7 dias — útil para mostrar consistência e streak visual."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/daily_activity?user_id=eq.{user_id}&select=date,tasks_completed,focus_minutes&order=date.desc&limit=7`

---

### 22. verificar_conquistas
**Description:** "Verifica e desbloqueia novas conquistas baseado no progresso do usuário. Use após o usuário completar algo significativo (tarefa, meta, streak)."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/rpc/check_achievements`
- **Body:**
```json
{
  "p_user_id": "{user_id}"
}
```

---

### 23. calcular_streak
**Description:** "Calcula o streak atual (dias consecutivos de atividade) do usuário."
- **Method:** POST
- **URL:** `{{SUPABASE_URL}}/rest/v1/rpc/calculate_streak`
- **Body:**
```json
{
  "p_user_id": "{user_id}"
}
```

---

### 24. consultar_foco_total_hoje
**Description:** "Retorna total de minutos de foco completados hoje."
- **Method:** GET
- **URL:** `{{SUPABASE_URL}}/rest/v1/focus_sessions?user_id=eq.{user_id}&status=eq.completed&select=actual_minutes&created_at=gte.{today}`
- **Nota:** O agente soma os valores de `actual_minutes` para dar o total

---

### 25. atualizar_nota
**Description:** "Edita uma nota existente — atualiza título ou conteúdo."
- **Method:** PATCH
- **URL:** `{{SUPABASE_URL}}/rest/v1/user_notes?id=eq.{note_id}&user_id=eq.{user_id}`
- **Body:**
```json
{
  "title": "{title}",
  "content": "{content}"
}
```

---

### 26. deletar_nota
**Description:** "Deleta uma nota do usuário. SEMPRE confirme antes."
- **Method:** DELETE
- **URL:** `{{SUPABASE_URL}}/rest/v1/user_notes?id=eq.{note_id}&user_id=eq.{user_id}`

---

## DICA DE CONFIGURAÇÃO NO n8n

Para cada tool, no n8n:
1. Arraste um nó "HTTP Request Tool" para o canvas
2. Conecte ao "Cérebro ORVAX" (AI Agent) na entrada "Tool"
3. Configure os campos:
   - **Name**: nome_da_tool (ex: registrar_agua)
   - **Description**: a descrição listada acima
   - **Method**: GET/POST/PATCH/DELETE conforme indicado
   - **URL**: URL com placeholders
   - **Headers**: os headers padrão do Supabase
   - **Body**: o JSON body conforme indicado (apenas para POST/PATCH)

Para o `user_id` fixo, use uma expressão n8n:
```
{{ $('Montar Contexto do Usuário').item.json.user_id }}
```

Para a data de hoje:
```
{{ new Date().toISOString().split('T')[0] }}
```
