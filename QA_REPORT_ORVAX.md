# QA Report — ORVAX Sistema de Controle Pessoal
**Data:** 26/03/2026
**Engenheiro QA:** Claude (Sessão Autônoma)
**Stack testada:** React 18 + Vite (localhost:5173) · Supabase PostgreSQL · n8n WhatsApp Agent

---

## Resumo Executivo

| Severidade | Qtd |
|---|---|
| 🔴 CRÍTICO | 3 |
| 🟠 ALTO | 4 |
| 🟡 MÉDIO | 3 |
| 🟢 BAIXO / INFO | 3 |
| **Total** | **13** |

**Status geral do sistema:** ⚠️ Parcialmente funcional. Módulos Focus e Arena (leitura) funcionam. Todos os módulos de escrita no Supabase falham por ausência de profile row para o usuário autenticado. n8n ativo mas com execução zombie e erro no sub-nó de memória.

---

## Bugs Críticos 🔴

### BUG-001 · Missing `profiles` row — raiz de todas as falhas de escrita
**Severidade:** CRÍTICO
**Afeta:** FitCal (água, peso), Arena (criar desafio), potencialmente todas as features de escrita
**Causa raiz:** O usuário `2390a96c-1f3a-4539-80c8-e04e84877291` não possui linha na tabela `public.profiles`. A trigger `handle_new_user()` que deveria criar o profile automaticamente no signup não foi executada para este usuário.
**Impacto:** FK constraint violation em cascata:
- `weight_logs.user_id` → `profiles(id)` ❌ FK 23503
- `water_logs.user_id` → `profiles(id)` ❌ FK manifesta como 409
- `challenges.owner_id` → `profiles(id)` ❌ FK 23503
- `challenge_members.user_id` → `profiles(id)` → falha também ao entrar em desafio

**Fix imediato (SQL — executar no Supabase Dashboard como service role):**
```sql
INSERT INTO public.profiles (id)
VALUES ('2390a96c-1f3a-4539-80c8-e04e84877291')
ON CONFLICT DO NOTHING;
```
**Fix permanente:** Verificar e reinstalar a trigger `handle_new_user()` + validar que dispara para novos usuários.

---

### BUG-002 · Tabela `foods` vazia — Diário Alimentar 100% não-funcional
**Severidade:** CRÍTICO
**Afeta:** FitCal → Diário Alimentar (AddMealModal)
**Evidência:** `searchFoods('arroz')` retorna `[]`. Query confirmada: `GET /rest/v1/foods?name=ilike.%25arroz%25` → `[]`
**Impacto:** Usuário não consegue adicionar nenhum alimento ao diário. A feature completa está inoperante.
**Fix:** Fazer seed da tabela `foods` com base de dados alimentar brasileira (TACO ou similar). Script de seed SQL necessário.

---

### BUG-003 · n8n: Execução zombie (249+ horas em "Running")
**Severidade:** CRÍTICO (operacional)
**Afeta:** n8n — ORVAX WhatsApp Agent v2
**Evidência:** Execution ID #1500 (Mar 16, 14:40:39) aparece como "Running for 249h 13m+" na lista de execuções.
**Impacto:** Pode consumir recursos do servidor n8n, bloquear novas execuções dependendo do plano, e poluir métricas de execução.
**Fix:** Parar manualmente a execução via botão "Stop all" na lista de execuções ou via API n8n.

---

## Bugs Altos 🟠

### BUG-004 · Water logs: erro silencioso no `addWater()`
**Severidade:** ALTO
**Afeta:** FitCal → Tracker de Água
**Causa:** `addWater()` em `weightService.js` não tem try/catch e não faz await do error:
```js
await supabase.from('water_logs').insert({...}); // sem verificar error
```
Quando a inserção falha (por FK), o erro é silenciado. O usuário clica no botão +250ml e nada acontece — sem feedback de erro.
**Fix:** Adicionar tratamento de erro + feedback visual ao usuário.

---

### BUG-005 · Weight save: erro silencioso para o usuário
**Severidade:** ALTO
**Afeta:** FitCal → Progresso → salvar peso
**Causa:** `handleSaveWeight` em `ProgressPage.jsx` captura o erro mas só faz `console.error('Weight save error:', err)` — sem feedback na UI.
**Impacto:** Usuário clica em salvar peso, não ocorre nada visível. Experiência confusa.
**Fix:** Adicionar estado de erro e mostrar mensagem na UI.

---

### BUG-006 · n8n: Sub-nó 'memoria' falhando intermitentemente
**Severidade:** ALTO
**Afeta:** n8n — Cérebro ORVAX (AI Agent)
**Evidência:** Execuções com duração de 34ms retornam "Error in sub-node 'memoria'". As execuções de ~6s que chegam ao agente de IA também falham neste nó.
**Causa provável:** Credenciais ou configuração do nó de memória (provavelmente Supabase Vector Store ou Window Buffer Memory) estão inválidas/expiradas.
**Fix:** Abrir o nó 'memoria' no editor n8n, verificar credenciais e testar a conexão.

---

### BUG-007 · RLS: ausência de política INSERT em `profiles` bloqueia criação manual
**Severidade:** ALTO
**Afeta:** Backend Supabase
**Causa:** A tabela `profiles` tem RLS habilitado mas nenhuma política de INSERT. Isso é intencional (só a trigger service-role pode inserir), mas significa que se a trigger falhar, não há forma de corrigir via cliente.
**Impacto:** Usuários cujo signup falhou silenciosamente ficarão permanentemente sem profile, com todas as features de escrita bloqueadas.
**Fix sugerido:** Criar política `profiles_insert_self`: `WITH CHECK (auth.uid() = id)` para permitir auto-inserção em caso de emergência, ou adicionar lógica de upsert no `onAuthStateChange` do front-end.

---

## Bugs Médios 🟡

### BUG-008 · Tabela `tasks`: política INSERT ausente
**Severidade:** MÉDIO
**Afeta:** Módulo de Tarefas
**Evidência:** `supabase_schema.sql` define RLS em `tasks` mas não há política de INSERT. Inserção de tarefas provavelmente falha silenciosamente.
**Fix:** Adicionar política:
```sql
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### BUG-009 · Arena: CRIAR DESAFIO mostra erro técnico de FK ao usuário
**Severidade:** MÉDIO
**Afeta:** Arena → Criar Desafio
**Evidência:** Mensagem exibida: `"insert or update on table "challenges" violates foreign key constraint "challenges_owner_id_fkey""`
**Impacto:** Mensagem técnica exposta diretamente ao usuário. Deve ser tratada e exibida como "Perfil não encontrado. Por favor, faça logout e login novamente."
**Fix:** Em `CreateChallenge.jsx`, capturar o erro code `23503` e exibir mensagem amigável.

---

### BUG-010 · EventNotifier: timezone offset em notificações
**Severidade:** MÉDIO
**Afeta:** `EventNotifier.jsx` — notificações de tarefas
**Situação:** O componente foi parcialmente corrigido (usa data local para `scheduled_date`), mas a comparação de horário para disparar notificação usa `new Date()` sem considerar possíveis divergências de timezone entre servidor (Supabase) e cliente.
**Fix:** Confirmar que `time_start` no banco está sempre em hora local (sem offset).

---

## Bugs Baixos / Informativos 🟢

### BUG-011 · [CORRIGIDO] Timezone bug em datas (BUG original #11)
**Severidade:** BAIXO (resolvido)
**Status:** ✅ CORRIGIDO em sessão anterior
**Fix aplicado:** `toLocalDateStr()` em `dateUtils.js` usando `getFullYear()/getMonth()/getDate()`.
**Verificação:** Requisições Supabase confirmadas com `log_date=eq.2026-03-26` ✅

---

### BUG-012 · FitCal: LAT/LNG mostrando "00.00.00" fixo
**Severidade:** BAIXO
**Afeta:** Header do app (LAT/LNG display)
**Evidência:** Coordenadas exibem `00.00.00` estaticamente — a geolocalização não está sendo solicitada/populada.
**Fix:** Implementar `navigator.geolocation.getCurrentPosition()` no componente de header.

---

### BUG-013 · n8n: Fast-fail errors (~10-34ms) — Meta webhook challenges
**Severidade:** INFO
**Afeta:** n8n executions list
**Análise:** As numerosas execuções com erro em 10-34ms são provávelmente webhooks de verificação do Meta (GET `hub.challenge`) sendo processados pelo fluxo principal ao invés do "Validador Meta [GET]". Não afetam usuários reais.
**Recomendação:** Verificar se o nó "É uma Mensagem Real?" está filtrando corretamente as challenge requests do Meta.

---

## Fluxos Testados e Status

| Módulo | Fluxo | Status | Observação |
|---|---|---|---|
| **App** | Carregamento inicial | ✅ OK | Limpo, sem erros de console |
| **App** | Toggle dark mode | ✅ OK | Funciona corretamente |
| **FitCal** | Visualizar dashboard | ✅ OK | Renders corretamente |
| **FitCal** | Adicionar água (+250ml) | ❌ FAIL | FK violation silenciosa (BUG-001, BUG-004) |
| **FitCal** | Salvar peso | ❌ FAIL | FK violation silenciosa (BUG-001, BUG-005) |
| **FitCal** | Buscar alimento | ❌ FAIL | foods table vazia (BUG-002) |
| **FitCal** | Plano nutricional | ✅ OK | Exibe dados corretos |
| **Focus** | Carregar artigos | ✅ OK | Feed renderiza |
| **Focus** | Abrir artigo (detalhe) | ✅ OK | Navegação e conteúdo OK |
| **Focus** | ORVAX FM player | ✅ OK | Play/pause funciona |
| **Arena** | Visualizar home | ✅ OK | "NENHUM DESAFIO" exibe correto |
| **Arena** | Criar desafio | ❌ FAIL | FK violation visível (BUG-001, BUG-009) |
| **Arena** | Entrar com código (inválido) | ✅ OK | "Desafio nao encontrado" exibe correto |
| **Arena** | Navegação back | ✅ OK | Volta ao home correto |
| **n8n** | Workflow ativo | ✅ OK | Workflow publicado e ativo |
| **n8n** | Execuções bem-sucedidas | ✅ OK | 2 execuções completas (2.7s e 6.1s) |
| **n8n** | Sub-nó memoria | ❌ FAIL | Erro intermitente (BUG-006) |
| **n8n** | Execução zombie | ❌ FAIL | Running há 249h+ (BUG-003) |

---

## Ações Prioritárias (Ordem de Execução)

1. **[DB IMEDIATO]** Executar SQL para criar profile row do usuário de teste (BUG-001)
2. **[DB IMEDIATO]** Fazer seed da tabela `foods` com dados alimentares (BUG-002)
3. ~~**[n8n IMEDIATO]** Parar execução zombie ID #1500 (BUG-003)~~ ✅ **RESOLVIDO** — Execução cancelada em 27/03/2026
4. ~~**[n8n IMEDIATO]** Corrigir sub-nó 'memoria': On Error → Continue (BUG-006)~~ ⚠️ **FIX APLICADO NA UI** — Verificar persistência após re-login (sessão expirada)
5. **[CÓDIGO MÉDIO]** Adicionar tratamento de erro visível em `addWater()` e `handleSaveWeight` (BUG-004, BUG-005)
6. **[DB MÉDIO]** Adicionar política INSERT em `tasks` (BUG-008)
7. **[CÓDIGO BAIXO]** Humanizar mensagem de erro FK em CreateChallenge (BUG-009)
8. **[DB BAIXO]** Adicionar política INSERT de emergência em `profiles` (BUG-007)

---

## Sessão de Fixes n8n — 27/03/2026

### O que foi feito nesta sessão

**BUG-003 ✅ RESOLVIDO — Zombie execution parada**
- Execução ID #1500 (Mar 16, 14:40:39 — Running 249h+) cancelada com sucesso via botão "Stop Execution"
- Status alterado para "Canceled in 249h 34m 55.726s"

**BUG-006 — Root cause identificada, fix pendente de save**

Diagnóstico completo do sub-nó Memória1:
- **Tipo:** Simple Memory (armazenamento in-process, sem credenciais externas) — OK
- **Session Key:** `{{ $("Montar Contexto do Usuário1").item.json.phone }}` — OK
- **Context Window:** 20 mensagens — OK
- **Root cause real:** `On Error` configurado como **"Stop Workflow"** → quando a expressão do phone falha (ex: em webhook challenges do Meta), o nó lança exceção e para TODO o workflow

**Fix necessário (1 clique — pendente salvar):**
> Memória1 → aba Settings → `On Error` → mudar de **"Stop Workflow"** para **"Continue"**

A mudança foi feita na UI mas **não foi persistida** porque a sessão atual retorna "Unauthorized" ao tentar salvar. O proprietário do workflow precisa:
1. Fazer login no n8n com conta de Owner
2. Abrir `Cérebro ORVAX1` → clicar no ícone de banco de dados (Memory) → aba Settings
3. Alterar `On Error` → **Continue** → Ctrl+S

**Nó com issue flag — INVESTIGADO:**
- **Modelo GPT-4o-mini** (branch Extrair Texto → Resposta de Erro) — **DESATIVADO INTENCIONALMENTE**
- Output confirma: `"This node is disabled, and will simply pass the input through"`
- Credencial: "OpenAI account" — configurada ✅
- Modelo: `gpt-4o-mini` — OK ✅
- Versão do nó: **1.2** (latest: 1.3) — minor update disponível, não crítico
- `On Error: Stop Workflow` — não importa pois o nó está desativado
- **Conclusão:** Não é um bug. O indicador de issue no canvas é apenas o ícone de "desativado".

---

## Sessão de Investigação n8n — 27/03/2026 (Continuação)

### Diagnóstico da sessão expirada

**Causa do "Autosave failed: Unauthorized":**
- A sessão do n8n (`kadoido712@gmail.com`) **expirou** — todas as chamadas REST retornam 401
- O autosave tentou salvar 45+ vezes (`retryCount: 45`, `retryDelay: 32s`) sem sucesso
- O `pendingAutoSave: {}` indica que o payload de salvamento foi processado mas **não confirmado pelo servidor**

**Estado atual da Memória1 (in-memory, browser):**
- `onError: "continueRegularOutput"` ✅ — o fix está na memória do browser
- **NÃO É POSSÍVEL CONFIRMAR** se o servidor tem essa configuração salva (401 em todas as chamadas)

**Ação necessária pelo usuário:**
1. Abrir o n8n e **fazer login** (sessão expirada)
2. Abrir o workflow `ORVAX WhatsApp Agent v2`
3. Abrir o nó `Cérebro ORVAX1` → clicar no ícone de banco de dados (Memory) → aba **Settings**
4. **Verificar** se `On Error` = **Continue**
   - Se já estiver como "Continue" → ✅ foi salvo, nada a fazer
   - Se ainda for "Stop Workflow" → alterar para **Continue** → **Ctrl+S**

---

## Resumo Final do Estado n8n

| Item | Status | Observação |
|---|---|---|
| BUG-003 Zombie execution | ✅ RESOLVIDO | Cancelada — Execution ID #1500 |
| BUG-006 Memória1 On Error | ⚠️ VERIFICAR | Fix aplicado na UI; persistência incerta (sessão expirada) |
| Modelo GPT-4o-mini | ℹ️ NORMAL | Desativado intencionalmente; não é bug |
| Sessão n8n | ❌ EXPIRADA | Re-login necessário para qualquer operação |

---

*Relatório atualizado — Sessão 27/03/2026 (Continuação)*
