# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 TEM USUÁRIO REAL EM PRODUÇÃO — nunca publique por conta própria (2026-09-05)

O ORVAX já é usado por gente de verdade. Publicar direto em produção sem
o dono aprovar não é agilidade, é risco em cima de usuário pagante.

**Fluxo obrigatório:**

1. Trabalhe na branch `dev`. A `main` é produção — não commite nela.
2. Verifique no `localhost` (`npm run dev` ou o preview do Claude Code).
3. Para o dono revisar, publique uma PRÉ-VISUALIZAÇÃO:
   `npx vercel --yes --scope kauas-projects-7c59a39f`  ← SEM `--prod`
   Sai numa URL própria, atrás do login da Vercel (302 para quem não é
   da equipe), então nenhum usuário real alcança.
4. **Só depois do "pode subir"** explícito: merge `dev` → `main` e
   `npx vercel --prod --yes --scope kauas-projects-7c59a39f`.

**Nunca rode `--prod` sem aprovação explícita naquela conversa.** Aprovação
de uma vez não vale para a próxima.

**O banco NÃO tem separação.** Existe um único projeto Supabase, então
todo SQL rodado atinge usuário real na hora — não há ambiente de teste de
banco. Por isso: migration é sempre proposta em arquivo, explicada, e
QUEM RODA É O DONO. Nunca aplique schema por conta própria, e prefira
mudança aditiva e reversível (coluna nova nullable) a destrutiva.
Um segundo projeto Supabase de staging resolveria — ainda não existe.

## Project Overview

**ORVAX** — anti-procrastination personal control system ("Sistema de Controle Pessoal") built in Portuguese BR for Brazilian users. Mobile-first React app (428px max-width). Futuristic black-and-white theme throughout — no colors outside that palette.

**Full stack:** React + Vite + Tailwind · Supabase (auth, DB, storage, Edge Functions) · GPT-4o-mini via Edge Functions (mentor-chat, analyze-food, xp-engine, dimension-coach) · Capacitor 8 (Android, em espera) · Stripe **somente na Landing Page** (fora do app)

## 📲 DISTRIBUIÇÃO: app instalável pelo navegador (2026-08-12)

O ORVAX **não é distribuído por loja**. É um app instalável (PWA): a pessoa
abre `app.orvaxapp.com.br`, adiciona à tela inicial e passa a ter ícone
próprio, tela cheia e funcionamento offline. A Play Store não foi
abandonada (o AAB e o keystore continuam prontos), só deixou de ser o
caminho de lançamento — por isso a regra comercial abaixo continua valendo
integralmente.

- `public/manifest.webmanifest` + `public/sw.js` + `public/icons/`.
- **O service worker é rede-primeiro na navegação** e cache-primeiro só em
  `/assets/*` (nome com hash = imutável). Nunca intercepta outra origem —
  cachear resposta do Supabase vazaria sessão entre contas. Não mexa nessa
  estratégia sem entender que ela é o que impede o usuário de ficar preso
  numa versão velha.
- `src/lib/installPrompt.js` registra `beforeinstallprompt` **fora do React**:
  o Chrome dispara antes do primeiro render e um `useEffect` perde o evento.
- Deploy: `npx vercel --prod --yes --scope kauas-projects-7c59a39f` (não há
  deploy automático por git). `vercel.json` **não aceita** chave `"//"`.

## ⚠️ ARQUITETURA COMERCIAL — o app NÃO vende (2026-07-24)

O ORVAX é uma **plataforma de acesso**: quem compra, compra na Landing Page.
`LP → Stripe → stripe-webhook → profiles.plan/is_premium → app LÊ e libera`

**NUNCA adicionar ao app:** preço, tela de planos, checkout, Stripe Checkout,
Google Play Billing, RevenueCat, botão "Assinar/Comprar", ou link que abra uma
página de venda (isso é *anti-steering* e reprova na Play Store).

- **Não existe plano gratuito**: só `essencial` e `completo` (ambos pagos).
  `none` = conta sem plano ativo → `AccessGate` (tela informativa, não vende).
- Acesso por plano: `src/services/entitlements.js` (única fonte) — tiers
  `none | essencial | completo`, mapa `FEATURE_MIN_TIER`, `hasFeature()`,
  `hasActivePlan()`. Admin (`profiles.role='admin'`) vê tudo.
- Recurso fora do plano → `<FeatureLocked>`: mostra o VALOR do recurso e o CTA
  chama `requestUpgrade()` → Edge Function `request-upgrade` **envia um e-mail**
  com o link da LP. O link de compra nunca aparece no app.
- Conta → seção "Seu Plano" é **read-only**. Cancelamento/gerenciamento é fora.

> n8n/WhatsApp foram DESCONTINUADOS (2026-07-22). Não existe mais agente WhatsApp; o mentor é 100% in-app via Edge Function `mentor-chat`.

## Commands

```bash
npm run dev       # Start dev server (accessible on network via --host)
npm run build     # Production build to dist/
npm run lint      # ESLint (flat config, ESLint 9)
npm run preview   # Preview production build

# Supabase local dev
supabase start           # Start local Supabase stack (ports 54321/API, 54322/DB)
supabase db reset        # Reset DB and rerun all migrations + seed
supabase functions serve # Serve Edge Functions locally (Deno 2)
```

## Architecture

### Tab-Based SPA

`src/App.jsx` is the root — it manages auth state, theme, and tab routing.

| Tab key | Screen name | Purpose |
|---|---|---|
| `nexus` | Home | Dashboard ORVAX |
| `vault` | O Cofre | Agenda, Arquivo, Notas, Capital |
| `telemetry` | Hub Telemetria | Score global, mapa de equilíbrio |
| `fitcal` | FitCal | Rastreador nutricional |
| `arena` | Arena | Desafios fitness (GymRats) |
| `dossier` | Dossier | Perfil, XP, ranking |
| `focus` | Blog | Timeline de notícias |

The AI mentor system (Atlas/Aurora personas) lives in-app: `MentorAssistant.jsx` (aba central) e `MentorModal.jsx` (overlay do Nexus) — ambos falam com a Edge Function `mentor-chat`.

### Layers

- **`src/components/`** — 30 shared/page-level components. Large components like `Vault.jsx` (65KB), `CapitalViewNew.jsx` (54KB), and `Telemetry.jsx` (38KB) are monolithic.
- **`src/features/`** — Self-contained feature modules, each with their own components, pages, services, and hooks:
  - `fitcal/` — Nutrition and weight tracking
  - `gymrats/` — Social fitness challenges
- **`src/services/db.js`** — All Supabase queries. Every query filters by `user_id` for RLS compliance.
- **`src/services/mentorAgent.js`** — mentor client → Edge Function `mentor-chat` (chaves de IA vivem SÓ no servidor; nunca criar `VITE_*_API_KEY` de LLM).
- **`src/lib/supabase.js`** — Supabase client init (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- **`src/utils/dateUtils.js`** — Local date helpers that fix UTC offset issues for Brazil timezone (critical — don't use raw `new Date()` for date comparisons).

### Supabase Backend

- **Edge Functions** (Deno 2, TypeScript): `mentor-chat` (personas Atlas/Aurora), `analyze-food` (scanner nutricional por foto), `xp-engine` (VERITAS — única fonte de XP), `dimension-coach` (Conselho de IAs), `stripe-webhook` (fonte de verdade do acesso: cria a conta na compra da LP + e-mail com link de senha e da Play Store), `request-upgrade` (e-mail com o link da LP), `delete-account` (exclusão de conta — requisito Play). `create-checkout`/`create-portal` existem mas **não são chamadas pelo app** (só a LP pode usar).
- **Migrations** in `supabase/migrations/` — PostgreSQL 17 schema files. New features require a dated migration file.
- All tables use RLS. The `profiles` table row must exist for a user before any FK-constrained writes work.

### Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENAI_API_KEY=
```

Edge Function requires Supabase service role key and OpenAI key set via `supabase secrets`.

Stripe keys will also be required when payment flows are implemented.

## Current Priorities (as of 2026-08-12)

1. **DNS do app** — registro `A` de `app` → `76.76.21.21` no registro.br. Até
   lá o app só responde em `orvax-app.vercel.app` e o link do `/obrigado` da
   LP fica morto.
2. **Deploy das Edge Functions** `nutri-coach`, `analyze-food` e
   `stripe-webhook` — commitadas mas NÃO no ar. Enquanto isso, o gate do
   plano Completo vale só na tela, não no servidor. ⚠️ O CLI e o MCP do
   Supabase estão autenticados numa conta SEM o projeto `vnwehvaymxvkmibcikvi`.
3. **Teste real de compra** ponta a ponta (comprar → e-mail → instalar → entrar
   → reembolsar). Nunca foi feito.
4. **FitCal** — base de alimentos rasa (153 `foods` + 304 `foods_v2`).

### VSCode / Deno

`.vscode/settings.json` configures Deno for files inside `supabase/functions/`. Use Deno import syntax there — not Node/npm imports.
