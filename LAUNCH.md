# ORVAX — Playbook de Lançamento

Este é o guia de execução para colocar o ORVAX em produção (Web + Play Store). Cada item tem critério de aceite e comando. Siga em ordem.

---

## FASE A — SEGURANÇA (fazer AGORA, antes de qualquer deploy)

### A1. Rotacionar a chave OpenAI vazada ⚠️
A chave `sk-proj-eEHCwtWWI2iHh6ly...` está no histórico do git e foi commitada. Considere-a comprometida.

- [ ] Entre em https://platform.openai.com/api-keys e **revogue** essa chave
- [ ] Crie uma nova chave OpenAI
- [ ] Configure como secret no Supabase (NUNCA em `.env` do cliente):
  ```bash
  supabase secrets set OPENAI_API_KEY=sk-proj-NOVA_CHAVE
  ```

### A2. Rotacionar a anon key do Supabase (opcional, mas recomendado)
A anon key não é tecnicamente secreta, mas se quiser limpar vestígios:
- Supabase Dashboard → Settings → API → "Generate new JWT secret"
- Atualizar `.env` local e variáveis no Vercel

### A3. Configurar secret do WhatsApp App
- [ ] No Meta for Developers → App → Basic → copiar "App Secret"
- [ ] `supabase secrets set WHATSAPP_APP_SECRET=<app_secret>`
- [ ] `supabase secrets set WHATSAPP_VERIFY_TOKEN=<token_aleatório_gerado_por_você>`

### A4. Aplicar migrações faltantes no Supabase
Cole cada arquivo no SQL Editor do Supabase e execute (em ordem):
- [ ] `supabase/migrations/20260421_orvax_core_unified.sql` (já aplicada)
- [ ] `supabase/migrations/20260421_orvax_core_triggers.sql` (já corrigida com BIGINT)
- [ ] `supabase/migrations/20260422_launch_hardening.sql`
- [ ] `supabase/migrations/20260422_n8n_support.sql`

---

## FASE B — DEPLOY FRONTEND (Vercel)

### B1. Preparar repositório
```bash
# Remover .env do tracking (já feito no commit anterior)
git status  # deve mostrar D .env
git add .gitignore .env.example vercel.json capacitor.config.json
git commit -m "chore: launch hardening — remove .env, add deploy config"
```

### B2. Conectar Vercel
- [ ] Login em https://vercel.com com GitHub
- [ ] Import Project → selecione o repo
- [ ] Framework: Vite (detectado automaticamente)
- [ ] Environment Variables:
  - `VITE_SUPABASE_URL` = `https://vnwehvaymxvkmibcikvi.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = (anon key nova ou atual)
  - `VITE_GEMINI_API_KEY` = (sua chave Gemini — obter em https://aistudio.google.com/app/apikey)
  - `VITE_ADMIN_EMAIL` = `kkfelipemacedo@gmail.com`
- [ ] Deploy

### B3. Configurar domínio personalizado (opcional)
- Vercel → Project → Settings → Domains → Add `orvax.app` ou similar

### B4. Supabase Auth Redirect URLs
- Supabase Dashboard → Authentication → URL Configuration
- Site URL: `https://seu-dominio.vercel.app`
- Redirect URLs: adicionar `https://seu-dominio.vercel.app/**`

---

## FASE C — EDGE FUNCTIONS

### C1. Deploy do whatsapp-agent
```bash
supabase login
supabase link --project-ref vnwehvaymxvkmibcikvi
supabase functions deploy whatsapp-agent --no-verify-jwt
```

### C2. Configurar webhook no Meta Business
- URL: `https://vnwehvaymxvkmibcikvi.functions.supabase.co/whatsapp-agent`
- Verify Token: o mesmo que você setou em `WHATSAPP_VERIFY_TOKEN`
- Subscribe to: `messages`

### C3. Testar
```bash
# GET (verificação)
curl "https://vnwehvaymxvkmibcikvi.functions.supabase.co/whatsapp-agent?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=TESTE"
# esperado: TESTE

# POST (deve retornar 403 sem assinatura HMAC válida)
curl -X POST "https://vnwehvaymxvkmibcikvi.functions.supabase.co/whatsapp-agent" -d '{}'
# esperado: Forbidden
```

---

## FASE D — n8n WORKFLOWS

### D1. Subir instância n8n
Opção A (rápida): https://n8n.cloud — $20/mês
Opção B (VPS): Docker em DigitalOcean/Hetzner:
```yaml
# docker-compose.yml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    ports: ["5678:5678"]
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=<senha-forte>
      - SUPABASE_URL=https://vnwehvaymxvkmibcikvi.supabase.co
      - SUPABASE_SERVICE_KEY=<service_role_key>
      - OPENAI_API_KEY=<nova_openai_key>
      - WHATSAPP_TOKEN=<token_whatsapp>
      - WHATSAPP_PHONE_NUMBER_ID=<id>
    volumes: [./n8n_data:/home/node/.n8n]
```

### D2. Importar workflows
- [ ] `n8n/01_welcome_new_user.json` → ativar → copiar URL do webhook
- [ ] `n8n/02_daily_habit_reminder.json` → ativar cron 08:00 BRT
- [ ] `n8n/03_performance_drop_detection.json` → ativar cron 20:00 BRT

### D3. Criar trigger no Supabase que chama Welcome webhook
```sql
-- Cole no SQL Editor
CREATE OR REPLACE FUNCTION public.call_welcome_webhook()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://seu-n8n.com/webhook/orvax-welcome',
        body := jsonb_build_object('record', row_to_json(NEW))
    );
    RETURN NEW;
END $$;

CREATE TRIGGER t_welcome_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.call_welcome_webhook();
```

(Precisa da extensão `pg_net` — Supabase Dashboard → Database → Extensions → habilitar `pg_net`)

---

## FASE E — BUILD ANDROID (Play Store)

### E1. Instalar Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init ORVAX com.orvax.app --web-dir=dist
npx cap add android
```

### E2. Build & sync
```bash
npm run build
npx cap sync android
npx cap open android   # abre Android Studio
```

### E3. No Android Studio
- Build → Generate Signed Bundle/APK → Android App Bundle
- Criar keystore (GUARDE EM LOCAL SEGURO, sem ele não publica atualizações)
- Sign com release key
- Arquivo .aab gerado em `android/app/release/`

### E4. Play Console
- https://play.google.com/console → $25 único para conta dev
- Create app → ORVAX → Português BR
- Upload `.aab`
- Preencher: descrição, screenshots (mín 2 por orientação), ícone 512x512, feature graphic 1024x500
- Política de privacidade (URL obrigatória) — ver Fase G
- Classificação etária (questionário)
- Público-alvo
- Submit for review (1-7 dias)

---

## FASE F — TESTES QA (checklist pré-lançamento)

### Autenticação
- [ ] Cadastro com e-mail válido cria conta
- [ ] Cadastro com e-mail já existente mostra erro claro
- [ ] Login com senha correta entra no app
- [ ] Login com senha errada mostra "E-mail ou senha incorretos"
- [ ] "Esqueci minha senha" envia e-mail
- [ ] Link do e-mail abre app em modo reset
- [ ] Nova senha funciona no próximo login
- [ ] Logout em uma aba → outra aba detecta e volta pro login (`onAuthStateChange`)

### Core loop (a prova-de-tudo)
- [ ] Criar hábito no Dashboard → aparece na lista
- [ ] Check-in do hábito → score sobe em tempo real (sem F5)
- [ ] XP aumenta no Dossier
- [ ] Streak calcula corretamente
- [ ] Criar tarefa no Vault com `state = 'done'` → XP +5 cascateia
- [ ] Criar meta → progresso +10% → XP proporcional
- [ ] Progresso 100% → status 'concluida' + 100 XP bônus

### UX críticos
- [ ] App abre em <3s no mobile
- [ ] Não há scroll horizontal em nenhuma tela
- [ ] Teclado não cobre input em forms
- [ ] Botão de confirmar em modais NÃO fica atrás da nav bar
- [ ] Light mode vs Dark mode: nenhum texto some
- [ ] Navegação entre abas mantém estado
- [ ] Logout limpa todos os estados

### Edge cases
- [ ] Rede offline → componentes mostram fallback, não crash
- [ ] Token expirado → refresh automático (onAuthStateChange captura)
- [ ] Upload de foto > 10MB → mensagem clara de erro
- [ ] Inserir milhões de caracteres em campos → validação

### Segurança (DevTools)
- [ ] Nenhum `console.log` em produção vaza dados sensíveis
- [ ] Network tab: todas requests vão pra `supabase.co` (não terceiros desconhecidos)
- [ ] Sem API key OpenAI no bundle (só SUPABASE_URL e SUPABASE_ANON_KEY)
- [ ] RLS funciona: logar com user A e tentar query direta de dados do user B retorna []

---

## FASE G — POLÍTICA DE PRIVACIDADE + TERMOS

Obrigatório para Play Store. Crie 2 páginas HTML estáticas e hospede:
- `/privacy` — Política de privacidade (LGPD)
- `/terms` — Termos de uso

Pontos obrigatórios na Política:
1. Que dados coletamos (e-mail, hábitos, tarefas, metas, opcionalmente telefone)
2. Como usamos (melhorar experiência, enviar lembretes)
3. Onde armazenamos (Supabase — US/EU região)
4. Compartilhamento (NÃO vendemos; processamos com OpenAI e Google Gemini para mentoria)
5. Direito de excluir conta (função `delete_my_account` já criada → expor na UI)
6. Contato: kkfelipemacedo@gmail.com

---

## FASE H — PÓS-LANÇAMENTO

### Observabilidade
- [ ] Supabase Dashboard → Logs → configurar alerta para erros > 10/min
- [ ] Vercel → Analytics (habilitar, free tier)
- [ ] Sentry (opcional, $0 tier): wrappear ErrorBoundary para enviar stacktrace

### Métricas essenciais (semana 1)
- DAU / MAU (acesse via `auth.users` + `daily_metrics`)
- % que completa o primeiro hábito em <24h (ativação)
- % que volta no D2, D7 (retenção)
- Hábitos criados por usuário (profundidade)
- Fontes de drop-off (onde fecham o app)

### Monitoramento contínuo
- Logs do whatsapp-agent (Supabase Functions → Logs)
- Execuções do n8n (verificar taxa de sucesso semanalmente)
- Feedback dos usuários (adicionar formulário simples na tela de dossier)

---

## Comandos rápidos (cheat sheet)

```bash
# Dev local
npm run dev

# Build & check
npm run build:check

# Deploy edge function
npm run supabase:deploy:functions

# Gerar tipos TS do schema atual
npm run supabase:types

# Build Android
npm run cap:build:android
```

---

**Pronto para lançar quando todos os checkboxes das Fases A-F estiverem marcados.**
