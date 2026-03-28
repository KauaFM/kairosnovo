# ORVAX Agent - Guia de Deploy

## Passo 1: Configurar o Banco de Dados

1. Abra o **Supabase Dashboard** > **SQL Editor**
2. Cole e execute o conteúdo do arquivo `setup.sql`
3. Isso vai criar as tabelas novas e adicionar os campos necessários

## Passo 2: Instalar o Supabase CLI

```bash
npm install -g supabase
```

## Passo 3: Inicializar o Supabase no Projeto

```bash
cd kairosnovo
supabase init
supabase login
supabase link --project-ref vnwehvaymxvkmibcikvi
```

## Passo 4: Criar a Edge Function

```bash
supabase functions new whatsapp-agent
```

Depois copie o conteúdo de `agent/index.ts` para:
`supabase/functions/whatsapp-agent/index.ts`

## Passo 5: Configurar as Variáveis de Ambiente (Secrets)

```bash
supabase secrets set WHATSAPP_TOKEN="seu_token_aqui"
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="seu_phone_number_id"
supabase secrets set WHATSAPP_VERIFY_TOKEN="orvax_verify_2026"
supabase secrets set OPENAI_API_KEY="sua_chave_openai"
```

As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já estão disponíveis automaticamente nas Edge Functions.

## Passo 6: Deploy da Edge Function

```bash
supabase functions deploy whatsapp-agent --no-verify-jwt
```

O `--no-verify-jwt` é necessário porque o WhatsApp não manda JWT — ele manda webhooks diretos.

A URL da função será:
```
https://vnwehvaymxvkmibcikvi.supabase.co/functions/v1/whatsapp-agent
```

## Passo 7: Configurar o Webhook no Meta Business

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Vá no seu App > WhatsApp > Configuration
3. Em **Webhook**, coloque:
   - **Callback URL**: `https://vnwehvaymxvkmibcikvi.supabase.co/functions/v1/whatsapp-agent`
   - **Verify Token**: `orvax_verify_2026` (ou o que você definiu)
4. Clique em **Verify and Save**
5. Em **Webhook Fields**, ative: `messages`

## Passo 8: Vincular Telefone dos Usuários

Para o agente funcionar, cada usuário precisa ter o número de telefone salvo no perfil.

No app, o campo `phone_number` na tabela `profiles` precisa estar preenchido com o número no formato internacional (ex: `5511999998888`).

Você pode adicionar um campo de telefone na tela Dossier ou preencher manualmente no Supabase durante o beta.

## Onde Encontrar Cada Token

| Token | Onde encontrar |
|-------|---------------|
| WHATSAPP_TOKEN | Meta Business > App > WhatsApp > API Setup > "Temporary access token" ou token permanente do System User |
| WHATSAPP_PHONE_NUMBER_ID | Meta Business > App > WhatsApp > API Setup > "Phone number ID" |
| OPENAI_API_KEY | https://platform.openai.com/api-keys |

## Testando

1. Envie uma mensagem de texto para o número do WhatsApp Business
2. Verifique os logs: `supabase functions logs whatsapp-agent --tail`
3. A resposta deve chegar no WhatsApp com a personalidade do mentor selecionado

## Custos Estimados

- **Supabase Edge Functions**: Grátis no plano Free (500K invocações/mês)
- **WhatsApp Business API**: Grátis dentro da janela de 24h (resposta)
- **OpenAI GPT-4o-mini**: ~$0.15 por 1M tokens input, ~$0.60 por 1M tokens output
- **OpenAI Whisper**: $0.006 por minuto de áudio

Para um uso típico de ~50 mensagens/dia, o custo mensal fica em torno de $2-5.
