# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ORVAX** — anti-procrastination personal control system ("Sistema de Controle Pessoal") built in Portuguese BR for Brazilian users. Mobile-first React app (428px max-width). Futuristic black-and-white theme throughout — no colors outside that palette.

**Full stack:** React + Vite + Tailwind · Supabase (auth, DB, storage, Edge Functions) · GPT-4o-mini via Edge Functions (mentor-chat, analyze-food, xp-engine, dimension-coach) · Capacitor 7 (Android) · Stripe **somente na Landing Page** (fora do app)

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

## Current Priorities (as of 2026-03-28)

1. **FitCal** — expand Brazilian foods database (currently empty, blocking food diary)
2. **Blog dinâmico** — Supabase-backed posts with admin + public views
3. **Mentor ↔ WhatsApp bridge** — connect in-app Atlas/Aurora to the n8n WhatsApp agent
4. **Auditoria completa** — full frontend and backend audit

### VSCode / Deno

`.vscode/settings.json` configures Deno for files inside `supabase/functions/`. Use Deno import syntax there — not Node/npm imports.
