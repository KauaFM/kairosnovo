# AUDIT_BACKEND.md
**ORVAX — Auditoria Completa do Backend Supabase**
Data: 2026-03-28 | Auditor: Claude Code

---

## ARQUIVOS SQL ANALISADOS

| Arquivo | Tipo |
|---------|------|
| `supabase_schema.sql` | Schema base v1 |
| `agent/setup.sql` | Agente n8n — conversation_history, agent_actions, XP function |
| `agent/setup_backend_complete.sql` | Backend completo — blog, achievements, focus, daily_activity, goals, telemetry_history, user_notes |
| `agent/setup_missing_tables.sql` | Tabelas faltando — transactions, financial_goals, orvax_habitos, telemetry_metrics, media_vault, ranking_groups |
| `fix_database.sql` | Hotfix — INSERT policies emergenciais + 10 alimentos |
| `supabase/migrations/20260325_gymrats_module.sql` | GymRats — challenges, teams, workouts, reactions, comments, messages |
| `supabase/migrations/20260325_fitcal_module.sql` | FitCal — nutrition_plans, foods, meal_entries, weight_logs, water_logs, activity_logs |
| `supabase/migrations/20260328_blog_and_admin.sql` | Blog dinâmico + role em profiles |
| `supabase/migrations/20260328_ensure_profiles.sql` | Trigger handle_new_user() robusto + backfill |
| `supabase/migrations/20260328_mentor_column.sql` | active_mentor em profiles |
| `supabase/migrations/20260328_telemetry_schema_fix.sql` | Colunas extras em telemetry_metrics |
| `supabase/seeds/foods_taco.sql` | 150 alimentos brasileiros TACO |
| `supabase/seeds/blog_posts_seed.sql` | Posts seed do Blog.jsx |

---

## 1. TABELAS: FRONTEND × SCHEMA

### ✅ Existem e estão corretas

| Tabela | Definida em | Observação |
|--------|-------------|------------|
| `profiles` | supabase_schema.sql | Ver colunas faltando abaixo |
| `app_settings` | supabase_schema.sql | |
| `tasks` | supabase_schema.sql | Ver RLS abaixo |
| `blog_posts` | setup_backend_complete.sql + 20260328_blog_and_admin.sql | Ver conflito de schema |
| `achievements` | setup_backend_complete.sql | |
| `user_achievements` | setup_backend_complete.sql | |
| `focus_sessions` | setup_backend_complete.sql | |
| `daily_activity` | setup_backend_complete.sql | |
| `goals` | setup_backend_complete.sql | |
| `telemetry_history` | setup_backend_complete.sql | |
| `user_notes` | setup_backend_complete.sql | |
| `transactions` | setup_missing_tables.sql | |
| `financial_goals` | setup_missing_tables.sql | |
| `telemetry_metrics` | setup_missing_tables.sql + telemetry_schema_fix | Ver mismatch |
| `ranking_groups` | setup_missing_tables.sql | |
| `ranking_group_members` | setup_missing_tables.sql | |
| `nutrition_plans` | fitcal_module.sql | |
| `foods` | fitcal_module.sql | |
| `meal_entries` | fitcal_module.sql | |
| `custom_meals` | fitcal_module.sql | |
| `custom_meal_items` | fitcal_module.sql | |
| `weight_logs` | fitcal_module.sql | |
| `water_logs` | fitcal_module.sql | |
| `activity_logs` | fitcal_module.sql | |
| `challenges` | gymrats_module.sql | |
| `challenge_members` | gymrats_module.sql | |
| `teams` | gymrats_module.sql | |
| `workouts` | gymrats_module.sql | |
| `workout_reactions` | gymrats_module.sql | |
| `workout_comments` | gymrats_module.sql | |
| `messages` | gymrats_module.sql | |

### ⚠️ Existem MAS com colunas faltando / mismatch

| Tabela | Problema | Severidade |
|--------|----------|-----------|
| `profiles` | Coluna `xp` **não existe em nenhum SQL** mas é usada em GlobalRanking, add_xp_and_update_streak(), getRankFromXP() | 🔴 CRÍTICO |
| `profiles` | Coluna `updated_at` **não existe** mas é referenciada em `add_xp_and_update_streak()` | 🔴 CRÍTICO |
| `media_vault` | SQL: `url, type, title, thumbnail, file_size` — Frontend usa: `file_url, description, segment` — nomes completamente diferentes, toda inserção/leitura falha silenciosamente | 🔴 CRÍTICO |
| `telemetry_metrics` | `name NOT NULL` sem default, mas frontend envia apenas `title` sem `name` — upsert falha com NOT NULL violation | 🔴 CRÍTICO |
| `blog_posts` | Definida em 2 lugares: setup_backend_complete tem `tags, views, updated_at`; 20260328 tem `date_day, date_month`. IF NOT EXISTS faz a segunda migration ignorar essas colunas | 🟠 ALTO |
| `profiles` | `agent/setup.sql` cria `selected_mentor` e `20260328_mentor_column.sql` cria `active_mentor` — dois campos para o mesmo propósito, gera confusão | 🟡 MÉDIO |

### ❌ Tabelas legadas (existem no SQL mas NÃO são usadas pelo frontend atual)

| Tabela | Definida em | Observação |
|--------|-------------|------------|
| `notes` | supabase_schema.sql | Frontend migrou para `user_notes`. Tabela morta, gera confusão |
| `orvax_habitos` | setup_missing_tables.sql | Usado apenas pelo n8n agent. OK manter |
| `orvax_workouts` | setup_missing_tables.sql | Usado apenas pelo n8n agent. OK manter |
| `conversation_history` | agent/setup.sql | Usado apenas pelo n8n agent. OK manter |
| `agent_actions` | agent/setup.sql | Usado apenas pelo n8n agent. OK manter |
| `push_tokens` | gymrats_module.sql | Feature não implementada no frontend |
| `recipes` | fitcal_module.sql | Feature não implementada no frontend |
| `community_groups` | fitcal_module.sql | Feature não implementada no frontend |
| `group_members` | fitcal_module.sql | Feature não implementada no frontend |

---

## 2. RLS (Row Level Security)

### Status por tabela

| Tabela | RLS Habilitado | Políticas User | Políticas Service Role | Risco |
|--------|----------------|----------------|------------------------|-------|
| `profiles` | ✅ | SELECT + UPDATE próprio | — | ⚠️ Sem INSERT policy |
| `app_settings` | ✅ | SELECT próprio | — | ⚠️ Sem INSERT policy |
| `tasks` | ✅ | SELECT + UPDATE próprio | — | 🔴 **Sem INSERT policy — frontend não consegue criar tarefas!** |
| `notes` (legacy) | ✅ | INSERT + SELECT próprio | — | Sem UPDATE/DELETE |
| `conversation_history` | ✅ | SELECT próprio | ALL | ✅ |
| `agent_actions` | ✅ | — | ALL | ✅ (só agente lê) |
| `blog_posts` | ✅ | SELECT published | Admin ALL | ✅ |
| `achievements` | ✅ | SELECT public | Service ALL | ✅ |
| `user_achievements` | ✅ | SELECT próprio | Service ALL | ✅ |
| `focus_sessions` | ✅ | ALL próprio | Service ALL | ✅ |
| `daily_activity` | ✅ | SELECT próprio | Service ALL | ⚠️ User não pode inserir |
| `goals` | ✅ | ALL próprio | Service ALL | ✅ |
| `telemetry_history` | ✅ | SELECT próprio | Service ALL | ⚠️ User não pode inserir |
| `user_notes` | ✅ | ALL próprio | Service ALL | ✅ |
| `transactions` | ✅ | ALL próprio | Service ALL | ✅ |
| `financial_goals` | ✅ | ALL próprio | Service ALL | ✅ |
| `orvax_habitos` | ✅ | ALL próprio | Service ALL | ✅ |
| `telemetry_metrics` | ✅ | ALL próprio | Service ALL | ✅ |
| `orvax_workouts` | ✅ | ALL próprio | Service ALL | ✅ |
| `media_vault` | ✅ | ALL próprio | Service ALL | ✅ |
| `ranking_groups` | ✅ | SELECT (próprio/membro) + INSERT | Service ALL | ✅ |
| `ranking_group_members` | ✅ | ALL próprio | Service ALL | ✅ |
| `nutrition_plans` | ✅ | SELECT/INSERT/UPDATE próprio | — | ⚠️ Sem DELETE, sem service_role policy |
| `foods` | ✅ | SELECT public + INSERT autenticado | — | ✅ |
| `meal_entries` | ✅ | SELECT/INSERT/DELETE próprio | — | ✅ |
| `custom_meals` | ✅ | ALL próprio + public read | — | ✅ |
| `custom_meal_items` | ✅ | SELECT public + INSERT autenticado | — | ✅ |
| `weight_logs` | ✅ | SELECT/INSERT/UPDATE próprio | — | ✅ |
| `water_logs` | ✅ | SELECT/INSERT próprio | — | ✅ |
| `activity_logs` | ✅ | SELECT/INSERT próprio | — | ✅ |
| `challenges` | ✅ | SELECT public + owner CRUD | — | ✅ |
| `challenge_members` | ✅ | SELECT public + INSERT/DELETE próprio | — | ✅ |
| `teams` | ✅ | SELECT public + INSERT member | — | ✅ |
| `workouts` | ✅ | SELECT/INSERT member + UPDATE/DELETE próprio | — | ✅ |
| `workout_reactions` | ✅ | SELECT public + INSERT/DELETE próprio | — | ✅ |
| `workout_comments` | ✅ | SELECT public + INSERT próprio | — | ✅ |
| `messages` | ✅ | SELECT/INSERT member | — | ✅ |
| `push_tokens` | ✅ | SELECT/INSERT/DELETE próprio | — | ✅ |

### Problemas Críticos de RLS

**#RLS-1 — `tasks` sem INSERT policy** 🔴 CRÍTICO
O frontend (`Vault.jsx`, `FullCalendar.jsx`) cria tarefas diretamente via `createTask()`. Sem política INSERT, todas as criações de tarefas falham com `new row violates row-level security policy`.
```sql
-- FIX:
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**#RLS-2 — `profiles` sem INSERT policy** 🟠 ALTO
`ensureProfile()` usa upsert que inclui INSERT. Se o trigger `handle_new_user()` falhar por qualquer motivo, o usuário não consegue criar o próprio profile do frontend.
```sql
-- FIX:
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
```

**#RLS-3 — `app_settings` sem INSERT policy** 🟠 ALTO
Se a trigger falhar ao criar app_settings, o usuário fica sem configuração e não pode criar manualmente.
```sql
-- FIX:
CREATE POLICY "app_settings_insert" ON public.app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**#RLS-4 — `monthly_financial_summary` VIEW sem RLS** 🟡 MÉDIO
A view expõe dados financeiros de TODOS os usuários para qualquer autenticado. Não é usada pelo frontend (db.js calcula em JS diretamente de `transactions`), mas representa risco se consultada diretamente.

**#RLS-5 — `telemetry_history` sem INSERT policy para usuário** 🟡 MÉDIO
A função `saveWeeklyTelemetry()` em db.js tenta inserir em telemetry_history, mas a policy só permite service_role. Usuário não consegue salvar histórico.
```sql
-- FIX:
CREATE POLICY "telemetry_history_insert" ON public.telemetry_history FOR INSERT WITH CHECK (user_id = auth.uid());
```

### n8n service_role bypass

O service_role key **bypassa RLS completamente** no Supabase — isso é o comportamento padrão, independente de políticas. As políticas `"Service role full access ..."` nos SQLs são **documentação redundante** (funcionam, mas são desnecessárias). O n8n com service_role consegue ler/escrever em todas as tabelas.

---

## 3. TRIGGERS E FUNCTIONS

### `handle_new_user()` — Status: ⚠️ INCOMPLETO

| Versão | Arquivo | O que faz | Problema |
|--------|---------|-----------|----------|
| v1 | supabase_schema.sql | Cria profile + app_settings | Sem tratamento de erro, pode quebrar signup |
| v2 (ativa) | 20260328_ensure_profiles.sql | Cria profile com EXCEPTION handling, backfill | **NÃO cria app_settings!** |

A versão atual da trigger (v2) foi corrigida para ter exception handling, mas perdeu a criação do `app_settings`. Se o usuário não tiver uma row em `app_settings`, `App.jsx:154` retorna null e não carrega o tema customizado do agente.

**Fix:** Recriar a trigger incluindo INSERT em `app_settings`.

### Outras Functions

| Function | Arquivo | Status | Observação |
|----------|---------|--------|------------|
| `add_xp_and_update_streak()` | agent/setup.sql | ⚠️ | Usa `profiles.updated_at` que não existe |
| `calculate_streak()` | setup_backend_complete.sql | ✅ | Correta |
| `check_achievements()` | setup_backend_complete.sql | ✅ | Correta |
| `update_daily_activity()` | setup_backend_complete.sql | ✅ | Correta |
| `on_task_completed()` trigger | setup_backend_complete.sql | ✅ | Atualiza daily_activity e perfil |
| `on_transaction_created()` trigger | setup_backend_complete.sql | ✅ | Atualiza daily_activity e perfil |
| `on_focus_completed()` trigger | setup_backend_complete.sql | ✅ | Atualiza daily_activity e perfil |
| `get_personal_bests()` | gymrats_module.sql | ✅ | Correta |
| `get_calorie_range()` | fitcal_module.sql | ✅ | Correta |
| `get_daily_summary()` | fitcal_module.sql | ✅ | Correta |
| `monthly_financial_summary` VIEW | setup_backend_complete.sql | ❌ | Type mismatch: usa `'income'/'expense'` mas tabela tem `'in'/'out'` |

---

## 4. FOREIGN KEYS

| FK | Aponta para | Status | Risco |
|----|-------------|--------|-------|
| `profiles.id → auth.users(id)` | auth.users | ✅ | |
| `app_settings.user_id → profiles(id)` | profiles | ✅ | |
| `tasks.user_id → profiles(id)` | profiles | ✅ | |
| `focus_sessions.task_id → tasks(id)` | tasks | ✅ ON DELETE SET NULL | |
| `focus_sessions.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros que apontam pra profiles |
| `challenges.owner_id → profiles(id)` | profiles | ✅ | |
| `challenge_members.user_id → profiles(id)` | profiles | ✅ | |
| `workouts.user_id → profiles(id)` | profiles | ✅ | |
| `meal_entries.food_id → foods(id)` | foods | ✅ ON DELETE... | food_id nullable — OK para entradas manuais |
| `custom_meal_items.food_id → foods(id)` | foods | ✅ | |
| `user_achievements.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros |
| `daily_activity.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros |
| `goals.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros |
| `telemetry_history.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros |
| `user_notes.user_id → auth.users(id)` | auth.users | ⚠️ | Inconsistente com outros |
| `foods.created_by → profiles(id)` | profiles | ✅ | Nullable |

**Inconsistência de FK:** Algumas tabelas criadas em `setup_backend_complete.sql` apontam `user_id → auth.users(id)` enquanto as do schema base apontam `user_id → profiles(id)`. Funcionalmente equivalente (auth.users.id = profiles.id), mas viola a convenção do projeto.

---

## 5. RELATÓRIO DE PROBLEMAS

| # | Tabela/Arquivo | Severidade | Descrição | Fix |
|---|----------------|-----------|-----------|-----|
| 1 | `profiles` | 🔴 CRÍTICO | Coluna `xp` usada em GlobalRanking, Dossier, add_xp_and_update_streak(), getRankFromXP() mas **nunca definida** em nenhum SQL | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0` |
| 2 | `profiles` | 🔴 CRÍTICO | Coluna `updated_at` referenciada na function `add_xp_and_update_streak()` mas não existe na tabela | `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()` |
| 3 | `media_vault` | 🔴 CRÍTICO | Frontend usa `file_url, description, segment` mas SQL tem `url, title, type` — toda operação no Vault Arquivo falha silenciosamente | Adicionar aliases com `ADD COLUMN IF NOT EXISTS file_url`, `description`, `segment` |
| 4 | `tasks` | 🔴 CRÍTICO | Sem INSERT policy — usuário não consegue criar tarefas pela UI (`Vault.jsx`, `FullCalendar.jsx`) | Adicionar `CREATE POLICY tasks_insert` |
| 5 | `telemetry_metrics` | 🔴 CRÍTICO | `name TEXT NOT NULL` sem default — frontend envia `{title, value}` sem `name`, upsert viola constraint NOT NULL | Adicionar `DEFAULT ''` em `name`, ou mapear `name = title` |
| 6 | `handle_new_user()` | 🟠 ALTO | Versão atual (v2) não cria app_settings — usuário fica sem configuração de tema/tabs | Recriar trigger incluindo INSERT em app_settings |
| 7 | `profiles` | 🟠 ALTO | Sem INSERT policy — `ensureProfile()` upsert pode falhar na primeira inserção | Adicionar INSERT policy |
| 8 | `app_settings` | 🟠 ALTO | Sem INSERT policy — se trigger falhar, usuário fica bloqueado | Adicionar INSERT policy |
| 9 | `blog_posts` | 🟠 ALTO | Definida em 2 arquivos com schemas diferentes; `date_day/date_month` (usados pelo frontend) só estão no migration, não no setup_backend_complete | Garantir ambas as colunas com ADD COLUMN IF NOT EXISTS |
| 10 | `telemetry_history` | 🟠 ALTO | Sem INSERT policy para usuário — `saveWeeklyTelemetry()` em db.js falha | Adicionar INSERT policy |
| 11 | `monthly_financial_summary` VIEW | 🟡 MÉDIO | Type values incorretos: `'income'/'expense'` vs `'in'/'out'` da tabela transactions. View nunca retorna dados. Frontend não a usa (calcula em JS), mas pode confundir no futuro | Recriar view com os valores corretos |
| 12 | `profiles.selected_mentor` | 🟡 MÉDIO | `agent/setup.sql` cria `selected_mentor`. Migration `20260328_mentor_column.sql` cria `active_mentor`. Dois campos para o mesmo propósito | Dropar `selected_mentor` ou documentar deprecação |
| 13 | `notes` table | 🟡 MÉDIO | Tabela legada do schema v1, nunca usada pelo frontend (que usa `user_notes`). Cria confusão | DROP TABLE IF EXISTS public.notes |
| 14 | `deleteTelemetryMetric` | 🟡 MÉDIO | db.js:176 `.delete().eq('id', id)` sem `.eq('user_id', ...)` — com RLS ativo é seguro, mas o código deveria filtrar explicitamente | Adicionar `.eq('user_id', session.user.id)` |
| 15 | FK inconsistência | 🔵 BAIXO | Metade das tabelas aponta `user_id → auth.users`, metade aponta `→ profiles`. Funcionalmente OK mas viola convenção | Documentar — correção não é urgente |
| 16 | `createGroup` | 🔵 BAIXO | Duas queries separadas sem transação — se segunda falhar, grupo fica sem owner | Encapsular em função SQL transacional |

---

## 6. RESUMO EXECUTIVO

| Categoria | Qtd |
|-----------|-----|
| 🔴 CRÍTICO | 5 |
| 🟠 ALTO | 5 |
| 🟡 MÉDIO | 4 |
| 🔵 BAIXO | 2 |
| **Total** | **16** |

### Impacto no Beta

Com os 5 problemas críticos não resolvidos:
- **GlobalRanking**: crash ao ler `profiles.xp` (undefined, não 0)
- **Vault Arquivo**: todas as fotos/mídias falham ao salvar e ao carregar
- **Vault Agenda + FullCalendar**: impossível criar novas tarefas (RLS bloqueia)
- **Telemetria**: impossível adicionar métricas customizadas (NOT NULL violation)
- **Dossier/XP**: nenhum usuário tem XP, ranks sempre E/RECRUTA

### O arquivo `FINAL_BETA_MIGRATION.sql` corrige todos os 16 problemas acima.

---

## TABELAS NECESSÁRIAS PARA O BETA — LISTA CONSOLIDADA

### Grupo 1: Core / Auth / Config
- `profiles` (30+ colunas — ver migration)
- `app_settings`

### Grupo 2: Agenda / Tarefas / Foco
- `tasks`
- `focus_sessions`
- `daily_activity`

### Grupo 3: Financeiro
- `transactions`
- `financial_goals`

### Grupo 4: Vault
- `user_notes`
- `media_vault`
- `goals`

### Grupo 5: Telemetria
- `telemetry_metrics`
- `telemetry_history`

### Grupo 6: Gamificação
- `achievements`
- `user_achievements`

### Grupo 7: Blog
- `blog_posts`

### Grupo 8: FitCal
- `nutrition_plans`
- `foods`
- `meal_entries`
- `custom_meals`
- `custom_meal_items`
- `weight_logs`
- `water_logs`
- `activity_logs`

### Grupo 9: GymRats / Arena
- `challenges`
- `challenge_members`
- `teams`
- `workouts`
- `workout_reactions`
- `workout_comments`
- `messages`

### Grupo 10: Ranking Social
- `ranking_groups`
- `ranking_group_members`

### Grupo 11: n8n Agent (não acessadas pelo frontend)
- `conversation_history`
- `agent_actions`
- `orvax_habitos`
- `orvax_workouts`
