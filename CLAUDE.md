# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ORVAX** — anti-procrastination personal control system ("Sistema de Controle Pessoal") built in Portuguese BR for Brazilian users. Mobile-first React app (428px max-width). Futuristic black-and-white theme throughout — no colors outside that palette.

**Full stack:** React + Vite + Tailwind · Supabase (auth, DB, storage, Edge Functions) · n8n (WhatsApp agent orchestration) · WhatsApp Business API (Meta) · GPT-4o-mini (agent LLM) · Stripe (payments)

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

The AI mentor system (Atlas/Aurora personas) lives in `MentorModal.jsx` in-app and mirrors into the WhatsApp agent.

### Layers

- **`src/components/`** — 30 shared/page-level components. Large components like `Vault.jsx` (65KB), `CapitalViewNew.jsx` (54KB), and `Telemetry.jsx` (38KB) are monolithic.
- **`src/features/`** — Self-contained feature modules, each with their own components, pages, services, and hooks:
  - `fitcal/` — Nutrition and weight tracking
  - `gymrats/` — Social fitness challenges
- **`src/services/db.js`** — All Supabase queries. Every query filters by `user_id` for RLS compliance.
- **`src/services/gemini.js`** — Google Gemini API wrapper for the in-app mentor.
- **`src/lib/supabase.js`** — Supabase client init (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
- **`src/utils/dateUtils.js`** — Local date helpers that fix UTC offset issues for Brazil timezone (critical — don't use raw `new Date()` for date comparisons).

### Supabase Backend

- **Edge Function** at `supabase/functions/whatsapp-agent/` — Deno 2, TypeScript. Implements two AI mentor personas (ATLAS and AURORA) via OpenAI. Handles WhatsApp Business API webhooks.
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
