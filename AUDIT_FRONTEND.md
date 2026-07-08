# AUDIT_FRONTEND.md
**ORVAX — Auditoria Completa do Frontend**
Data: 2026-03-28 | Auditor: Claude Code

---

## RESULTADO DO BUILD

```
npm run build → ✓ built in 4.13s  (sem erros de compilação)
```

| Tipo | Descrição |
|------|-----------|
| ⚠️ WARNING CSS | `@import` Google Fonts após outros statements em `index.css` (linha ~11) |
| ⚠️ WARNING Bundle | Chunk único `index-*.js` de **884 kB** (gzip 232 kB) — acima do limite 500 kB recomendado pelo Vite |

---

## LISTA DE ARQUIVOS `src/`

```
src/main.jsx
src/App.jsx
src/invert.js
src/lib/supabase.js
src/services/db.js
src/services/gemini.js
src/utils/dateUtils.js
src/components/Navigation.jsx
src/components/Nexus.jsx
src/components/Vault.jsx
src/components/Telemetry.jsx
src/components/Dossier.jsx
src/components/Blog.jsx
src/components/MentorConfig.jsx
src/components/MentorModal.jsx
src/components/GlobalRanking.jsx
src/components/AdminBlog.jsx
src/components/BaseLayout.jsx
src/components/CapitalViewNew.jsx
src/components/EventNotifier.jsx
src/components/WelcomeVideo.jsx
src/components/RankSystem.jsx
src/components/UserProfile.jsx
src/components/ScrollReveal.jsx
src/components/FullCalendar.jsx
src/components/FocusMode.jsx
src/components/Metrics/MetricCards.jsx
src/components/Metrics/MetricDetailModal.jsx
src/components/Metrics/metricDefs.js
src/components/Metrics/GoalProgress.jsx
src/components/Metrics/NodeDashboards.jsx
src/components/charts/RadarChart.jsx
src/components/charts/WeeklyHeatmap.jsx
src/components/charts/TimeSeriesChart.jsx
src/components/nodes/SocialNodeView.jsx
src/components/nodes/SkillsNodeView.jsx
src/components/nodes/EspiritualNodeView.jsx
src/components/nodes/DigitalNodeView.jsx
src/components/Login/Login.jsx
src/features/fitcal/pages/FitCalHome.jsx
src/features/fitcal/pages/ProgressPage.jsx
src/features/fitcal/components/AddMealModal.jsx
src/features/fitcal/components/CalorieSummary.jsx
src/features/fitcal/components/FoodDiary.jsx
src/features/fitcal/components/FoodScanner.jsx
src/features/fitcal/components/MacroBar.jsx
src/features/fitcal/components/StreakBadge.jsx
src/features/fitcal/components/WaterTracker.jsx
src/features/fitcal/components/WeightChart.jsx
src/features/fitcal/hooks/useFoodDiary.js
src/features/fitcal/hooks/useNutritionPlan.js
src/features/fitcal/hooks/useStreak.js
src/features/fitcal/hooks/useWeight.js
src/features/fitcal/services/aiService.js
src/features/fitcal/services/barcodeService.js
src/features/fitcal/services/foodService.js
src/features/fitcal/services/streakService.js
src/features/fitcal/services/weightService.js
src/features/fitcal/utils/macroCalc.js
src/features/fitcal/utils/tdeeCalc.js
src/features/gymrats/pages/GymRatsHome.jsx
src/features/gymrats/pages/ChallengeDetail.jsx
src/features/gymrats/pages/CreateChallenge.jsx
src/features/gymrats/pages/ProfileStats.jsx
src/features/gymrats/components/ChallengeCard.jsx
src/features/gymrats/components/ChatWindow.jsx
src/features/gymrats/components/CheckInModal.jsx
src/features/gymrats/components/Leaderboard.jsx
src/features/gymrats/components/ScoringConfig.jsx
src/features/gymrats/components/WorkoutFeed.jsx
src/features/gymrats/hooks/useChat.js
src/features/gymrats/hooks/useChallenges.js
src/features/gymrats/hooks/useCheckin.js
src/features/gymrats/hooks/useLeaderboard.js
src/features/gymrats/services/challengeService.js
src/features/gymrats/services/chatService.js
src/features/gymrats/services/checkinService.js
src/features/gymrats/utils/formatters.js
src/features/gymrats/utils/scoring.js
```

---

## ROTAS E NAVEGAÇÃO

### Tabs definidas em `Navigation.jsx`
| Tab key | Componente em App.jsx | Componente existe? |
|---------|----------------------|-------------------|
| `nexus` | `<Nexus>` | ✅ |
| `vault` | `<Vault>` | ✅ |
| `fitcal` | `<FitCalHome>` | ✅ |
| `focus` | `<Blog>` | ✅ |
| `telemetry` | `<Telemetry>` | ✅ |
| `arena` | `<GymRatsHome>` | ✅ |
| `dossier` | `<Dossier>` | ✅ |
| `admin` | `<AdminBlog>` (só role='admin') | ✅ |

**Componente órfão:** `FocusMode.jsx` existe em `src/components/` mas não é importado nem montado em nenhum lugar.

---

## TABELAS SUPABASE: USADAS vs. DEFINIDAS

| Tabela | Arquivo(s) que usa | Definida no SQL? |
|--------|--------------------|-----------------|
| `profiles` | db.js, foodService.js, App.jsx | ✅ |
| `app_settings` | App.jsx:154 | ✅ setup_missing_tables.sql |
| `tasks` | db.js, EventNotifier.jsx | ✅ setup_backend_complete.sql |
| `transactions` | db.js | ✅ setup_missing_tables.sql |
| `financial_goals` | db.js | ✅ setup_missing_tables.sql |
| `media_vault` | db.js | ✅ setup_missing_tables.sql |
| `telemetry_metrics` | db.js, Telemetry.jsx | ⚠️ Existe mas com **schema incompatível** (ver abaixo) |
| `blog_posts` | db.js, AdminBlog.jsx | ✅ migration 20260328 |
| `achievements` | db.js | ✅ setup_backend_complete.sql |
| `user_achievements` | db.js | ✅ setup_backend_complete.sql |
| `focus_sessions` | db.js | ✅ setup_backend_complete.sql |
| `daily_activity` | db.js | ✅ setup_backend_complete.sql |
| `goals` | db.js | ✅ setup_backend_complete.sql |
| `telemetry_history` | db.js | ✅ setup_backend_complete.sql |
| `user_notes` | db.js | ✅ setup_backend_complete.sql |
| `ranking_groups` | db.js | ✅ setup_missing_tables.sql |
| `ranking_group_members` | db.js | ✅ setup_missing_tables.sql |
| `nutrition_plans` | foodService.js | ✅ fitcal_module.sql |
| `foods` | foodService.js | ✅ fitcal_module.sql |
| `meal_entries` | foodService.js | ✅ fitcal_module.sql |
| `custom_meals` | foodService.js | ✅ fitcal_module.sql |
| `custom_meal_items` | foodService.js | ✅ fitcal_module.sql |
| `weight_logs` | weightService.js | ✅ fitcal_module.sql |
| `water_logs` | weightService.js | ✅ fitcal_module.sql |
| `activity_logs` | weightService.js | ✅ fitcal_module.sql |
| `challenges` | challengeService.js | ✅ gymrats_module.sql |
| `challenge_members` | challengeService.js | ✅ gymrats_module.sql |
| `workouts` | checkinService.js | ✅ gymrats_module.sql |
| `messages` | chatService.js | ✅ gymrats_module.sql |
| **`modulos`** | **Vault.jsx:63** | ❌ **NÃO EXISTE** |
| **`registros_dinamicos`** | **Vault.jsx:68** | ❌ **NÃO EXISTE** |

### Mismatch de schema: `telemetry_metrics`

O SQL define:
```sql
-- setup_missing_tables.sql
name TEXT, score INTEGER, category TEXT, updated_at TIMESTAMPTZ
```

O frontend (db.js + Telemetry.jsx) acessa:
```
title, value, unit, trend, status, type, metadata (JSONB)
```

Resultado: **Hub Telemetria sempre renderiza completamente vazio** — `coreNodes = []`, `expansionNodes = []`, `shadowMetrics = []`.

---

## RELATÓRIO DE PROBLEMAS

| # | Arquivo | Linha | Severidade | Descrição | Fix Sugerido |
|---|---------|-------|-----------|-----------|--------------|
| 1 | `src/components/Vault.jsx` | 63–76 | 🔴 **CRÍTICO** | Consulta tabelas `modulos` e `registros_dinamicos` que **não existem** em nenhuma migration. A seção "Notas" do Vault nunca mostra dados — falha silenciosa. | Substituir por chamada a `getUserNotes()` / `createNote()` de `db.js`, que usa a tabela `user_notes` existente. |
| 2 | `src/components/Telemetry.jsx` + `src/services/db.js` | db.js:165 / Telemetry:253 | 🔴 **CRÍTICO** | Schema da tabela `telemetry_metrics` incompatível entre SQL e frontend. SQL: `(name, score, category)`. Frontend acessa: `(title, value, unit, trend, status, type, metadata)`. Hub Telemetria sempre vazio em produção. | Criar migration: `ALTER TABLE telemetry_metrics ADD COLUMN title TEXT, value NUMERIC, unit TEXT, trend TEXT, status TEXT, type TEXT, metadata JSONB;` — ou remapear no `db.js` (`name→title`, `score→value`). |
| 3 | `src/index.css` | ~11 | 🟠 **ALTO** | `@import url('https://fonts.googleapis.com/...')` está após outros statements CSS. Viola spec CSS, gera warning no build e pode causar FOUC em alguns browsers. | Mover o `@import` para a **linha 1** do arquivo, antes de qualquer outro statement. |
| 4 | `src/components/Blog.jsx` | 171–182 | 🟠 **ALTO** | `useEffect` manipula `document.documentElement.classList.add('dark')` diretamente, conflitando com a lógica de tema do `App.jsx` que gerencia classe `light`. Os dois sistemas de tema brigam. | Remover o `useEffect` de tema do `Blog.jsx` inteiramente. As variáveis CSS `var(--bg-color)` e `var(--text-main)` já são controladas pelo App. |
| 5 | `src/components/Login/Login.jsx` | 391–410 | 🟠 **ALTO** | Após SignUp bem-sucedido, o botão "Continuar" chama `onLoginSuccess()` que tenta montar a sessão. Se o e-mail ainda não foi confirmado, `getSession()` retorna null e o app volta para login sem mensagem explicativa. | No fluxo de SignUp, não chamar `onLoginSuccess()`. Exibir mensagem "Verifique seu e-mail para ativar a conta" e aguardar ação do usuário. |
| 6 | `src/components/Dossier.jsx` | 15 | 🟡 **MÉDIO** | `selectedMentorId` tem default `'peterson'`, mas nenhum mentor tem esse id. O fallback `MENTORS[1]` (Aurora) salva a UI, porém o estado inicial é incorreto e pode causar flash visual. | Mudar default para `'atlas'` para consistência com `MentorConfig.jsx`. |
| 7 | `src/components/FocusMode.jsx` | — | 🟡 **MÉDIO** | Arquivo existe mas não é importado em lugar nenhum. Componente órfão. Aumenta o bundle desnecessariamente se o build não fizer tree-shaking. | Remover o arquivo ou conectar à navegação se for uma feature planejada. |
| 8 | `vite.config.js` | — | 🟡 **MÉDIO** | Bundle único de 884 kB sem code-splitting. Tempo de carregamento alto em mobile / conexões lentas. | Usar `React.lazy()` + `Suspense` para features pesadas (`FitCal`, `GymRats`, `CapitalViewNew`) e configurar `manualChunks` no Rollup. |
| 9 | `src/components/Nexus.jsx` | 70–100 | 🟡 **MÉDIO** | Não há `isLoading` state durante `fetchNexusData()`. Dados aparecem zerados por um instante antes de carregar — má UX no primeiro render. | Adicionar `const [loading, setLoading] = useState(true)` e renderizar skeleton/spinner enquanto carrega. |
| 10 | `src/components/Telemetry.jsx` | 223–320 | 🟡 **MÉDIO** | Não há loading state. Score 0 e listas vazias aparecem antes dos dados carregarem. | Adicionar loading state com feedback visual. |
| 11 | `src/components/GlobalRanking.jsx` | 13–57 | 🟡 **MÉDIO** | Não há loading state durante `fetchRankings()`. Pódio vazio aparece antes dos dados. | Adicionar loading state com skeleton. |
| 12 | `src/components/GlobalRanking.jsx` | 52 | 🟡 **MÉDIO** | A aba "Amigos" é apenas `formattedUsers.slice(0, 5)` do ranking global — não são amigos reais. A feature de grupos via `ranking_groups` existe no banco mas não é usada aqui. | Implementar busca real via `getMyGroups()` de `db.js`. |
| 13 | `src/services/db.js` | ~175 | 🟡 **MÉDIO** | `deleteTelemetryMetric` não filtra por `user_id`. Com RLS desativada ou mal configurada, qualquer usuário poderia deletar métrica de outro. | Adicionar `.eq('user_id', session.user.id)` na query de delete. |
| 14 | `src/components/Login/Login.jsx` | 299–313 | 🔵 **BAIXO** | Checkbox "Lembrar-me" é decorativo — sem `checked`, `onChange` ou lógica de persistência. | Remover da UI ou implementar com `supabase.auth.signInWithPassword` + opção `{ persistSession: true }`. |
| 15 | `src/components/MentorConfig.jsx` | 116–118 | 🔵 **BAIXO** | Imagens `/atlas.png` e `/aurora.png` sem handler de erro. Se os arquivos não existirem em `public/`, quebram silenciosamente. | Adicionar `onError={(e) => { e.target.src = '/mentor-placeholder.png' }}` nas tags `<img>`. |
| 16 | `src/features/fitcal/hooks/useWeight.js` | 1 | 🔵 **BAIXO** | O hook `useWater` é exportado do arquivo `useWeight.js`. Semanticamente confuso — dois hooks sem relação no mesmo arquivo. | Renomear para `useWaterAndWeight.js` ou separar em `useWater.js`. |
| 17 | `src/services/db.js` | ~408 | 🔵 **BAIXO** | `createGroup` faz 2 queries separadas (criar grupo + adicionar owner) sem transação. Se a segunda falhar, grupo fica sem owner como membro. | Encapsular em `rpc()` com função SQL transacional, ou fazer tratamento de erro com rollback manual. |
| 18 | Schema antigo | `supabase_schema.sql` | 🔵 **BAIXO** | Tabela `notes` definida no schema original nunca é usada pelo frontend atual (que usa `user_notes`). Dois schemas de notas coexistem gerando confusão. | Documentar deprecação ou criar migration para `DROP TABLE notes`. |

---

## RESUMO EXECUTIVO

| Categoria | Qtd |
|-----------|-----|
| 🔴 CRÍTICO | 2 |
| 🟠 ALTO | 3 |
| 🟡 MÉDIO | 7 |
| 🔵 BAIXO | 6 |
| **Total** | **18** |

### Críticos (ação imediata)

**#1 — Vault.jsx notas quebradas:** Substituir chamadas a `modulos`/`registros_dinamicos` por `getUserNotes()` de `db.js`.

**#2 — Telemetry schema mismatch:** Criar migration adicionando colunas `title, value, unit, trend, status, type, metadata` à tabela `telemetry_metrics`, ou remapear no `db.js`.

### Altos (resolver antes do próximo release)

**#3 — CSS `@import`:** Mover para linha 1 do `index.css`.

**#4 — Tema duplicado Blog.jsx:** Remover `useEffect` de tema — usa variáveis CSS do App.

**#5 — SignUp sem confirmação de e-mail:** Não chamar `onLoginSuccess()` antes de e-mail confirmado.

### Build
O app **compila sem erros**. Todos os imports de módulos Node estão resolvidos. Os problemas são de lógica e integração de dados, não de compilação.
